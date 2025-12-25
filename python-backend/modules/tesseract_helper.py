"""
Helper module to detect and configure Tesseract OCR.
Supports both bundled (desktop) and system-installed (web) Tesseract.
"""
import os
import platform
import sys
from pathlib import Path

def _is_web_server_mode():
    """
    Detect if we're running in web/server mode vs desktop app mode.
    Returns True if running in web/server mode, False if desktop mode.
    """
    # Check for explicit server mode environment variable
    if os.environ.get("SERVER_MODE") == "true" or os.environ.get("WEB_MODE") == "true":
        return True
    
    # Check if running in Docker container (typical web deployment)
    if os.path.exists("/.dockerenv") or (os.path.exists("/app") and Path("/app").is_dir()):
        return True
    
    # Check if we're running as a regular Python script (not bundled)
    # In desktop mode, Python backend is typically bundled with PyInstaller
    if not getattr(sys, 'frozen', False):
        # Not bundled - check if we're in a Tauri sidecar context
        exe_path = Path(sys.executable)
        exe_str = str(exe_path).lower()
        
        # If executable path contains Tauri-specific directories, it's desktop mode
        if "src-tauri" in exe_str or "binaries" in exe_str:
            return False
        
        # If executable is a standard Python interpreter (python.exe, python3, etc.)
        # and we're not in a Tauri structure, it's likely web mode
        if any(name in exe_path.name.lower() for name in ["python", "python3", "uvicorn"]):
            # Additional check: if CORS_ORIGINS is set (web API indicator), it's web mode
            if os.environ.get("CORS_ORIGINS"):
                return True
            
            # Check if we're running from a typical web server directory structure
            # Web mode typically runs from project root or a web-specific directory
            cwd = Path.cwd()
            cwd_str = str(cwd).lower()
            # If we're in a directory that suggests web deployment (not desktop dev)
            if "website" in cwd_str or "web" in cwd_str or cwd.name == "python-backend":
                return True
    
    # Check if running via uvicorn directly (web server)
    # This is a heuristic - if main process is uvicorn, we're in web mode
    try:
        import psutil
        current_process = psutil.Process()
        parent = current_process.parent()
        if parent and "uvicorn" in parent.name().lower():
            return True
    except (ImportError, AttributeError, psutil.NoSuchProcess):
        pass
    
    return False

def _find_bundled_tesseract():
    """
    Find bundled Tesseract in Tauri app structure.
    Returns path to tesseract executable if found, None otherwise.
    
    NOTE: Only searches for bundled Tesseract if NOT in web/server mode.
    In web mode, system-installed Tesseract should be used instead.
    """
    # If we're in web/server mode, don't look for bundled Tesseract
    if _is_web_server_mode():
        return None
    
    # In Tauri, bundled binaries are typically in the resource directory
    # The Python backend runs as a sidecar, so we need to find the app directory
    
    # Try common Tauri resource paths
    possible_paths = []
    
    # Method 1: Check environment variable (Tauri may set this)
    tesseract_env = os.environ.get('TESSERACT_PATH') or os.environ.get('TESSERACT_CMD')
    if tesseract_env:
        env_path = Path(tesseract_env)
        if env_path.exists() and env_path.is_file():
            return str(env_path.resolve())
    
    # Method 2: Check if we're running from a bundled app
    if getattr(sys, 'frozen', False):
        # PyInstaller bundle
        base_path = Path(sys._MEIPASS) if hasattr(sys, '_MEIPASS') else Path(sys.executable).parent
        possible_paths.append(base_path.parent / "tesseract" / "tesseract.exe")
        possible_paths.append(base_path.parent / "tesseract" / "tesseract")
        possible_paths.append(base_path / "tesseract" / "tesseract.exe")
        possible_paths.append(base_path / "tesseract" / "tesseract")
    
    # Method 3: Check relative to executable (Tauri sidecar location)
    exe_dir = Path(sys.executable).parent
    possible_paths.extend([
        # Same directory as Python backend
        exe_dir / "tesseract.exe",
        exe_dir / "tesseract",
        # Parent directory (where Tauri app might be)
        exe_dir.parent / "tesseract" / "tesseract.exe",
        exe_dir.parent / "tesseract" / "tesseract",
        # Resources directory (Tauri v2 typical location)
        exe_dir.parent / "resources" / "tesseract" / "tesseract.exe",
        exe_dir.parent / "resources" / "tesseract" / "tesseract",
        # App directory structure
        exe_dir.parent.parent / "tesseract" / "tesseract.exe",
        exe_dir.parent.parent / "tesseract" / "tesseract",
    ])
    
    # Method 4: Check common Tauri binary locations (development)
    # Only check these if we're definitely in desktop mode (not web)
    # Skip relative path checks that might find desktop app's Tesseract in web mode
    if not _is_web_server_mode():
        if platform.system() == "Windows":
            possible_paths.extend([
                Path(".") / "tesseract" / "tesseract.exe",
                Path("..") / "tesseract" / "tesseract.exe",
                Path("..") / "src-tauri" / "binaries" / "tesseract" / "tesseract.exe",
            ])
        else:
            possible_paths.extend([
                Path(".") / "tesseract" / "tesseract",
                Path("..") / "tesseract" / "tesseract",
                Path("..") / "src-tauri" / "binaries" / "tesseract" / "tesseract",
            ])
    else:
        # In web mode, explicitly skip any paths that might point to desktop app's Tesseract
        # Filter out any paths containing "src-tauri" or "binaries"
        possible_paths = [p for p in possible_paths if "src-tauri" not in str(p) and "binaries" not in str(p)]
    
    # Additional safeguard: If running from python-backend directory, 
    # skip any paths that go to src-tauri (desktop app structure)
    cwd = Path.cwd()
    if cwd.name == "python-backend" or "python-backend" in str(cwd):
        possible_paths = [p for p in possible_paths if "src-tauri" not in str(p.resolve())]
    
    # Check each path
    for path in possible_paths:
        if path.exists() and path.is_file():
            # Verify it's executable (on Unix)
            if platform.system() != "Windows":
                if not os.access(path, os.X_OK):
                    continue
            
            # Additional validation: Try to verify the binary is actually runnable
            # This prevents using desktop app binaries in web mode
            try:
                import subprocess
                # Try to get version (quick check that binary works)
                result = subprocess.run(
                    [str(path.resolve()), "--version"],
                    capture_output=True,
                    timeout=2,
                    text=True
                )
                if result.returncode == 0:
                    return str(path.resolve())
            except (subprocess.TimeoutExpired, subprocess.SubprocessError, FileNotFoundError, OSError):
                # Binary exists but can't be executed (e.g., wrong architecture, missing deps)
                # Skip this path and try next
                continue
    
    return None

def _find_bundled_tessdata():
    """
    Find bundled tessdata directory.
    Returns path to tessdata directory if found, None otherwise.
    """
    tesseract_path = _find_bundled_tesseract()
    if tesseract_path:
        # tessdata is typically in the same directory as tesseract executable
        tessdata_dir = Path(tesseract_path).parent / "tessdata"
        if tessdata_dir.exists() and tessdata_dir.is_dir():
            return str(tessdata_dir.resolve())
        
        # Alternative: check parent directory
        tessdata_dir = Path(tesseract_path).parent.parent / "tessdata"
        if tessdata_dir.exists() and tessdata_dir.is_dir():
            return str(tessdata_dir.resolve())
    
    return None

def configure_tesseract():
    """
    Configure pytesseract to use bundled Tesseract if available,
    otherwise fall back to system Tesseract.
    
    Returns: (tesseract_path, tessdata_path) or (None, None) if not found
    """
    try:
        import pytesseract
    except ImportError:
        return None, None
    
    # First, try to find bundled Tesseract
    bundled_tesseract = _find_bundled_tesseract()
    bundled_tessdata = _find_bundled_tessdata()
    
    if bundled_tesseract:
        # Configure pytesseract to use bundled binary
        pytesseract.pytesseract.tesseract_cmd = bundled_tesseract
        
        # Set TESSDATA_PREFIX if tessdata is found
        if bundled_tessdata:
            os.environ['TESSDATA_PREFIX'] = bundled_tessdata
        
        return bundled_tesseract, bundled_tessdata
    
    # Fall back to system Tesseract (will use PATH)
    return None, None

def is_tesseract_available():
    """
    Check if Tesseract is available (either bundled or system-installed).
    Returns: (available: bool, error_message: str or None)
    """
    try:
        import pytesseract
    except ImportError:
        return False, "Python package 'pytesseract' is not installed. Install with: pip install pytesseract pdf2image"
    
    # Configure Tesseract (bundled or system)
    configure_tesseract()
    
    try:
        # Try to get Tesseract version
        pytesseract.get_tesseract_version()
        return True, None
    except Exception as e:
        error_msg = str(e).lower()
        if "tesseract" in error_msg and ("not found" in error_msg or "not installed" in error_msg or "path" in error_msg):
            # Provide platform-specific installation instructions
            system = platform.system()
            if system == "Windows":
                install_msg = "Tesseract OCR is not installed or not in PATH.\n\n" \
                            "For Desktop App: Tesseract should be bundled with the app.\n" \
                            "For Development: Download from https://github.com/UB-Mannheim/tesseract/wiki"
            elif system == "Darwin":  # macOS
                install_msg = "Tesseract OCR is not installed.\n\n" \
                            "Install with: brew install tesseract"
            else:  # Linux
                install_msg = "Tesseract OCR is not installed.\n\n" \
                            "Ubuntu/Debian: sudo apt-get install tesseract-ocr\n" \
                            "Fedora: sudo dnf install tesseract\n" \
                            "Arch: sudo pacman -S tesseract"
            return False, install_msg
        return False, f"Tesseract OCR error: {str(e)}"

