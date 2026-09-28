import os

def wrap_text(text, max_chars=75):
    """Wraps text lines to fit inside a page boundary."""
    wrapped_lines = []
    for line in text.split("\n"):
        if not line:
            wrapped_lines.append("")
            continue
        words = line.split()
        curr_line = []
        curr_len = 0
        for word in words:
            if curr_len + len(word) + 1 > max_chars:
                wrapped_lines.append(" ".join(curr_line))
                curr_line = [word]
                curr_len = len(word)
            else:
                curr_line.append(word)
                curr_len += len(word) + 1
        if curr_line:
            wrapped_lines.append(" ".join(curr_line))
    return wrapped_lines

def create_simple_pdf(filename, text_content: str):
    """Compiles string text into a valid minimal PDF file."""
    # Wrap text to 75 characters per line
    lines = wrap_text(text_content)
    
    # We will write the page contents as stream
    # Font Helvetica, size 10, line spacing 13, margin left 50, top 750
    # To handle multi-page, we can create multiple page objects if it goes over 50 lines.
    # For a high-fidelity tender document, we can distribute lines across multiple pages.
    lines_per_page = 52
    pages_data = []
    
    for i in range(0, len(lines), lines_per_page):
        page_lines = lines[i:i + lines_per_page]
        # Construct stream
        stream_content = "BT\n/F1 10 Tf\n13 TL\n50 780 Td\n"
        for line in page_lines:
            # Escape parenthesis
            escaped_line = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            stream_content += f"({escaped_line}) Tj T*\n"
        stream_content += "ET\n"
        pages_data.append(stream_content.encode('latin1'))

    pdf_data = b"%PDF-1.4\n"
    objects = []
    offsets = {}
    
    def add_object(obj_bytes):
        nonlocal pdf_data
        obj_id = len(objects) + 1
        offsets[obj_id] = len(pdf_data)
        pdf_data += f"{obj_id} 0 obj\n".encode('latin1') + obj_bytes + b"\nendobj\n"
        objects.append(obj_id)
        return obj_id

    # Pre-calculate IDs
    # 1: Catalog
    # 2: Parent Pages container
    # 3..N: Page objects
    # Font object
    font_id = len(pages_data) + 3
    # Content objects (streams)
    content_ids = []
    
    # We will add objects sequentially
    # Catalog
    catalog_id = 1
    pages_container_id = 2
    
    # Page IDs will be 3, 4, ... 3 + len(pages_data) - 1
    page_ids = [3 + idx for idx in range(len(pages_data))]
    
    # 1. Catalog
    add_object(f"<< /Type /Catalog /Pages {pages_container_id} 0 R >>".encode('latin1'))
    # 2. Pages parent
    kids_str = " ".join([f"{pid} 0 R" for pid in page_ids])
    add_object(f"<< /Type /Pages /Kids [{kids_str}] /Count {len(page_ids)} >>".encode('latin1'))
    
    # 3. Write each Page object
    for idx, page_id in enumerate(page_ids):
        content_stream_id = page_ids[-1] + 1 + idx + 1 # offset after pages and font
        add_object(f"<< /Type /Page /Parent {pages_container_id} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_stream_id} 0 R >>".encode('latin1'))
        content_ids.append(content_stream_id)
        
    # 4. Write Font object
    add_object(f"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>".encode('latin1'))
    
    # 5. Write each Content stream object
    for idx, stream_bytes in enumerate(pages_data):
        stream_len = len(stream_bytes)
        contents_obj = f"<< /Length {stream_len} >>\nstream\n".encode('latin1') + stream_bytes + b"\nendstream"
        add_object(contents_obj)
        
    # Cross-reference table
    xref_offset = len(pdf_data)
    pdf_data += b"xref\n"
    pdf_data += f"0 {len(objects) + 1}\n".encode('latin1')
    pdf_data += b"0000000000 65535 f \n"
    for obj_id in sorted(offsets.keys()):
        offset_str = f"{offsets[obj_id]:010d} 00000 n \n"
        pdf_data += offset_str.encode('latin1')
        
    pdf_data += b"trailer\n"
    pdf_data += f"<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n".encode('latin1')
    pdf_data += b"startxref\n"
    pdf_data += f"{xref_offset}\n".encode('latin1')
    pdf_data += b"%%EOF\n"
    
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(pdf_data)
    print(f"Created PDF {filename}")
