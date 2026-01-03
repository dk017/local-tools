import sys
import json
import logging
import os
from datetime import datetime
import importlib
import traceback
import threading

# Setup Logging
def setup_logging():
    log_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(log_dir, exist_ok=True)

    date_str = datetime.now().strftime('%Y-%m-%d')
    log_file = os.path.join(log_dir, f'{date_str}-backend.log')

    logging.basicConfig(
        filename=log_file,
        level=logging.INFO,
        format='[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Also log to stderr so we can see it in development console if needed,
    # but be careful not to pollute stdout which is used for communication
    console = logging.StreamHandler(sys.stderr)
    console.setLevel(logging.INFO)
    formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] %(message)s')
    console.setFormatter(formatter)
    logging.getLogger('').addHandler(console)

setup_logging()
logger = logging.getLogger('main')

# Module Registry
if getattr(sys, 'frozen', False):
    # Running in PyInstaller bundle
    try:
        from modules import image_tools
        from modules import pdf_tools
        from modules import pdf_editor
        from modules import licensing
    except ImportError:
        # Fallback if bundled flat
        import image_tools
        import pdf_tools
        import pdf_editor
        import licensing

    MODULES = {
        "image_tools": image_tools,
        "pdf_tools": pdf_tools,
        "pdf_editor": pdf_editor,
        "licensing": licensing
    }
else:
    # Running from source
    MODULES = {
        "image_tools": "modules.image_tools",
        "pdf_tools": "modules.pdf_tools",
        "pdf_editor": "modules.pdf_editor",
        "licensing": "modules.licensing"
    }

def load_module(module_name):
    if module_name in MODULES:
        val = MODULES[module_name]
        if isinstance(val, str):
            try:
                # Reload module if it's already imported to pick up changes
                if val in sys.modules:
                    return importlib.reload(sys.modules[val])
                return importlib.import_module(val)
            except ImportError as e:
                logger.error(f"Failed to import module {module_name}: {e}")
                return None
        else:
            return val
    return None

def process_request(request):
    req_id = request.get("request_id")
    module_name = request.get("module")
    action = request.get("action")
    payload = request.get("payload", {})

    logger.info(f"Processing request {req_id}: {module_name}.{action}")

    module = load_module(module_name)
    if not module:
        return {
            "type": "result",
            "request_id": req_id,
            "status": "error",
            "error": {"code": "MODULE_NOT_FOUND", "message": f"Module {module_name} not found"}
        }

    try:
        # Assuming modules have a standard entry point or we call specific functions
        result_data = None

        if module_name == "image_tools" and hasattr(module, "handle_image_action"):
            result_data = module.handle_image_action(action, payload)
        elif module_name == "pdf_tools" and hasattr(module, "handle_pdf_action"):
            result_data = module.handle_pdf_action(action, payload)
        elif module_name == "licensing":
            if action == "status":
                result_data = module.check_local_license()
            elif action == "activate":
                # Expecting payload to be just the key string or a dict?
                # Frontend payload is flexible. Let's assume standard payload dict.
                # ActivationScreen typically sends { license_key: "..." } if using fetch.
                # usePython sends 'payload' as is.
                key = payload if isinstance(payload, str) else payload.get("license_key")
                result_data = module.activate_license(key)
            elif action == "deactivate":
                result_data = module.deactivate_license()
            else:
                 raise ValueError(f"Unknown licensing action: {action}")

        if result_data is not None:
            return {
                "type": "result",
                "request_id": req_id,
                "status": "success",
                "data": result_data
            }
        else:
             return {
                "type": "result",
                "request_id": req_id,
                "status": "error",
                "error": {"code": "ACTION_NOT_SUPPORTED", "message": f"Action handler not found for {module_name}"}
            }

    except Exception as e:
        # Log full traceback server-side for debugging
        logger.exception(f"Error processing request {req_id}")
        # Return generic error to client without exposing internals
        return {
            "type": "result",
            "request_id": req_id,
            "status": "error",
            "error": {"code": "INTERNAL_ERROR", "message": "An internal error occurred during processing."}
        }

def stdin_loop():
    """Handle stdin/stdout communication bridge (for existing tools)"""
    logger.info("Stdin/stdout bridge started")

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break

            line = line.strip()
            if not line:
                continue

            try:
                request = json.loads(line)
                response = process_request(request)
                print(json.dumps(response))
                sys.stdout.flush()
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
                print(json.dumps({
                    "type": "result",
                    "status": "error",
                    "error": {"code": "INVALID_JSON", "message": "Invalid JSON"}
                }))
                sys.stdout.flush()

        except KeyboardInterrupt:
            break
        except Exception as e:
            logger.exception("Fatal error in stdin loop")
            break

def start_http_server():
    """Start HTTP server for PDF Editor endpoints"""
    try:
        import uvicorn
        from fastapi import FastAPI, UploadFile, File, Form
        from fastapi.middleware.cors import CORSMiddleware
        from fastapi.responses import FileResponse
        import tempfile

        logger.info("Starting HTTP server for PDF Editor...")

        app = FastAPI()

        # CORS for desktop app (connects from localhost)
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Desktop app - allow all origins
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # Load pdf_editor module
        pdf_editor_module = load_module("pdf_editor")

        @app.post("/api/pdf-editor/info")
        async def pdf_editor_get_info(file: UploadFile = File(...)):
            """Get PDF document information"""
            try:
                # Save uploaded file to temp location
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                    content = await file.read()
                    tmp.write(content)
                    file_path = tmp.name

                result = pdf_editor_module.get_pdf_info({"file": file_path})

                # Cleanup
                try:
                    os.unlink(file_path)
                except:
                    pass

                return {"status": "success", "data": result}
            except Exception as e:
                logger.exception("Error in pdf-editor/info")
                return {"status": "error", "error": str(e)}

        @app.post("/api/pdf-editor/render")
        async def pdf_editor_render_page(
            file: UploadFile = File(...),
            page: int = Form(...),
            dpi: int = Form(150)
        ):
            """Render PDF page to image"""
            try:
                # Save uploaded file to temp location
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                    content = await file.read()
                    tmp.write(content)
                    file_path = tmp.name

                result = pdf_editor_module.render_pdf_page({
                    "file": file_path,
                    "page": page,
                    "dpi": dpi
                })

                # Cleanup
                try:
                    os.unlink(file_path)
                except:
                    pass

                return {"status": "success", "data": result}
            except Exception as e:
                logger.exception("Error in pdf-editor/render")
                return {"status": "error", "error": str(e)}

        @app.post("/api/pdf-editor/load-annotations")
        async def pdf_editor_load_annotations(file: UploadFile = File(...)):
            """Load existing annotations from PDF"""
            try:
                # Save uploaded file to temp location
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                    content = await file.read()
                    tmp.write(content)
                    file_path = tmp.name

                result = pdf_editor_module.load_annotations({"file": file_path})

                # Cleanup
                try:
                    os.unlink(file_path)
                except:
                    pass

                return {"status": "success", "data": result}
            except Exception as e:
                logger.exception("Error in pdf-editor/load-annotations")
                return {"status": "error", "error": str(e)}

        @app.post("/api/pdf-editor/save")
        async def pdf_editor_save_annotations(
            file: UploadFile = File(...),
            annotations: str = Form(...),
            flatten: bool = Form(False)
        ):
            """Save annotations to PDF"""
            try:
                # Save uploaded file to temp location
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                    content = await file.read()
                    tmp.write(content)
                    file_path = tmp.name

                # Parse annotations JSON
                import json
                annotations_list = json.loads(annotations)

                result = pdf_editor_module.save_annotations({
                    "file": file_path,
                    "annotations": annotations_list,
                    "flatten": flatten
                })

                output_path = result.get("output_file")

                if output_path and os.path.exists(output_path):
                    return FileResponse(
                        output_path,
                        media_type="application/pdf",
                        filename=os.path.basename(output_path),
                        headers={"Content-Disposition": f"attachment; filename={os.path.basename(output_path)}"}
                    )
                else:
                    return {"status": "error", "error": "Failed to generate output file"}

            except Exception as e:
                logger.exception("Error in pdf-editor/save")
                return {"status": "error", "error": str(e)}

        @app.get("/")
        def health_check():
            return {"status": "online", "mode": "desktop-hybrid"}

        # Run server (blocking call)
        uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")

    except Exception as e:
        logger.exception("Failed to start HTTP server")

def main():
    logger.info("Backend started in HYBRID mode (stdin/stdout + HTTP)")

    # Start HTTP server in a separate thread for PDF Editor
    http_thread = threading.Thread(target=start_http_server, daemon=True)
    http_thread.start()
    logger.info("HTTP server thread started")

    # Run stdin/stdout loop in main thread (blocking)
    stdin_loop()

if __name__ == "__main__":
    main()
