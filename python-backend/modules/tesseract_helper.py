"""
Helper module to detect and configure Tesseract OCR.
Supports both bundled (desktop) and system-installed (web) Tesseract.
"""
import os
import platform
import sys
from pathlib import Path

def _find_bundled_tesseract():
    """
    Find bundled Tesseract in Tauri app structure.
    Returns path to tesseract executable if found, None otherwise.
    """
    # In Tauri, bundled binaries are typically in the resource directory
    # The Python backend runs as a sidecar, so we need to find the app directory
    
    # Try common Tauri resource paths
    possible_paths = []
    
    # Method 1: Check if we're running from a bundled app
    if getattr(sys, 'frozen', False):
        # PyInstaller bundle
        base_path = Path(sys._MEIPASS) if hasattr(sys, '_MEIPASS') else Path(sys.executable).parent
        possible_paths.append(base_path.parent / "tesseract" / "tesseract.exe")
        possible_paths.append(base_path.parent / "tesseract" / "tesseract")
        possible_paths.append(base_path / "tesseract" / "tesseract.exe")
        possible_paths.append(base_path / "tesseract" / "tesseract")
    
    # Method 2: Check relative to executable
    exe_dir = Path(sys.executable).parent
    possible_paths.extend([
        exe_dir.parent / "tesseract" / "tesseract.exe",
        exe_dir.parent / "tesseract" / "tesseract",
        exe_dir / "tesseract" / "tesseract.exe",
        exe_dir / "tesseract" / "tesseract",
    ])
    
    # Method 3: Check common Tauri binary locations
    if platform.system() == "Windows":
        possible_paths.extend([
            Path(".") / "tesseract" / "tesseract.exe",
            Path("..") / "tesseract" / "tesseract.exe",
        ])
    else:
        possible_paths.extend([
            Path(".") / "tesseract" / "tesseract",
            Path("..") / "tesseract" / "tesseract",
        ])
    
    # Check each path
    for path in possible_paths:
        if path.exists() and path.is_file():
            # Verify it's executable (on Unix)
            if platform.system() != "Windows":
                if not os.access(path, os.X_OK):
                    continue
            return str(path.resolve())
    
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

