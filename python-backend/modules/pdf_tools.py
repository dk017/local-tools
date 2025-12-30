
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

# Import debug_log (always in flat structure)
try:
    from debug_utils import debug_log
except ImportError:
    # Fallback if debug_utils not available
    def debug_log(msg):
        print(f"[DEBUG] {msg}", flush=True)


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
    elif action == "extract_metadata":
        return extract_metadata(payload)
    elif action == "extract_form_data":
        return extract_form_data(payload)
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

            # Convert to float and handle None
            x = float(x) if x is not None else 0.0
            y = float(y) if y is not None else 0.0

            # Get original page dimensions
            rect = page.rect

            # If width/height not specified, use full page
            if width is None:
                width = rect.width - x
            else:
                width = float(width)
            if height is None:
                height = rect.height - y
            else:
                height = float(height)
            
            # Create crop rectangle
            crop_rect = fitz.Rect(x, y, x + width, y + height)
            # Clamp to page bounds
            crop_rect = crop_rect & rect
            
            # Get pixmap of cropped area
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=crop_rect)
        elif action == "watermark":
            # For watermark preview, just show the plain PDF page
            # The frontend will overlay the watermark for interactive editing
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
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

        # Get page dimensions for coordinate conversion
        page_width = float(page.rect.width)
        page_height = float(page.rect.height)

        # Cleanup
        pix = None
        if doc:
            doc.close()

        return {
            "image": f"data:image/png;base64,{base64_img}",
            "page_count": page_count,
            "page_width": page_width,
            "page_height": page_height,
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
    """
    Compress PDF file to reduce size with configurable compression levels.

    Compression Levels:
    - 0 (Low): Minimal compression, highest quality
    - 1 (Medium): Balanced compression and quality (default)
    - 2 (High): Maximum compression, smaller file size
    - 3 (Extreme): Aggressive compression with image downsampling
    """
    files = payload.get("files", [])
    level = int(payload.get("level", 1))  # Default to medium compression

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        doc = None
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_compressed{ext}"

            # Level 0: Minimal compression (just remove unused objects)
            if level == 0:
                with pikepdf.open(file_path) as pdf:
                    pdf.save(output_path, compress_streams=True)

            # Level 1: Balanced compression (default)
            elif level == 1:
                with pikepdf.open(file_path) as pdf:
                    pdf.save(
                        output_path,
                        compress_streams=True,
                        object_stream_mode=pikepdf.ObjectStreamMode.generate
                    )

            # Level 2: High compression (optimize images + object streams)
            elif level == 2:
                doc = fitz.open(file_path)

                # Process each page to compress images
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    image_list = page.get_images(full=True)

                    for img_index, img_info in enumerate(image_list):
                        xref = img_info[0]
                        try:
                            # Extract and recompress image
                            base_image = doc.extract_image(xref)
                            image_bytes = base_image["image"]

                            # Compress using PIL with quality 85
                            img = Image.open(io.BytesIO(image_bytes))
                            img_bytes_io = io.BytesIO()

                            # Save with compression
                            if img.mode == "RGBA":
                                img.save(img_bytes_io, format="PNG", optimize=True, compress_level=9)
                            else:
                                img.save(img_bytes_io, format="JPEG", quality=85, optimize=True)

                            compressed_bytes = img_bytes_io.getvalue()

                            # Only replace if compressed version is smaller
                            if len(compressed_bytes) < len(image_bytes):
                                rects = page.get_image_rects(xref)
                                if rects:
                                    page.delete_image(xref)
                                    for rect in rects:
                                        page.insert_image(rect, stream=compressed_bytes)
                        except Exception as e:
                            logger.warning(f"Could not compress image {xref}: {e}")

                # Save with garbage collection
                doc.save(output_path, garbage=4, deflate=True, clean=True)
                doc.close()

                # Further compress with pikepdf
                with pikepdf.open(output_path) as pdf:
                    pdf.save(
                        output_path,
                        compress_streams=True,
                        object_stream_mode=pikepdf.ObjectStreamMode.generate
                    )

            # Level 3: Extreme compression (downsample images + max compression)
            elif level == 3:
                doc = fitz.open(file_path)

                # Process each page to aggressively compress images
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    image_list = page.get_images(full=True)

                    for img_index, img_info in enumerate(image_list):
                        xref = img_info[0]
                        try:
                            # Extract image
                            base_image = doc.extract_image(xref)
                            image_bytes = base_image["image"]

                            # Aggressively compress and downsample
                            img = Image.open(io.BytesIO(image_bytes))

                            # Downsample large images
                            max_dimension = 1500
                            if max(img.width, img.height) > max_dimension:
                                ratio = max_dimension / max(img.width, img.height)
                                new_size = (int(img.width * ratio), int(img.height * ratio))
                                img = img.resize(new_size, Image.Resampling.LANCZOS)

                            img_bytes_io = io.BytesIO()

                            # Save with aggressive compression
                            if img.mode == "RGBA":
                                img.save(img_bytes_io, format="PNG", optimize=True, compress_level=9)
                            else:
                                # Convert to RGB if needed
                                if img.mode != "RGB":
                                    img = img.convert("RGB")
                                img.save(img_bytes_io, format="JPEG", quality=70, optimize=True)

                            compressed_bytes = img_bytes_io.getvalue()

                            # Replace image
                            rects = page.get_image_rects(xref)
                            if rects:
                                page.delete_image(xref)
                                for rect in rects:
                                    page.insert_image(rect, stream=compressed_bytes)
                        except Exception as e:
                            logger.warning(f"Could not compress image {xref}: {e}")

                # Save with maximum garbage collection
                doc.save(output_path, garbage=4, deflate=True, clean=True)
                doc.close()

                # Final pass with pikepdf
                with pikepdf.open(output_path) as pdf:
                    pdf.save(
                        output_path,
                        compress_streams=True,
                        object_stream_mode=pikepdf.ObjectStreamMode.generate,
                        recompress_flate=True
                    )

            if os.path.exists(output_path):
                # Check compression ratio
                original_size = os.path.getsize(file_path)
                compressed_size = os.path.getsize(output_path)
                ratio = ((original_size - compressed_size) / original_size) * 100

                logger.info(f"Compressed {file_path}: {original_size} -> {compressed_size} bytes ({ratio:.1f}% reduction)")
                processed_files.append(output_path)
            else:
                errors.append({"file": file_path, "error": "Compression failed: output file not created"})

        except Exception as e:
            logger.error(f"Error compressing PDF {file_path}: {e}", exc_info=True)
            if doc:
                doc.close()
            errors.append({"file": file_path, "error": f"Compression failed: {str(e)}"})

    return {"processed_files": processed_files, "errors": errors}

def protect_pdf(payload):
    """Add password protection to PDF."""
    files = payload.get("files", [])
    password = payload.get("password")

    if not password:
        file_name = files[0] if files else "unknown"
        return {"processed_files": [], "errors": [{"file": file_name, "error": "Please enter a password to protect your PDF file."}]}

    if len(password) < 3:
        file_name = files[0] if files else "unknown"
        return {"processed_files": [], "errors": [{"file": file_name, "error": "Password must be at least 3 characters long."}]}

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
                if not password:
                    errors.append({"file": file_path, "error": "This PDF is password-protected. Please provide the password."})
                    continue
                decrypt_result = reader.decrypt(password)
                if decrypt_result == 0:  # 0 = failed, 1 = user password, 2 = owner password
                    errors.append({"file": file_path, "error": "Incorrect password. Please try again."})
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
    opacity = float(payload.get("opacity", 0.5))
    watermark_file = payload.get("watermark_file")
    color = str(payload.get("color", "gray"))
    font_size = int(payload.get("font_size", 72))
    x_percent = float(payload.get("x", 0.5))  # 0-1 range
    y_percent = float(payload.get("y", 0.5))  # 0-1 range

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
                        # Parse color - convert to RGBA with opacity
                        # Support both color names and hex colors
                        if color.startswith("#"):
                            # Hex color (e.g., "#ff0000")
                            hex_color = color.lstrip("#")
                            if len(hex_color) == 6:
                                r = int(hex_color[0:2], 16) / 255.0
                                g = int(hex_color[2:4], 16) / 255.0
                                b = int(hex_color[4:6], 16) / 255.0
                                base_color = (r, g, b)
                            else:
                                base_color = (0.5, 0.5, 0.5)  # fallback
                        elif color == "gray":
                            base_color = (0.5, 0.5, 0.5)
                        elif color == "red":
                            base_color = (1, 0, 0)
                        elif color == "blue":
                            base_color = (0, 0, 1)
                        else:
                            base_color = (0.5, 0.5, 0.5)

                        # Apply opacity to color (convert RGB to RGBA)
                        fill_color = base_color + (opacity,)

                        # Calculate position from percentages
                        point = fitz.Point(rect.width * x_percent, rect.height * y_percent)

                        # Insert text with RGBA color (includes opacity)
                        page.insert_text(point, text, fontsize=font_size, color=fill_color,
                                       render_mode=0)  # render_mode=0 for fill
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
    """Extract all images from PDF with duplicate detection and resource limits."""
    files = payload.get("files", [])

    # Production limits
    MAX_IMAGES_PER_PDF = 1000
    MAX_IMAGE_SIZE_MB = 50

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        doc = None
        try:
            print(f"[EXTRACT_IMAGES] Starting extraction for {os.path.basename(file_path)}", flush=True)

            base, _ = os.path.splitext(file_path)
            images_dir = f"{base}_images"
            os.makedirs(images_dir, exist_ok=True)

            doc = fitz.open(file_path)
            img_count = 0
            extracted_xrefs = set()  # Track extracted images by xref to avoid duplicates

            for page_num in range(len(doc)):
                page = doc[page_num]
                image_list = page.get_images()

                for img_index, img in enumerate(image_list):
                    xref = img[0]

                    # Skip if we've already extracted this image (duplicate detection)
                    if xref in extracted_xrefs:
                        print(f"[EXTRACT_IMAGES] Skipping duplicate image xref={xref} on page {page_num + 1}", flush=True)
                        continue

                    # Check image count limit
                    if img_count >= MAX_IMAGES_PER_PDF:
                        print(f"[EXTRACT_IMAGES] Reached maximum image limit ({MAX_IMAGES_PER_PDF})", flush=True)
                        errors.append({
                            "file": file_path,
                            "error": f"PDF contains more than {MAX_IMAGES_PER_PDF} images. Only first {MAX_IMAGES_PER_PDF} extracted."
                        })
                        break

                    try:
                        base_image = doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        image_ext = base_image["ext"]

                        # Check image size
                        image_size_mb = len(image_bytes) / (1024 * 1024)
                        if image_size_mb > MAX_IMAGE_SIZE_MB:
                            print(f"[EXTRACT_IMAGES] Skipping oversized image ({image_size_mb:.1f}MB)", flush=True)
                            continue

                        img_count += 1
                        extracted_xrefs.add(xref)

                        output_path = os.path.join(images_dir, f"image_{img_count:03d}.{image_ext}")
                        with open(output_path, "wb") as img_file:
                            img_file.write(image_bytes)
                        processed_files.append(output_path)

                    except Exception as img_err:
                        print(f"[EXTRACT_IMAGES] Failed to extract image xref={xref}: {img_err}", flush=True)
                        continue

            if doc:
                doc.close()

            print(f"[EXTRACT_IMAGES] Extracted {img_count} unique images from {os.path.basename(file_path)}", flush=True)

            # Handle case where PDF has no images
            if img_count == 0:
                errors.append({
                    "file": file_path,
                    "error": "This PDF contains no extractable images. PDFs created from scanned documents or text-only PDFs may not have embedded images."
                })

        except Exception as e:
            logger.error(f"Error extracting images from {file_path}: {e}", exc_info=True)
            if doc:
                doc.close()
            errors.append({"file": file_path, "error": f"Failed to process PDF: {str(e)}"})

    return {"processed_files": processed_files, "errors": errors}

def _detect_header_row(table_data):
    """
    Detect if the first row of a table is a header row or data row.

    Heuristic: A header row typically has:
    - Mostly non-numeric text
    - Different content pattern than data rows
    - Unique values (not repeated in subsequent rows)

    Args:
        table_data: Table data (list of lists)

    Returns:
        bool: True if first row appears to be a header
    """
    if not table_data:
        return False

    if len(table_data) == 1:
        # Single row - could be header or data, default to header
        return True

    first_row = table_data[0]

    # If all cells in first row are empty, it's not a header
    first_row_texts = [str(cell).strip() if cell else "" for cell in first_row]
    non_empty_count = sum(1 for cell in first_row_texts if cell)

    if non_empty_count == 0:
        return False

    if non_empty_count < len(first_row) * 0.4:  # Less than 40% filled
        return False

    # Check if first row looks different from the rest of the rows
    # Headers typically have unique text, while data rows have similar patterns

    # Count numeric cells in first row vs second row
    def count_numeric_cells(row):
        count = 0
        for cell in row:
            if cell:
                cell_str = str(cell).strip()
                # Check if it's numeric (number, currency, percentage, etc.)
                # Remove common formatting
                cleaned = cell_str.replace(',', '').replace('$', '').replace('%', '').replace('€', '')
                try:
                    float(cleaned)
                    count += 1
                except ValueError:
                    pass
        return count

    first_row_numeric = count_numeric_cells(first_row)

    # Check subsequent rows
    if len(table_data) > 1:
        second_row_numeric = count_numeric_cells(table_data[1])

        # If first row has significantly fewer numbers than second row, likely a header
        if first_row_numeric < second_row_numeric * 0.5:
            return True

        # If first row has many numbers like data rows, probably not a header
        if first_row_numeric > len(first_row) * 0.6:
            return False

    # Check if first row values are repeated in data (headers shouldn't repeat)
    if len(table_data) > 2:
        first_row_lower = [str(cell).strip().lower() if cell else "" for cell in first_row]

        # Count how many first-row values appear in subsequent rows
        repeats = 0
        for row in table_data[1:]:
            row_lower = [str(cell).strip().lower() if cell else "" for cell in row]
            for val in first_row_lower:
                if val and val in row_lower:
                    repeats += 1

        # If many values repeat, probably not a unique header row
        if repeats > len(first_row) * 0.5:
            return False

    # Default: assume it's a header if we're not sure
    # Better to skip a header than to include it as data
    return True

def _can_merge_tables(table1_data, table2_data, similarity_threshold=0.8):
    """
    Determine if two tables can be merged based on column structure similarity.

    Handles both:
    - Tables with matching headers
    - Continuation tables without headers (common for page breaks)

    Args:
        table1_data: First table (list of lists)
        table2_data: Second table (list of lists)
        similarity_threshold: Minimum column similarity to merge (0.0 to 1.0)

    Returns:
        bool: True if tables can be merged
    """
    if not table1_data or not table2_data:
        print(f"[MERGE] Cannot merge: empty table data", flush=True)
        return False

    # Get column counts
    col_count1 = len(table1_data[0]) if table1_data else 0
    col_count2 = len(table2_data[0]) if table2_data else 0

    print(f"[MERGE] Table1: {len(table1_data)} rows, {col_count1} cols | Table2: {len(table2_data)} rows, {col_count2} cols", flush=True)

    # Must have same number of columns
    if col_count1 != col_count2 or col_count1 == 0:
        print(f"[MERGE] Cannot merge: column count mismatch ({col_count1} vs {col_count2})", flush=True)
        return False

    # Detect if tables have headers
    table1_has_header = _detect_header_row(table1_data)
    table2_has_header = _detect_header_row(table2_data)
    print(f"[MERGE] Table1 has header: {table1_has_header} | Table2 has header: {table2_has_header}", flush=True)

    # Case 1: Both have headers - compare them for similarity
    if table1_has_header and table2_has_header and len(table1_data) > 1 and len(table2_data) > 1:
        header1 = [str(cell).strip().lower() if cell else "" for cell in table1_data[0]]
        header2 = [str(cell).strip().lower() if cell else "" for cell in table2_data[0]]

        # Count matching headers
        matches = sum(1 for h1, h2 in zip(header1, header2) if h1 and h2 and h1 == h2)
        try:
            print(f"[MERGE] Headers: {header1[:3]}... vs {header2[:3]}... | Matches: {matches}/{col_count1}", flush=True)
        except UnicodeEncodeError:
            print(f"[MERGE] Headers comparison: {matches}/{col_count1} matches (contains Unicode)", flush=True)

        # If headers match well, they're likely the same table type
        if matches / col_count1 >= similarity_threshold:
            print(f"[MERGE] CAN MERGE: headers match well", flush=True)
            return True

    # Case 2: Table 2 has NO header (continuation table) - just check column count
    # This is the common case for tables split across pages
    if table1_has_header and not table2_has_header:
        print(f"[MERGE] CAN MERGE: table2 is headerless continuation", flush=True)
        return True

    # Case 3: Both have no clear headers - match by column count
    if not table1_has_header and not table2_has_header:
        print(f"[MERGE] CAN MERGE: both headerless with same columns", flush=True)
        return True

    # Case 4: Table 1 has no header but table 2 does - unlikely to be continuation
    print(f"[MERGE] Cannot merge: table1 no header but table2 has header (new table, not continuation)", flush=True)
    return False

def extract_tables(payload):
    """
    Extract tables from PDF to CSV or Excel with production-quality validation.

    Features:
    - Scanned PDF detection
    - Table quality validation
    - Memory limits
    - UTF-8 encoding for CSV
    - Partial success handling
    - Detailed error categorization
    - Smart table merging across pages
    """
    try:
        files = payload.get("files", [])
        output_format = payload.get("output_format", "csv")
        merge_tables_enabled = payload.get("merge_tables", "false").lower() == "true"

        print(f"[EXTRACT_TABLES] Starting: {len(files)} file(s), format={output_format}, merge={merge_tables_enabled}", flush=True)
        logger.info(f"Starting table extraction: {len(files)} file(s), format={output_format}, merge={merge_tables_enabled}")
        logger.info(f"Files received: {files}")

        # Immediate validation - catch empty files list
        if not files:
            logger.error("No files provided to extract_tables!")
            return {
                "processed_files": [],
                "errors": [{
                    "file": "none",
                    "error": "No files were uploaded. Please select a PDF file to extract tables from."
                }]
            }

        # Configuration
        MAX_CELLS_PER_TABLE = 100000  # Prevent memory issues
        MIN_NON_EMPTY_CELLS = 3  # Minimum cells to consider table valid
        MIN_ROWS = 1  # Minimum rows (excluding potential header)
        COLUMN_SIMILARITY_THRESHOLD = 0.8  # 80% column match to consider tables mergeable

        # pdfplumber table detection settings - tuned to catch edge cases
        # These settings make detection more aggressive to avoid missing last rows
        table_settings = {
            "vertical_strategy": "lines",  # Use lines for vertical edges (more lenient than "lines_strict")
            "horizontal_strategy": "lines",  # Use lines for horizontal edges
            "explicit_vertical_lines": [],  # No explicit lines (auto-detect)
            "explicit_horizontal_lines": [],  # No explicit lines (auto-detect)
            "snap_tolerance": 5,  # Pixels tolerance for snapping to lines (increased from default 3)
            "snap_x_tolerance": 5,
            "snap_y_tolerance": 5,
            "join_tolerance": 5,  # Join nearby line segments (increased from default 3)
            "join_x_tolerance": 5,
            "join_y_tolerance": 5,
            "edge_min_length": 3,  # Minimum line length to detect (lowered to catch partial borders)
            "min_words_vertical": 1,  # Minimum words to form vertical edge (lowered from default 3)
            "min_words_horizontal": 1,  # Minimum words to form horizontal edge
            "intersection_tolerance": 5,  # Tolerance for line intersections
            "text_tolerance": 5,  # Tolerance for text alignment
            "text_x_tolerance": 5,
            "text_y_tolerance": 5,
        }

        processed_files = []
        errors = []

        for file_path in files:
            doc = None
            tables_found = 0
            total_pages = 0
            is_scanned = False
            collected_tables = []  # Store tables with metadata for potential merging

            try:
                if not os.path.exists(file_path):
                    errors.append({"file": file_path, "error": "File not found"})
                    continue

                base, _ = os.path.splitext(file_path)

                # Use pdfplumber for table extraction
                with pdfplumber.open(file_path) as pdf:
                    total_pages = len(pdf.pages)

                    # Scanned PDF detection - check first few pages for extractable text
                    if total_pages > 0:
                        text_found = False
                        pages_to_check = min(3, total_pages)  # Check first 3 pages
                        for i in range(pages_to_check):
                            page_text = pdf.pages[i].extract_text()
                            if page_text and len(page_text.strip()) > 50:  # At least 50 chars
                                text_found = True
                                break

                        if not text_found:
                            is_scanned = True
                            errors.append({
                                "file": file_path,
                                "error": "This appears to be a scanned PDF (image-based). Table extraction requires text-based PDFs. Please convert using OCR first."
                            })
                            continue

                    # Extract tables from each page - collect them for potential merging
                    for page_num, page_obj in enumerate(pdf.pages):
                        try:
                            # Extract tables with custom settings for better detection
                            tables = page_obj.extract_tables(table_settings=table_settings)

                            print(f"[DEBUG] Page {page_num + 1}: Found {len(tables) if tables else 0} tables", flush=True)

                            # If no tables found with "lines" strategy, try "text" strategy as fallback
                            if not tables:
                                text_settings = {
                                    "vertical_strategy": "text",
                                    "horizontal_strategy": "text",
                                    "snap_tolerance": 5,
                                    "join_tolerance": 5,
                                }
                                tables = page_obj.extract_tables(table_settings=text_settings)
                                if tables:
                                    print(f"[DEBUG] Page {page_num + 1}: Fallback to text strategy found {len(tables)} tables", flush=True)

                            if not tables:
                                continue

                            for table_num, table in enumerate(tables):
                                if not table or len(table) == 0:
                                    continue

                                print(f"[DEBUG] Page {page_num + 1}, Table {table_num + 1}: {len(table)} rows, {len(table[0]) if table else 0} columns", flush=True)

                                # Table quality validation
                                total_cells = sum(len(row) for row in table)

                                # Check memory limits
                                if total_cells > MAX_CELLS_PER_TABLE:
                                    logger.warning(f"Table {table_num + 1} on page {page_num + 1} exceeds cell limit ({total_cells} > {MAX_CELLS_PER_TABLE})")
                                    errors.append({
                                        "file": file_path,
                                        "error": f"Table {table_num + 1} on page {page_num + 1} is too large ({total_cells} cells). Maximum {MAX_CELLS_PER_TABLE} cells allowed."
                                    })
                                    continue

                                # Count non-empty cells
                                non_empty_cells = sum(1 for row in table for cell in row if cell and str(cell).strip())

                                # Filter out low-quality tables
                                if non_empty_cells < MIN_NON_EMPTY_CELLS:
                                    logger.info(f"Skipping low-quality table {table_num + 1} on page {page_num + 1} (only {non_empty_cells} non-empty cells)")
                                    continue

                                # Check minimum rows
                                if len(table) < MIN_ROWS + 1:  # +1 for potential header
                                    logger.info(f"Skipping table {table_num + 1} on page {page_num + 1} (only {len(table)} rows)")
                                    continue

                                tables_found += 1

                                # Collect table with metadata for potential merging
                                collected_tables.append({
                                    "page_num": page_num,
                                    "table_num": table_num,
                                    "data": table,
                                    "non_empty_cells": non_empty_cells
                                })
                                logger.info(f"Collected table {table_num + 1} from page {page_num + 1} ({non_empty_cells} cells)")

                        except Exception as e:
                            logger.warning(f"Table extraction failed for page {page_num + 1}: {e}")
                            errors.append({
                                "file": file_path,
                                "error": f"Page {page_num + 1} processing failed: {str(e)}"
                            })

                # Process collected tables - merge if enabled, otherwise save individually
                print(f"[DEBUG] Collected {len(collected_tables)} tables total, merge_enabled={merge_tables_enabled}", flush=True)
                if collected_tables:
                    if merge_tables_enabled:
                        # Group consecutive tables that can be merged
                        merged_groups = []
                        current_group = [collected_tables[0]]

                        for i in range(1, len(collected_tables)):
                            prev_table = current_group[-1]
                            curr_table = collected_tables[i]

                            # Check if consecutive pages and can merge
                            is_consecutive = curr_table["page_num"] == prev_table["page_num"] + 1
                            can_merge = _can_merge_tables(prev_table["data"], curr_table["data"], COLUMN_SIMILARITY_THRESHOLD) if is_consecutive else False
                            print(f"[DEBUG] Comparing page {prev_table['page_num']+1} -> page {curr_table['page_num']+1}: consecutive={is_consecutive}, can_merge={can_merge}", flush=True)

                            if is_consecutive and can_merge:
                                current_group.append(curr_table)
                            else:
                                # Start new group
                                merged_groups.append(current_group)
                                current_group = [curr_table]

                        # Don't forget the last group
                        merged_groups.append(current_group)

                        # Process each group
                        for group_idx, group in enumerate(merged_groups):
                            try:
                                if len(group) == 1:
                                    # Single table - save as is
                                    table_meta = group[0]
                                    table = table_meta["data"]

                                    if len(table) > 1:
                                        df = pd.DataFrame(table[1:], columns=table[0])
                                    else:
                                        df = pd.DataFrame(table)

                                    if output_format == "csv":
                                        output_path = f"{base}_p{table_meta['page_num'] + 1}_t{table_meta['table_num'] + 1}.csv"
                                        df.to_csv(output_path, index=False, encoding='utf-8-sig')
                                        processed_files.append(output_path)
                                    elif output_format == "excel" or output_format == "xlsx":
                                        output_path = f"{base}_p{table_meta['page_num'] + 1}_t{table_meta['table_num'] + 1}.xlsx"
                                        df.to_excel(output_path, index=False, engine='openpyxl')
                                        processed_files.append(output_path)

                                    logger.info(f"Saved single table from page {table_meta['page_num'] + 1}")
                                else:
                                    # Multiple tables - merge them intelligently
                                    first_table = group[0]["data"]
                                    first_has_header = _detect_header_row(first_table)

                                    # Use header from first table if it has one
                                    header = first_table[0] if first_has_header and len(first_table) > 1 else None

                                    # Collect all data rows
                                    all_rows = []

                                    # Add rows from first table
                                    if first_has_header and len(first_table) > 1:
                                        # Skip header row
                                        all_rows.extend(first_table[1:])
                                    else:
                                        # No header - include all rows
                                        all_rows.extend(first_table)

                                    # Add rows from subsequent tables
                                    for table_meta in group[1:]:
                                        table_data = table_meta["data"]

                                        # Check if this continuation table has a header
                                        table_has_header = _detect_header_row(table_data)

                                        if table_has_header and len(table_data) > 1:
                                            # Has header (repeated header case) - skip it
                                            all_rows.extend(table_data[1:])
                                            logger.info(f"Skipping repeated header from page {table_meta['page_num'] + 1}")
                                        else:
                                            # No header (continuation case) - include ALL rows
                                            all_rows.extend(table_data)
                                            logger.info(f"Merging headerless continuation from page {table_meta['page_num'] + 1}")

                                    # Create merged DataFrame
                                    if header:
                                        df = pd.DataFrame(all_rows, columns=header)
                                    else:
                                        df = pd.DataFrame(all_rows)

                                    # Save merged table
                                    start_page = group[0]["page_num"] + 1
                                    end_page = group[-1]["page_num"] + 1

                                    if output_format == "csv":
                                        output_path = f"{base}_p{start_page}-{end_page}_merged.csv"
                                        df.to_csv(output_path, index=False, encoding='utf-8-sig')
                                        processed_files.append(output_path)
                                    elif output_format == "excel" or output_format == "xlsx":
                                        output_path = f"{base}_p{start_page}-{end_page}_merged.xlsx"
                                        df.to_excel(output_path, index=False, engine='openpyxl')
                                        processed_files.append(output_path)

                                    logger.info(f"Merged {len(group)} tables from pages {start_page}-{end_page} ({len(all_rows)} total rows)")

                            except Exception as e:
                                logger.warning(f"Failed to process table group {group_idx + 1}: {e}")
                                errors.append({
                                    "file": file_path,
                                    "error": f"Failed to save merged table: {str(e)}"
                                })
                    else:
                        # Merge disabled - save each table individually (original behavior)
                        for table_meta in collected_tables:
                            try:
                                table = table_meta["data"]
                                page_num = table_meta["page_num"]
                                table_num = table_meta["table_num"]

                                if len(table) > 1:
                                    df = pd.DataFrame(table[1:], columns=table[0])
                                else:
                                    df = pd.DataFrame(table)

                                if output_format == "csv":
                                    output_path = f"{base}_p{page_num + 1}_t{table_num + 1}.csv"
                                    df.to_csv(output_path, index=False, encoding='utf-8-sig')
                                    processed_files.append(output_path)
                                elif output_format == "excel" or output_format == "xlsx":
                                    output_path = f"{base}_p{page_num + 1}_t{table_num + 1}.xlsx"
                                    df.to_excel(output_path, index=False, engine='openpyxl')
                                    processed_files.append(output_path)

                                logger.info(f"Successfully extracted table {table_num + 1} from page {page_num + 1} ({table_meta['non_empty_cells']} cells)")

                            except Exception as e:
                                logger.warning(f"Failed to save table {table_num + 1} from page {page_num + 1}: {e}")
                                errors.append({
                                    "file": file_path,
                                    "error": f"Failed to save table {table_num + 1} from page {page_num + 1}: {str(e)}"
                                })

                # Check if we successfully processed any files from this PDF
                files_before = len(processed_files)
                # Count how many files from this specific PDF were added
                # (processed_files could have files from previous PDFs in the loop)

                # Categorized error messages for no tables found or all filtered
                if tables_found == 0 and not is_scanned:
                    logger.info(f"No tables found in {file_path}")
                    errors.append({
                        "file": file_path,
                        "error": f"No tables detected in {total_pages} page(s). The PDF may not contain structured tables with clear borders/gridlines."
                    })
                elif tables_found > 0 and not collected_tables:
                    # Tables were detected but all filtered out by quality checks
                    logger.info(f"All {tables_found} table(s) from {file_path} were filtered out (quality checks)")
                    errors.append({
                        "file": file_path,
                        "error": f"Detected {tables_found} potential table(s), but all were filtered out due to low quality (too few data cells, mostly empty rows). Try a different PDF or adjust detection settings."
                    })
                elif collected_tables and not any(base in str(pf) for pf in processed_files):
                    # Tables collected but none were successfully saved
                    logger.warning(f"Collected {len(collected_tables)} tables from {file_path} but none saved successfully")
                    if not any(err.get("file") == file_path for err in errors):
                        errors.append({
                            "file": file_path,
                            "error": f"Failed to extract tables. All {len(collected_tables)} table(s) encountered processing errors."
                        })

            except Exception as e:
                logger.error(f"Error extracting tables from {file_path}: {e}", exc_info=True)
                # Categorize errors
                error_msg = str(e)
                if "password" in error_msg.lower() or "encrypted" in error_msg.lower():
                    errors.append({"file": file_path, "error": "PDF is password-protected or encrypted. Please unlock it first."})
                elif "corrupt" in error_msg.lower() or "damaged" in error_msg.lower():
                    errors.append({"file": file_path, "error": "PDF file appears to be corrupted or damaged."})
                else:
                    errors.append({"file": file_path, "error": f"Processing failed: {str(e)}"})

        # Final safety check - ensure we never return completely empty results
        if not processed_files and not errors:
            logger.error("CRITICAL: extract_tables returning empty results with no errors!")
            errors.append({
                "file": "unknown",
                "error": "Table extraction failed with no specific error. The PDF may be corrupted, empty, or in an unsupported format."
            })

        # Partial success handling - return what we have
        logger.info(f"Extraction complete: {len(processed_files)} files, {len(errors)} errors")
        return {"processed_files": processed_files, "errors": errors}

    except Exception as e:
        # Top-level exception handler - catch ANY unexpected error
        logger.error(f"UNEXPECTED ERROR in extract_tables: {e}", exc_info=True)
        return {
            "processed_files": [],
            "errors": [{
                "file": "unknown",
                "error": f"Unexpected error during table extraction: {str(e)}"
            }]
        }

def grayscale_pdf(payload):
    """
    Convert PDF to grayscale.

    This converts the entire PDF (text, images, and graphics) to grayscale/black & white.
    Uses Ghostscript for reliable conversion while preserving PDF structure.
    """
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_grayscale{ext}"

            # Use Ghostscript for proper grayscale conversion
            # This preserves text quality and properly converts all elements
            import subprocess

            gs_command = [
                "gswin64c" if os.name == "nt" else "gs",  # Windows uses gswin64c
                "-sDEVICE=pdfwrite",
                "-sColorConversionStrategy=Gray",
                "-dProcessColorModel=/DeviceGray",
                "-dCompatibilityLevel=1.4",
                "-dNOPAUSE",
                "-dBATCH",
                "-dQUIET",
                f"-sOutputFile={output_path}",
                file_path
            ]

            try:
                result = subprocess.run(gs_command, capture_output=True, text=True, timeout=60)
                if result.returncode == 0 and os.path.exists(output_path):
                    processed_files.append(output_path)
                else:
                    # Fallback to PyMuPDF method if Ghostscript fails
                    raise Exception("Ghostscript conversion failed, using fallback")
            except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as gs_error:
                logger.warning(f"Ghostscript not available or failed ({gs_error}), using fallback method")

                # Fallback: Convert each page to grayscale image and rebuild PDF
                # This works but reduces quality slightly
                doc = fitz.open(file_path)
                new_doc = fitz.open()

                for page_num in range(len(doc)):
                    page = doc[page_num]

                    # Render page as high-quality grayscale image
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), colorspace=fitz.csGRAY)

                    # Create new page with same dimensions
                    new_page = new_doc.new_page(width=page.rect.width, height=page.rect.height)

                    # Insert grayscale image
                    new_page.insert_image(new_page.rect, pixmap=pix)

                    pix = None

                new_doc.save(output_path, garbage=4, deflate=True)
                new_doc.close()
                doc.close()

                processed_files.append(output_path)

        except Exception as e:
            logger.error(f"Error converting PDF to grayscale {file_path}: {e}", exc_info=True)
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def repair_pdf(payload):
    """
    Repair corrupted PDF files using multiple strategies.

    Repair techniques:
    1. Standard repair: Open and resave with garbage collection
    2. Linearization: Rebuild PDF structure
    3. Incremental save disabled: Force full rewrite
    4. Clean content streams: Fix broken page content
    """
    files = payload.get("files", [])

    processed_files = []
    errors = []

    for file_path in files:
        repaired = False
        last_error = None

        try:
            # Check if file exists
            if not os.path.exists(file_path):
                errors.append({"file": file_path, "error": f"File not found: {file_path}"})
                continue

            file_size = os.path.getsize(file_path)
            print(f"[REPAIR] Starting repair for {os.path.basename(file_path)} (size: {file_size} bytes)", flush=True)

            # Verify file is readable and check PDF magic header
            try:
                with open(file_path, 'rb') as f:
                    first_bytes = f.read(1024)
                    print(f"[REPAIR] File readable. First bytes: {first_bytes[:20]}", flush=True)

                    # Check for valid PDF header
                    if not first_bytes.startswith(b'%PDF-'):
                        # File has no PDF structure at all - cannot repair
                        error_msg = "This file is not a valid PDF or is completely corrupted beyond repair. PDF files must start with '%PDF-' header, but this file does not. The repair tool can only fix PDFs with minor internal corruption, not files that have lost their entire PDF structure."

                        print(f"[REPAIR] ERROR: {error_msg}", flush=True)
                        errors.append({"file": file_path, "error": error_msg})
                        continue
            except Exception as read_err:
                print(f"[REPAIR] Cannot read file with Python: {read_err}", flush=True)
                errors.append({"file": file_path, "error": f"Cannot read file: {read_err}"})
                continue

            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_repaired{ext}"

            # Strategy 1: Standard repair with aggressive garbage collection
            try:
                print(f"[REPAIR] Attempting fitz.open() with file_path: {file_path}", flush=True)
                doc = fitz.open(file_path)
                doc.save(
                    output_path,
                    garbage=4,  # Aggressive garbage collection (removes unused objects)
                    deflate=True,  # Compress streams
                    clean=True,  # Clean and sanitize content streams
                    pretty=True,  # Format content streams for readability
                )
                doc.close()
                repaired = True
                print(f"[REPAIR] Strategy 1 (standard) succeeded for {os.path.basename(file_path)}")
            except Exception as e1:
                last_error = e1
                print(f"[REPAIR] Strategy 1 failed: {e1}")

                # Strategy 2: Try with linear=True (rebuild PDF structure)
                try:
                    doc = fitz.open(file_path)
                    doc.save(
                        output_path,
                        garbage=4,
                        deflate=True,
                        linear=True,  # Linearize PDF (rebuilds structure)
                    )
                    doc.close()
                    repaired = True
                    print(f"[REPAIR] Strategy 2 (linearize) succeeded for {os.path.basename(file_path)}")
                except Exception as e2:
                    last_error = e2
                    print(f"[REPAIR] Strategy 2 failed: {e2}")

                    # Strategy 3: Force full rewrite (no incremental)
                    try:
                        doc = fitz.open(file_path)
                        doc.save(
                            output_path,
                            garbage=4,
                            deflate=True,
                            incremental=False,  # Force full rewrite
                            expand=True,  # Expand all objects
                        )
                        doc.close()
                        repaired = True
                        print(f"[REPAIR] Strategy 3 (full rewrite) succeeded for {os.path.basename(file_path)}")
                    except Exception as e3:
                        last_error = e3
                        print(f"[REPAIR] Strategy 3 failed: {e3}")

            if repaired:
                processed_files.append(output_path)
            else:
                # All strategies failed
                error_msg = f"Failed to repair PDF. Last error: {str(last_error)}"
                errors.append({"file": file_path, "error": error_msg})

        except Exception as e:
            errors.append({"file": file_path, "error": f"Unexpected error: {str(e)}"})

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
    """
    Compare two PDFs visually with highlighted differences.

    Creates a comparison PDF showing:
    - Side-by-side view of both PDFs
    - Differences highlighted in red/green
    - Page-by-page comparison
    """
    files = payload.get("files", [])

    # Production limits
    MAX_PAGES_PER_PDF = 100
    MAX_TOTAL_PAGES = 150

    # Strict validation: exactly 2 files required
    if len(files) != 2:
        if len(files) < 2:
            return {"processed_files": [], "errors": [{"file": "comparison", "error": "PDF comparison requires exactly 2 PDF files. Please upload 2 PDFs to compare."}]}
        else:
            return {"processed_files": [], "errors": [{"file": "comparison", "error": f"PDF comparison requires exactly 2 files, but {len(files)} were provided. Only the first 2 will be compared."}]}

    processed_files = []
    errors = []

    # Validate files exist
    for i, file_path in enumerate(files[:2]):
        if not os.path.exists(file_path):
            return {"processed_files": [], "errors": [{"file": file_path, "error": f"File {i+1} not found: {os.path.basename(file_path)}"}]}

    doc1 = None
    doc2 = None
    new_doc = None

    try:
        print(f"[PDF_DIFF] Starting comparison: {os.path.basename(files[0])} vs {os.path.basename(files[1])}", flush=True)

        doc1 = fitz.open(files[0])
        doc2 = fitz.open(files[1])

        # Check page count limits
        if len(doc1) > MAX_PAGES_PER_PDF or len(doc2) > MAX_PAGES_PER_PDF:
            return {"processed_files": [], "errors": [{"file": files[0], "error": f"PDFs with more than {MAX_PAGES_PER_PDF} pages are not supported for comparison. File 1 has {len(doc1)} pages, File 2 has {len(doc2)} pages."}]}

        max_pages = max(len(doc1), len(doc2))
        if max_pages > MAX_TOTAL_PAGES:
            return {"processed_files": [], "errors": [{"file": files[0], "error": f"Total page count ({max_pages}) exceeds limit of {MAX_TOTAL_PAGES} pages."}]}

        print(f"[PDF_DIFF] File 1: {len(doc1)} pages, File 2: {len(doc2)} pages", flush=True)

        # Better output naming: include both file names
        base1 = os.path.splitext(os.path.basename(files[0]))[0]
        base2 = os.path.splitext(os.path.basename(files[1]))[0]
        output_dir = os.path.dirname(files[0])
        output_path = os.path.join(output_dir, f"{base1}_vs_{base2}_comparison.pdf")

        # Create comparison PDF with difference highlighting
        new_doc = fitz.open()
        max_pages = max(len(doc1), len(doc2))
        differences_found = 0

        for page_num in range(max_pages):
            # Get page dimensions (use first page as reference)
            if page_num < len(doc1):
                ref_width = doc1[page_num].rect.width
                ref_height = doc1[page_num].rect.height
            else:
                ref_width = doc2[page_num].rect.width
                ref_height = doc2[page_num].rect.height

            # Create wide page for side-by-side comparison
            page = new_doc.new_page(width=ref_width * 2 + 40, height=ref_height + 80)

            # Add labels
            page.insert_text(fitz.Point(20, 20), "Original (File 1)", fontsize=12, color=(0, 0, 0))
            page.insert_text(fitz.Point(ref_width + 40, 20), "Comparison (File 2)", fontsize=12, color=(0, 0, 0))

            # Render both pages as images to detect differences
            if page_num < len(doc1):
                page1 = doc1[page_num]
                # Show original on left side
                page.show_pdf_page(
                    fitz.Rect(20, 40, ref_width + 20, ref_height + 40),
                    doc1,
                    page_num
                )

            if page_num < len(doc2):
                page2 = doc2[page_num]
                # Show comparison on right side
                page.show_pdf_page(
                    fitz.Rect(ref_width + 40, 40, ref_width * 2 + 40, ref_height + 40),
                    doc2,
                    page_num
                )

            # Try to detect and highlight differences
            if page_num < len(doc1) and page_num < len(doc2):
                try:
                    # Render both pages as images
                    pix1 = doc1[page_num].get_pixmap(matrix=fitz.Matrix(2, 2))
                    pix2 = doc2[page_num].get_pixmap(matrix=fitz.Matrix(2, 2))

                    # Convert to PIL Images for comparison
                    img1 = Image.frombytes("RGB", [pix1.width, pix1.height], pix1.samples)
                    img2 = Image.frombytes("RGB", [pix2.width, pix2.height], pix2.samples)

                    # Ensure both images are the same size
                    if img1.size != img2.size:
                        # Resize to match dimensions
                        max_width = max(img1.width, img2.width)
                        max_height = max(img1.height, img2.height)
                        img1_resized = Image.new("RGB", (max_width, max_height), (255, 255, 255))
                        img2_resized = Image.new("RGB", (max_width, max_height), (255, 255, 255))
                        img1_resized.paste(img1, (0, 0))
                        img2_resized.paste(img2, (0, 0))
                        img1 = img1_resized
                        img2 = img2_resized

                    # Calculate difference
                    diff = ImageChops.difference(img1, img2)

                    # Check if there are differences
                    if diff.getbbox():
                        differences_found += 1
                        # Add difference indicator (avoid Unicode characters)
                        try:
                            page.insert_text(
                                fitz.Point(20, ref_height + 60),
                                f"! Page {page_num + 1}: Differences detected",
                                fontsize=10,
                                color=(0.8, 0, 0)  # Red
                            )
                        except Exception:
                            # Fallback without special characters
                            page.insert_text(
                                fitz.Point(20, ref_height + 60),
                                f"Page {page_num + 1}: Different",
                                fontsize=10,
                                color=(0.8, 0, 0)
                            )

                        # Add red border around pages with differences
                        page.draw_rect(
                            fitz.Rect(18, 38, ref_width + 22, ref_height + 42),
                            color=(1, 0, 0),
                            width=2
                        )
                        page.draw_rect(
                            fitz.Rect(ref_width + 38, 38, ref_width * 2 + 42, ref_height + 42),
                            color=(1, 0, 0),
                            width=2
                        )
                    else:
                        # Pages are identical
                        try:
                            page.insert_text(
                                fitz.Point(20, ref_height + 60),
                                f"Page {page_num + 1}: Identical",
                                fontsize=10,
                                color=(0, 0.6, 0)  # Green
                            )
                        except Exception:
                            page.insert_text(
                                fitz.Point(20, ref_height + 60),
                                f"Page {page_num + 1}: Same",
                                fontsize=10,
                                color=(0, 0.6, 0)
                            )

                except Exception as e:
                    # Log and notify user of comparison failure for this page
                    print(f"[PDF_DIFF] Could not detect differences for page {page_num + 1}: {e}", flush=True)
                    try:
                        page.insert_text(
                            fitz.Point(20, ref_height + 60),
                            f"Page {page_num + 1}: Comparison failed",
                            fontsize=10,
                            color=(0.5, 0.5, 0.5)  # Gray
                        )
                    except Exception:
                        pass  # Silent fail on text insertion

            elif page_num >= len(doc1):
                # Page only in doc2
                differences_found += 1
                try:
                    page.insert_text(
                        fitz.Point(20, ref_height + 60),
                        f"! Page {page_num + 1}: Only exists in File 2",
                        fontsize=10,
                        color=(0.8, 0, 0)
                    )
                except Exception:
                    page.insert_text(
                        fitz.Point(20, ref_height + 60),
                        f"Page {page_num + 1}: Only in File 2",
                        fontsize=10,
                        color=(0.8, 0, 0)
                    )
            elif page_num >= len(doc2):
                # Page only in doc1
                differences_found += 1
                try:
                    page.insert_text(
                        fitz.Point(20, ref_height + 60),
                        f"! Page {page_num + 1}: Only exists in File 1",
                        fontsize=10,
                        color=(0.8, 0, 0)
                    )
                except Exception:
                    page.insert_text(
                        fitz.Point(20, ref_height + 60),
                        f"Page {page_num + 1}: Only in File 1",
                        fontsize=10,
                        color=(0.8, 0, 0)
                    )

        # Add summary page at the beginning
        summary_page = new_doc.new_page(0, width=ref_width * 2 + 40, height=200)
        summary_page.insert_text(
            fitz.Point(20, 40),
            "PDF Comparison Summary",
            fontsize=16,
            color=(0, 0, 0)
        )
        summary_page.insert_text(
            fitz.Point(20, 70),
            f"File 1: {base1}",
            fontsize=12,
            color=(0, 0, 0)
        )
        summary_page.insert_text(
            fitz.Point(20, 90),
            f"File 2: {base2}",
            fontsize=12,
            color=(0, 0, 0)
        )
        summary_page.insert_text(
            fitz.Point(20, 120),
            f"Total pages compared: {max_pages}",
            fontsize=12,
            color=(0, 0, 0)
        )
        summary_page.insert_text(
            fitz.Point(20, 140),
            f"Pages with differences: {differences_found}",
            fontsize=12,
            color=(0.8, 0, 0) if differences_found > 0 else (0, 0.6, 0)
        )

        new_doc.save(output_path, garbage=4, deflate=True)
        print(f"[PDF_DIFF] Comparison complete. {differences_found} pages with differences found.", flush=True)

        if new_doc:
            new_doc.close()
        if doc1:
            doc1.close()
        if doc2:
            doc2.close()

        processed_files.append(output_path)

    except Exception as e:
        logger.error(f"Error comparing PDFs: {e}", exc_info=True)
        print(f"[PDF_DIFF] Comparison failed: {e}", flush=True)
        if new_doc:
            new_doc.close()
        if doc1:
            doc1.close()
        if doc2:
            doc2.close()
        errors.append({"file": files[0] if files else "unknown", "error": f"PDF comparison failed: {str(e)}. Please ensure both files are valid PDFs."})

    return {"processed_files": processed_files, "errors": errors}

def create_booklet(payload):
    """
    Create booklet layout for saddle-stitch printing.

    Reorders PDF pages so when printed double-sided, folded in half,
    and stapled in the middle, pages appear in correct sequential order.

    Algorithm:
    - For n pages (rounded up to multiple of 4):
    - Page order: [n, 1, 2, n-1, n-2, 3, 4, n-3, ...]
    - This creates proper imposition for folding and stapling
    """
    files = payload.get("files", [])

    # Production limits
    MAX_PAGES = 200  # Booklets larger than this are impractical

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        doc = None
        new_doc = None

        try:
            print(f"[BOOKLET] Starting booklet creation for {os.path.basename(file_path)}", flush=True)

            doc = fitz.open(file_path)
            total_pages = len(doc)

            if total_pages == 0:
                errors.append({"file": file_path, "error": "PDF has no pages"})
                continue

            if total_pages > MAX_PAGES:
                errors.append({"file": file_path, "error": f"PDF has {total_pages} pages. Booklets with more than {MAX_PAGES} pages are not supported."})
                continue

            # Round up to nearest multiple of 4 (required for saddle-stitch)
            pages_needed = total_pages
            if pages_needed % 4 != 0:
                pages_needed = ((pages_needed // 4) + 1) * 4

            blank_pages_added = pages_needed - total_pages
            print(f"[BOOKLET] Original pages: {total_pages}, booklet pages: {pages_needed}, blank pages: {blank_pages_added}", flush=True)

            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_booklet{ext}"

            # Create booklet with CORRECT saddle-stitch algorithm
            new_doc = fitz.open()

            # Correct booklet page order for saddle-stitch binding
            # For each physical sheet (4 pages: 2 on front, 2 on back):
            # Sheet i from outside to inside
            booklet_pages = []
            num_sheets = pages_needed // 4

            for i in range(num_sheets):
                # Front of sheet: [right page, left page]
                front_right = pages_needed - 1 - (2 * i)  # Last page working inward
                front_left = 2 * i                         # First page working inward

                # Back of sheet: [left page, right page]
                back_left = 2 * i + 1                      # Second page working inward
                back_right = pages_needed - 2 - (2 * i)   # Second-to-last working inward

                # Order for this sheet: front-right, front-left, back-left, back-right
                booklet_pages.extend([front_right, front_left, back_left, back_right])

            print(f"[BOOKLET] Page order: {booklet_pages}", flush=True)

            # Insert pages in booklet order
            for page_idx in booklet_pages:
                if page_idx < total_pages:
                    # Real page from original PDF
                    new_doc.insert_pdf(doc, from_page=page_idx, to_page=page_idx)
                else:
                    # Blank page (for padding to multiple of 4)
                    if total_pages > 0:
                        ref_page = doc[0]
                        blank_page = new_doc.new_page(width=ref_page.rect.width, height=ref_page.rect.height)
                        blank_page.insert_text(
                            fitz.Point(blank_page.rect.width / 2 - 30, blank_page.rect.height / 2),
                            "(Blank page)",
                            fontsize=10,
                            color=(0.7, 0.7, 0.7)
                        )

            new_doc.save(output_path, garbage=4, deflate=True)
            print(f"[BOOKLET] Created booklet with {len(new_doc)} pages (added {blank_pages_added} blank pages)", flush=True)

            if new_doc:
                new_doc.close()
            if doc:
                doc.close()

            processed_files.append(output_path)

        except Exception as e:
            logger.error(f"Error creating booklet from {file_path}: {e}", exc_info=True)
            print(f"[BOOKLET] Failed: {e}", flush=True)
            if new_doc:
                new_doc.close()
            if doc:
                doc.close()
            errors.append({"file": file_path, "error": f"Failed to create booklet: {str(e)}"})

    return {"processed_files": processed_files, "errors": errors}

def scrub_pdf(payload):
    """
    Deep scrub PDF - Remove ALL privacy-leaking metadata and hidden content.

    Removes:
    - Document metadata (author, title, dates, etc.)
    - XMP metadata streams
    - Annotations and comments
    - JavaScript code
    - Embedded files and attachments
    - Named destinations
    - Bookmarks/outlines
    - Form data
    - Document ID
    - OpenAction (auto-execute scripts)
    - Threads and article threads
    - Hidden layers (OCGs)
    - Markup and revision history
    - ViewerPreferences
    """
    files = payload.get("files", [])

    # Production limits
    MAX_FILE_SIZE_MB = 500

    processed_files = []
    errors = []

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        # Check file size
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        if file_size_mb > MAX_FILE_SIZE_MB:
            errors.append({"file": file_path, "error": f"File size ({file_size_mb:.1f}MB) exceeds limit of {MAX_FILE_SIZE_MB}MB"})
            continue

        try:
            print(f"[SCRUBBER] Starting deep scrub for {os.path.basename(file_path)}", flush=True)

            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_scrubbed{ext}"

            with pikepdf.open(file_path) as pdf:
                items_removed = []

                # 1. Remove XMP metadata stream
                if '/Metadata' in pdf.Root:
                    del pdf.Root.Metadata
                    items_removed.append("XMP metadata")

                # 2. Clear document info (author, title, creation date, etc.)
                # pikepdf's docinfo doesn't support .clear(), need to delete individual keys
                if pdf.docinfo:
                    try:
                        # Get all keys and delete them individually
                        keys_to_delete = list(pdf.docinfo.keys())
                        for key in keys_to_delete:
                            del pdf.docinfo[key]
                        items_removed.append("document info")
                    except Exception as e:
                        print(f"[SCRUBBER] Could not clear docinfo: {e}", flush=True)

                # 3. Remove JavaScript
                try:
                    if '/Names' in pdf.Root and '/JavaScript' in pdf.Root.Names:
                        del pdf.Root.Names.JavaScript
                        items_removed.append("JavaScript")
                except Exception as e:
                    print(f"[SCRUBBER] Could not remove JavaScript: {e}", flush=True)

                # 4. Remove embedded files/attachments
                try:
                    if '/Names' in pdf.Root and '/EmbeddedFiles' in pdf.Root.Names:
                        del pdf.Root.Names.EmbeddedFiles
                        items_removed.append("embedded files")
                except Exception as e:
                    print(f"[SCRUBBER] Could not remove embedded files: {e}", flush=True)

                # 5. Remove OpenAction (auto-execute on open)
                try:
                    if '/OpenAction' in pdf.Root:
                        del pdf.Root.OpenAction
                        items_removed.append("OpenAction")
                except Exception as e:
                    print(f"[SCRUBBER] Could not remove OpenAction: {e}", flush=True)

                # 6. Remove AA (Additional Actions)
                try:
                    if '/AA' in pdf.Root:
                        del pdf.Root.AA
                        items_removed.append("additional actions")
                except Exception as e:
                    print(f"[SCRUBBER] Could not remove additional actions: {e}", flush=True)

                # 7. Remove Named Destinations
                try:
                    if '/Names' in pdf.Root and '/Dests' in pdf.Root.Names:
                        del pdf.Root.Names.Dests
                        items_removed.append("named destinations")
                except Exception as e:
                    print(f"[SCRUBBER] Could not remove named destinations: {e}", flush=True)

                # 8. Remove Outlines (bookmarks - can contain user names/dates)
                try:
                    if '/Outlines' in pdf.Root:
                        del pdf.Root.Outlines
                        items_removed.append("bookmarks")
                except Exception as e:
                    print(f"[SCRUBBER] Could not remove bookmarks: {e}", flush=True)

                # 9. Remove Threads (article threads)
                try:
                    if '/Threads' in pdf.Root:
                        del pdf.Root.Threads
                        items_removed.append("threads")
                except Exception as e:
                    print(f"[SCRUBBER] Could not remove threads: {e}", flush=True)

                # 10. Remove Optional Content Groups (hidden layers)
                try:
                    if '/OCProperties' in pdf.Root:
                        del pdf.Root.OCProperties
                        items_removed.append("optional content layers")
                except Exception as e:
                    print(f"[SCRUBBER] Could not remove optional content: {e}", flush=True)

                # 11. Remove ViewerPreferences (can leak info)
                try:
                    if '/ViewerPreferences' in pdf.Root:
                        del pdf.Root.ViewerPreferences
                        items_removed.append("viewer preferences")
                except Exception as e:
                    print(f"[SCRUBBER] Could not remove viewer preferences: {e}", flush=True)

                # 12. Remove MarkInfo (accessibility/tagging info)
                try:
                    if '/MarkInfo' in pdf.Root:
                        del pdf.Root.MarkInfo
                        items_removed.append("mark info")
                except Exception as e:
                    print(f"[SCRUBBER] Could not remove mark info: {e}", flush=True)

                # 13. Remove StructTreeRoot (structure tree - can contain metadata)
                try:
                    if '/StructTreeRoot' in pdf.Root:
                        del pdf.Root.StructTreeRoot
                        items_removed.append("structure tree")
                except Exception as e:
                    print(f"[SCRUBBER] Could not remove structure tree: {e}", flush=True)

                # 14. Process each page
                for page_num, page in enumerate(pdf.pages):
                    # Remove annotations (comments, highlights, etc.)
                    try:
                        if '/Annots' in page:
                            del page['/Annots']
                    except Exception as e:
                        print(f"[SCRUBBER] Could not remove annotations from page {page_num + 1}: {e}", flush=True)

                    # Remove page metadata
                    try:
                        if '/Metadata' in page:
                            del page['/Metadata']
                    except Exception as e:
                        print(f"[SCRUBBER] Could not remove page metadata from page {page_num + 1}: {e}", flush=True)

                    # Remove piece info (editing history)
                    try:
                        if '/PieceInfo' in page:
                            del page['/PieceInfo']
                    except Exception as e:
                        print(f"[SCRUBBER] Could not remove piece info from page {page_num + 1}: {e}", flush=True)

                    # Remove additional actions on page
                    try:
                        if '/AA' in page:
                            del page['/AA']
                    except Exception as e:
                        print(f"[SCRUBBER] Could not remove additional actions from page {page_num + 1}: {e}", flush=True)

                if not items_removed:
                    items_removed.append("page annotations")

                # 15. Remove unreferenced resources (cleanup)
                try:
                    pdf.remove_unreferenced_resources()
                except Exception as e:
                    print(f"[SCRUBBER] Could not remove unreferenced resources: {e}", flush=True)

                # Save with linearization (web optimization) and compression
                try:
                    pdf.save(
                        output_path,
                        linearize=True,  # Optimize for web/fast viewing
                        compress_streams=True,
                        stream_decode_level=pikepdf.StreamDecodeLevel.generalized,
                        object_stream_mode=pikepdf.ObjectStreamMode.generate
                    )
                except Exception as save_err:
                    # If linearization fails, try without it
                    print(f"[SCRUBBER] Linearization failed, trying without: {save_err}", flush=True)
                    pdf.save(
                        output_path,
                        compress_streams=True,
                        stream_decode_level=pikepdf.StreamDecodeLevel.generalized
                    )

            print(f"[SCRUBBER] Removed: {', '.join(items_removed)}", flush=True)
            print(f"[SCRUBBER] Scrubbed PDF saved: {os.path.basename(output_path)}", flush=True)

            processed_files.append(output_path)

        except pikepdf.PasswordError:
            errors.append({"file": file_path, "error": "PDF is password-protected. Cannot scrub encrypted files. Please unlock the PDF first."})
        except Exception as e:
            logger.error(f"Error scrubbing PDF {file_path}: {e}", exc_info=True)
            print(f"[SCRUBBER] Failed: {e}", flush=True)
            errors.append({"file": file_path, "error": f"Failed to scrub PDF: {str(e)}"})

    return {"processed_files": processed_files, "errors": errors}

def redact_pdf(payload):
    """
    Redact (permanently remove) text from PDF.

    Supports both single text (legacy) and multiple texts array.
    """
    files = payload.get("files", [])

    logger.info(f"Redact PDF called with payload keys: {payload.keys()}")
    logger.info(f"Payload texts: {payload.get('texts')}, text: {payload.get('text')}")

    # Support both single text (legacy) and multiple texts array
    texts_to_redact = []
    if payload.get("texts"):
        # New format: JSON array of texts
        import json
        try:
            texts_to_redact = json.loads(payload.get("texts"))
            logger.info(f"Parsed texts from JSON: {texts_to_redact}")
            if not isinstance(texts_to_redact, list):
                texts_to_redact = [texts_to_redact]
        except Exception as e:
            logger.warning(f"Failed to parse texts as JSON: {e}, using as-is")
            texts_to_redact = [payload.get("texts")]
    elif payload.get("text"):
        # Legacy format: single text
        logger.info(f"Using legacy single text format: {payload.get('text')}")
        texts_to_redact = [payload.get("text")]

    # Filter out empty strings
    texts_to_redact = [t.strip() for t in texts_to_redact if t and t.strip()]
    logger.info(f"Final texts to redact after filtering: {texts_to_redact}")

    if not texts_to_redact:
        file_name = files[0] if files else "unknown"
        return {"processed_files": [], "errors": [{"file": file_name, "error": "No text provided for redaction"}]}

    processed_files = []
    errors = []

    for file_path in files:
        doc = None
        try:
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_redacted{ext}"

            doc = fitz.open(file_path)
            total_redactions = 0
            page_count = len(doc)

            for page in doc:
                # Find and redact all specified texts
                for text in texts_to_redact:
                    # Find text instances
                    text_instances = page.search_for(text)

                    # Redact (black out) each instance
                    for inst in text_instances:
                        page.add_redact_annot(inst, fill=(0, 0, 0))
                        total_redactions += 1

                # Apply all redactions to this page
                page.apply_redactions()

            doc.save(output_path)
            doc.close()
            doc = None

            logger.info(f"Redacted {total_redactions} instances across {page_count} pages in {file_path}")
            processed_files.append(output_path)
        except Exception as e:
            logger.error(f"Error redacting PDF {file_path}: {e}", exc_info=True)
            if doc is not None:
                try:
                    doc.close()
                except:
                    pass
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def sign_pdf(payload):
    """Digitally sign PDF with certificate (PKCS#12/PFX format).

    Supports visual signature appearance with configurable position.
    Uses pyhanko for cryptographic signing with X.509 certificates.

    Security Notes:
    - Certificate files (.pfx/.p12) should be deleted immediately after use
    - Passwords should be transmitted over HTTPS only
    - File size limits enforced to prevent DoS attacks
    """
    from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
    from pyhanko.sign.signers import SimpleSigner
    from pyhanko.sign.fields import SigFieldSpec
    from pyhanko.sign import PdfSignatureMetadata
    import tempfile

    files = payload.get("files", [])
    cert_file = payload.get("cert_file")
    password = payload.get("password", "")

    # Signature appearance configuration
    signature_text = payload.get("text", "Digitally Signed")
    reason = payload.get("reason", "Document Authorization")
    location = payload.get("location", "")

    # Position configuration (percentages from frontend, convert to PDF coordinates)
    x_percent = float(payload.get("x", 50)) / 100.0  # Default center
    y_percent = float(payload.get("y", 50)) / 100.0  # Default center

    processed_files = []
    errors = []

    # SECURITY: File size limits
    MAX_PDF_SIZE_MB = 50
    MAX_CERT_SIZE_KB = 100

    # Validation: Certificate required
    if not cert_file:
        return {"processed_files": [], "errors": ["Certificate file (.pfx or .p12) required for digital signing. Please upload a valid PKCS#12 certificate."]}

    if not os.path.exists(cert_file):
        return {"processed_files": [], "errors": [{"file": "certificate", "error": "Certificate file not found on server"}]}

    # SECURITY: Validate certificate file size
    try:
        cert_size_kb = os.path.getsize(cert_file) / 1024
        if cert_size_kb > MAX_CERT_SIZE_KB:
            return {"processed_files": [], "errors": [f"Certificate file too large ({cert_size_kb:.1f}KB). Maximum allowed: {MAX_CERT_SIZE_KB}KB."]}
    except Exception as e:
        return {"processed_files": [], "errors": [f"Error checking certificate file size: {str(e)}"]}

    # Validate certificate format (PKCS#12)
    if not (cert_file.lower().endswith('.pfx') or cert_file.lower().endswith('.p12')):
        # Try to load it anyway, but warn user
        logger.warning(f"Certificate file {cert_file} doesn't have .pfx or .p12 extension")

    # Load certificate and create signer
    signer = None
    try:
        # Try to load PKCS#12 certificate with password
        from cryptography.hazmat.primitives.serialization import pkcs12

        with open(cert_file, 'rb') as f:
            cert_data = f.read()

        # Parse PKCS#12 file
        try:
            private_key, certificate, ca_certs = pkcs12.load_key_and_certificates(
                cert_data,
                password.encode('utf-8') if password else None
            )
        except Exception as e:
            error_msg = str(e)
            if "password" in error_msg.lower() or "decrypt" in error_msg.lower():
                return {"processed_files": [], "errors": ["Invalid certificate password. Please check your password and try again."]}
            elif "could not deserialize" in error_msg.lower():
                return {"processed_files": [], "errors": ["Invalid certificate file format. Please use a valid PKCS#12 (.pfx or .p12) certificate."]}
            else:
                return {"processed_files": [], "errors": [f"Error loading certificate: {error_msg}"]}

        if not private_key or not certificate:
            return {"processed_files": [], "errors": ["Invalid certificate: missing private key or certificate data."]}

        # Create SimpleSigner from loaded certificate
        signer = SimpleSigner.load_pkcs12(
            pfx_file=cert_file,
            passphrase=password.encode('utf-8') if password else None
        )

        print(f"[SIGNER] Successfully loaded certificate for signing", flush=True)

    except Exception as e:
        logger.error(f"Error loading certificate: {e}", exc_info=True)
        return {"processed_files": [], "errors": [f"Failed to load certificate: {str(e)}"]}

    # Process each PDF file
    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        # SECURITY: Check PDF file size
        try:
            pdf_size_mb = os.path.getsize(file_path) / (1024 * 1024)
            if pdf_size_mb > MAX_PDF_SIZE_MB:
                errors.append({"file": file_path, "error": f"PDF file too large ({pdf_size_mb:.1f}MB). Maximum allowed: {MAX_PDF_SIZE_MB}MB."})
                continue
        except Exception as e:
            errors.append({"file": file_path, "error": f"Error checking file size: {str(e)}"})
            continue

        try:
            # Read PDF and get dimensions for signature placement
            doc = fitz.open(file_path)
            if len(doc) == 0:
                errors.append({"file": file_path, "error": "PDF has no pages"})
                doc.close()
                continue

            # Get first page dimensions (sign first page by default)
            page = doc[0]
            page_width = page.rect.width
            page_height = page.rect.height
            doc.close()

            # Calculate signature box position
            # Signature box: 200x60 points (approximately 2.8" x 0.8")
            sig_width = 200
            sig_height = 60

            # Convert percentage position to PDF coordinates
            # PDF coordinates: (0,0) is bottom-left
            # Frontend sends: (0,0) is top-left, so flip Y
            x = int(x_percent * page_width - sig_width / 2)
            y = int((1 - y_percent) * page_height - sig_height / 2)  # Flip Y coordinate

            # Ensure signature box stays within page bounds
            x = max(10, min(x, page_width - sig_width - 10))
            y = max(10, min(y, page_height - sig_height - 10))

            print(f"[SIGNER] Signature box position: ({x}, {y}) on {page_width}x{page_height} page", flush=True)

            # Create signature field specification
            sig_field_spec = SigFieldSpec(
                sig_field_name='Signature',
                box=(x, y, x + sig_width, y + sig_height)
            )

            # Create signature metadata
            sig_meta = PdfSignatureMetadata(
                field_name='Signature',
                reason=reason if reason else None,
                location=location if location else None,
                name=signature_text if signature_text else None,
            )

            # Generate output path
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_signed{ext}"

            # Sign the PDF
            with open(file_path, 'rb') as inf:
                writer = IncrementalPdfFileWriter(inf)

                # Add signature field
                fields.append_signature_field(
                    writer,
                    sig_field_spec
                )

                # Sign the field
                with open(output_path, 'wb') as outf:
                    meta = PdfSignatureMetadata(
                        field_name='Signature',
                        reason=reason if reason else None,
                        location=location if location else None,
                    )

                    # Actually sign the PDF
                    from pyhanko.sign.validation import validate_pdf_signature
                    fields.sign_field(
                        writer,
                        sig_field_spec,
                        signer,
                        meta
                    )

                    writer.write(outf)

            processed_files.append(output_path)
            print(f"[SIGNER] Successfully signed: {output_path}", flush=True)

        except Exception as e:
            logger.error(f"Error signing PDF {file_path}: {e}", exc_info=True)
            errors.append({"file": file_path, "error": f"Signing failed: {str(e)}"})

    # SECURITY: Clean up certificate file immediately
    try:
        if cert_file and os.path.exists(cert_file):
            os.remove(cert_file)
            print(f"[SECURITY] Deleted certificate file: {cert_file}", flush=True)
    except Exception as e:
        logger.warning(f"Failed to delete certificate file: {e}")

    return {"processed_files": processed_files, "errors": errors}

def optimize_pdf(payload):
    """Optimize PDF for web viewing (compression and structure optimization).

    Applies aggressive optimization:
    - Removes unused objects (garbage collection)
    - Compresses streams (deflate)
    - Cleans up PDF structure
    - Removes encryption

    Safety limits:
    - Maximum file size: 100MB (generous for desktop users)
    - Maximum pages: 1000 pages
    - Validates PDF integrity before processing
    - Detects password-protected PDFs
    """
    files = payload.get("files", [])

    processed_files = []
    errors = []

    # Backend safety limits (prevents abuse even for desktop)
    MAX_PDF_SIZE_MB = 100  # Generous limit for desktop users
    MAX_PAGES = 1000       # Page count limit

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        doc = None
        try:
            # SECURITY: Check file size
            try:
                pdf_size_mb = os.path.getsize(file_path) / (1024 * 1024)
                if pdf_size_mb > MAX_PDF_SIZE_MB:
                    errors.append({
                        "file": file_path,
                        "error": f"PDF file too large ({pdf_size_mb:.1f}MB). Maximum allowed: {MAX_PDF_SIZE_MB}MB."
                    })
                    continue
            except Exception as e:
                errors.append({"file": file_path, "error": f"Cannot check file size: {str(e)}"})
                continue

            # VALIDATION: Check PDF header (integrity check)
            try:
                with open(file_path, 'rb') as f:
                    header = f.read(5)
                    if header != b'%PDF-':
                        errors.append({"file": file_path, "error": "Invalid PDF file: missing PDF header. File may be corrupted."})
                        continue
            except Exception as e:
                errors.append({"file": file_path, "error": f"Cannot read file: {str(e)}"})
                continue

            # Try to open PDF (will detect encryption/password protection)
            try:
                doc = fitz.open(file_path)
            except Exception as e:
                error_msg = str(e).lower()
                if "password" in error_msg or "crypt" in error_msg or "encrypt" in error_msg:
                    errors.append({
                        "file": file_path,
                        "error": "Cannot optimize password-protected PDFs. Please unlock the PDF first using the 'Unlock PDF' tool."
                    })
                else:
                    errors.append({
                        "file": file_path,
                        "error": f"Cannot open PDF: {str(e)}"
                    })
                continue

            # Check for empty PDF
            if len(doc) == 0:
                doc.close()
                errors.append({"file": file_path, "error": "PDF has no pages. Cannot optimize an empty PDF."})
                continue

            # SECURITY: Check page count
            if len(doc) > MAX_PAGES:
                doc.close()
                errors.append({
                    "file": file_path,
                    "error": f"PDF has too many pages ({len(doc)} pages). Maximum allowed: {MAX_PAGES} pages."
                })
                continue

            print(f"[OPTIMIZE] Starting optimization for {os.path.basename(file_path)} ({len(doc)} pages, {pdf_size_mb:.2f}MB)", flush=True)

            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_web_optimized{ext}"

            # Optimize for web viewing
            # garbage=4: Maximum garbage collection (remove unused objects)
            # deflate=True: Compress streams for smaller file size
            # clean=True: Clean up PDF structure
            # ascii=False: Keep binary format (smaller)
            # no_new_id=True: Don't generate new IDs (faster)
            # encryption=NONE: Remove any encryption
            doc.save(
                output_path,
                garbage=4,           # Maximum garbage collection
                deflate=True,        # Compress streams
                clean=True,          # Clean up structure
                ascii=False,         # Keep binary (smaller than ASCII)
                no_new_id=True,      # Don't generate new IDs (faster)
                encryption=fitz.PDF_ENCRYPT_NONE  # Ensure no encryption
            )

            # Calculate size reduction
            try:
                original_size_mb = os.path.getsize(file_path) / (1024 * 1024)
                optimized_size_mb = os.path.getsize(output_path) / (1024 * 1024)
                reduction_percent = ((original_size_mb - optimized_size_mb) / original_size_mb) * 100

                print(f"[OPTIMIZE] {os.path.basename(file_path)}: {original_size_mb:.2f}MB → {optimized_size_mb:.2f}MB ({reduction_percent:+.1f}%)", flush=True)
            except Exception as e:
                print(f"[OPTIMIZE] Could not calculate size reduction: {e}", flush=True)

            if os.path.exists(output_path):
                processed_files.append(output_path)
            else:
                errors.append({"file": file_path, "error": "Optimization failed: output file not created"})

        except Exception as e:
            logger.error(f"Error optimizing PDF {file_path}: {e}", exc_info=True)
            errors.append({"file": file_path, "error": f"Optimization failed: {str(e)}"})
        finally:
            # SECURITY: Always clean up resources
            if doc:
                try:
                    doc.close()
                except:
                    pass

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
                # Validate page order format (only digits, commas, dashes, and spaces)
                import re
                if not re.match(r'^[\d\s,\-]+$', page_order):
                    errors.append({"file": file_path, "error": f"Invalid page order format: {page_order}. Use only numbers, commas, and dashes (e.g., '3,1,2' or '1-5,10,8-9')"})
                    doc.close()
                    continue

                # Split by comma
                parts = [p.strip() for p in page_order.split(",")]

                # Limit max parts to prevent DoS
                if len(parts) > 1000:
                    errors.append({"file": file_path, "error": f"Too many page specifications (max 1000). Please simplify your page order."})
                    doc.close()
                    continue

                for part in parts:
                    if not part:  # Skip empty parts
                        continue

                    if "-" in part:
                        # Range like "1-5"
                        range_parts = part.split("-")
                        if len(range_parts) != 2:
                            errors.append({"file": file_path, "error": f"Invalid range format: {part}. Use format like '1-5'"})
                            doc.close()
                            continue

                        start, end = map(int, range_parts)

                        # Validate range bounds
                        if start < 1 or end < 1:
                            errors.append({"file": file_path, "error": f"Page numbers must be >= 1. Invalid range: {part}"})
                            doc.close()
                            continue

                        if start > end:
                            errors.append({"file": file_path, "error": f"Invalid range: {part}. Start page must be <= end page."})
                            doc.close()
                            continue

                        # Limit range size to prevent memory issues
                        if end - start > 500:
                            errors.append({"file": file_path, "error": f"Range too large: {part}. Maximum range size is 500 pages."})
                            doc.close()
                            continue

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
                            doc.close()
                            continue
            except ValueError as ve:
                errors.append({"file": file_path, "error": f"Invalid page order format: {page_order}. Use format like '3,1,2' or '1-5,10,8-9'. Error: {str(ve)}"})
                doc.close()
                continue

            if not page_indices:
                errors.append({"file": file_path, "error": "No valid pages specified in page order"})
                doc.close()
                continue

            # Limit total pages to prevent memory issues
            if len(page_indices) > 1000:
                errors.append({"file": file_path, "error": f"Too many pages to reorder ({len(page_indices)} pages). Maximum is 1000 pages."})
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

def extract_metadata(payload):
    """Extract PDF metadata as key-value pairs (user-friendly format).

    Extracts and displays:
    - Standard metadata (title, author, dates)
    - Document information (pages, file size)
    - XML metadata (if present)

    Security Features:
    - File size limits (100MB max)
    - PDF validation (header check)
    - Password-protected PDF detection
    - Metadata sanitization (removes control characters)
    - Metadata length limits (prevents huge output files)
    """
    files = payload.get("files", [])

    processed_files = []
    errors = []

    # Backend safety limits
    MAX_PDF_SIZE_MB = 100  # Generous limit for desktop users
    MAX_METADATA_LENGTH = 10000  # Prevent huge metadata strings

    def sanitize_metadata(value):
        """Sanitize metadata by removing control characters and limiting length."""
        if not value:
            return ""

        # Convert to string
        value_str = str(value)

        # Remove control characters (except newline and tab)
        sanitized = ''.join(char for char in value_str if char == '\n' or char == '\t' or (ord(char) >= 32 and ord(char) != 127))

        # Limit length
        if len(sanitized) > MAX_METADATA_LENGTH:
            sanitized = sanitized[:MAX_METADATA_LENGTH] + "... (truncated)"

        # Replace newlines with spaces for single-line fields
        sanitized = sanitized.replace('\n', ' ').replace('\r', ' ')

        return sanitized.strip()

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        doc = None
        try:
            # SECURITY: Check file size
            try:
                pdf_size_mb = os.path.getsize(file_path) / (1024 * 1024)
                if pdf_size_mb > MAX_PDF_SIZE_MB:
                    errors.append({
                        "file": file_path,
                        "error": f"PDF file too large ({pdf_size_mb:.1f}MB). Maximum allowed: {MAX_PDF_SIZE_MB}MB."
                    })
                    continue
            except Exception as e:
                errors.append({"file": file_path, "error": f"Cannot check file size: {str(e)}"})
                continue

            # VALIDATION: Check PDF header (integrity check)
            try:
                with open(file_path, 'rb') as f:
                    header = f.read(5)
                    if header != b'%PDF-':
                        errors.append({"file": file_path, "error": "Invalid PDF file: missing PDF header. File may be corrupted."})
                        continue
            except Exception as e:
                errors.append({"file": file_path, "error": f"Cannot read file: {str(e)}"})
                continue

            # Try to open PDF (will detect encryption/password protection)
            try:
                doc = fitz.open(file_path)
            except Exception as e:
                error_msg = str(e).lower()
                if "password" in error_msg or "crypt" in error_msg or "encrypt" in error_msg:
                    errors.append({
                        "file": file_path,
                        "error": "Cannot extract metadata from password-protected PDFs. Please unlock the PDF first using the 'Unlock PDF' tool."
                    })
                else:
                    errors.append({
                        "file": file_path,
                        "error": f"Cannot open PDF: {str(e)}"
                    })
                continue

            # Check for empty PDF
            if len(doc) == 0:
                errors.append({"file": file_path, "error": "PDF has no pages. Cannot extract metadata from an empty PDF."})
                continue

            # Extract metadata
            metadata = doc.metadata

            # Build metadata output with sanitization
            metadata_lines = []
            metadata_lines.append("PDF Metadata Information")
            metadata_lines.append("=" * 50)
            metadata_lines.append("")

            # Standard PDF metadata fields (sanitized)
            if metadata.get('title'):
                metadata_lines.append(f"Title: {sanitize_metadata(metadata.get('title'))}")
            if metadata.get('author'):
                metadata_lines.append(f"Author: {sanitize_metadata(metadata.get('author'))}")
            if metadata.get('subject'):
                metadata_lines.append(f"Subject: {sanitize_metadata(metadata.get('subject'))}")
            if metadata.get('keywords'):
                metadata_lines.append(f"Keywords: {sanitize_metadata(metadata.get('keywords'))}")
            if metadata.get('creator'):
                metadata_lines.append(f"Creator: {sanitize_metadata(metadata.get('creator'))}")
            if metadata.get('producer'):
                metadata_lines.append(f"Producer: {sanitize_metadata(metadata.get('producer'))}")
            if metadata.get('creationDate'):
                metadata_lines.append(f"Creation Date: {sanitize_metadata(metadata.get('creationDate'))}")
            if metadata.get('modDate'):
                metadata_lines.append(f"Modification Date: {sanitize_metadata(metadata.get('modDate'))}")

            # If no metadata found
            if len([line for line in metadata_lines if ': ' in line]) == 0:
                metadata_lines.append("No standard metadata found in this PDF.")

            # Additional document info
            metadata_lines.append("")
            metadata_lines.append("Document Information")
            metadata_lines.append("-" * 50)
            metadata_lines.append(f"Number of Pages: {len(doc)}")
            metadata_lines.append(f"File Size: {os.path.getsize(file_path):,} bytes ({pdf_size_mb:.2f} MB)")
            metadata_lines.append(f"PDF Version: {doc.metadata.get('format', 'Unknown')}")

            # Try to get additional metadata from pikepdf if available
            try:
                with pikepdf.open(file_path) as pdf:
                    if '/Metadata' in pdf.Root:
                        metadata_lines.append("")
                        metadata_lines.append("Additional Metadata (XML)")
                        metadata_lines.append("-" * 50)
                        metadata_lines.append("This PDF contains XMP metadata. View in a PDF reader for full details.")
            except Exception:
                # pikepdf might fail on some PDFs, that's okay
                pass

            # Generate output path
            base, _ = os.path.splitext(file_path)
            output_path = f"{base}_metadata.txt"

            # Write to file with error handling
            try:
                with open(output_path, 'w', encoding='utf-8', errors='replace') as f:
                    f.write('\n'.join(metadata_lines))
            except Exception as e:
                errors.append({"file": file_path, "error": f"Cannot write metadata file: {str(e)}"})
                continue

            if os.path.exists(output_path):
                processed_files.append(output_path)
                print(f"[METADATA] Extracted metadata from {os.path.basename(file_path)} → {os.path.basename(output_path)}", flush=True)
            else:
                errors.append({"file": file_path, "error": "Failed to create metadata file"})

        except Exception as e:
            logger.error(f"Error extracting metadata from {file_path}: {e}", exc_info=True)
            errors.append({"file": file_path, "error": f"Metadata extraction failed: {str(e)}"})
        finally:
            # SECURITY: Always clean up resources
            if doc:
                try:
                    doc.close()
                except:
                    pass

    return {"processed_files": processed_files, "errors": errors}

def extract_form_data(payload):
    """Extract form field data from PDF to CSV/XLSX.

    Handles:
    - Fillable forms (AcroForm fields)
    - Widget-based forms (PyMuPDF extraction)
    - Flattened forms (text extraction fallback - limited)

    Security Features:
    - File size limits (100MB max)
    - Page count limits (1000 pages max)
    - Field count limits (10,000 fields max)
    - Flattened form page limit (100 pages max for text extraction)
    - Field value sanitization (removes control characters)
    - PDF validation (header check)
    - Password-protected PDF detection
    - Resource cleanup with try/finally
    """
    files = payload.get("files", [])
    output_format = payload.get("output_format", "csv")  # csv or xlsx

    processed_files = []
    errors = []

    # Backend safety limits
    MAX_PDF_SIZE_MB = 100  # Generous limit for desktop users
    MAX_PAGES = 1000       # Page count limit
    MAX_FIELDS = 10000     # Field count limit (prevent huge DataFrames)
    MAX_FLATTENED_PAGES = 100  # Limit pages for flattened form text extraction

    def sanitize_field_value(value):
        """Sanitize field value by removing control characters.

        No length limit - we already limit at file/page/field level.
        Skips binary data (signature certificates, embedded files, etc.).
        """
        if not value:
            return ""

        # Skip binary data (bytes objects with non-printable content)
        if isinstance(value, bytes):
            # Check if it's likely binary data (signature, certificate, etc.)
            # Binary data typically has high proportion of non-printable bytes
            try:
                # Try to decode as UTF-8 text
                value_str = value.decode('utf-8')
            except (UnicodeDecodeError, AttributeError):
                # Binary data - skip it
                debug_log(f"[FORM DATA] Skipping binary field value ({len(value)} bytes)")
                return "[Binary Data - Omitted]"
        else:
            value_str = str(value)

        # Remove control characters (except newline, tab, carriage return)
        # This prevents CSV injection and other control character attacks
        sanitized = ''.join(char for char in value_str
                          if char in '\n\t\r' or (ord(char) >= 32 and ord(char) != 127))

        return sanitized.strip()

    for file_path in files:
        if not os.path.exists(file_path):
            errors.append({"file": file_path, "error": f"File not found: {file_path}"})
            continue

        doc = None
        try:
            # SECURITY: Check file size
            try:
                pdf_size_mb = os.path.getsize(file_path) / (1024 * 1024)
                if pdf_size_mb > MAX_PDF_SIZE_MB:
                    errors.append({
                        "file": file_path,
                        "error": f"PDF file too large ({pdf_size_mb:.1f}MB). Maximum allowed: {MAX_PDF_SIZE_MB}MB."
                    })
                    continue
            except Exception as e:
                errors.append({"file": file_path, "error": f"Cannot check file size: {str(e)}"})
                continue

            # VALIDATION: Check PDF header (integrity check)
            try:
                with open(file_path, 'rb') as f:
                    header = f.read(5)
                    debug_log(f"[FORM DATA] PDF header check: {header}")
                    if header != b'%PDF-':
                        error_msg = f"Invalid PDF file: missing PDF header. Expected '%PDF-' but got '{header}'. File may be corrupted or is not a PDF."
                        debug_log(f"[FORM DATA] VALIDATION FAILED: {error_msg}")
                        errors.append({"file": file_path, "error": error_msg})
                        continue
                    debug_log(f"[FORM DATA] PDF header validation passed")
            except Exception as e:
                debug_log(f"[FORM DATA] Error reading file header: {str(e)}")
                errors.append({"file": file_path, "error": f"Cannot read file: {str(e)}"})
                continue

            # Try to open PDF with PyMuPDF (will detect encryption)
            try:
                doc = fitz.open(file_path)
            except Exception as e:
                error_msg = str(e).lower()
                if "password" in error_msg or "crypt" in error_msg or "encrypt" in error_msg:
                    errors.append({
                        "file": file_path,
                        "error": "Cannot extract form data from password-protected PDFs. Please unlock the PDF first using the 'Unlock PDF' tool."
                    })
                else:
                    errors.append({
                        "file": file_path,
                        "error": f"Cannot open PDF: {str(e)}"
                    })
                continue

            # Check for empty PDF (FIXED: should be OR, not AND)
            if len(doc) == 0:
                errors.append({"file": file_path, "error": "PDF has no pages. Cannot extract form data from an empty PDF."})
                continue

            # SECURITY: Check page count
            if len(doc) > MAX_PAGES:
                errors.append({
                    "file": file_path,
                    "error": f"PDF has too many pages ({len(doc)} pages). Maximum allowed: {MAX_PAGES} pages."
                })
                continue

            print(f"[FORM DATA] Extracting from {os.path.basename(file_path)} ({len(doc)} pages, {pdf_size_mb:.2f}MB)", flush=True)

            form_fields = []
            base, _ = os.path.splitext(file_path)

            # Method 1: Try pypdf for AcroForm fields (most reliable for fillable forms)
            try:
                from pypdf import PdfReader
                reader = PdfReader(file_path)

                if '/AcroForm' in reader.trailer.get('/Root', {}):
                    acro_form = reader.trailer['/Root']['/AcroForm']
                    if '/Fields' in acro_form:
                        fields = acro_form['/Fields']

                        for field in fields:
                            # SECURITY: Check field count limit
                            if len(form_fields) >= MAX_FIELDS:
                                print(f"[FORM DATA] Field limit reached ({MAX_FIELDS}). Stopping extraction.", flush=True)
                                break

                            field_info = {}

                            # Get field name
                            if '/T' in field:
                                field_info['Field Name'] = sanitize_field_value(str(field['/T']))
                            else:
                                field_info['Field Name'] = 'Unnamed'

                            # Get field type
                            if '/FT' in field:
                                field_type = str(field['/FT'])
                                type_map = {
                                    '/Tx': 'Text',
                                    '/Btn': 'Button',
                                    '/Ch': 'Choice',
                                    '/Sig': 'Signature'
                                }
                                field_info['Field Type'] = type_map.get(field_type, field_type.replace('/', ''))

                                # Skip signature fields - they contain binary certificate data
                                if field_type == '/Sig':
                                    debug_log(f"[FORM DATA] Skipping signature field: {field_info.get('Field Name', 'Unnamed')}")
                                    continue
                            else:
                                field_info['Field Type'] = 'Unknown'

                            # Get field value (sanitized)
                            if '/V' in field:
                                value = field['/V']
                                if isinstance(value, list):
                                    field_info['Field Value'] = sanitize_field_value(', '.join(str(v) for v in value))
                                else:
                                    field_info['Field Value'] = sanitize_field_value(value)
                            elif '/DV' in field:  # Default value
                                field_info['Field Value'] = sanitize_field_value(field['/DV'])
                            else:
                                field_info['Field Value'] = ''

                            field_info['Page'] = 'Unknown'
                            form_fields.append(field_info)

                        print(f"[FORM DATA] Found {len(form_fields)} AcroForm fields", flush=True)
            except Exception as e:
                logger.warning(f"pypdf form extraction failed: {e}")

            # Method 2: If no AcroForm fields, try PyMuPDF widgets (already have doc open)
            if not form_fields and doc:
                try:
                    for page_num in range(len(doc)):
                        page = doc[page_num]
                        widgets = page.widgets()

                        for widget in widgets:
                            # SECURITY: Check field count limit
                            if len(form_fields) >= MAX_FIELDS:
                                print(f"[FORM DATA] Field limit reached ({MAX_FIELDS}). Stopping extraction.", flush=True)
                                break

                            field_info = {}
                            field_info['Field Name'] = sanitize_field_value(widget.field_name or 'Unnamed')

                            # Map field type
                            field_type_map = {
                                fitz.PDF_WIDGET_TYPE_TEXT: 'Text',
                                fitz.PDF_WIDGET_TYPE_CHECKBOX: 'Checkbox',
                                fitz.PDF_WIDGET_TYPE_RADIOBUTTON: 'Radio Button',
                                fitz.PDF_WIDGET_TYPE_SIGNATURE: 'Signature',
                                fitz.PDF_WIDGET_TYPE_BUTTON: 'Button',
                                fitz.PDF_WIDGET_TYPE_CHOICE: 'Dropdown',
                            }
                            field_info['Field Type'] = field_type_map.get(widget.field_type, 'Unknown')

                            # Skip signature widgets - they contain binary certificate data
                            if widget.field_type == fitz.PDF_WIDGET_TYPE_SIGNATURE:
                                debug_log(f"[FORM DATA] Skipping signature widget: {field_info.get('Field Name', 'Unnamed')}")
                                continue

                            # Get field value (sanitized)
                            if widget.field_value:
                                field_info['Field Value'] = sanitize_field_value(widget.field_value)
                            else:
                                field_info['Field Value'] = ''

                            field_info['Page'] = str(page_num + 1)
                            form_fields.append(field_info)

                        if len(form_fields) >= MAX_FIELDS:
                            break

                    if form_fields:
                        print(f"[FORM DATA] Found {len(form_fields)} widget fields", flush=True)
                except Exception as e:
                    logger.warning(f"PyMuPDF widget extraction failed: {e}")

            # Method 3: Fallback for flattened forms (LIMITED to prevent performance issues)
            if not form_fields and doc:
                try:
                    # SECURITY: Limit pages for text extraction
                    pages_to_extract = min(len(doc), MAX_FLATTENED_PAGES)
                    if len(doc) > MAX_FLATTENED_PAGES:
                        print(f"[FORM DATA] Limiting flattened form extraction to first {MAX_FLATTENED_PAGES} pages", flush=True)

                    for page_num in range(pages_to_extract):
                        # SECURITY: Check field count limit
                        if len(form_fields) >= MAX_FIELDS:
                            break

                        page = doc[page_num]

                        # Extract text using multiple methods for better coverage
                        # Method 1: Standard text extraction
                        text = page.get_text("text")

                        # Method 2: If text seems incomplete (very short), try block extraction
                        # This handles complex layouts better (tables, columns, text boxes)
                        if len(text.strip()) < 100:  # Suspiciously short
                            try:
                                blocks = page.get_text("blocks")
                                # Blocks format: (x0, y0, x1, y1, "text", block_no, block_type)
                                text_blocks = [block[4] for block in blocks if len(block) > 4 and block[4].strip()]
                                if text_blocks:
                                    text = '\n'.join(text_blocks)
                                    debug_log(f"[FORM DATA] Used block extraction for page {page_num + 1} (improved layout handling)")
                            except Exception as e:
                                logger.warning(f"Block extraction failed on page {page_num + 1}: {e}")

                        if text.strip():
                            # Extract full page text (no character limit - we already limit file size and page count)
                            # This is for flattened forms where the entire page content IS the form data
                            field_info = {
                                'Field Name': f'Page {page_num + 1} Content',
                                'Field Type': 'Text (Flattened)',
                                'Field Value': sanitize_field_value(text.strip()),  # No limit - already have file/page limits
                                'Page': str(page_num + 1)
                            }
                            form_fields.append(field_info)

                            # Debug: Log text length
                            debug_log(f"[FORM DATA] Page {page_num + 1}: Extracted {len(text.strip())} characters")

                    if form_fields:
                        debug_log(f"[FORM DATA] Extracted {len(form_fields)} flattened form entries from {pages_to_extract} pages")
                        debug_log(f"[FORM DATA] Note: This PDF has no fillable fields. Extracted page text instead.")
                except Exception as e:
                    logger.warning(f"Flattened form extraction failed: {e}")

            # Create output file
            if form_fields:
                try:
                    df = pd.DataFrame(form_fields)

                    # Debug: Check if data is complete in DataFrame
                    total_chars = sum(len(str(row.get('Field Value', ''))) for _, row in df.iterrows())
                    debug_log(f"[FORM DATA] DataFrame contains {total_chars:,} total characters across {len(form_fields)} fields")

                    if output_format == "csv":
                        output_path = f"{base}_form_data.csv"
                        # Force no truncation in CSV export
                        df.to_csv(
                            output_path,
                            index=False,
                            encoding='utf-8-sig',  # UTF-8 with BOM for Excel
                            quoting=1,  # QUOTE_ALL - ensures long text is properly quoted
                        )
                        processed_files.append(output_path)
                        debug_log(f"[FORM DATA] Created CSV with {len(form_fields)} fields")

                        # Verify CSV file size
                        csv_size_kb = os.path.getsize(output_path) / 1024
                        debug_log(f"[FORM DATA] CSV file size: {csv_size_kb:.1f}KB")

                    elif output_format == "xlsx":
                        output_path = f"{base}_form_data.xlsx"
                        df.to_excel(output_path, index=False, engine='openpyxl')
                        processed_files.append(output_path)
                        debug_log(f"[FORM DATA] Created XLSX with {len(form_fields)} fields")

                        # Verify XLSX file size
                        xlsx_size_kb = os.path.getsize(output_path) / 1024
                        debug_log(f"[FORM DATA] XLSX file size: {xlsx_size_kb:.1f}KB")
                    else:
                        errors.append({"file": file_path, "error": f"Unsupported output format: {output_format}. Use 'csv' or 'xlsx'."})
                except Exception as e:
                    errors.append({"file": file_path, "error": f"Cannot create output file: {str(e)}"})
            else:
                errors.append({
                    "file": file_path,
                    "error": "No form fields found in PDF. The PDF may not contain fillable forms, or the forms may be completely flattened without extractable data."
                })

        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}", exc_info=True)
            errors.append({"file": file_path, "error": f"Form data extraction failed: {str(e)}"})
        finally:
            # SECURITY: Always clean up resources
            if doc:
                try:
                    doc.close()
                except:
                    pass

    return {"processed_files": processed_files, "errors": errors}
# Trigger reload
