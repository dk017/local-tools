import os
import shutil
import tempfile
import zipfile
import sys
from typing import List, Optional, Tuple
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Force reload modules in development (when reload=True)
if 'modules.pdf_tools' in sys.modules:
    del sys.modules['modules.pdf_tools']
if 'modules.image_tools' in sys.modules:
    del sys.modules['modules.image_tools']

from modules.pdf_tools import handle_pdf_action
from modules.image_tools import handle_image_action
from debug_utils import debug_log

# =============================================================================
# WEB VERSION SECURITY LIMITS
# These limits only apply to the web version (server.py)
# Desktop version (main.py) has no file size limits
# =============================================================================
MAX_PDF_SIZE_MB = 5       # 5MB for PDFs (web version)
MAX_IMAGE_SIZE_MB = 3     # 3MB for images (web version)
MAX_PDF_SIZE = MAX_PDF_SIZE_MB * 1024 * 1024
MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024

# File type magic bytes for validation
PDF_MAGIC = b'%PDF'
IMAGE_MAGIC = {
    b'\x89PNG': 'PNG',
    b'\xff\xd8\xff': 'JPEG',
    b'RIFF': 'WEBP',  # WEBP starts with RIFF
    b'GIF8': 'GIF',
    b'BM': 'BMP',
}

def get_file_type_from_extension(filename: str) -> str:
    """Determine file type from extension."""
    if not filename:
        return 'unknown'
    ext = filename.lower().split('.')[-1]
    if ext == 'pdf':
        return 'pdf'
    elif ext in ('jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'heif'):
        return 'image'
    return 'unknown'

def validate_file_type(content: bytes, expected_type: str) -> Tuple[bool, str]:
    """
    Validate file content matches expected type using magic bytes.
    Returns (is_valid, error_message).
    """
    if len(content) < 8:
        return False, "File is too small or empty"

    if expected_type == 'pdf':
        if content[:4] == PDF_MAGIC:
            return True, ""
        return False, "Invalid PDF file (file header doesn't match PDF format)"

    elif expected_type == 'image':
        for magic, name in IMAGE_MAGIC.items():
            if content[:len(magic)] == magic:
                return True, ""
        # Allow HEIC/HEIF which have different headers (ftyp box)
        if b'ftyp' in content[:12]:
            return True, ""
        return False, "Invalid image file (unsupported format or corrupted)"

    # Unknown types pass through (don't block Office files, etc.)
    return True, ""

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration - allow both production and development origins
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
# Always include production domain
PRODUCTION_ORIGINS = [
    "https://localtools.pro",
    "https://www.localtools.pro",
    "http://localtools.pro",
    "http://www.localtools.pro",
]
ALL_ORIGINS = list(set(CORS_ORIGINS + PRODUCTION_ORIGINS))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALL_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Processing-Warning"]
)

TEMP_DIR = tempfile.gettempdir()

async def save_upload_file(upload_file: UploadFile, expected_type: str = None) -> str:
    """
    Save uploaded file with security validation.

    Args:
        upload_file: The uploaded file
        expected_type: Expected file type ('pdf', 'image', or None to auto-detect)

    Returns:
        Path to saved temporary file

    Raises:
        HTTPException: If file fails validation (size, type, etc.)
    """
    try:
        suffix = os.path.splitext(upload_file.filename)[1]
        print(f"[UPLOAD] Saving file: {upload_file.filename}, suffix: {suffix}", flush=True)

        # Read the content
        content = await upload_file.read()
        content_size = len(content)
        print(f"[UPLOAD] Read {content_size} bytes. First 20 bytes: {content[:20]}", flush=True)

        # Auto-detect file type if not specified
        if expected_type is None:
            expected_type = get_file_type_from_extension(upload_file.filename)

        # === SECURITY: File Size Validation ===
        if expected_type == 'pdf':
            if content_size > MAX_PDF_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"PDF file too large ({content_size / 1024 / 1024:.1f}MB). Maximum size for web version is {MAX_PDF_SIZE_MB}MB. Please use the desktop app for larger files."
                )
        elif expected_type == 'image':
            if content_size > MAX_IMAGE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"Image file too large ({content_size / 1024 / 1024:.1f}MB). Maximum size for web version is {MAX_IMAGE_SIZE_MB}MB. Please use the desktop app for larger files."
                )

        # === SECURITY: File Type Validation ===
        is_valid, error_msg = validate_file_type(content, expected_type)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=TEMP_DIR) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # Verify what was written
        with open(tmp_path, 'rb') as verify:
            verify_bytes = verify.read(20)
            print(f"[UPLOAD] Verified temp file. First 20 bytes: {verify_bytes}", flush=True)

        return tmp_path
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"[UPLOAD] Error saving file: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pdf/{action}")
@limiter.limit("30/minute")  # 30 requests per minute per IP
async def pdf_endpoint(
    request: Request,
    action: str,
    files: List[UploadFile] = File(...),
    output_name: Optional[str] = Form(None),
    output_format: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
    pages: Optional[str] = Form(None),
    level: Optional[int] = Form(None),
    watermark_type: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    texts: Optional[str] = Form(None),
    opacity: Optional[float] = Form(None),
    watermark_file: Optional[UploadFile] = File(None),
    color: Optional[str] = Form(None),
    font_size: Optional[int] = Form(None),
    position: Optional[str] = Form(None),
    x: Optional[str] = Form(None),
    y: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    cert_file: Optional[UploadFile] = File(None),
    width: Optional[float] = Form(None),
    height: Optional[float] = Form(None),
    page_order: Optional[str] = Form(None),
    angle: Optional[float] = Form(None),
    page: Optional[int] = Form(None),
    merge_tables: Optional[str] = Form(None)
):
    # Track all temp files for cleanup
    temp_files_to_cleanup = []

    saved_files = []
    for f in files:
        # For PDF endpoints, validate files as PDFs (except for special actions)
        file_type = 'pdf'
        if action in ('images_to_pdf',):
            file_type = 'image'  # This action accepts images
        path = await save_upload_file(f, expected_type=file_type)
        saved_files.append(path)
        temp_files_to_cleanup.append(path)

    # Save watermark file if present (can be image)
    saved_watermark_file = None
    if watermark_file:
        saved_watermark_file = await save_upload_file(watermark_file, expected_type='image')
        temp_files_to_cleanup.append(saved_watermark_file)

    saved_cert_file = None
    if cert_file:
        saved_cert_file = await save_upload_file(cert_file, expected_type=None)  # Cert files have various formats
        temp_files_to_cleanup.append(saved_cert_file)

    payload = {
        "files": saved_files,
        "output_name": output_name,
        "output_format": output_format,
        "mode": mode,
        "pages": pages,
        "level": level,
        "watermark_type": watermark_type,
        "text": text,
        "texts": texts,
        "opacity": opacity,
        "watermark_file": saved_watermark_file,
        "color": color,
        "font_size": font_size,
        "position": position,
        "x": x,
        "y": y,
        "password": password,
        "cert_file": saved_cert_file,
        "width": width,
        "height": height,
        "page_order": page_order,
        "angle": angle,
        "page": page,
        "merge_tables": merge_tables
    }

    # Handle split/preview specifically where we might need file path
    if action == "split" or action == "preview":
        if not saved_files:
             raise HTTPException(status_code=400, detail="No files uploaded for preview/split")
        payload["file"] = saved_files[0]
        # For preview, pass the action type from the original request
        if action == "preview":
            # The actual transformation action should be passed as a parameter
            # We'll use the action from the URL path, but allow override via mode
            preview_action = mode or "preview"
            payload["action"] = preview_action

    debug_log(f"Action: {action}, Payload keys: {list(payload.keys())}")
    if "file" in payload: debug_log(f"File: {payload['file']}")
    if action == "extract_tables":
        print(f"[DEBUG] extract_tables called with merge_tables={merge_tables}")

    try:
        result = handle_pdf_action(action, payload)
        debug_log(f"Result for {action}: {result}")
        print(f"Action Result for {action}: {result}")

        # Special Case: Preview and Palette returns JSON, not file
        if action == "preview" or action == "extract_palette":
            return result

        processed_files = result.get("processed_files", [])
        errors = result.get("errors", [])

        # Handle errors and partial success
        if errors and not processed_files:
             # Complete failure - no files processed
             debug_log(f"Complete failure - errors found: {errors}")
             error_messages = []
             for err in errors:
                 if isinstance(err, dict) and "error" in err:
                     error_messages.append(err["error"])
                 else:
                     error_messages.append(str(err))
             error_detail = ". ".join(error_messages) if error_messages else "Processing failed"
             print(f"ERROR DETAIL TO SEND: {error_detail}")
             raise HTTPException(status_code=400, detail=error_detail)

        if not processed_files and not errors:
             # No files and no errors - shouldn't happen
             debug_log("No processed files and no errors returned!")
             print(f"CRITICAL ERROR: Action {action} returned no files and no errors. Result: {result}")
             raise HTTPException(status_code=500, detail=f"Processing failed. Result: {result}")

        # Prepare warning header for partial success
        warning_header = None
        if errors and processed_files:
            # Partial success - some succeeded, some failed
            error_count = len(errors)
            success_count = len(processed_files)
            warning_header = f"{success_count} table(s) extracted successfully, {error_count} failed"
            print(f"PARTIAL SUCCESS: {warning_header}")

        # Return single file or zip if multiple
        if len(processed_files) == 1:
             response = FileResponse(processed_files[0], filename=os.path.basename(processed_files[0]))
             if warning_header:
                 response.headers["X-Processing-Warning"] = warning_header
             return response
        else:
             # Create zip
             zip_filename = f"processed_files_{action}.zip"
             zip_path = os.path.join(TEMP_DIR, zip_filename)
             with zipfile.ZipFile(zip_path, 'w') as zipf:
                 for file in processed_files:
                     zipf.write(file, os.path.basename(file))

             response = FileResponse(
                 zip_path,
                 filename=zip_filename,
                 media_type="application/zip"
             )
             if warning_header:
                 response.headers["X-Processing-Warning"] = warning_header
             return response

    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp UPLOAD files (the original uploads, not processed outputs)
        # Processed files are returned to client and will be cleaned up by OS temp cleanup
        for temp_file in temp_files_to_cleanup:
            try:
                if temp_file and os.path.exists(temp_file):
                    os.remove(temp_file)
                    print(f"[CLEANUP] Removed temp file: {temp_file}", flush=True)
            except Exception as cleanup_error:
                # Don't fail the request if cleanup fails, just log it
                print(f"[CLEANUP] Warning: Failed to remove temp file {temp_file}: {cleanup_error}", flush=True)

# --- Licensing Endpoints ---
from modules import licensing
from fastapi.concurrency import run_in_threadpool
from fastapi import Request

@app.get("/license/status")
async def check_license_status():
    """Checks the local license state."""
    return licensing.check_local_license()

@app.post("/license/activate")
async def activate_license(request: Request):
    """Activates a license key."""
    try:
        body = await request.json()
        key = body.get("license_key")
        result = await run_in_threadpool(licensing.activate_license, key)
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/license/deactivate")
async def deactivate_license():
    """Deactivates/Removes local license."""
    return await run_in_threadpool(licensing.deactivate_license)

@app.post("/api/image/{action}")
@limiter.limit("30/minute")  # 30 requests per minute per IP
async def image_endpoint(
    request: Request,
    action: str,
    files: List[UploadFile] = File(...),
    watermark_type: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    opacity: Optional[float] = Form(None),
    watermark_file: Optional[UploadFile] = File(None),
    color: Optional[str] = Form(None),
    font_size: Optional[int] = Form(None),
    position: Optional[str] = Form(None),
    x: Optional[str] = Form(None),
    y: Optional[str] = Form(None),
    crop_box: Optional[str] = Form(None),
    # New Params
    target_format: Optional[str] = Form(None),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None),
    percentage: Optional[int] = Form(None),
    quality: Optional[int] = Form(None),
    level: Optional[int] = Form(None),
    country: Optional[str] = Form(None),
    rows: Optional[int] = Form(None),
    cols: Optional[int] = Form(None),
    count: Optional[int] = Form(None),
    maintain_aspect: Optional[bool] = Form(None)
):
    print(f"DEBUG: Received crop_box raw: {crop_box}")

    # Track all temp files for cleanup
    temp_files_to_cleanup = []

    saved_files = []
    for f in files:
        path = await save_upload_file(f, expected_type='image')
        saved_files.append(path)
        temp_files_to_cleanup.append(path)

    # Save watermark file if present
    saved_watermark_file = None
    if watermark_file:
        saved_watermark_file = await save_upload_file(watermark_file, expected_type='image')
        temp_files_to_cleanup.append(saved_watermark_file)

    payload = {
        "files": saved_files,
        "watermark_type": watermark_type,
        "text": text,
        "opacity": opacity,
        "watermark_file": saved_watermark_file,
        "color": color,
        "font_size": font_size,
        "position": position,
        "x": x,
        "y": y,
        "crop_box": crop_box,
        "target_format": target_format,
        "width": width,
        "height": height,
        "percentage": percentage,
        "quality": quality,
        "level": level,
        "country": country,
        "rows": rows,
        "cols": cols,
        "count": count,
        "maintain_aspect": maintain_aspect
    }

    if crop_box:
        try:
            import json
            payload["crop_box"] = json.loads(crop_box)
        except Exception as e:
            print(f"Error parsing crop_box: {e}")
            pass

    try:
        result = handle_image_action(action, payload)

        # Special Case: Palette Extraction returns JSON, not file
        if action == "extract_palette":
            return result

        if result.get("errors"):
             # Extract just the error messages, not the full file paths
             error_messages = []
             for err in result["errors"]:
                 if isinstance(err, dict) and "error" in err:
                     error_messages.append(err["error"])
                 else:
                     error_messages.append(str(err))
             error_detail = ". ".join(error_messages) if error_messages else "Processing failed"
             raise HTTPException(status_code=400, detail=error_detail)

        processed_files = result.get("processed_files", [])
        if not processed_files:
             raise HTTPException(status_code=500, detail="Processing failed")

        if len(processed_files) == 1:
             return FileResponse(processed_files[0], filename=os.path.basename(processed_files[0]))
        else:
             zip_filename = f"processed_images_{action}.zip"
             zip_path = os.path.join(TEMP_DIR, zip_filename)
             with zipfile.ZipFile(zip_path, 'w') as zipf:
                 for file in processed_files:
                     zipf.write(file, os.path.basename(file))
             return FileResponse(
                 zip_path, 
                 filename=zip_filename,
                 media_type="application/zip"
             )

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp UPLOAD files (the original uploads, not processed outputs)
        for temp_file in temp_files_to_cleanup:
            try:
                if temp_file and os.path.exists(temp_file):
                    os.remove(temp_file)
                    print(f"[CLEANUP] Removed temp file: {temp_file}", flush=True)
            except Exception as cleanup_error:
                print(f"[CLEANUP] Warning: Failed to remove temp file {temp_file}: {cleanup_error}", flush=True)

if __name__ == "__main__":
    import uvicorn
    # Use port 8001 to avoid conflict with desktop app (main.py uses 8000)
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True)
