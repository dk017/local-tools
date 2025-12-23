import os
import shutil
import json
import tempfile
import traceback
import zipfile
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse

# Import our local tool modules
from modules import image_tools, pdf_tools

app = FastAPI()

# CORS Configuration - Security Hardened
# In production, restrict to specific domains
# In development, allow localhost for testing
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:8080").split(",")
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS if origin.strip()]

# If CORS_ORIGINS is set to "*" explicitly, allow all (development only)
# Otherwise, use the configured origins
if os.getenv("CORS_ORIGINS") == "*":
    allow_origins = ["*"]
    # Note: allow_credentials cannot be True when allow_origins=["*"]
    allow_credentials = False
else:
    allow_origins = CORS_ORIGINS
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

TEMP_DIR = os.path.join(tempfile.gettempdir(), "offline_tools_api")
os.makedirs(TEMP_DIR, exist_ok=True)

# File upload size limits (in bytes)
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "52428800"))  # Default: 50MB
MAX_TOTAL_SIZE = int(os.getenv("MAX_TOTAL_SIZE", "104857600"))  # Default: 100MB for multiple files

def validate_file_size(file: UploadFile) -> None:
    """Validates that the uploaded file size is within limits."""
    if hasattr(file, 'size') and file.size:
        if file.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File size ({file.size / 1024 / 1024:.2f}MB) exceeds maximum allowed size ({MAX_FILE_SIZE / 1024 / 1024:.2f}MB)"
            )

def save_upload(file: UploadFile) -> str:
    """Saves an uploaded file to a specific temp path and returns the path."""
    # Validate file size
    validate_file_size(file)

    safe_name = "".join([c for c in file.filename if c.isalpha() or c.isdigit() or c in "._-"]) if file.filename else "unknown"
    path = os.path.join(TEMP_DIR, safe_name)
    # Ensure unique if conflict? Overwrite for now is simpler for MVPs.
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return path

async def save_upload_file(upload_file: UploadFile) -> str:
    """Saves an uploaded file (async version matching server.py)."""
    try:
        # Validate file size
        validate_file_size(upload_file)

        suffix = os.path.splitext(upload_file.filename)[1] if upload_file.filename else ""
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=TEMP_DIR) as tmp:
            shutil.copyfileobj(upload_file.file, tmp)
            return tmp.name
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.concurrency import run_in_threadpool

async def process_request(module_name: str, action: str, request: Request):
    """
    Generic handler that parses JSON payload (from body or form-data)
    and merges it with file uploads, then dispatches to the module.
    """
    payload = {}
    uploaded_files: Dict[str, List[str]] = {}

    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()

        # 1. Parse the JSON payload
        if "__payload_json" in form:
            try:
                payload = json.loads(form["__payload_json"])
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON in __payload_json")

        # 2. Handle Files
        for key, value in form.multi_items():
            if key == "__payload_json":
                continue

            if isinstance(value, UploadFile):
                # Save file
                path = save_upload(value)
                if key not in uploaded_files:
                    uploaded_files[key] = []
                uploaded_files[key].append(path)

        # 3. Merge files back into payload
        # Standard convention: if logic expects 'files', map it to list.
        # If logic expects 'file', map it to single.
        for key, paths in uploaded_files.items():
            # If payload had this key (as a marker), we overwrite it.
            # We try to infer properly if it should be a list or single based on logic?
            # Or simpler: The frontend sends 'files' for list inputs.
            if len(paths) == 1 and key.endswith("_obj") or key == "file" or key == "watermark_file":
                 # Heuristic: keys like 'file' usually mean single path
                 payload[key] = paths[0]
            else:
                 payload[key] = paths

            # Special case for 'files' array in image_tools
            if key == "files":
                payload["files"] = paths

    else:
        # Standard JSON body
        try:
            payload = await request.json()
        except:
            pass # might be empty body

    # Dispatch to module
    try:
        if module_name == "image_tools":
            if not hasattr(image_tools, "handle_image_action"):
                 raise HTTPException(status_code=500, detail="image_tools module missing dispatcher")

            # Run CPU-bound task in threadpool
            result = await run_in_threadpool(image_tools.handle_image_action, action, payload)
            return {"status": "success", "data": result}

        elif module_name == "pdf_tools":
             if not hasattr(pdf_tools, "handle_pdf_action"):
                 raise HTTPException(status_code=500, detail="pdf_tools module missing dispatcher")

             # Run CPU-bound task in threadpool
             result = await run_in_threadpool(pdf_tools.handle_pdf_action, action, payload)
             return {"status": "success", "data": result}

        else:
            raise HTTPException(status_code=404, detail="Module not found")

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "error": str(e), "trace": traceback.format_exc()}
        )


@app.post("/image_tools/{action}")
async def handle_image_tools(action: str, request: Request):
    return await process_request("image_tools", action, request)


@app.post("/api/image/{action}")
async def image_endpoint(
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
    """Endpoint matching server.py format for website compatibility."""
    # Validate total size of all files
    total_size = sum(f.size if hasattr(f, 'size') and f.size else 0 for f in files)
    if total_size > MAX_TOTAL_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Total file size ({total_size / 1024 / 1024:.2f}MB) exceeds maximum allowed size ({MAX_TOTAL_SIZE / 1024 / 1024:.2f}MB)"
        )

    saved_files = []
    for f in files:
        saved_files.append(await save_upload_file(f))

    # Save watermark file if present
    saved_watermark_file = None
    if watermark_file:
        saved_watermark_file = await save_upload_file(watermark_file)

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
            payload["crop_box"] = json.loads(crop_box)
        except Exception as e:
            pass

    try:
        result = await run_in_threadpool(image_tools.handle_image_action, action, payload)

        # Special Case: Palette Extraction returns JSON, not file
        if action == "extract_palette":
            return result

        if result.get("errors"):
            raise HTTPException(status_code=400, detail=str(result["errors"]))

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
            return FileResponse(zip_path, filename=zip_filename)

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/pdf_tools/{action}")
async def handle_pdf_tools(action: str, request: Request):
    return await process_request("pdf_tools", action, request)


@app.post("/api/pdf/{action}")
async def pdf_endpoint(
    action: str,
    files: List[UploadFile] = File(...),
    output_name: Optional[str] = Form(None),
    output_format: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
    pages: Optional[str] = Form(None),
    level: Optional[int] = Form(None),
    watermark_type: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    opacity: Optional[float] = Form(None),
    watermark_file: Optional[UploadFile] = File(None),
    color: Optional[str] = Form(None),
    font_size: Optional[int] = Form(None),
    position: Optional[str] = Form(None),
    x: Optional[str] = Form(None),
    y: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    cert_file: Optional[UploadFile] = File(None),
    language: Optional[str] = Form(None),
    libreoffice_path: Optional[str] = Form(None),
    width: Optional[float] = Form(None),
    height: Optional[float] = Form(None),
    page_order: Optional[str] = Form(None)
):
    """Endpoint matching server.py format for website compatibility."""
    # Validate total size of all files
    total_size = sum(f.size if hasattr(f, 'size') and f.size else 0 for f in files)
    if total_size > MAX_TOTAL_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Total file size ({total_size / 1024 / 1024:.2f}MB) exceeds maximum allowed size ({MAX_TOTAL_SIZE / 1024 / 1024:.2f}MB)"
        )

    saved_files = []
    for f in files:
        saved_files.append(await save_upload_file(f))

    # Save watermark file if present
    saved_watermark_file = None
    if watermark_file:
        saved_watermark_file = await save_upload_file(watermark_file)

    saved_cert_file = None
    if cert_file:
        saved_cert_file = await save_upload_file(cert_file)

    payload = {
        "files": saved_files,
        "output_name": output_name,
        "output_format": output_format,
        "mode": mode,
        "pages": pages,
        "level": level,
        "watermark_type": watermark_type,
        "text": text,
        "opacity": opacity,
        "watermark_file": saved_watermark_file,
        "color": color,
        "font_size": font_size,
        "position": position,
        "x": x,
        "y": y,
        "password": password,
        "cert_file": saved_cert_file,
        "language": language,
        "libreoffice_path": libreoffice_path,
        "width": width,
        "height": height,
        "page_order": page_order
    }

    # Handle split/preview specifically where we might need file path
    if action == "split" or action == "preview":
        if not saved_files:
            raise HTTPException(status_code=400, detail="No files uploaded for preview/split")
        payload["file"] = saved_files[0]

    try:
        result = await run_in_threadpool(pdf_tools.handle_pdf_action, action, payload)

        if result.get("errors"):
            raise HTTPException(status_code=400, detail=str(result["errors"]))

        # Special Case: Preview and Palette returns JSON, not file
        if action == "preview" or action == "extract_palette":
            return result

        processed_files = result.get("processed_files", [])
        if not processed_files:
            raise HTTPException(status_code=500, detail=f"Processing failed. Result: {result}")

        # Return single file or zip if multiple
        if len(processed_files) == 1:
            return FileResponse(processed_files[0], filename=os.path.basename(processed_files[0]))
        else:
            # Create zip
            zip_filename = f"processed_files_{action}.zip"
            zip_path = os.path.join(TEMP_DIR, zip_filename)
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                for file in processed_files:
                    zipf.write(file, os.path.basename(file))

            return FileResponse(zip_path, filename=zip_filename)

    except HTTPException as he:
        raise he
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/py-invoke")
async def handle_py_invoke(request: Request):
    """
    Unified endpoint that matches frontend expectations.
    Handles both JSON and FormData requests.
    """
    try:
        content_type = request.headers.get("content-type", "")

        if "multipart/form-data" in content_type:
            # FormData mode - frontend sends module, action, and files
            form = await request.form()

            module = form.get("module")
            action = form.get("action")

            if not module or not action:
                raise HTTPException(status_code=400, detail="module and action are required")

            # Build payload from form data
            payload = {}
            uploaded_files: Dict[str, List[str]] = {}

            # Extract files
            for key, value in form.multi_items():
                if key in ["module", "action"]:
                    continue

                if isinstance(value, UploadFile):
                    path = save_upload(value)
                    if key not in uploaded_files:
                        uploaded_files[key] = []
                    uploaded_files[key].append(path)
                else:
                    # Try to parse as JSON if it looks like JSON
                    try:
                        payload[key] = json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        payload[key] = value

            # Merge files into payload
            for key, paths in uploaded_files.items():
                if len(paths) == 1 and (key == "file" or key == "watermark_file" or key == "cert_file"):
                    payload[key] = paths[0]
                else:
                    payload[key] = paths

            # Ensure 'files' key exists if we have uploaded files
            if "files" not in payload and uploaded_files:
                # Collect all file paths
                all_files = []
                for paths in uploaded_files.values():
                    all_files.extend(paths)
                if all_files:
                    payload["files"] = all_files
        else:
            # JSON mode
            body = await request.json()
            module = body.get("module")
            action = body.get("action")
            payload = body.get("payload", {})

            if not module or not action:
                raise HTTPException(status_code=400, detail="module and action are required")

        # Dispatch to appropriate module
        if module == "image_tools":
            if not hasattr(image_tools, "handle_image_action"):
                raise HTTPException(status_code=500, detail="image_tools module missing dispatcher")
            result = await run_in_threadpool(image_tools.handle_image_action, action, payload)
            return {"status": "success", "data": result}
        elif module == "pdf_tools":
            if not hasattr(pdf_tools, "handle_pdf_action"):
                raise HTTPException(status_code=500, detail="pdf_tools module missing dispatcher")
            result = await run_in_threadpool(pdf_tools.handle_pdf_action, action, payload)
            return {"status": "success", "data": result}
        else:
            raise HTTPException(status_code=404, detail=f"Module '{module}' not found")

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "error": str(e), "trace": traceback.format_exc()}
        )

# --- Licensing Endpoints ---
from modules import licensing

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
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.post("/license/deactivate")
async def deactivate_license():
    """Deactivates/Removes local license."""
    return await run_in_threadpool(licensing.deactivate_license)

@app.post("/license/update-subscription")
async def update_subscription(request: Request):
    """Updates subscription from webhook data."""
    try:
        body = await request.json()
        subscription_id = body.get("subscription_id")
        status = body.get("status")
        expires_at = body.get("expires_at")

        if not subscription_id or not status:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "subscription_id and status are required"}
            )

        result = await run_in_threadpool(
            licensing.update_subscription_from_webhook,
            subscription_id,
            status,
            expires_at
        )
        return result
    except Exception as e:
        logger.error(f"Error updating subscription: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@app.get("/")
def health_check():
    return {"status": "online", "mode": "web-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
