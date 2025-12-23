import PyInstaller.__main__
import shutil
import os

def build():
    # Define paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(base_dir, "dist")
    target_dir = os.path.join(base_dir, "..", "src-tauri", "binaries")
    
    # Ensure target directory exists
    os.makedirs(target_dir, exist_ok=True)
    
    # PyInstaller arguments
    args = [
        "main.py",
        "--name=python-backend",
        "--onefile",
        "--noconsole", 
        "--clean",
        "--paths=.",
        "--hidden-import=modules",
        "--hidden-import=modules.image_tools",
        "--hidden-import=modules.pdf_tools",
        "--collect-all=pdf2docx", 
        "--collect-all=py_pdf_parser",
        
        # Excludes to reduce size and build time
        "--exclude-module=torch",
        "--exclude-module=torchvision",
        "--exclude-module=tensorflow",
        "--exclude-module=tensorboard",
        "--exclude-module=matplotlib",
        #" --exclude-module=scipy", # Needed for rembg/pandas?
        #" --exclude-module=pandas", # Needed for pdf_tools
        #" --exclude-module=sklearn", 
        "--exclude-module=av",
        "--exclude-module=onnxruntime",
        "--exclude-module=moviepy",
        "--exclude-module=numba",
        "--exclude-module=llvmlite",
        "--exclude-module=notebook",
        "--exclude-module=ipython",
        "--exclude-module=tkinter", # usually not needed for backend
    ]
    
    print("Building python backend...")
    PyInstaller.__main__.run(args)
    
    # Move and Rename
    src = os.path.join(dist_dir, "python-backend.exe")
    dst = os.path.join(target_dir, "python-backend-x86_64-pc-windows-msvc.exe")
    
    if os.path.exists(src):
        print(f"Moving {src} to {dst}")
        # Retry logic if file is locked?
        try:
            if os.path.exists(dst):
                os.remove(dst)
            shutil.move(src, dst)
            print("Build success!")
        except Exception as e:
             print(f"Error moving file: {e}")
    else:
        print("Build failed: Output executable not found.")

if __name__ == "__main__":
    build()
