
import logging
import os
import io
import platform
import base64
import fitz  # PyMuPDF
from pypdf import PdfWriter, PdfReader
import pdfplumber
import pandas as pd
import pikepdf
from PIL import Image, ImageChops, ImageOps
from pyhanko.sign import signers, fields
try:
    from modules.security import validate_input_file
    from modules.tesseract_helper import is_tesseract_available, configure_tesseract
except ImportError:
    # Fallback for flat structure
    from security import validate_input_file
    try:
        from tesseract_helper import is_tesseract_available, configure_tesseract
    except ImportError:
        # If helper not available, define fallback
        def is_tesseract_available():
            try:
                import pytesseract
                pytesseract.get_tesseract_version()
                return True, None
            except:
                return False, "Tesseract not available"
        def configure_tesseract():
            pass


logger = logging.getLogger(__name__)

def handle_pdf_action(action, payload):
    """
    Main dispatcher for PDF actions.
    Routes to appropriate function based on action name.
    """
    logger.info(f"Handling PDF action: {action}")

    # Security Check
    files = payload.get("files", [])
    if not files:
        files = [payload.get("file")] if payload.get("file") else []
        files = [f for f in files if f]  # Remove None values

    for f in files:
        if isinstance(f, str):
            validate_input_file(f)

    # Route to appropriate handler
    if action == "merge":
        return merge_pdfs(payload)
    elif action == "split":
        return split_pdf(payload)
    elif action == "compress":
        return compress_pdf(payload)
    elif action == "protect":
        return protect_pdf(payload)
    elif action == "unlock":
        return unlock_pdf(payload)
    elif action == "watermark":
        return watermark_pdf(payload)
    elif action == "rotate":
        return rotate_pdf(payload)
    elif action == "remove_metadata":
        return remove_metadata(payload)
    elif action == "pdf_to_word":
        return pdf_to_word(payload)
    elif action == "pdf_to_images":
        return pdf_to_images(payload)
    elif action == "images_to_pdf":
        return images_to_pdf(payload)
    elif action == "extract_text":
        return extract_text(payload)
    elif action == "extract_images_from_pdf":
        return extract_images_from_pdf(payload)
    elif action == "extract_tables":
        return extract_tables(payload)
    elif action == "grayscale":
        return grayscale_pdf(payload)
    elif action == "repair":
        return repair_pdf(payload)
    elif action == "flatten":
        return flatten_pdf(payload)
    elif action == "page_numbers":
        return add_page_numbers(payload)
    elif action == "delete_pages":
        return delete_pages(payload)
    elif action == "diff":
        return diff_pdfs(payload)
    elif action == "booklet":
        return create_booklet(payload)
    elif action == "scrub":
        return scrub_pdf(payload)
    elif action == "redact":
        return redact_pdf(payload)
    elif action == "sign":
        return sign_pdf(payload)
    elif action == "optimize":
        return optimize_pdf(payload)
    elif action == "word_to_pdf":
        return word_to_pdf(payload)
    elif action == "powerpoint_to_pdf":
        return powerpoint_to_pdf(payload)
    elif action == "excel_to_pdf":
        return excel_to_pdf(payload)
    elif action == "html_to_pdf":
        return html_to_pdf(payload)
    elif action == "ocr_pdf":
        return ocr_pdf(payload)
    elif action == "pdf_to_pdfa":
        return pdf_to_pdfa(payload)
    elif action == "crop":
        return crop_pdf(payload)
    elif action == "organize" or action == "reorder_pages":
        return organize_pdf(payload)
    elif action == "preview":
        return preview_pdf(payload)
    else:
        raise ValueError(f"Unknown PDF action: {action}")

# ============================================================================
# PDF PREVIEW FUNCTION
# ============================================================================

def preview_pdf(payload):
    """
    Generate preview image for PDF transformations.
    Returns base64-encoded image of the first page with applied transformation.
    """
    file_path = payload.get("file") or (payload.get("files", [None])[0] if payload.get("files") else None)
    if not file_path:
        return {"image": None, "page_count": 0, "errors": ["No file provided"]}
    
    if not os.path.exists(file_path):
        return {"image": None, "page_count": 0, "errors": [f"File not found: {file_path}"]}
    
    action = payload.get("action", "preview")
    page_num = payload.get("page", 0)
    
    doc = None
    try:
        doc = fitz.open(file_path)
        page_count = len(doc)
        
        if page_count == 0:
            return {"image": None, "page_count": 0, "errors": ["PDF has no pages"]}
        
        # Ensure page_num is valid
        page_num = max(0, min(page_num, page_count - 1))
        page = doc[page_num]
        
        # Apply transformation based on action
        if action == "rotate":
            angle = float(payload.get("angle", 0))
            # Normalize angle to 0-360 range
            angle = angle % 360
            if angle < 0:
                angle += 360
            
            # Round to nearest 90 degrees for set_rotation (which only supports 0, 90, 180, 270)
            # This matches the actual rotate_pdf function behavior
            if angle < 45:
                rotation_deg = 0
            elif angle < 135:
                rotation_deg = 90
            elif angle < 225:
                rotation_deg = 180
            elif angle < 315:
                rotation_deg = 270
            else:
                rotation_deg = 0
            
            # Create a temporary page with rotation
            temp_doc = fitz.open()
            temp_page = temp_doc.new_page(width=page.rect.width, height=page.rect.height)
            # Copy content from original page
            temp_page.show_pdf_page(temp_page.rect, doc, page_num)
            # Apply rotation
            temp_page.set_rotation(rotation_deg)
            # Get pixmap with 2x zoom for preview
            pix = temp_page.get_pixmap(matrix=fitz.Matrix(2, 2))
            temp_doc.close()
        elif action == "crop":
            x = payload.get("x", 0)
            y = payload.get("y", 0)
            width = payload.get("width")
            height = payload.get("height")
            
            # Get original page dimensions
            rect = page.rect
            
            # If width/height not specified, use full page
            if width is None:
                width = rect.width - x
            if height is None:
                height = rect.height - y
            
            # Create crop rectangle
            crop_rect = fitz.Rect(x, y, x + width, y + height)
            # Clamp to page bounds
            crop_rect = crop_rect & rect
            
            # Get pixmap of cropped area
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=crop_rect)
        elif action == "watermark":
            # Create a temporary page with watermark
            temp_doc = fitz.open()
            temp_page = temp_doc.new_page(width=page.rect.width, height=page.rect.height)
            temp_page.show_pdf_page(temp_page.rect, doc, page_num)
            
            watermark_type = payload.get("watermark_type", "text")
            text = payload.get("text", "CONFIDENTIAL")
            opacity = payload.get("opacity", 0.5)
            watermark_file = payload.get("watermark_file")
            color = payload.get("color", "gray")
            font_size = payload.get("font_size", 72)
            position = payload.get("position", "center")
            
            rect = temp_page.rect
            
            if watermark_type == "text":
                # Parse color
                if color == "gray":
                    fill_color = (0.5, 0.5, 0.5)
                elif color == "red":
                    fill_color = (1, 0, 0)
                elif color == "blue":
                    fill_color = (0, 0, 1)
                else:
                    fill_color = (0.5, 0.5, 0.5)
                
                # Calculate position
                if position == "center":
                    point = fitz.Point(rect.width / 2, rect.height / 2)
                elif position == "top-left":
                    point = fitz.Point(50, 50)
                elif position == "top-right":
                    point = fitz.Point(rect.width - 50, 50)
                elif position == "bottom-left":
                    point = fitz.Point(50, rect.height - 50)
                elif position == "bottom-right":
                    point = fitz.Point(rect.width - 50, rect.height - 50)
                else:
                    point = fitz.Point(rect.width / 2, rect.height / 2)
                
                temp_page.insert_text(point, text, fontsize=font_size, color=fill_color,
                                     render_mode=3, opacity=opacity)
            elif watermark_type == "image" and watermark_file and os.path.exists(watermark_file):
                img_rect = fitz.Rect(0, 0, rect.width, rect.height)
                temp_page.insert_image(img_rect, filename=watermark_file, opacity=opacity)
            
            pix = temp_page.get_pixmap(matrix=fitz.Matrix(2, 2))
            temp_doc.close()
        elif action == "grayscale":
            # Get pixmap and convert to grayscale
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            gray_pix = fitz.Pixmap(pix, 0)  # 0 = grayscale
            pix = gray_pix
        else:
            # Default preview - just show the page
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        
        # Convert to base64
        img_data = pix.tobytes("png")
        base64_img = base64.b64encode(img_data).decode()
        
        # Cleanup
        pix = None
        if doc:
            doc.close()
        
        return {
            "image": f"data:image/png;base64,{base64_img}",
            "page_count": page_count,
            "errors": []
        }
    except Exception as e:
        logger.error(f"Error generating preview: {e}", exc_info=True)
        if doc:
            doc.close()
        return {
            "image": None,
            "page_count": 0,
            "errors": [str(e)]
        }

# ============================================================================
# PDF MANIPULATION FUNCTIONS
# ============================================================================

def merge_pdfs(payload):
    """Merge multiple PDF files into one."""
    files = payload.get("files", [])
    if not files:
        return {"processed_files": [], "errors": ["No files provided"]}

    output_filename = payload.get("output_name", "merged.pdf")
    base_dir = os.path.dirname(files[0]) if files[0] else os.getcwd()
    output_path = os.path.join(base_dir, output_filename)

    processed_files = []
    errors = []

    try:
        merger = PdfWriter()
        for pdf_path in files:
            if not os.path.exists(pdf_path):
                errors.append({"file": pdf_path, "error": f"File not found: {pdf_path}"})
                continue
            try:
                merger.append(pdf_path)
            except Exception as e:
                errors.append({"file": pdf_path, "error": f"Failed to add PDF: {str(e)}"})
                continue

        if errors and not merger.pages:
            return {"processed_files": [], "errors": errors}

        merger.write(output_path)
        merger.close()

        if os.path.exists(output_path):
            processed_files.append(output_path)
        else:
            errors.append({"file": "unknown", "error": "Failed to create merged PDF"})
    except Exception as e:
        logger.error(f"Error merging PDFs: {e}", exc_info=True)
        errors.append({"file": files[0] if files else "unknown", "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def split_pdf(payload):
    """Split PDF into individual pages or extract specific pages."""
    file_path = payload.get("file") or (payload.get("files", [None])[0])
    if not file_path:
        return {"processed_files": [], "errors": ["No file provided"]}

    if not os.path.exists(file_path):
        return {"processed_files": [], "errors": [{"file": file_path, "error": f"File not found: {file_path}"}]}

    mode = payload.get("mode", "all")  # all, range, pages
    pages = payload.get("pages", "")

    processed_files = []
    errors = []
    doc = None

    try:
        base, ext = os.path.splitext(file_path)
        doc = fitz.open(file_path)
        total_pages = len(doc)

        if total_pages == 0:
            errors.append({"file": file_path, "error": "PDF has no pages"})
            doc.close()
            return {"processed_files": [], "errors": errors}

        if mode == "all" or not pages:
            # Split into individual pages
            for page_num in range(total_pages):
                new_doc = fitz.open()
                new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
                output_path = f"{base}_page_{page_num + 1}{ext}"
                new_doc.save(output_path)
                new_doc.close()
                processed_files.append(output_path)
        elif mode == "range" and pages:
            # Extract page range (e.g., "1-5" or "1,3,5")
            try:
                if "-" in pages:
                    start, end = map(int, pages.split("-"))
                    for page_num in range(start - 1, min(end, total_pages)):
                        new_doc = fitz.open()
                        new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
                        output_path = f"{base}_page_{page_num + 1}{ext}"
                        new_doc.save(output_path)
                        new_doc.close()
                        processed_files.append(output_path)
                else:
                    # Comma-separated pages
                    page_list = [int(p.strip()) - 1 for p in pages.split(",")]
                    for page_num in page_list:
                        if 0 <= page_num < total_pages:
                            new_doc = fitz.open()
                            new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
                            output_path = f"{base}_page_{page_num + 1}{ext}"
                            new_doc.save(output_path)
                            new_doc.close()
                            processed_files.append(output_path)
            except ValueError:
                errors.append({"file": file_path, "error": f"Invalid page range: {pages}"})

        if doc:
            doc.close()
        return {"processed_files": processed_files, "errors": errors}
    except Exception as e:
        logger.error(f"Error splitting PDF {file_path}: {e}", exc_info=True)
        if doc:
            doc.close()
        return {"processed_files": [], "errors": [{"file": file_path, "error": str(e)}]}

def compress_pdf(payload):
    """Compress PDF file to reduce size."""
    files = payload.get("files", [])
    level = payload.get("level", 3)  # Compression level (not used by pikepdf, but kept for API compatibility)

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_compressed{ext}"

            # Use pikepdf for compression
            with pikepdf.open(file_path) as pdf:
                pdf.save(output_path, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)

            if os.path.exists(output_path):
                processed_files.append(output_path)
            else:
                errors.append({"file": file_path, "error": "Compression failed: output file not created"})
        except Exception as e:
            logger.error(f"Error compressing PDF {file_path}: {e}", exc_info=True)
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def protect_pdf(payload):
    """Add password protection to PDF."""
    files = payload.get("files", [])
    password = payload.get("password")

    if not password:
        return {"processed_files": [], "errors": ["Use a password to protect the file"]}

    if len(password) < 3:
        return {"processed_files": [], "errors": ["Password must be at least 3 characters long"]}

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_protected{ext}"

            reader = PdfReader(file_path)
            writer = PdfWriter()

            for page in reader.pages:
                writer.add_page(page)

            writer.encrypt(password)
            with open(output_path, 'wb') as f:
                writer.write(f)

            if os.path.exists(output_path):
                processed_files.append(output_path)
            else:
                errors.append({"file": file_path, "error": "Failed to create protected PDF"})
        except Exception as e:
            logger.error(f"Error protecting PDF {file_path}: {e}", exc_info=True)
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def unlock_pdf(payload):
    """Remove password protection from PDF."""
    files = payload.get("files", [])
    password = payload.get("password", "")

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_unlocked{ext}"

            reader = PdfReader(file_path)
            if reader.is_encrypted:
                if not reader.decrypt(password):
                    errors.append({"file": file_path, "error": "Incorrect password"})
                    continue

            writer = PdfWriter()
            for page in reader.pages:
                writer.add_page(page)

            with open(output_path, 'wb') as f:
                writer.write(f)

            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def watermark_pdf(payload):
    """Add watermark to PDF pages."""
    files = payload.get("files", [])
    watermark_type = payload.get("watermark_type", "text")
    text = payload.get("text", "CONFIDENTIAL")
    opacity = payload.get("opacity", 0.5)
    watermark_file = payload.get("watermark_file")
    color = payload.get("color", "gray")
    font_size = payload.get("font_size", 72)
    position = payload.get("position", "center")

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        if watermark_type == "image" and watermark_file and not os.path.exists(watermark_file):
            errors.append({"file": file_path, "error": f"Watermark image not found: {watermark_file}"})
            continue

        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_watermarked{ext}"

            doc = fitz.open(file_path)

            for page in doc:
                rect = page.rect

                if watermark_type == "text":
                    # Text watermark
                    try:
                        # Parse color
                        if color == "gray":
                            fill_color = (0.5, 0.5, 0.5)
                        elif color == "red":
                            fill_color = (1, 0, 0)
                        elif color == "blue":
                            fill_color = (0, 0, 1)
                        else:
                            fill_color = (0.5, 0.5, 0.5)

                        # Calculate position
                        if position == "center":
                            point = fitz.Point(rect.width / 2, rect.height / 2)
                        elif position == "top-left":
                            point = fitz.Point(50, 50)
                        elif position == "top-right":
                            point = fitz.Point(rect.width - 50, 50)
                        elif position == "bottom-left":
                            point = fitz.Point(50, rect.height - 50)
                        elif position == "bottom-right":
                            point = fitz.Point(rect.width - 50, rect.height - 50)
                        else:
                            point = fitz.Point(rect.width / 2, rect.height / 2)

                        # Insert text
                        page.insert_text(point, text, fontsize=font_size, color=fill_color,
                                       render_mode=3, opacity=opacity)  # render_mode=3 is invisible but searchable
                    except Exception as e:
                        errors.append({"file": file_path, "error": f"bad rotate value" if "rotate" in str(e).lower() else str(e)})
                        doc.close()
                        continue
                elif watermark_type == "image" and watermark_file:
                    # Image watermark
                    try:
                        img_rect = fitz.Rect(0, 0, rect.width, rect.height)
                        page.insert_image(img_rect, filename=watermark_file, opacity=opacity)
                    except Exception as e:
                        errors.append({"file": file_path, "error": str(e)})
                        doc.close()
                        continue

            doc.save(output_path)
            doc.close()
            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def rotate_pdf(payload):
    """Rotate PDF pages."""
    files = payload.get("files", [])
    angle = payload.get("angle", 90)  # 90, 180, 270
    pages = payload.get("pages", "")  # Optional: specific pages

    # Convert angle to int and normalize to valid values (0, 90, 180, 270)
    try:
        angle = int(float(angle))  # Handle both string and float inputs
        # Normalize to 0-360 range
        angle = angle % 360
        if angle < 0:
            angle += 360
        # Round to nearest 90 degrees (PyMuPDF only supports 0, 90, 180, 270)
        if angle < 45:
            angle = 0
        elif angle < 135:
            angle = 90
        elif angle < 225:
            angle = 180
        elif angle < 315:
            angle = 270
        else:
            angle = 0
    except (ValueError, TypeError):
        angle = 90  # Default to 90 degrees if invalid

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_rotated{ext}"

            doc = fitz.open(file_path)

            # Parse pages if specified
            page_list = None
            if pages:
                try:
                    if "-" in pages:
                        start, end = map(int, pages.split("-"))
                        page_list = list(range(start - 1, min(end, len(doc))))
                    else:
                        page_list = [int(p.strip()) - 1 for p in pages.split(",")]
                except:
                    pass

            for page_num in range(len(doc)):
                if page_list is None or page_num in page_list:
                    doc[page_num].set_rotation(int(angle))  # Ensure it's an int

            doc.save(output_path)
            doc.close()
            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def remove_metadata(payload):
    """Remove metadata from PDF."""
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_sanitized{ext}"

            with pikepdf.open(file_path) as pdf:
                # Remove metadata
                if '/Metadata' in pdf.Root:
                    del pdf.Root.Metadata
                pdf.docinfo.clear()
                pdf.save(output_path)

            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def pdf_to_word(payload):
    """Convert PDF to Word document."""
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        try:
            base, _ = os.path.splitext(file_path)
            output_path = f"{base}.docx"

            from pdf2docx import Converter
            cv = Converter(file_path)
            cv.convert(output_path)
            cv.close()

            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def pdf_to_images(payload):
    """Convert PDF pages to images."""
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        doc = None
        try:
            base, _ = os.path.splitext(file_path)
            doc = fitz.open(file_path)

            if len(doc) == 0:
                errors.append({"file": file_path, "error": "PDF has no pages"})
                doc.close()
                continue

            for page_num in range(len(doc)):
                page = doc[page_num]
                pix = page.get_pixmap(dpi=300)
                output_path = f"{base}_page_{page_num + 1}.png"
                pix.save(output_path)
                pix = None  # Free memory
                if os.path.exists(output_path):
                    processed_files.append(output_path)

            doc.close()
        except Exception as e:
            logger.error(f"Error converting PDF to images {file_path}: {e}", exc_info=True)
            if doc:
                doc.close()
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def images_to_pdf(payload):
    """Combine images into a PDF."""
    files = payload.get("files", [])
    output_name = payload.get("output_name", "combined.pdf")

    processed_files = []
    errors = []

    if not files:
        return {"processed_files": [], "errors": ["No images provided"]}

    try:
        base_dir = os.path.dirname(files[0]) if files[0] and os.path.dirname(files[0]) else os.getcwd()
        output_path = os.path.join(base_dir, output_name)

        images = []
        for file_path in files:
            if not os.path.exists(file_path):
                errors.append({"file": file_path, "error": f"File not found: {file_path}"})
                continue

            try:
                img = Image.open(file_path)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                images.append(img)
            except Exception as e:
                errors.append({"file": file_path, "error": str(e)})

        if images:
            images[0].save(output_path, save_all=True, append_images=images[1:])
            processed_files.append(output_path)
    except Exception as e:
        errors.append({"file": files[0] if files else "unknown", "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def extract_text(payload):
    """Extract text from PDF."""
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        doc = None
        try:
            base, _ = os.path.splitext(file_path)
            output_path = f"{base}_extracted.txt"

            doc = fitz.open(file_path)
            text_content = []

            for page in doc:
                text_content.append(page.get_text())

            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n\n'.join(text_content))

            if doc:
                doc.close()
            if os.path.exists(output_path):
                processed_files.append(output_path)
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {e}", exc_info=True)
            if doc:
                doc.close()
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def extract_images_from_pdf(payload):
    """Extract all images from PDF."""
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        doc = None
        try:
            base, _ = os.path.splitext(file_path)
            images_dir = f"{base}_images"
            os.makedirs(images_dir, exist_ok=True)

            doc = fitz.open(file_path)
            img_count = 0

            for page_num in range(len(doc)):
                page = doc[page_num]
                image_list = page.get_images()

                for img_index, img in enumerate(image_list):
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]

                    img_count += 1
                    output_path = os.path.join(images_dir, f"page{page_num + 1}_img{img_index + 1}.{image_ext}")
                    with open(output_path, "wb") as img_file:
                        img_file.write(image_bytes)
                    processed_files.append(output_path)

            if doc:
                doc.close()
        except Exception as e:
            logger.error(f"Error extracting images from {file_path}: {e}", exc_info=True)
            if doc:
                doc.close()
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def extract_tables(payload):
    """Extract tables from PDF to CSV."""
    files = payload.get("files", [])
    output_format = payload.get("output_format", "csv")

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, _ = os.path.splitext(file_path)
            doc = fitz.open(file_path)

            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()

                # Try to extract tables using pdfplumber
                try:
                    import pdfplumber
                    with pdfplumber.open(file_path) as pdf:
                        page_obj = pdf.pages[page_num]
                        tables = page_obj.extract_tables()

                        for table_num, table in enumerate(tables):
                            if table:
                                if output_format == "csv":
                                    output_path = f"{base}_p{page_num + 1}_t{table_num + 1}.csv"
                                    df = pd.DataFrame(table[1:], columns=table[0] if table else None)
                                    df.to_csv(output_path, index=False)
                                    processed_files.append(output_path)
                                elif output_format == "excel":
                                    output_path = f"{base}_p{page_num + 1}_t{table_num + 1}.xlsx"
                                    df = pd.DataFrame(table[1:], columns=table[0] if table else None)
                                    df.to_excel(output_path, index=False)
                                    processed_files.append(output_path)
                except Exception as e:
                    logger.warning(f"Table extraction failed for page {page_num}: {e}")

            doc.close()
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def grayscale_pdf(payload):
    """Convert PDF to grayscale."""
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_grayscale{ext}"

            doc = fitz.open(file_path)

            for page in doc:
                pix = page.get_pixmap()
                # Convert to grayscale
                gray_pix = fitz.Pixmap(pix, 0)  # 0 = grayscale
                page.insert_image(page.rect, pixmap=gray_pix)
                gray_pix = None
                pix = None

            doc.save(output_path)
            doc.close()
            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def repair_pdf(payload):
    """Repair corrupted PDF."""
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_repaired{ext}"

            # Try to open and re-save (this repairs many issues)
            doc = fitz.open(file_path)
            doc.save(output_path, garbage=4, deflate=True)
            doc.close()

            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def flatten_pdf(payload):
    """Flatten PDF (make form fields non-editable)."""
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_flattened{ext}"

            doc = fitz.open(file_path)

            for page in doc:
                page.flatten_annotations()

            doc.save(output_path)
            doc.close()
            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def add_page_numbers(payload):
    """Add page numbers to PDF."""
    files = payload.get("files", [])
    position = payload.get("position", "bottom-right")  # bottom-right, bottom-left, top-right, top-left

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_numbered{ext}"

            doc = fitz.open(file_path)

            for page_num, page in enumerate(doc):
                rect = page.rect

                # Calculate position
                if position == "bottom-right":
                    point = fitz.Point(rect.width - 50, rect.height - 20)
                elif position == "bottom-left":
                    point = fitz.Point(50, rect.height - 20)
                elif position == "top-right":
                    point = fitz.Point(rect.width - 50, 30)
                elif position == "top-left":
                    point = fitz.Point(50, 30)
                else:
                    point = fitz.Point(rect.width - 50, rect.height - 20)

                page.insert_text(point, str(page_num + 1), fontsize=12, color=(0, 0, 0))

            doc.save(output_path)
            doc.close()
            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def delete_pages(payload):
    """Delete specific pages from PDF."""
    files = payload.get("files", [])
    pages = payload.get("pages", "")  # e.g., "1,3,5" or "2-5"

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_deleted{ext}"

            doc = fitz.open(file_path)

            # Parse pages to delete (0-indexed)
            pages_to_delete = set()
            if pages:
                if "-" in pages:
                    start, end = map(int, pages.split("-"))
                    pages_to_delete = set(range(start - 1, min(end, len(doc))))
                else:
                    pages_to_delete = {int(p.strip()) - 1 for p in pages.split(",")}

            # Create new document without deleted pages
            new_doc = fitz.open()
            for page_num in range(len(doc)):
                if page_num not in pages_to_delete:
                    new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)

            new_doc.save(output_path)
            new_doc.close()
            doc.close()
            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def diff_pdfs(payload):
    """Compare two PDFs visually."""
    files = payload.get("files", [])

    if len(files) < 2:
        return {"processed_files": [], "errors": ["Need at least 2 PDFs to compare"]}

    processed_files = []
    errors = []

    try:
        doc1 = fitz.open(files[0])
        doc2 = fitz.open(files[1])

        base, ext = os.path.splitext(files[0])
        output_path = f"{base}_diff{ext}"

        # Create comparison PDF (side by side)
        new_doc = fitz.open()
        max_pages = max(len(doc1), len(doc2))

        for page_num in range(max_pages):
            # Create wider page for side-by-side
            page = new_doc.new_page(width=doc1[0].rect.width * 2, height=doc1[0].rect.height)

            if page_num < len(doc1):
                page.show_pdf_page(fitz.Rect(0, 0, doc1[0].rect.width, doc1[0].rect.height), doc1, page_num)
            if page_num < len(doc2):
                page.show_pdf_page(fitz.Rect(doc1[0].rect.width, 0, doc1[0].rect.width * 2, doc1[0].rect.height), doc2, page_num)

        new_doc.save(output_path)
        new_doc.close()
        doc1.close()
        doc2.close()

        processed_files.append(output_path)
    except Exception as e:
        errors.append({"file": files[0] if files else "unknown", "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def create_booklet(payload):
    """Create booklet layout from PDF."""
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_booklet{ext}"

            doc = fitz.open(file_path)
            total_pages = len(doc)

            # Create booklet (2 pages per sheet, reordered)
            new_doc = fitz.open()

            # Calculate booklet page order
            booklet_pages = []
            for i in range(0, total_pages, 4):
                if i + 3 < total_pages:
                    booklet_pages.extend([i + 3, i, i + 1, i + 2])
                else:
                    booklet_pages.extend(range(i, total_pages))

            for page_idx in booklet_pages:
                new_doc.insert_pdf(doc, from_page=page_idx, to_page=page_idx)

            new_doc.save(output_path)
            new_doc.close()
            doc.close()
            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def scrub_pdf(payload):
    """Scrub PDF (remove metadata, annotations, etc.)."""
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_scrubbed{ext}"

            with pikepdf.open(file_path) as pdf:
                # Remove metadata
                if '/Metadata' in pdf.Root:
                    del pdf.Root.Metadata
                pdf.docinfo.clear()

                # Remove annotations
                for page in pdf.pages:
                    if '/Annots' in page:
                        del page['/Annots']

                pdf.save(output_path)

            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def redact_pdf(payload):
    """Redact (permanently remove) text from PDF."""
    files = payload.get("files", [])
    text = payload.get("text", "")

    if not text:
        return {"processed_files": [], "errors": ["No text provided for redaction"]}

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_redacted{ext}"

            doc = fitz.open(file_path)

            for page in doc:
                # Find text instances
                text_instances = page.search_for(text)

                # Redact (black out) each instance
                for inst in text_instances:
                    page.add_redact_annot(inst, fill=(0, 0, 0))

                page.apply_redactions()

            doc.save(output_path)
            doc.close()
            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def sign_pdf(payload):
    """Digitally sign PDF with certificate.

    Note: Digital signing requires a valid X.509 certificate and private key.
    This is a placeholder implementation. For production use, implement proper
    certificate validation, timestamping, and signature appearance.
    """
    files = payload.get("files", [])
    cert_file = payload.get("cert_file")
    password = payload.get("password", "")

    processed_files = []
    errors = []

    if not cert_file:
        return {"processed_files": [], "errors": ["Certificate file required for digital signing"]}

    if not os.path.exists(cert_file):
        return {"processed_files": [], "errors": [{"file": cert_file, "error": "Certificate file not found"}]}

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_signed{ext}"

            # Digital signing requires:
            # 1. Valid X.509 certificate (PEM or PKCS#12 format)
            # 2. Private key (may be password-protected)
            # 3. Proper signature field configuration
            # 4. Optional: timestamping server

            # This is a placeholder - full implementation would use pyhanko or similar
            # For now, return informative error
            errors.append({
                "file": file_path,
                "error": "Digital signing is not yet fully implemented. Requires certificate setup and proper key management."
            })
        except Exception as e:
            logger.error(f"Error signing PDF {file_path}: {e}", exc_info=True)
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def optimize_pdf(payload):
    """Optimize PDF for web (linearize)."""
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_web_optimized{ext}"

            doc = fitz.open(file_path)
            # Linearize for web viewing
            doc.save(output_path, linear=True, garbage=4, deflate=True)
            doc.close()

            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def word_to_pdf(payload):
    """Convert Word documents to PDF."""
    files = payload.get("files", [])
    libreoffice_path = payload.get("libreoffice_path")

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, _ = os.path.splitext(file_path)
            output_path = f"{base}.pdf"

            # Try LibreOffice first (best quality)
            libreoffice_available = False
            if libreoffice_path or os.name == 'nt':
                if os.name == 'nt':
                    possible_paths = [
                        libreoffice_path,
                        r"C:\Program Files\LibreOffice\program\soffice.exe",
                        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
                    ]
                else:
                    possible_paths = [libreoffice_path, "/usr/bin/soffice", "/usr/local/bin/soffice", "soffice"]

                for path in possible_paths:
                    if path and (os.path.exists(path) or path == "soffice"):
                        try:
                            import subprocess
                            cmd = [path, "--headless", "--convert-to", "pdf",
                                   "--outdir", os.path.dirname(output_path) or ".", file_path]
                            result = subprocess.run(cmd, capture_output=True, timeout=120, text=True)
                            if result.returncode == 0 and os.path.exists(output_path):
                                libreoffice_available = True
                                break
                        except:
                            continue

            # Fallback: Python-only conversion
            if not libreoffice_available:
                try:
                    from docx import Document
                    from reportlab.lib.pagesizes import letter
                    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
                    from reportlab.lib.styles import getSampleStyleSheet

                    doc = Document(file_path)
                    pdf_doc = SimpleDocTemplate(output_path, pagesize=letter)
                    story = []
                    styles = getSampleStyleSheet()

                    for para in doc.paragraphs:
                        if para.text.strip():
                            story.append(Paragraph(para.text, styles['Normal']))
                            story.append(Spacer(1, 12))

                    pdf_doc.build(story)
                except ImportError:
                    errors.append({"file": file_path, "error": "python-docx and reportlab required for Word conversion"})
                    continue
                except Exception as e:
                    errors.append({"file": file_path, "error": f"Conversion failed: {str(e)}"})
                    continue

            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def powerpoint_to_pdf(payload):
    """Convert PowerPoint presentations to PDF."""
    files = payload.get("files", [])
    libreoffice_path = payload.get("libreoffice_path")

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, _ = os.path.splitext(file_path)
            output_path = f"{base}.pdf"

            # Try LibreOffice first
            libreoffice_available = False
            if libreoffice_path or os.name == 'nt':
                if os.name == 'nt':
                    possible_paths = [
                        libreoffice_path,
                        r"C:\Program Files\LibreOffice\program\soffice.exe",
                        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
                    ]
                else:
                    possible_paths = [libreoffice_path, "/usr/bin/soffice", "/usr/local/bin/soffice", "soffice"]

                for path in possible_paths:
                    if path and (os.path.exists(path) or path == "soffice"):
                        try:
                            import subprocess
                            cmd = [path, "--headless", "--convert-to", "pdf",
                                   "--outdir", os.path.dirname(output_path) or ".", file_path]
                            result = subprocess.run(cmd, capture_output=True, timeout=120, text=True)
                            if result.returncode == 0 and os.path.exists(output_path):
                                libreoffice_available = True
                                break
                        except:
                            continue

            # Fallback: Convert slides to images then to PDF
            if not libreoffice_available:
                try:
                    from pptx import Presentation
                    from reportlab.lib.pagesizes import letter
                    from reportlab.platypus import SimpleDocTemplate, Image as RLImage, Spacer
                    from reportlab.lib.units import inch

                    prs = Presentation(file_path)
                    pdf_doc = SimpleDocTemplate(output_path, pagesize=letter)
                    story = []

                    for slide in prs.slides:
                        # Extract text from slide
                        for shape in slide.shapes:
                            if hasattr(shape, "text") and shape.text:
                                from reportlab.platypus import Paragraph
                                from reportlab.lib.styles import getSampleStyleSheet
                                styles = getSampleStyleSheet()
                                story.append(Paragraph(shape.text, styles['Normal']))
                        story.append(Spacer(1, 0.5*inch))

                    pdf_doc.build(story)
                except ImportError:
                    errors.append({"file": file_path, "error": "python-pptx and reportlab required for PowerPoint conversion"})
                    continue
                except Exception as e:
                    errors.append({"file": file_path, "error": f"Conversion failed: {str(e)}"})
                    continue

            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def excel_to_pdf(payload):
    """Convert Excel spreadsheets to PDF."""
    files = payload.get("files", [])
    libreoffice_path = payload.get("libreoffice_path")

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, _ = os.path.splitext(file_path)
            output_path = f"{base}.pdf"

            # Try LibreOffice first
            libreoffice_available = False
            if libreoffice_path or os.name == 'nt':
                if os.name == 'nt':
                    possible_paths = [
                        libreoffice_path,
                        r"C:\Program Files\LibreOffice\program\soffice.exe",
                        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
                    ]
                else:
                    possible_paths = [libreoffice_path, "/usr/bin/soffice", "/usr/local/bin/soffice", "soffice"]

                for path in possible_paths:
                    if path and (os.path.exists(path) or path == "soffice"):
                        try:
                            import subprocess
                            cmd = [path, "--headless", "--convert-to", "pdf",
                                   "--outdir", os.path.dirname(output_path) or ".", file_path]
                            result = subprocess.run(cmd, capture_output=True, timeout=120, text=True)
                            if result.returncode == 0 and os.path.exists(output_path):
                                libreoffice_available = True
                                break
                        except:
                            continue

            # Fallback: Python-only conversion
            if not libreoffice_available:
                try:
                    import openpyxl
                    from reportlab.lib.pagesizes import letter, landscape
                    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
                    from reportlab.lib.styles import getSampleStyleSheet
                    from reportlab.lib import colors

                    wb = openpyxl.load_workbook(file_path)
                    pdf_doc = SimpleDocTemplate(output_path, pagesize=landscape(letter))
                    story = []
                    styles = getSampleStyleSheet()

                    for sheet_name in wb.sheetnames:
                        ws = wb[sheet_name]
                        data = []
                        for row in ws.iter_rows(values_only=True):
                            data.append([str(cell) if cell is not None else "" for cell in row])

                        if data:
                            table = Table(data)
                            table.setStyle(TableStyle([
                                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                                ('FONTSIZE', (0, 0), (-1, 0), 10),
                                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                                ('GRID', (0, 0), (-1, -1), 1, colors.black)
                            ]))
                            story.append(Paragraph(sheet_name, styles['Heading1']))
                            story.append(table)

                    pdf_doc.build(story)
                except ImportError:
                    errors.append({"file": file_path, "error": "openpyxl and reportlab required for Excel conversion"})
                    continue
                except Exception as e:
                    errors.append({"file": file_path, "error": f"Conversion failed: {str(e)}"})
                    continue

            processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def html_to_pdf(payload):
    """Convert HTML files to PDF."""
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, _ = os.path.splitext(file_path)
            output_path = f"{base}.pdf"

            # Try WeasyPrint first (pure Python, good CSS support)
            try:
                from weasyprint import HTML
                HTML(filename=file_path).write_pdf(output_path)
                processed_files.append(output_path)
                continue
            except ImportError:
                logger.warning("WeasyPrint not available, trying alternative")
            except Exception as e:
                logger.warning(f"WeasyPrint conversion failed: {e}, trying fallback")

            # Fallback: Basic HTML parsing and PDF generation
            try:
                from html.parser import HTMLParser
                from reportlab.lib.pagesizes import letter
                from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
                from reportlab.lib.styles import getSampleStyleSheet
                from reportlab.lib.units import inch
                import re

                with open(file_path, 'r', encoding='utf-8') as f:
                    html_content = f.read()

                # Remove script and style tags
                html_content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
                html_content = re.sub(r'<style[^>]*>.*?</style>', '', html_content, flags=re.DOTALL | re.IGNORECASE)

                # Extract text (very basic)
                text_content = re.sub(r'<[^>]+>', '\n', html_content)
                text_content = ' '.join(text_content.split())

                pdf_doc = SimpleDocTemplate(output_path, pagesize=letter)
                story = []
                styles = getSampleStyleSheet()

                # Split into paragraphs
                paragraphs = [p.strip() for p in text_content.split('\n') if p.strip()]
                for para_text in paragraphs[:200]:  # Limit for performance
                    if para_text:
                        story.append(Paragraph(para_text, styles['Normal']))
                        story.append(Spacer(1, 0.1*inch))

                pdf_doc.build(story)
                processed_files.append(output_path)

            except Exception as e:
                errors.append({"file": file_path, "error": f"HTML conversion failed: {str(e)}. Install WeasyPrint for better results: pip install weasyprint"})

        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def ocr_pdf(payload):
    """Convert scanned PDF to searchable PDF using OCR."""
    files = payload.get("files", [])
    language = payload.get("language", "eng")  # Default English

    processed_files = []
    errors = []

    # Configure Tesseract (bundled or system)
    configure_tesseract()

    # Check Tesseract availability first
    tesseract_available, tesseract_error = is_tesseract_available()
    if not tesseract_available:
        for file_path in files:
            errors.append({"file": file_path, "error": tesseract_error})
        return {"processed_files": processed_files, "errors": errors}

    for file_path in files:
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_ocr{ext}"

            # Try pytesseract (Tesseract OCR)
            try:
                import pytesseract
                from pdf2image import convert_from_path

                # Convert PDF pages to images
                try:
                    images = convert_from_path(file_path, dpi=300)
                except Exception as e:
                    # Fallback: use PyMuPDF to render pages
                    images = []
                    doc = fitz.open(file_path)
                    for page in doc:
                        pix = page.get_pixmap(dpi=300)
                        img_data = pix.tobytes("png")
                        images.append(Image.open(io.BytesIO(img_data)))
                    doc.close()

                # Create new PDF with OCR text
                ocr_doc = fitz.open()
                total_pages = len(images)
                logger.info(f"Processing {total_pages} pages for OCR")

                for page_idx, img in enumerate(images):
                    logger.info(f"Processing page {page_idx + 1}/{total_pages}")
                    
                    # Perform OCR with detailed data (bounding boxes)
                    ocr_data = None
                    ocr_text = ""
                    try:
                        # Get OCR data with bounding boxes for accurate text positioning
                        ocr_data = pytesseract.image_to_data(img, lang=language, output_type=pytesseract.Output.DICT)
                        ocr_text = pytesseract.image_to_string(img, lang=language)
                        logger.info(f"OCR extracted {len(ocr_text)} characters from page {page_idx + 1}")
                    except Exception as ocr_err:
                        logger.error(f"OCR failed for page {page_idx + 1}: {ocr_err}")
                        # Fallback: try simple OCR without detailed data
                        try:
                            ocr_text = pytesseract.image_to_string(img, lang=language)
                            logger.info(f"Fallback OCR extracted {len(ocr_text)} characters")
                        except Exception as fallback_err:
                            logger.error(f"Fallback OCR also failed: {fallback_err}")
                            ocr_text = ""

                    # Create new page
                    page = ocr_doc.new_page(width=img.width, height=img.height)

                    # Insert original image
                    img_bytes = io.BytesIO()
                    img.save(img_bytes, format='PNG')
                    img_bytes.seek(0)
                    page.insert_image(page.rect, stream=img_bytes.getvalue())

                    # Add invisible text layer (for searchability)
                    text_added = False
                    if ocr_text.strip():
                        if ocr_data and len(ocr_data.get('text', [])) > 0:
                            # Use OCR bounding boxes for accurate text positioning
                            n_boxes = len(ocr_data['text'])
                            logger.info(f"Found {n_boxes} text boxes from OCR")
                            for i in range(n_boxes):
                                text = ocr_data['text'][i].strip()
                                conf = int(ocr_data['conf'][i]) if ocr_data['conf'][i] else 0
                                if text and conf > 0:  # Confidence > 0
                                    x = ocr_data['left'][i]
                                    y = ocr_data['top'][i]
                                    w = ocr_data['width'][i]
                                    h = ocr_data['height'][i]
                                    
                                    # Convert to PDF coordinates (OCR uses top-left, PyMuPDF uses bottom-left)
                                    pdf_y = img.height - y - h
                                    
                                    # Insert invisible text (render_mode=3) for searchability
                                    try:
                                        page.insert_text(
                                            fitz.Point(x, pdf_y + h),
                                            text,
                                            fontsize=max(8, min(h * 0.8, 12)),
                                            color=(1, 1, 1),  # White (invisible on white background)
                                            render_mode=3  # Invisible but searchable
                                        )
                                        text_added = True
                                    except Exception as text_err:
                                        logger.warning(f"Failed to insert text at position ({x}, {pdf_y}): {text_err}")
                                        # Fallback: simple text insertion
                                        try:
                                            page.insert_text(
                                                fitz.Point(x, pdf_y + h),
                                                text[:50],  # Limit length
                                                fontsize=10,
                                                color=(1, 1, 1),
                                                render_mode=3
                                            )
                                            text_added = True
                                        except:
                                            pass
                        
                        # Fallback: add text as lines if bounding boxes failed
                        if not text_added:
                            logger.info("Using fallback text positioning (lines)")
                            lines = [l.strip() for l in ocr_text.split('\n') if l.strip()]
                            if lines:
                                line_height = img.height / max(len(lines), 1)
                                line_idx = 0
                                for line in lines[:200]:  # Limit lines for performance
                                    y_pos = line_idx * line_height + 20
                                    text_point = fitz.Point(10, min(y_pos, page.rect.height - 10))
                                    # Use render_mode=3 (invisible) to make text searchable but not visible
                                    try:
                                        page.insert_text(
                                            text_point,
                                            line[:100],  # Limit line length
                                            fontsize=12,
                                            color=(1, 1, 1),
                                            render_mode=3
                                        )
                                        text_added = True
                                    except Exception as line_err:
                                        logger.warning(f"Failed to insert line {line_idx}: {line_err}")
                                    line_idx += 1
                    
                    if text_added:
                        logger.info(f"Successfully added searchable text to page {page_idx + 1}")
                    else:
                        logger.warning(f"No text was added to page {page_idx + 1}")

                ocr_doc.save(output_path)
                ocr_doc.close()
                
                # Verify output file was created
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    logger.info(f"OCR PDF saved successfully: {output_path} ({os.path.getsize(output_path)} bytes)")
                    processed_files.append(output_path)
                else:
                    logger.error(f"OCR PDF file was not created or is empty: {output_path}")
                    errors.append({"file": file_path, "error": "OCR processing completed but output file was not created"})

            except ImportError:
                errors.append({"file": file_path, "error": "Python packages required. Install with: pip install pytesseract pdf2image"})
            except Exception as e:
                error_str = str(e)
                # Check if it's a Tesseract-specific error
                if "tesseract" in error_str.lower():
                    tesseract_available, tesseract_error = is_tesseract_available()
                    if not tesseract_available:
                        errors.append({"file": file_path, "error": tesseract_error})
                    else:
                        errors.append({"file": file_path, "error": f"OCR processing failed: {error_str}"})
                else:
                    errors.append({"file": file_path, "error": f"OCR failed: {error_str}"})

        except Exception as e:
            errors.append({"file": file_path, "error": f"Unexpected error: {str(e)}"})

    return {"processed_files": processed_files, "errors": errors}

def pdf_to_pdfa(payload):
    """Convert PDF to PDF/A format (archival compliance).

    Note: Full PDF/A compliance requires proper metadata, color profiles, and structure.
    This implementation provides basic PDF/A conversion. For full compliance, consider
    using specialized tools like Ghostscript or pdfa_validator.
    """
    files = payload.get("files", [])
    pdfa_version = payload.get("pdfa_version", "2b")  # Default PDF/A-2b

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_pdfa{ext}"

            # Use pikepdf for PDF/A conversion
            with pikepdf.open(file_path) as pdf:
                # Remove encryption if present (PDF/A doesn't allow encryption)
                if pdf.is_encrypted:
                    try:
                        pdf.save(output_path, compress_streams=True)
                        # Reopen unencrypted version
                        with pikepdf.open(output_path) as pdf_unencrypted:
                            pdf = pdf_unencrypted
                    except:
                        errors.append({"file": file_path, "error": "Cannot convert encrypted PDF to PDF/A. Please unlock first."})
                        continue

                # Set PDF/A metadata (basic implementation)
                # Full PDF/A requires XMP metadata with proper schema
                if '/Metadata' not in pdf.Root or pdf.Root.Metadata is None:
                    # Create basic metadata structure
                    pdf.Root.Metadata = pikepdf.Stream(pdf, b'<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"><pdfaid:part>2</pdfaid:part><pdfaid:conformance>B</pdfaid:conformance></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>')

                # Ensure required PDF/A keys
                if '/OutputIntents' not in pdf.Root:
                    # Add basic output intent (required for PDF/A)
                    pdf.Root.OutputIntents = pikepdf.Array()

                # Save as PDF/A
                pdf.save(output_path, compress_streams=True, normalize_content=True)

            if os.path.exists(output_path):
                processed_files.append(output_path)
            else:
                errors.append({"file": file_path, "error": "Failed to create PDF/A file"})
        except Exception as e:
            logger.error(f"Error converting to PDF/A {file_path}: {e}", exc_info=True)
            errors.append({"file": file_path, "error": f"PDF/A conversion failed: {str(e)}"})

    return {"processed_files": processed_files, "errors": errors}

def crop_pdf(payload):
    """Crop PDF pages to specific dimensions."""
    files = payload.get("files", [])
    x = payload.get("x", 0)  # Left margin
    y = payload.get("y", 0)  # Top margin
    width = payload.get("width")  # Crop width
    height = payload.get("height")  # Crop height
    pages = payload.get("pages", "")  # Optional: specific pages (e.g., "1,3,5" or "2-5")

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        doc = None
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_cropped{ext}"

            doc = fitz.open(file_path)
            total_pages = len(doc)

            if total_pages == 0:
                errors.append({"file": file_path, "error": "PDF has no pages"})
                doc.close()
                continue

            # Parse pages if specified
            page_list = None
            if pages:
                try:
                    if "-" in pages:
                        start, end = map(int, pages.split("-"))
                        page_list = list(range(start - 1, min(end, total_pages)))
                    else:
                        page_list = [int(p.strip()) - 1 for p in pages.split(",")]
                        # Validate page numbers
                        page_list = [p for p in page_list if 0 <= p < total_pages]
                except ValueError:
                    errors.append({"file": file_path, "error": f"Invalid page range: {pages}"})
                    doc.close()
                    continue

            # Validate crop dimensions
            if width is None or height is None:
                errors.append({"file": file_path, "error": "Width and height are required for cropping"})
                doc.close()
                continue

            if width <= 0 or height <= 0:
                errors.append({"file": file_path, "error": "Width and height must be positive"})
                doc.close()
                continue

            # Process pages
            for page_num in range(total_pages):
                if page_list is None or page_num in page_list:
                    page = doc[page_num]
                    page_rect = page.rect

                    # Calculate crop rectangle
                    # x, y are from top-left, convert to fitz coordinates
                    crop_rect = fitz.Rect(
                        float(x),
                        float(y),
                        min(float(x) + float(width), page_rect.width),
                        min(float(y) + float(height), page_rect.height)
                    )

                    # Validate crop rectangle is within page bounds
                    if crop_rect.x1 <= crop_rect.x0 or crop_rect.y1 <= crop_rect.y0:
                        errors.append({"file": file_path, "error": f"Invalid crop dimensions for page {page_num + 1}"})
                        continue

                    if crop_rect.x0 < 0 or crop_rect.y0 < 0:
                        errors.append({"file": file_path, "error": f"Crop coordinates out of bounds for page {page_num + 1}"})
                        continue

                    # Set crop box (visible area)
                    page.set_cropbox(crop_rect)

            doc.save(output_path)
            if doc:
                doc.close()

            if os.path.exists(output_path):
                processed_files.append(output_path)
            else:
                errors.append({"file": file_path, "error": "Failed to create cropped PDF"})

        except Exception as e:
            logger.error(f"Error cropping PDF {file_path}: {e}", exc_info=True)
            if doc:
                doc.close()
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def organize_pdf(payload):
    """Reorder pages in PDF (Organize PDF)."""
    files = payload.get("files", [])
    page_order = payload.get("page_order", "")  # e.g., "3,1,2,5,4" or "1-5,10,8-9"

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        doc = None
        new_doc = None
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_organized{ext}"

            doc = fitz.open(file_path)
            total_pages = len(doc)

            if total_pages == 0:
                errors.append({"file": file_path, "error": "PDF has no pages"})
                doc.close()
                continue

            if not page_order:
                errors.append({"file": file_path, "error": "Page order is required. Provide page numbers like '3,1,2' or '1-5,10,8-9'"})
                doc.close()
                continue

            # Parse page order
            page_indices = []
            try:
                # Split by comma
                parts = [p.strip() for p in page_order.split(",")]
                for part in parts:
                    if "-" in part:
                        # Range like "1-5"
                        start, end = map(int, part.split("-"))
                        # Convert to 0-indexed and validate
                        for p in range(start - 1, min(end, total_pages)):
                            if 0 <= p < total_pages:
                                page_indices.append(p)
                    else:
                        # Single page number
                        p = int(part) - 1  # Convert to 0-indexed
                        if 0 <= p < total_pages:
                            page_indices.append(p)
                        else:
                            errors.append({"file": file_path, "error": f"Page number {part} is out of range (1-{total_pages})"})
                            continue
            except ValueError:
                errors.append({"file": file_path, "error": f"Invalid page order format: {page_order}. Use format like '3,1,2' or '1-5,10,8-9'"})
                doc.close()
                continue

            if not page_indices:
                errors.append({"file": file_path, "error": "No valid pages specified in page order"})
                doc.close()
                continue

            # Create new document with reordered pages
            new_doc = fitz.open()
            for page_idx in page_indices:
                new_doc.insert_pdf(doc, from_page=page_idx, to_page=page_idx)

            new_doc.save(output_path)
            if new_doc:
                new_doc.close()
            if doc:
                doc.close()

            if os.path.exists(output_path):
                processed_files.append(output_path)
            else:
                errors.append({"file": file_path, "error": "Failed to create organized PDF"})

        except Exception as e:
            logger.error(f"Error organizing PDF {file_path}: {e}", exc_info=True)
            if new_doc:
                new_doc.close()
            if doc:
                doc.close()
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}
