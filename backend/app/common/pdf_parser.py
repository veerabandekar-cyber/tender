import io
import logging
import httpx
from pypdf import PdfReader

logger = logging.getLogger(__name__)

async def extract_text_from_pdf_url(url: str) -> str:
    """
    Downloads a PDF from a URL and extracts its text contents.
    Handles edge cases such as connection timeouts, corrupted files,
    encrypted files, and empty/image-only PDFs gracefully.
    """
    if not url:
        return ""
        
    try:
        # Download PDF bytes
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            pdf_bytes = response.content
    except Exception as e:
        logger.error(f"Failed to download PDF from {url}: {e}")
        return f"Error: Failed to download PDF document. Details: {e}"

    try:
        # Load PDF using BytesIO
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_file)
        
        # Check if encrypted/password protected
        if reader.is_encrypted:
            logger.warning(f"PDF at {url} is encrypted/password-protected.")
            return "Error: PDF is encrypted and cannot be parsed."

        text_content = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text_content.append(page_text)

        extracted_text = "\n".join(text_content).strip()
        
        if not extracted_text:
            logger.warning(f"PDF at {url} contains no readable text. It might be scanned/image-only.")
            return "Error: PDF contains no readable text (scanned/image-only PDF)."
            
        return extracted_text

    except Exception as e:
        logger.error(f"Error parsing PDF from {url}: {e}")
        return f"Error: Corrupted or unreadable PDF document. Details: {e}"
