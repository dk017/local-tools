import sys
import json
import logging
import os
from datetime import datetime
import importlib
import traceback

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
        from modules import licensing
    except ImportError:
        # Fallback if bundled flat
        import image_tools
        import pdf_tools
        import licensing
        
    MODULES = {
        "image_tools": image_tools,
        "pdf_tools": pdf_tools,
        "licensing": licensing
    }
else:
    # Running from source
    MODULES = {
        "image_tools": "modules.image_tools",
        "pdf_tools": "modules.pdf_tools",
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
        logger.exception(f"Error processing request {req_id}")
        return {
            "type": "result",
            "request_id": req_id,
            "status": "error",
            "error": {"code": "INTERNAL_ERROR", "message": f"{str(e)}\n{traceback.format_exc()}"}
        }

def main():
    logger.info("Backend started")
    
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
            logger.exception("Fatal error in main loop")
            break

if __name__ == "__main__":
    main()
