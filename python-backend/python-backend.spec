# -*- mode: python ; coding: utf-8 -*-
import sys
from PyInstaller.utils.hooks import collect_all

datas = []
binaries = []
hiddenimports = ['modules', 'modules.image_tools', 'modules.pdf_tools', 'modules.pdf_editor', 'modules.licensing']
tmp_ret = collect_all('pdf2docx')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('py_pdf_parser')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]

# Base excludes list
excludes_list = [
    # ML/AI frameworks (not used)
    'torch', 'torchvision', 'tensorflow', 'tensorboard',
    'matplotlib', 'av', 'onnxruntime', 'moviepy',
    'numba', 'llvmlite', 'notebook', 'ipython',

    # GUI toolkits (not needed for backend)
    'tkinter', 'PyQt5', 'PyQt6', 'PySide2', 'PySide6',
    'wx', 'gi', 'gtk',

    # Testing frameworks
    'pytest', 'unittest', 'test', 'tests', '_pytest',
    'nose', 'doctest', 'coverage',

    # Development tools
    'pip', 'wheel',
    'pkg_resources._vendor',

    # Unused standard library modules
    'pydoc', 'pdb', 'profile', 'pstats',
    'turtle', 'curses',

    # Unused network/web
    'http.server', 'wsgiref', 'xmlrpc',

    # Unused data formats
    'sqlite3',  # Only if you don't use SQLite
]

# Only exclude distutils on Python < 3.12 (it doesn't exist in 3.12+)
if sys.version_info < (3, 12):
    excludes_list.extend(['setuptools', 'distutils'])

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
    optimize=2,  # Changed from 0 to 2 for better optimization
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
    strip=True,  # Changed from False - strips debug symbols for smaller size
    upx=True,  # Already enabled - compresses executable
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
