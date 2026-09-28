from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.common.dependencies import get_current_user
from app.modules.userauth.models import User
from app.modules.reports.service import ReportsService
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

class EmailRequest(BaseModel):
    recipient_email: EmailStr

@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves high-level summary statistics of active tenders."""
    return await ReportsService.get_dashboard_summary(db)

@router.get("/charts")
async def get_charts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves aggregated chart data for status distribution, closing timeline, and top organizations."""
    return await ReportsService.get_dashboard_charts(db)

@router.get("/export")
async def export_tenders_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Downloads a professionally styled Excel sheet listing all active tenders."""
    excel_bytes = await ReportsService.generate_excel_report(db)
    
    filename = f"Active_Tenders_Report_{current_user.id}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.post("/email", status_code=status.HTTP_200_OK)
async def email_tenders_report(
    req: EmailRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers compile and dispatch of tender digest email containing top 10 tenders and Excel attachment."""
    success = await ReportsService.send_tender_digest(db, req.recipient_email)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send tender digest email. Please check SMTP server settings."
        )
    return {"message": f"Tender digest email successfully sent to {req.recipient_email}."}
