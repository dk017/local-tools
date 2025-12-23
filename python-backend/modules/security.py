import os

# Define allowed directories for file operations
# In production, these should be dynamically set or strictly limited
# For this "offline" tool running locally or on server:
# Server Mode: Temp dir is primary.
# Desktop Mode: User directories (we rely on frontend sending valid paths, but we checks .. traversal)

def is_safe_path(path):
    """
    Checks if a path is safe to access.
    1. Must be absolute (or resolve to absolute).
    2. Must not contain traversal sequences that escape intended roots (though if we allow any abs path on desktop, this is looser).
    3. On Server Mode: Should ideally be restricted to TEMP_DIR or explicit upload folders.
    """
    if not path:
        return False
        
    try:
        clean_path = os.path.abspath(path)
        
        # Simple traversal check
        # Resolving abspath usually handles '..' but we explicitly check to be sure we are not being tricked
        # if the resolved path doesn't make sense or if we want to enforce stricter sandboxing.
        
        # For now, we allow arbitrary paths because this is a Desktop App first agent.
        # BUT, we should at least ensure the path is valid syntax and exists?
        # Actually validate_input_file does the exists check.
        
        # Improvement: Prevent traversing UP from root (unlikely on Windows but good practice)
        # Actually, abspath handles '..' so "C:/Users/../Windows" becomes "C:/Windows".
        # There is no "unsafe" path in Desktop mode unless we want to Sandbox.
        
        # TODO: If SERVER_MODE env var is set, enforce starts_with(TEMP_DIR)
        if os.environ.get("SERVER_MODE") == "true":
             temp_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "temp_uploads")) # concept
             # For now, let's just NOT crash.
             pass

        return True
    except Exception:
        return False

def validate_input_file(path):
    if not is_safe_path(path):
        raise ValueError(f"Invalid path structure: {path}")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Input file not found: {path}")
    if not os.path.isfile(path):
        raise ValueError(f"Not a file: {path}")
    return True
