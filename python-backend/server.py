import os
import shutil
import tempfile
import zipfile
import sys
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# Force reload modules in development (when reload=True)
if 'modules.pdf_tools' in sys.modules:
    del sys.modules['modules.pdf_tools']
if 'modules.image_tools' in sys.modules:
    del sys.modules['modules.image_tools']

from modules.pdf_tools import handle_pdf_action
from modules.image_tools import handle_image_action
from debug_utils import debug_log

app = FastAPI()

# Allow CORS for localhost development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

TEMP_DIR = tempfile.gettempdir()

async def save_upload_file(upload_file: UploadFile) -> str:
    try:
        suffix = os.path.splitext(upload_file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=TEMP_DIR) as tmp:
            shutil.copyfileobj(upload_file.file, tmp)
            return tmp.name
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    width: Optional[float] = Form(None),
    height: Optional[float] = Form(None),
    page_order: Optional[str] = Form(None)
):
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
        "width": width,
        "height": height,
        "page_order": page_order
    }

    # Handle split/preview specifically where we might need file path
    if action == "split" or action == "preview":
        if not saved_files:
             raise HTTPException(status_code=400, detail="No files uploaded for preview/split")
        payload["file"] = saved_files[0]

    debug_log(f"Action: {action}, Payload keys: {list(payload.keys())}")
    if "file" in payload: debug_log(f"File: {payload['file']}")

    try:
        result = handle_pdf_action(action, payload)
        debug_log(f"Result for {action}: {result}")
        print(f"Action Result for {action}: {result}")

        if result.get("errors"):
             debug_log(f"Errors found: {result['errors']}")
             raise HTTPException(status_code=400, detail=str(result["errors"]))

        # Special Case: Preview and Palette returns JSON, not file
        if action == "preview" or action == "extract_palette":
            return result

        processed_files = result.get("processed_files", [])
        if not processed_files:
             debug_log("No processed files and no errors returned!")
             print(f"CRITICAL ERROR: Action {action} returned no files and no errors. Result: {result}")
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
        import traceback
        traceback.print_exc()
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp upload files (processed files might be needed for download)
        # Ideally we'd have a cron job to clean up processed files later
        pass

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
