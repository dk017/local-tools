import React, { useState } from 'react';
import { usePython } from '../hooks/usePython';
import { Upload, FileImage, CheckCircle, AlertCircle, Loader2, X, Maximize2, Minimize2, FileOutput, Stamp, AppWindow, Palette, Crop, ImagePlus, Type, Trash2 } from 'lucide-react';
import { pickFiles, FileAsset, readFileAsset } from '../lib/file-picker';
import { validateFiles } from '../lib/file-validation';
import Cropper from 'react-easy-crop';
import { UserSquare2 } from 'lucide-react';
// import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { IS_TAURI } from '../config';
import { ToolInfo } from '../components/ToolInfo';
import { useNavigate } from 'react-router-dom';


import StudioCanvas, { StudioLayerData } from '../components/Studio/StudioCanvas';




type ToolMode = 'convert' | 'resize' | 'compress' | 'passport' | 'metadata' | 'watermark' | 'grid' | 'icon' | 'palette' | 'crop' | 'design' | 'remove_bg' | 'heic_to_jpg';

const COUNTRIES = [
    { code: 'US', label: 'United States (2x2 inch)', aspect: 1 },
    { code: 'UK', label: 'United Kingdom (35x45mm)', aspect: 35 / 45 },
    { code: 'EU', label: 'Europe (35x45mm)', aspect: 35 / 45 },
    { code: 'AU', label: 'Australia (35x45mm)', aspect: 35 / 45 },
    { code: 'JP', label: 'Japan (35x45mm)', aspect: 35 / 45 },
    { code: 'CN', label: 'China (33x48mm)', aspect: 33 / 48 },
    { code: 'IN', label: 'India (35x45mm)', aspect: 35 / 45 },
    { code: 'CA', label: 'Canada (50x70mm)', aspect: 50 / 70 },
];

export const ImageConverter: React.FC<{ initialMode?: string }> = ({ initialMode }) => {
    const { t } = useTranslation();
    const { execute } = usePython();
    const navigate = useNavigate();
    const [files, setFiles] = useState<FileAsset[]>([]);

    // In web mode, we have instant previews. In Desktop, we load them lazily.
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

    const [mode, setMode] = useState<ToolMode>((initialMode as ToolMode) || 'convert');

    React.useEffect(() => {
        if (initialMode) {
            setMode(initialMode as ToolMode);
        }
    }, [initialMode]);

    // Settings
    const [format, setFormat] = useState('png');
    const [resizeConfig, setResizeConfig] = useState({ width: 1920, height: 1080, percentage: 50, type: 'dimensions' as 'dimensions' | 'percentage', maintainAspect: true });
    const [compressQuality, setCompressQuality] = useState(80);
    const [compressMode, setCompressMode] = useState<'quality' | 'size'>('quality');
    const [targetSize, setTargetSize] = useState<number>(50);
    const [targetSizeUnit, setTargetSizeUnit] = useState<'KB' | 'MB'>('KB');

    // Passport Settings
    const [passportCountry, setPassportCountry] = useState('US');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [cropAspect, setCropAspect] = useState<number | undefined>(1);
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    // New Tool Settings
    const [watermarkText, setWatermarkText] = useState('Confidential');
    const [watermarkOpacity, setWatermarkOpacity] = useState(128);
    const [watermarkSize, setWatermarkSize] = useState(20);
    const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');

    const [watermarkFile, setWatermarkFile] = useState<FileAsset | null>(null);
    const [watermarkPreviewSrc, setWatermarkPreviewSrc] = useState<string | null>(null);

    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    // const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
    const [studioLayers, setStudioLayers] = useState<StudioLayerData[]>([]);
    const studioIdCounter = React.useRef(1);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const [studioImagePreview, _setStudioImagePreview] = useState<Record<string, string>>({});
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [gridRows, setGridRows] = useState(2);
    const [gridCols, setGridCols] = useState(2);
    const [paletteCount, setPaletteCount] = useState(5);
    const [watermarkPos, setWatermarkPos] = useState<{ x: number, y: number } | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [imageLoadError, setImageLoadError] = useState<string | null>(null);

    // Studio / Layout State
    const [imgNaturalDim, setImgNaturalDim] = useState<{ w: number, h: number } | null>(null);
    // const [displayDim, setDisplayDim] = useState<{ w: number, h: number }>({ w: 0, h: 0 });
    // const mainImageRef = React.useRef<HTMLImageElement>(null);
    const studioExportRef = React.useRef<any>(null);

    // Load previews for thumbnails
    React.useEffect(() => {
        let isMounted = true;

        const loadThumbnails = async () => {
            // Only needed for Desktop where preview isn't sync
            if (!IS_TAURI) return;

            const missing = files.filter(f => !thumbnails[f.id] && f.path);
            if (missing.length === 0) return;

            const newThumbs: Record<string, string> = {};

            for (const asset of missing) {
                if (!isMounted) break;
                try {
                    const contents = await readFileAsset(asset);
                    const blob = new Blob([contents as any]);
                    const url = URL.createObjectURL(blob);
                    newThumbs[asset.id] = url;
                } catch (e) {
                    console.error("Failed to load thumbnail for", asset.path, e);
                }
            }

            if (isMounted && Object.keys(newThumbs).length > 0) {
                setThumbnails(prev => ({ ...prev, ...newThumbs }));
            }
        };

        loadThumbnails();

        return () => {
            isMounted = false;
        };
    }, [files]);

    // Cleanup thumbnail URLs when component unmounts or files change
    React.useEffect(() => {
        return () => {
            // Revoke all thumbnail blob URLs to prevent memory leaks
            Object.values(thumbnails).forEach(url => {
                if (typeof url === 'string' && url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, []);

    // Track blob URLs we create for main image (not from cache)
    const mainImageBlobRef = React.useRef<string | null>(null);

    // Main Image loading logic (for Single view modes)
    React.useEffect(() => {
        let isMounted = true;

        if ((mode === 'passport' || mode === 'watermark' || mode === 'crop' || mode === 'design') && files.length > 0) {
            const target = files[0];

            // WEB MODE: Instant
            if (!IS_TAURI && target.preview) {
                setImageSrc(target.preview);
                return;
            }

            // DESKTOP MODE: Check cache or load
            if (thumbnails[target.id]) {
                setImageSrc(thumbnails[target.id]);
                return;
            }

            const loadFile = async () => {
                try {
                    const contents = await readFileAsset(target);
                    const blob = new Blob([contents as any]);
                    const url = URL.createObjectURL(blob);

                    // Revoke previous blob URL before setting new one
                    if (mainImageBlobRef.current) {
                        URL.revokeObjectURL(mainImageBlobRef.current);
                    }
                    mainImageBlobRef.current = url;

                    if (isMounted) {
                        setImageSrc(url);
                    }
                } catch (e: any) {
                    console.error("Failed to read file:", e);
                    if (isMounted) {
                        setImageLoadError(e.toString());
                    }
                }
            };
            loadFile();
        } else {
            // Revoke blob URL when clearing
            if (mainImageBlobRef.current) {
                URL.revokeObjectURL(mainImageBlobRef.current);
                mainImageBlobRef.current = null;
            }
            setImageSrc(null);
            setImageLoadError(null);
            setImgNaturalDim(null);
        }

        return () => {
            isMounted = false;
        };
    }, [files, mode, thumbnails]);

    // Cleanup main image blob URL on unmount
    React.useEffect(() => {
        return () => {
            if (mainImageBlobRef.current) {
                URL.revokeObjectURL(mainImageBlobRef.current);
            }
        };
    }, []);

    // Track watermark blob URL for cleanup
    const watermarkBlobRef = React.useRef<string | null>(null);

    // Load Watermark Image
    React.useEffect(() => {
        let isMounted = true;

        if (watermarkFile) {
            if (watermarkFile.preview) {
                setWatermarkPreviewSrc(watermarkFile.preview);
            } else {
                const load = async () => {
                    try {
                        const contents = await readFileAsset(watermarkFile);
                        const blob = new Blob([contents as any]);
                        const url = URL.createObjectURL(blob);

                        // Revoke previous blob URL
                        if (watermarkBlobRef.current) {
                            URL.revokeObjectURL(watermarkBlobRef.current);
                        }
                        watermarkBlobRef.current = url;

                        if (isMounted) {
                            setWatermarkPreviewSrc(url);
                        }
                    } catch (e) { console.error(e) }
                }
                load();
            }
        } else {
            // Revoke blob URL when clearing
            if (watermarkBlobRef.current) {
                URL.revokeObjectURL(watermarkBlobRef.current);
                watermarkBlobRef.current = null;
            }
            setWatermarkPreviewSrc(null);
        }

        return () => {
            isMounted = false;
        };
    }, [watermarkFile]);

    // Cleanup watermark blob URL on unmount
    React.useEffect(() => {
        return () => {
            if (watermarkBlobRef.current) {
                URL.revokeObjectURL(watermarkBlobRef.current);
            }
        };
    }, []);


    // Track Image Resize
    // React.useLayoutEffect(() => {
    //     if (!mainImageRef.current || !imgNaturalDim) return;
    //     const observer = new ResizeObserver((entries) => {
    //         for (const entry of entries) {
    //             const { width, height } = entry.contentRect;
    //             if (width > 0 && height > 0) {
    //                 // setDisplayDim({ w: width, h: height });
    //             }
    //         }
    //     });
    //     observer.observe(mainImageRef.current);
    //     return () => observer.disconnect();
    // }, [imageSrc, imgNaturalDim]);

    // Track Image Dimensions for Canvas without rendering
    React.useEffect(() => {
        if (imageSrc) {
            const img = new Image();
            img.src = imageSrc;
            img.onload = () => {
                setImgNaturalDim({ w: img.width, h: img.height });
            };
        }
    }, [imageSrc]);

    const handleSelectFiles = async () => {
        const assets = await pickFiles({
            multiple: true,
            accept: ['jpg', 'jpeg', 'png', 'webp', 'bmp'],
            description: 'Images'
        });
        if (assets.length > 0) {
            // Validate files before adding
            const validation = validateFiles(mode, assets);
            
            if (!validation.valid) {
                setError(validation.error || "Invalid files selected.");
                return;
            }
            
            // Clear previous errors if validation passes
            setError(null);
            setFiles(assets);
            setResult(null);
        }
    };

    const addTextLayer = () => {
        const id = `layer-${studioIdCounter.current++}`;
        setStudioLayers(prev => [...prev, { id, type: 'text', text: 'New Text', x: 50, y: 50, fontFamily: 'Inter', fontSize: 40, fill: '#ffffff', opacity: 1, rotation: 0, scaleX: 1, scaleY: 1 }]);
    };

    const addImageLayer = async () => {
        const assets = await pickFiles({ multiple: false, accept: ['png', 'jpg', 'webp'], description: 'Image Layer' });
        if (assets.length > 0) {
            const asset = assets[0];
            const id = `layer-${studioIdCounter.current++}`;

            let src = asset.path;
            // If web or no path, ensure we have a blob url
            if (!IS_TAURI || !src) {
                if (asset.preview) src = asset.preview;
                else {
                    try {
                        const contents = await readFileAsset(asset);
                        const blob = new Blob([contents as any]);
                        src = URL.createObjectURL(blob);
                    } catch (e) { console.error(e); }
                }
            }

            setStudioLayers(prev => [...prev, { id, type: 'image', asset, src: src || '', x: 50, y: 50, width: 200, height: 200, opacity: 1, rotation: 0, scaleX: 1, scaleY: 1 }]);
        }
    };

    const handleProcess = async () => {
        if (files.length === 0) return;

        // Validate before processing
        // Note: For image crop, we don't validate dimensions as it's interactive
        // Only validate for PDF crop which uses explicit width/height
        const validation = validateFiles(mode, files);
        
        if (!validation.valid) {
            setError(validation.error || "Validation failed. Please check your inputs.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setResult(null);

        try {
            let action = 'convert';
            let payload: any = {};

            // Determine if we need to send files physically (Web) or by reference (Desktop)
            // For now, we assume usePython handles the `files` array if we pass it specially?

            if (IS_TAURI) {
                payload.files = files.map(f => f.path);
            } else {
                // WEB MODE: Send File objects directly so usePython can Upload them?
                // Actually, let's keep it simple: Map FileAssets to usePython logic
                // But wait, the backend needs 'files' list of paths.

                // For now, let's just pass metadata and assume we haven't implemented Upload fully yet
                // But to make it work, I'll pass the whole FileAsset array hidden in payload
                // and usePython (Web version) will need to handle it.
                // Or better: Let's assume usePython handles "uploads" param.
                // But I can't change usePython signature without breaking other calls.

                // I'll stick 'files' as File objects in payload, usePython will convert to Form Data
                payload.files = files.map(f => f.file);
            }


            if (mode === 'convert') {
                action = 'convert';
                payload.target_format = format;
            } else if (mode === 'resize') {
                action = 'resize';
                payload.resize_mode = resizeConfig.type === 'percentage' ? 'percentage' : 'pixel';
                if (resizeConfig.type === 'percentage') {
                    payload.percentage = resizeConfig.percentage;
                } else {
                    payload.width = resizeConfig.width || undefined;
                    payload.height = resizeConfig.height || undefined;
                    payload.maintain_aspect = resizeConfig.maintainAspect;
                }
            } else if (mode === 'compress') {
                action = 'compress';
                if (compressMode === 'quality') {
                    payload.quality = compressQuality;
                } else {
                    let sizeInKb = targetSize;
                    if (targetSizeUnit === 'MB') {
                        sizeInKb = targetSize * 1024;
                    }
                    payload.target_size_kb = sizeInKb;
                }
            } else if (mode === 'passport') {
                action = 'passport';
                payload.country = passportCountry;
                if (files.length === 1 && croppedAreaPixels) {
                    payload.crop_box = croppedAreaPixels;
                }
            } else if (mode === 'metadata') {
                action = 'remove_metadata';
            } else if (mode === 'watermark') {
                action = 'watermark';
                payload.text = watermarkText;
                payload.opacity = watermarkOpacity;
                payload.size = watermarkSize;
                if (watermarkType === 'image' && watermarkFile) {
                    if (IS_TAURI) {
                        payload.watermark_file = watermarkFile.path;
                    } else {
                        // Web: need to upload watermark too
                        payload.watermark_file_obj = watermarkFile.file;
                    }
                }
                if (watermarkPos) {
                    payload.x = watermarkPos.x;
                    payload.y = watermarkPos.y;
                }
            } else if (mode === 'grid') {
                action = 'grid_split';
                payload.rows = gridRows;
                payload.cols = gridCols;
            } else if (mode === 'icon') {
                action = 'generate_icons';
            } else if (mode === 'palette') {
                action = 'extract_palette';
                payload.count = paletteCount;
            } else if (mode === 'crop') {
                action = 'crop';
                if (files.length === 1 && croppedAreaPixels) {
                    payload.crop_box = croppedAreaPixels;
                }
            } else if (mode === 'design') {
                action = 'save_canvas';
                if (studioExportRef.current) {
                    const dataUrl = studioExportRef.current();
                    payload.image_data = dataUrl;
                    payload.filename = `design_${Date.now()}.png`;
                }
            } else if (mode === 'remove_bg') {
                action = 'remove_bg';
                payload.model = 'u2net'; // could add UI selector for this later
            } else if (mode === 'heic_to_jpg') {
                action = 'heic_to_jpg';
                payload.quality = 95;
            }

            const res = await execute('image_tools', action, payload);
            setResult(res);

            if (res.errors && res.errors.length > 0) {
                setError(`Processed ${res.processed_files.length} files, but ${res.errors.length} failed.`);
            }

        } catch (err: any) {
            console.error("Processing Error:", err);
            setError(typeof err === 'string' ? err : (err.message || JSON.stringify(err) || "Operation failed"));
        } finally {
            setIsProcessing(false);
        }
    };

    // ----------------------------------------------------------------------
    // UNIFIED STUDIO-STYLE LAYOUT
    // ----------------------------------------------------------------------
    const tools = [
        { id: 'convert', label: t('tools.convert'), icon: FileOutput, cat: t('common.categories.essentials') },
        { id: 'resize', label: t('tools.resize'), icon: Maximize2, cat: t('common.categories.essentials') },
        { id: 'compress', label: t('tools.compress_img'), icon: Minimize2, cat: t('common.categories.essentials') },
        { id: 'crop', label: t('tools.crop'), icon: Crop, cat: t('common.categories.essentials') },
        { id: 'passport', label: t('tools.passport'), icon: UserSquare2, cat: t('common.categories.creative') },
        { id: 'watermark', label: t('tools.watermark'), icon: Stamp, cat: t('common.categories.creative') },
        { id: 'icon', label: t('tools.icon'), icon: AppWindow, cat: t('common.categories.developer') },
        { id: 'palette', label: t('tools.palette'), icon: Palette, cat: t('common.categories.developer') },
        { id: 'remove_bg', label: 'Remove BG', icon: UserSquare2, cat: t('common.categories.creative') },
        { id: 'heic_to_jpg', label: 'HEIC to JPG', icon: ImagePlus, cat: t('common.categories.convert') },
        { id: 'studio', label: t('tools.studio'), icon: Palette, cat: t('common.categories.creative') },
    ];

    const currentTool = tools.find(t => t.id === mode) || tools[0];
    const ActiveIcon = currentTool.icon;
    const selectedLayer = studioLayers.find(l => l.id === selectedLayerId);

    return (
        <div className="h-full flex flex-col bg-transparent relative overflow-hidden">
            {/* Top Bar */}
            <div className="h-16 shrink-0 border-b border-border flex items-center justify-between px-6 bg-background/40 backdrop-blur-md z-50">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <ActiveIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-foreground leading-none">{currentTool.label}</h2>
                        <p className="text-[10px] text-muted-foreground mt-1">{currentTool.cat}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Zoom Controls for Visual Modes */}
                    {['design', 'passport', 'crop', 'watermark'].includes(mode) && files.length > 0 && (
                        <div className="flex bg-secondary/50 rounded-lg p-1 border border-border/50">
                            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground"><Minimize2 size={14} /></button>
                            <span className="px-3 text-xs font-mono flex items-center">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground"><Maximize2 size={14} /></button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSelectFiles}
                        className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"
                    >
                        {files.length > 0 ? t('common.add_replace') : t('common.select_images')}
                    </button>
                    <button
                        onClick={handleProcess}
                        disabled={files.length === 0 || isProcessing}
                        className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileOutput className="w-4 h-4" />}
                        {mode === 'design' ? t('common.export') : t('common.start_processing')}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Center Content Area */}
                <div className="flex-1 bg-black/5 dark:bg-black/40 relative overflow-hidden flex flex-col">
                    {files.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div
                                onClick={handleSelectFiles}
                                className="border-2 border-dashed border-border p-12 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-secondary/10 transition-all group max-w-md w-full"
                            >
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">{t('common.select_images')}</h3>
                                <p className="text-sm text-muted-foreground text-center">{t('common.drag_drop')}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8 select-none">


                            {/* Studio Canvas Mode */}
                            {mode === 'design' && imageSrc && imgNaturalDim && (
                                <div
                                    id="studio-wrapper"
                                    className="relative shadow-2xl shadow-black/50 ring-1 ring-white/10 overflow-hidden"
                                    style={{
                                        transform: `scale(${zoom})`,
                                        transformOrigin: 'center center',
                                        transition: 'transform 0.1s ease-out',
                                        width: imgNaturalDim.w,
                                        height: imgNaturalDim.h
                                    }}
                                >
                                    <StudioCanvas
                                        width={imgNaturalDim.w}
                                        height={imgNaturalDim.h}
                                        backgroundSrc={files[0].preview || imageSrc}
                                        layers={studioLayers}
                                        setLayers={setStudioLayers}
                                        selectedId={selectedLayerId}
                                        setSelectedId={setSelectedLayerId}
                                        onExportRef={(cb) => { studioExportRef.current = cb; }}
                                    />
                                </div>
                            )}

                            {/* CROPPER / PASSPORT / WATERMARK */}
                            {['passport', 'crop', 'watermark'].includes(mode) && imageSrc && (
                                <div className="relative w-full h-full flex items-center justify-center p-4">
                                    <div className="relative w-full max-w-4xl h-full max-h-[80vh] bg-black/80 rounded-xl overflow-hidden shadow-2xl border border-border">
                                        {mode === 'watermark' ? (
                                            <div className="relative w-full h-full flex items-center justify-center overflow-hidden" id="preview-wrapper">
                                                <img
                                                    src={imageSrc}
                                                    className="max-w-full max-h-full object-contain shadow-lg"
                                                    onLoad={(e) => setImgNaturalDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                                                />
                                                <div
                                                    className="absolute cursor-move select-none z-10 border border-white/20 p-1 rounded hover:border-blue-500/50 transition-colors"
                                                    onDragEnd={(_) => {
                                                        setWatermarkPos({ x: 0, y: 0 }); // Placeholder
                                                    }}
                                                >
                                                    {watermarkType === 'text' ? (
                                                        <span className="font-bold text-white drop-shadow-md whitespace-nowrap" style={{ fontSize: `${Math.max(12, watermarkSize * 2)}px`, opacity: watermarkOpacity / 255 }}>
                                                            {watermarkText || 'Watermark'}
                                                        </span>
                                                    ) : (
                                                        watermarkPreviewSrc && <img src={watermarkPreviewSrc} className="object-contain drop-shadow-md" style={{ height: `${Math.max(20, watermarkSize * 3)}px`, opacity: watermarkOpacity / 255 }} />
                                                    )}
                                                </div>
                                                {imageLoadError && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-red-500 text-xs p-4 text-center">{imageLoadError}</div>}
                                            </div>
                                        ) : (
                                            <Cropper
                                                image={imageSrc}
                                                crop={crop}
                                                zoom={zoom}
                                                aspect={mode === 'passport' ? (COUNTRIES.find(c => c.code === passportCountry)?.aspect || 1) : cropAspect}
                                                onCropChange={setCrop}
                                                onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                                                onZoomChange={setZoom}
                                                objectFit="contain"
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* BATCH GRID (Convert, Resize, Compress, RemoveBG etc) */}
                            {['convert', 'resize', 'compress', 'grid', 'metadata', 'icon', 'palette', 'remove_bg', 'heic_to_jpg'].includes(mode) && (
                                <div className="w-full h-full overflow-y-auto p-8 custom-scrollbar">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {files.map((asset) => (
                                            <div
                                                key={asset.id}
                                                className="group relative bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all aspect-square flex flex-col"
                                            >
                                                <div className="flex-1 relative bg-secondary/50 flex items-center justify-center overflow-hidden">
                                                    {(thumbnails[asset.id] || asset.preview) ? (
                                                        <img src={thumbnails[asset.id] || asset.preview} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                    ) : (
                                                        <FileImage className="w-12 h-12 text-muted-foreground/30" />
                                                    )}
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setFiles(files.filter(f => f.id !== asset.id)); }}
                                                            className="p-1.5 bg-red-500/90 text-white rounded-full hover:bg-red-600 shadow-sm"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-card border-t border-border z-10">
                                                    <p className="text-xs font-medium truncate text-foreground" title={asset.name}>{asset.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate opacity-70 mt-0.5">{asset.size ? (asset.size / 1024).toFixed(1) + ' KB' : asset.path}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Add Button Tile */}
                                        <div
                                            onClick={handleSelectFiles}
                                            className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/20 transition-all gap-2 text-muted-foreground hover:text-foreground aspect-square"
                                        >
                                            <ImagePlus className="w-8 h-8 opacity-50" />
                                            <span className="text-xs font-medium">Add More</span>
                                        </div>
                                    </div>

                                    {/* Success/Error Messages Inline */}
                                    {result && (
                                        <div className="max-w-xl mx-auto mt-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-400" />
                                            <div className="text-sm text-green-400">
                                                Processed {result.processed_files?.length} files successfully.
                                            </div>
                                        </div>
                                    )}
                                    {error && (
                                        <div className="max-w-xl mx-auto mt-8 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-destructive mb-1">
                                                    {error.includes("This tool only accepts") || 
                                                     error.includes("Invalid file type")
                                                        ? "Validation Error"
                                                        : "Processing Error"}
                                                </h4>
                                                <p className="text-sm text-destructive/90">
                                                    {error}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Programmatic SEO Content Section */}
                    <div className="mt-12 mb-20">
                        <ToolInfo slug={
                            mode === 'convert' ? (format === 'png' ? 'jpg-to-png' : (format === 'jpg' ? 'png-to-jpg' : 'convert-image')) :
                                mode === 'resize' ? 'resize-image' :
                                    mode === 'compress' ? 'compress-image' :
                                        mode === 'remove_bg' ? 'remove-background' :
                                            mode === 'crop' ? 'crop-image' :
                                                mode === 'passport' ? 'passport-photo-maker' :
                                                    mode === 'watermark' ? 'add-watermark' :
                                                        mode === 'palette' ? 'image-color-palette' :
                                                            undefined
                        } />
                    </div>
                </div>

                {/* Right Fixed Sidebar (Settings & Navigation) */}
                <div className="w-80 bg-card border-l border-border flex flex-col shadow-xl z-20">

                    {/* TOP: SETTINGS FOR CURRENT MODE */}
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex-1">{t('common.settings')}</h4>
                        </div>

                        {mode === 'convert' && (
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-foreground">{t('common.target_format')}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['png', 'jpg', 'webp', 'pdf'].map(fmt => (
                                        <button key={fmt} onClick={() => setFormat(fmt)} className={cn("px-2 py-2.5 rounded-lg text-xs font-bold uppercase transition-all border", format === fmt ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-transparent hover:text-foreground")}>
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {mode === 'resize' && (
                            <div className="space-y-5">
                                <div className="flex gap-1 bg-secondary rounded-lg p-1">
                                    <button onClick={() => setResizeConfig({ ...resizeConfig, type: 'dimensions' })} className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition-all", resizeConfig.type === 'dimensions' ? "bg-background text-foreground shadow" : "text-muted-foreground")}>Px</button>
                                    <button onClick={() => setResizeConfig({ ...resizeConfig, type: 'percentage' })} className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition-all", resizeConfig.type === 'percentage' ? "bg-background text-foreground shadow" : "text-muted-foreground")}>%</button>
                                </div>
                                {resizeConfig.type === 'dimensions' ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground">{t('common.width')}</label>
                                            <input type="number" value={resizeConfig.width} onChange={(e) => setResizeConfig({ ...resizeConfig, width: parseInt(e.target.value) || 0 })} className="w-full bg-secondary rounded-md px-3 py-2 text-sm outline-none focus:ring-1 ring-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground">{t('common.height')}</label>
                                            <input type="number" value={resizeConfig.height} onChange={(e) => setResizeConfig({ ...resizeConfig, height: parseInt(e.target.value) || 0 })} className="w-full bg-secondary rounded-md px-3 py-2 text-sm outline-none focus:ring-1 ring-primary" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-xs text-muted-foreground flex justify-between"><span>Scale</span> <span>{resizeConfig.percentage}%</span></label>
                                        <input type="range" min="1" max="200" value={resizeConfig.percentage} onChange={(e) => setResizeConfig({ ...resizeConfig, percentage: parseInt(e.target.value) })} className="w-full accent-primary h-2 bg-secondary rounded-lg" />
                                    </div>
                                )}
                                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                                    <input type="checkbox" checked={resizeConfig.maintainAspect} onChange={(e) => setResizeConfig({ ...resizeConfig, maintainAspect: e.target.checked })} className="rounded bg-secondary border-transparent text-primary focus:ring-0" />
                                    Maintain Aspect Ratio
                                </label>
                            </div>
                        )}

                        {mode === 'compress' && (
                            <div className="space-y-5">
                                <div className="flex gap-1 bg-secondary rounded-lg p-1">
                                    <button onClick={() => setCompressMode('quality')} className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition-all", compressMode === 'quality' ? "bg-background text-foreground shadow" : "text-muted-foreground")}>{t('common.quality')}</button>
                                    <button onClick={() => setCompressMode('size')} className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition-all", compressMode === 'size' ? "bg-background text-foreground shadow" : "text-muted-foreground")}>Target Size</button>
                                </div>
                                {compressMode === 'quality' ? (
                                    <div className="space-y-2">
                                        <label className="text-xs text-muted-foreground flex justify-between"><span>{t('common.quality')}</span> <span>{compressQuality}%</span></label>
                                        <input type="range" min="1" max="100" value={compressQuality} onChange={(e) => setCompressQuality(parseInt(e.target.value))} className="w-full accent-primary h-2 bg-secondary rounded-lg" />
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input type="number" value={targetSize} onChange={(e) => setTargetSize(parseInt(e.target.value) || 0)} className="flex-1 bg-secondary rounded-md px-3 py-2 text-sm outline-none" placeholder="Size" />
                                        <select value={targetSizeUnit} onChange={(e) => setTargetSizeUnit(e.target.value as any)} className="w-20 bg-secondary rounded-md px-2 text-xs outline-none">
                                            <option value="KB">KB</option>
                                            <option value="MB">MB</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {mode === 'passport' && (
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-foreground">Country Standard</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {COUNTRIES.map(c => (
                                        <button key={c.code} onClick={() => setPassportCountry(c.code)} className={cn("px-3 py-2 text-left text-xs rounded-lg transition-all border", passportCountry === c.code ? "bg-primary/10 border-primary text-primary font-medium" : "bg-secondary border-transparent text-muted-foreground hover:text-foreground")}>
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {mode === 'crop' && (
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-foreground">Aspect Ratio</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[1, 4 / 3, 16 / 9].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setCropAspect(r)}
                                            className={cn(
                                                "px-2 py-2 text-xs rounded border transition-all",
                                                cropAspect === r ? "bg-primary/10 border-primary text-primary" : "bg-secondary border-transparent text-muted-foreground"
                                            )}
                                        >
                                            {r === 1 ? '1:1' : r === 4 / 3 ? '4:3' : '16:9'}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCropAspect(undefined)}
                                        className={cn(
                                            "px-2 py-2 text-xs rounded border transition-all",
                                            cropAspect === undefined ? "bg-primary/10 border-primary text-primary" : "bg-secondary border-transparent text-muted-foreground"
                                        )}
                                    >
                                        Free
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === 'watermark' && (
                            <div className="space-y-5">
                                <div className="flex bg-secondary rounded-lg p-1">
                                    <button onClick={() => setWatermarkType('text')} className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition-all", watermarkType === 'text' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>Text</button>
                                    <button onClick={() => setWatermarkType('image')} className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition-all", watermarkType === 'image' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>Image</button>
                                </div>
                                {watermarkType === 'text' ? (
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Text</label>
                                        <input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} className="w-full bg-secondary rounded-md px-3 py-2 text-sm outline-none" placeholder="Confidential" />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Image Source</label>
                                        <button onClick={async () => {
                                            const assets = await pickFiles({ multiple: false, accept: ['png', 'jpg'], description: 'Watermark' });
                                            if (assets.length) setWatermarkFile(assets[0]);
                                        }} className="w-full bg-secondary hover:bg-secondary/80 text-foreground py-2 rounded-md text-xs truncate px-2">{watermarkFile ? watermarkFile.name : "Select Image..."}</button>
                                    </div>
                                )}
                                <div className="space-y-4 pt-2 border-t border-border/50">
                                    <div className="space-y-2">
                                        <label className="text-xs text-muted-foreground flex justify-between"><span>Opacity</span> <span>{Math.round(watermarkOpacity / 2.55)}%</span></label>
                                        <input type="range" min="0" max="255" value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(parseInt(e.target.value))} className="w-full accent-primary h-2 bg-secondary rounded-lg" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-muted-foreground flex justify-between"><span>Size</span> <span>{watermarkSize}%</span></label>
                                        <input type="range" min="1" max="100" value={watermarkSize} onChange={(e) => setWatermarkSize(parseInt(e.target.value))} className="w-full accent-primary h-2 bg-secondary rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {mode === 'grid' && (
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-foreground">{t('tools.grid')}</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">Rows</label>
                                        <input type="number" min="1" max="10" value={gridRows} onChange={(e) => setGridRows(Math.max(1, parseInt(e.target.value)))} className="w-full bg-secondary rounded-md px-3 py-2 text-sm outline-none focus:ring-1 ring-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">Columns</label>
                                        <input type="number" min="1" max="10" value={gridCols} onChange={(e) => setGridCols(Math.max(1, parseInt(e.target.value)))} className="w-full bg-secondary rounded-md px-3 py-2 text-sm outline-none focus:ring-1 ring-primary" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {mode === 'palette' && (
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-foreground">{t('tools.palette')}</label>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Color Count ({paletteCount})</label>
                                    <input type="range" min="2" max="10" value={paletteCount} onChange={(e) => setPaletteCount(parseInt(e.target.value))} className="w-full accent-primary h-2 bg-secondary rounded-lg" />
                                </div>
                            </div>
                        )}

                        {mode === 'icon' && (
                            <div className="text-xs text-muted-foreground p-4 bg-secondary/20 rounded-lg">
                                Generates standard favicon sizes (16, 32, 64, 192, 512).
                            </div>
                        )}

                        {mode === 'metadata' && (
                            <div className="text-xs text-muted-foreground p-4 bg-secondary/20 rounded-lg">
                                {t('tools.remove_metadata_desc')}
                            </div>
                        )}

                        {mode === 'design' && (
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-foreground">{t('tools.design')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={addTextLayer} className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 py-2 rounded-lg text-xs font-medium transition-all"><Type size={14} /> Add Text</button>
                                    <button onClick={addImageLayer} className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 py-2 rounded-lg text-xs font-medium transition-all"><ImagePlus size={14} /> Add Image</button>
                                </div>

                                {selectedLayerId && (
                                    <div className="pt-4 border-t border-border mt-4 space-y-3">
                                        <h5 className="text-xs font-bold text-muted-foreground uppercase opacity-70">Layer Properties</h5>

                                        {selectedLayer && (
                                            <>
                                                <div className="space-y-2">
                                                    <label className="text-xs text-muted-foreground flex justify-between"><span>Opacity</span> <span>{Math.round((selectedLayer.opacity ?? 1) * 100)}%</span></label>
                                                    <input
                                                        type="range" min="0" max="1" step="0.1"
                                                        value={selectedLayer.opacity ?? 1}
                                                        onChange={(e) => setStudioLayers(l => l.map(ly => ly.id === selectedLayerId ? { ...ly, opacity: parseFloat(e.target.value) } : ly))}
                                                        className="w-full accent-primary h-2 bg-secondary rounded-lg"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs text-muted-foreground flex justify-between"><span>Rotation</span> <span>{selectedLayer.rotation}°</span></label>
                                                    <input
                                                        type="range" min="0" max="360"
                                                        value={selectedLayer.rotation}
                                                        onChange={(e) => setStudioLayers(l => l.map(ly => ly.id === selectedLayerId ? { ...ly, rotation: parseInt(e.target.value) } : ly))}
                                                        className="w-full accent-primary h-2 bg-secondary rounded-lg"
                                                    />
                                                </div>
                                                {selectedLayer.type === 'text' && (
                                                    <div className="space-y-2">
                                                        <label className="text-xs text-muted-foreground">Color</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                value={selectedLayer.fill || '#000000'}
                                                                onChange={(e) => setStudioLayers(l => l.map(ly => ly.id === selectedLayerId ? { ...ly, fill: e.target.value } : ly))}
                                                                className="w-8 h-8 rounded border-none cursor-pointer"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={selectedLayer.fill || '#000000'}
                                                                onChange={(e) => setStudioLayers(l => l.map(ly => ly.id === selectedLayerId ? { ...ly, fill: e.target.value } : ly))}
                                                                className="flex-1 bg-secondary rounded px-2 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <button onClick={() => {
                                            setStudioLayers(layers => layers.filter(l => l.id !== selectedLayerId));
                                            setSelectedLayerId(null);
                                        }} className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 py-2 rounded text-xs font-medium flex items-center justify-center gap-2 mt-2">
                                            <Trash2 size={14} /> Delete Layer
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    {/* BOTTOM: TOOL SELECTOR */}
                    <div className="p-4 bg-background/50 backdrop-blur-md border-t border-border">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Image Tools</label>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {tools.map(tool => (
                                <button
                                    key={tool.id}
                                    onClick={() => {
                                        if (tool.id === 'studio') {
                                            navigate('/tool/photo-studio');
                                        } else {
                                            setMode(tool.id as ToolMode);
                                        }
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                                        mode === tool.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                    )}
                                >
                                    <tool.icon size={16} />
                                    <span className="flex-1 text-left">{tool.label}</span>
                                    {mode === tool.id && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
