import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import List, Dict, Any, Optional
import aiosmtplib
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

async def send_email_async(
    to_email: str,
    subject: str,
    html_content: str,
    attachments: Optional[List[Dict[str, Any]]] = None
) -> bool:
    """
    Sends an email asynchronously using aiosmtplib.
    If SMTP configurations are incomplete or credentials are not set,
    it prints the email contents to the application log as a fallback.
    
    attachments parameter is a list of dicts:
    [{"filename": "report.xlsx", "content": b"bytes...", "mimetype": "application/vnd.ms-excel"}]
    """
    smtp_host = settings.smtp_host
    smtp_port = settings.smtp_port
    smtp_user = settings.smtp_user
    smtp_password = settings.smtp_password

    # Validation & Fallback Check
    if not smtp_user or not smtp_password:
        logger.info("=" * 60)
        logger.info("MOCK EMAIL DISPATCH (SMTP credentials missing/not set)")
        logger.info(f"To: {to_email}")
        logger.info(f"Subject: {subject}")
        logger.info(f"Content Preview: {html_content[:300]}...")
        if attachments:
            logger.info(f"Attachments: {[att['filename'] for att in attachments]}")
        logger.info("=" * 60)
        return True

    # Construct MIMEMultipart message
    message = MIMEMultipart()
    message["From"] = smtp_user
    message["To"] = to_email
    message["Subject"] = subject

    # Attach HTML body
    message.attach(MIMEText(html_content, "html"))

    # Attach any files
    if attachments:
        for attachment in attachments:
            try:
                part = MIMEApplication(attachment["content"])
                part.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename=attachment["filename"]
                )
                message.attach(part)
            except Exception as e:
                logger.error(f"Failed to attach file {attachment.get('filename')}: {e}")

    try:
        # Connect and send with a 10s timeout
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            start_tls=True if smtp_port == 587 else False,
            use_tls=True if smtp_port == 465 else False,
            timeout=10,
        )
        logger.info(f"Email successfully sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
