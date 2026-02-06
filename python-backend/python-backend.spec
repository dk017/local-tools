# -*- mode: python ; coding: utf-8 -*-
import sys
from PyInstaller.utils.hooks import collect_all, collect_data_files

datas = []
binaries = []
hiddenimports = ['modules', 'modules.image_tools', 'modules.pdf_tools', 'modules.pdf_editor', 'modules.licensing']
tmp_ret = collect_all('pdf2docx')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('py_pdf_parser')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]

# Collect rembg and onnxruntime for background removal feature
tmp_ret = collect_all('rembg')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('onnxruntime')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]

# Add pooch for model downloads
hiddenimports += ['pooch']

# Collect numba and llvmlite for rembg's pymatting dependency
tmp_ret = collect_all('numba')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('llvmlite')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]

# Base excludes list
# NOTE: Do NOT exclude pip, wheel, setuptools, or distutils here.
# PyInstaller's internal hooks need to manage these modules and will fail
# with "already imported as ExcludedModule" errors if we exclude them.
# NOTE: numba and llvmlite are required by rembg (via pymatting) - do NOT exclude them
excludes_list = [
    # ML/AI frameworks (not used - but NOT onnxruntime, needed for rembg)
    'torch', 'torchvision', 'tensorflow', 'tensorboard',
    'matplotlib', 'av', 'moviepy',
    'notebook', 'ipython',

    # GUI toolkits (not needed for backend)
    'tkinter', 'PyQt5', 'PyQt6', 'PySide2', 'PySide6',
    'wx', 'gi', 'gtk',

    # Testing frameworks (NOTE: unittest is needed by numpy.testing, don't exclude it)
    'pytest', '_pytest',
    'nose', 'doctest', 'coverage',

    # Unused standard library modules
    'pdb', 'profile', 'pstats',
    'turtle', 'curses',

    # Unused network/web
    'http.server', 'wsgiref', 'xmlrpc',

    # Unused data formats
    'sqlite3',  # Only if you don't use SQLite
]

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes_list,
    noarchive=False,
    optimize=0,  # Changed from 2 to 0 to prevent NumPy/docstring related crashes
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='python-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,  # Changed from True - fixes WinError 2 on Windows where strip utility is missing
    upx=False,  # Disabled - UPX can corrupt DLLs causing "Invalid access to memory location" errors
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
