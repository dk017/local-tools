import os
import logging

logger = logging.getLogger(__name__)

# Define allowed directories for file operations
# In production, these should be dynamically set or strictly limited
# For this "offline" tool running locally or on server:
# Server Mode: Temp dir is primary.
# Desktop Mode: User directories (we rely on frontend sending valid paths, but we checks .. traversal)

# Server mode allowed roots - configurable via environment
# Defaults to temp_uploads directory relative to python-backend
def _get_allowed_roots():
    """
    Returns list of allowed root directories for server mode.
    Configurable via ALLOWED_UPLOAD_ROOTS env var (comma-separated paths).
    """
    if os.environ.get("ALLOWED_UPLOAD_ROOTS"):
        roots = os.environ.get("ALLOWED_UPLOAD_ROOTS", "").split(",")
        return [os.path.abspath(r.strip()) for r in roots if r.strip()]

    # Default: temp_uploads and system temp directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    default_roots = [
        os.path.abspath(os.path.join(backend_dir, "temp_uploads")),
        os.path.abspath(os.environ.get("TEMP", os.path.join(backend_dir, "temp_uploads"))),
        os.path.abspath(os.environ.get("TMP", os.path.join(backend_dir, "temp_uploads"))),
    ]
    # On Unix, also allow /tmp
    if os.name != "nt":
        default_roots.append("/tmp")

    return list(set(default_roots))  # Remove duplicates


def is_safe_path(path):
    """
    Checks if a path is safe to access.
    1. Must be absolute (or resolve to absolute).
    2. Must not contain traversal sequences that escape intended roots.
    3. On Server Mode: MUST be within allowed upload directories (sandboxed).
    4. On Desktop Mode: Allows user directories but validates structure.

    Returns:
        True if path is safe, False otherwise.
    """
    if not path:
        return False

    try:
        # Normalize path and resolve any '..' or '.' components
        clean_path = os.path.abspath(os.path.normpath(path))

        # Block null bytes (path injection attempt)
        if '\x00' in str(path) or '\x00' in clean_path:
            logger.warning(f"Path contains null byte (injection attempt): {repr(path)}")
            return False

        # Block obvious traversal patterns in the original path string
        # Even though abspath normalizes, we want to detect malicious intent
        suspicious_patterns = ['../', '..\\', '%2e%2e', '....']
        path_lower = str(path).lower()
        for pattern in suspicious_patterns:
            if pattern in path_lower:
                logger.warning(f"Suspicious path pattern detected: {pattern} in {path}")
                # In server mode, this is a hard reject
                if os.environ.get("SERVER_MODE") == "true":
                    return False

        # SERVER MODE: Strict sandboxing to allowed directories only
        if os.environ.get("SERVER_MODE") == "true":
            allowed_roots = _get_allowed_roots()

            # Path must be under one of the allowed roots
            is_allowed = False
            for root in allowed_roots:
                # Ensure the clean path starts with an allowed root
                # Use os.path.commonpath to handle edge cases properly
                try:
                    common = os.path.commonpath([clean_path, root])
                    if common == root:
                        is_allowed = True
                        break
                except ValueError:
                    # Different drives on Windows
                    continue

            if not is_allowed:
                logger.warning(f"SERVER_MODE: Path outside allowed roots. Path: {clean_path}, Allowed: {allowed_roots}")
                return False

        # DESKTOP MODE: More permissive, but still validate structure
        # Ensure the path doesn't resolve to system directories
        if os.name == "nt":
            # Windows: Block access to system directories
            system_dirs = [
                os.environ.get("SYSTEMROOT", "C:\\Windows"),
                os.environ.get("PROGRAMFILES", "C:\\Program Files"),
                os.environ.get("PROGRAMFILES(X86)", "C:\\Program Files (x86)"),
            ]
            clean_lower = clean_path.lower()
            for sys_dir in system_dirs:
                if sys_dir and clean_lower.startswith(sys_dir.lower()):
                    logger.warning(f"Path resolves to system directory: {clean_path}")
                    return False
        else:
            # Unix: Block access to sensitive directories
            sensitive_dirs = ["/etc", "/bin", "/sbin", "/usr/bin", "/usr/sbin", "/root"]
            for sens_dir in sensitive_dirs:
                if clean_path.startswith(sens_dir):
                    logger.warning(f"Path resolves to sensitive directory: {clean_path}")
                    return False

        return True

    except Exception as e:
        logger.error(f"Error validating path {path}: {e}")
        return False

def validate_input_file(path):
    if not is_safe_path(path):
        raise ValueError(f"Invalid path structure: {path}")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Input file not found: {path}")
    if not os.path.isfile(path):
        raise ValueError(f"Not a file: {path}")
    return True
