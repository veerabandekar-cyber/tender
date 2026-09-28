import io
import logging
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy import select, func, cast, String, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.modules.tenders.models import Tender, TenderStatus
from app.modules.organizations.models import Organization
from app.common.email import send_email_async

logger = logging.getLogger(__name__)


def _clean_org_name(name: str) -> str:
    name_str = name.strip()
    mapping = {
        "Indian Space Research Organisation": "ISRO",
        "Bhabha Atomic Research Centre": "BARC",
        "Council of Scientific and Industrial Research": "CSIR",
        "National Centre for Radio Astrophysics": "NCRA-TIFR",
        "Tata Institute of Fundamental Research": "TIFR",
        "Indian Institute of Science": "IISc",
        "Indian Institute of Science Education and Research Pune": "IISER Pune",
        "Central Public Procurement Portal": "CPPP",
    }
    for full, short in mapping.items():
        if full.lower() in name_str.lower():
            return short
    if "indian institute of technology" in name_str.lower():
        sub = re.sub(r"(?i)indian institute of technology\s*", "IIT ", name_str)
        return sub.replace("(BHU) Varanasi", "BHU").strip()
    if "indian institute of science education and research" in name_str.lower():
        return re.sub(r"(?i)indian institute of science education and research\s*", "IISER ", name_str).strip()
    return name_str if len(name_str) <= 16 else name_str[:15] + ".."


class ReportsService:
    """Service layer for statistics, Excel reports compilation, and email dispatch."""
    
    @staticmethod
    async def get_dashboard_summary(session: AsyncSession) -> Dict[str, Any]:
        """Compiles overview metrics of all active tenders for the user dashboard."""
        now = datetime.now()
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # 1. Total active tenders count
        cnt_query = select(func.count()).select_from(Tender).where(Tender.is_active == True)
        total_cnt = (await session.execute(cnt_query)).scalar() or 0

        # 2. Total estimated value
        val_query = select(func.sum(Tender.tender_value)).where(Tender.is_active == True)
        total_val = (await session.execute(val_query)).scalar() or 0.0

        # 3. New Today
        q_new_today = select(func.count()).select_from(Tender).where(
            Tender.is_active == True,
            Tender.created_at >= start_of_today
        )
        new_today = (await session.execute(q_new_today)).scalar() or 0
        if new_today == 0:
            q_status_new = select(func.count()).select_from(Tender).where(
                Tender.is_active == True,
                Tender.status == TenderStatus.NEW
            )
            new_today = (await session.execute(q_status_new)).scalar() or 0

        # 4. Closing this week
        q_closing_this_week = select(func.count()).select_from(Tender).where(
            Tender.is_active == True,
            Tender.bid_closing_date >= now,
            Tender.bid_closing_date <= now + timedelta(days=7)
        )
        closing_this_week = (await session.execute(q_closing_this_week)).scalar() or 0

        # 5. DAE Opportunities
        dae_q = select(func.count()).select_from(Tender).where(
            Tender.is_active == True,
            or_(
                func.lower(Tender.department).like("%dae%"),
                func.lower(Tender.portal).like("%dae%"),
                func.lower(Tender.portal).like("%barc%"),
                func.lower(Tender.title).like("%atomic%"),
                func.lower(Tender.title).like("%dae%")
            )
        )
        dae_opps = (await session.execute(dae_q)).scalar() or 0

        # 6. ICP-MS / Target Instrument Opportunities
        icp_q = select(func.count()).select_from(Tender).where(
            Tender.is_active == True,
            or_(
                func.lower(Tender.title).like("%icp%"),
                func.lower(Tender.title).like("%spectro%"),
                func.lower(Tender.title).like("%mass%"),
                func.lower(Tender.title).like("%chromatograph%"),
                func.lower(Tender.instrument_category).like("%mass spectrometry%"),
                func.lower(Tender.instrument_category).like("%spectroscopy%"),
                func.lower(cast(Tender.raw_extracted_data, String)).like("%icp%")
            )
        )
        icp_opps = (await session.execute(icp_q)).scalar() or 0

        # 7. Breakdown by status
        status_query = (
            select(Tender.status, func.count())
            .where(Tender.is_active == True)
            .group_by(Tender.status)
        )
        status_result = await session.execute(status_query)
        status_counts = {status.value: count for status, count in status_result.all()}
        
        # Fill in missing statuses with 0
        for s in TenderStatus:
            if s.value not in status_counts:
                status_counts[s.value] = 0

        # 8. Breakdown by portal
        portal_query = (
            select(Tender.portal, func.count())
            .where(Tender.is_active == True)
            .group_by(Tender.portal)
        )
        portal_result = await session.execute(portal_query)
        portal_counts = {portal or "Unknown": count for portal, count in portal_result.all()}

        return {
            # Frontend camelCase keys
            "totalActiveTenders": total_cnt,
            "newToday": new_today,
            "closingThisWeek": closing_this_week,
            "totalTenderValue": float(total_val),
            "daeOpportunities": dae_opps,
            "icpMsOpportunities": icp_opps,
            # Legacy snake_case keys
            "total_tenders": total_cnt,
            "total_value": float(total_val),
            "status_breakdown": status_counts,
            "portal_breakdown": portal_counts
        }

    @staticmethod
    async def get_dashboard_charts(session: AsyncSession) -> Dict[str, Any]:
        """Compiles aggregated chart data for status distribution, closing timeline, and top organizations."""
        now = datetime.now()

        # 1. Status distribution
        status_query = (
            select(Tender.status, func.count())
            .where(Tender.is_active == True)
            .group_by(Tender.status)
        )
        status_result = await session.execute(status_query)
        status_map = {status.value: count for status, count in status_result.all()}
        
        status_order = ["New", "Under Review", "Interested", "Bid Submitted", "Won", "Lost", "Closed"]
        status_data = [
            {"name": s, "value": status_map.get(s, 0)}
            for s in status_order
        ]

        # 2. Closing timeline by week
        week1 = (await session.execute(select(func.count()).select_from(Tender).where(
            Tender.is_active == True,
            Tender.bid_closing_date >= now,
            Tender.bid_closing_date <= now + timedelta(days=7)
        ))).scalar() or 0
        
        week2 = (await session.execute(select(func.count()).select_from(Tender).where(
            Tender.is_active == True,
            Tender.bid_closing_date > now + timedelta(days=7),
            Tender.bid_closing_date <= now + timedelta(days=14)
        ))).scalar() or 0
        
        week3 = (await session.execute(select(func.count()).select_from(Tender).where(
            Tender.is_active == True,
            Tender.bid_closing_date > now + timedelta(days=14),
            Tender.bid_closing_date <= now + timedelta(days=21)
        ))).scalar() or 0
        
        week4 = (await session.execute(select(func.count()).select_from(Tender).where(
            Tender.is_active == True,
            Tender.bid_closing_date > now + timedelta(days=21)
        ))).scalar() or 0

        week_data = [
            {"name": "Week 1", "count": week1},
            {"name": "Week 2", "count": week2},
            {"name": "Week 3", "count": week3},
            {"name": "Week 4+", "count": week4},
        ]

        # 3. Top organizations by tender volume
        org_q = (
            select(Organization.name, func.count(Tender.id).label("tender_count"))
            .join(Tender, Tender.organization_id == Organization.id)
            .where(Tender.is_active == True)
            .group_by(Organization.id, Organization.name)
            .order_by(func.count(Tender.id).desc())
            .limit(5)
        )
        org_res = (await session.execute(org_q)).all()

        org_data = [
            {
                "name": _clean_org_name(name),
                "fullName": name,
                "count": count
            }
            for name, count in org_res
        ]

        return {
            "statusData": status_data,
            "weekData": week_data,
            "orgData": org_data,
        }

    @staticmethod
    async def generate_excel_report(session: AsyncSession) -> bytes:
        """
        Generates a styled Excel workbook listing all active tenders.
        Applies professional colors, border structures, and formats values.
        """
        from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE

        # Fetch all active tenders
        query = (
            select(Tender)
            .where(Tender.is_active == True)
            .options(selectinload(Tender.organization))
            .order_by(Tender.created_at.desc())
        )
        result = await session.execute(query)
        tenders = result.scalars().all()

        # Create Workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Active Tenders"
        
        # Grid lines visible
        ws.views.sheetView[0].showGridLines = True

        # Headers
        headers = [
            "Tender Number", "Title", "Organization", "Department",
            "Category", "Portal", "Value (INR)", "Closing Date", "Status"
        ]
        ws.append(headers)

        # Style definitions
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid") # Dark navy blue
        center_align = Alignment(horizontal="center", vertical="center")
        thin_side = Side(border_style="thin", color="D3D3D3")
        thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

        # Apply header styling
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_align
            cell.border = thin_border

        def _clean(v: Any) -> str:
            if v is None:
                return ""
            return ILLEGAL_CHARACTERS_RE.sub("", str(v))

        # Append data rows
        for t in tenders:
            org_name = t.organization.name if t.organization else ""
            closing_str = t.bid_closing_date.strftime("%Y-%m-%d") if t.bid_closing_date else ""
            status_val = t.status.value if t.status else ""
            
            row_data = [
                _clean(t.tender_number),
                _clean(t.title),
                _clean(org_name),
                _clean(t.department or ""),
                _clean(t.instrument_category or ""),
                _clean(t.portal or ""),
                t.tender_value if t.tender_value is not None else "",
                closing_str,
                status_val
            ]
            ws.append(row_data)

        # Explicit clean column dimensions
        ws.column_dimensions["A"].width = 24
        ws.column_dimensions["B"].width = 45
        ws.column_dimensions["C"].width = 32
        ws.column_dimensions["D"].width = 20
        ws.column_dimensions["E"].width = 22
        ws.column_dimensions["F"].width = 16
        ws.column_dimensions["G"].width = 16
        ws.column_dimensions["H"].width = 14
        ws.column_dimensions["I"].width = 14

        # Save workbook to bytes buffer
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    async def send_tender_digest(cls, session: AsyncSession, recipient_email: str) -> bool:
        """
        Compiles list of new active tenders and sends it as an HTML email digest
        accompanied by the full Excel export attachment.
        """
        # Fetch active tenders
        query = (
            select(Tender)
            .where(Tender.is_active == True)
            .options(selectinload(Tender.organization))
            .order_by(Tender.created_at.desc())
            .limit(10) # List top 10 recent tenders in email body
        )
        result = await session.execute(query)
        tenders = result.scalars().all()

        # Build HTML table
        table_rows = []
        for t in tenders:
            org_name = t.organization.name if t.organization else "N/A"
            value_str = f"₹ {t.tender_value:,.2f}" if t.tender_value else "N/A"
            closing_str = t.bid_closing_date.strftime("%Y-%m-%d") if t.bid_closing_date else "N/A"
            
            row_html = f"""
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">{t.tender_number}</td>
                <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">{t.title}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">{org_name}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">{value_str}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">{closing_str}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;"><span style="background-color: #e2f0d9; padding: 3px 8px; border-radius: 4px; font-size: 0.9em; color: #385723;">{t.status.value}</span></td>
            </tr>
            """
            table_rows.append(row_html)

        tenders_table_html = "\n".join(table_rows)

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #1F497D;">Tender Intelligence Portal (TIP) Daily Digest</h2>
            <p>Hello,</p>
            <p>Below is a summary of the latest scientific tender opportunities tracked in the TIP portal as of <strong>{datetime.now().strftime('%Y-%m-%d')}</strong>.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                    <tr style="background-color: #1F497D; color: white;">
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Tender Number</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Title</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Organization</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Value</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Closing Date</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {tenders_table_html or '<tr><td colspan="6" style="text-align: center; padding: 15px;">No active tenders tracked at this time.</td></tr>'}
                </tbody>
            </table>
            
            <p style="margin-top: 20px;"><em>Note: The complete list of active tenders has been compiled and attached to this email as an Excel spreadsheet.</em></p>
            <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
            <p style="font-size: 0.85em; color: #777;">Tender Intelligence Portal • Analytica Products Division</p>
        </body>
        </html>
        """

        # Generate excel attachment
        excel_bytes = await cls.generate_excel_report(session)
        attachments = [{
            "filename": f"Active_Tenders_Report_{datetime.now().strftime('%Y%m%d')}.xlsx",
            "content": excel_bytes,
            "mimetype": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }]

        # Dispatch
        subject = f"TIP Active Tenders Digest - {datetime.now().strftime('%d %b %Y')}"
        return await send_email_async(
            to_email=recipient_email,
            subject=subject,
            html_content=html_content,
            attachments=attachments
        )
