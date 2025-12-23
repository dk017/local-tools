import React, { useState, useEffect } from "react";
import { usePython } from "../hooks/usePython";
import {
  FileText,
  Scissors,
  Merge,
  Image as ImageIcon,
  Minimize2,
  Type,
  FileUp,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  ArrowRight,
  Lock,
  Unlock,
  Shield,
  RotateCw,
  Stamp,
  Hash,
  FileType2,
  XCircle,
  Droplet,
  Wrench,
  Layers,
  ShieldAlert,
  PenTool,
  Eraser,
  Zap,
  Book,
  GitCompare,
  Crop,
} from "lucide-react";
import { cn } from "../lib/utils";
// import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from "react-i18next";
import { pickFiles, FileAsset, readFileAsset } from "../lib/file-picker";
import { IS_TAURI } from "../config";
import { v4 as uuidv4 } from "uuid";
import { useDropzone } from "react-dropzone";
import { listen } from "@tauri-apps/api/event";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { invoke } from "@tauri-apps/api/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableFileCardProps {
  file: FileAsset;
  onRemove: (id: string) => void;
  thumbnail?: string;
}

const SortableFileCard: React.FC<SortableFileCardProps> = ({
  file,
  onRemove,
  thumbnail,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: file.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-card border border-border p-3 rounded-xl flex items-center gap-4 shadow-sm group touch-none cursor-grab active:cursor-grabbing hover:bg-secondary/30 transition-colors"
    >
      <div className="w-12 h-12 bg-secondary rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-border/50">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="bg-red-500/10 text-red-500 w-full h-full flex items-center justify-center">
            <FileText size={20} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate text-foreground/90"
          title={file.name}
        >
          {file.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-muted-foreground truncate opacity-70 font-mono">
            {file.size ? (file.size / 1024).toFixed(1) + " KB" : "Ready"}
          </p>
          {file.path && (
            <p className="text-[10px] text-muted-foreground/40 truncate max-w-[200px] hidden sm:block">
              • {file.path}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent drag start when clicking delete
          onRemove(file.id);
        }}
        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all cursor-pointer"
        onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

type PdfMode =
  | "merge"
  | "split"
  | "pdf_to_images"
  | "images_to_pdf"
  | "compress"
  | "extract_text"
  | "protect"
  | "unlock"
  | "remove_metadata"
  | "rotate"
  | "watermark"
  | "pdf_to_word"
  | "page_numbers"
  | "delete_pages"
  | "extract_images_from_pdf"
  | "grayscale"
  | "repair"
  | "flatten"
  | "extract_tables"
  | "diff"
  | "booklet"
  | "scrub"
  | "redact"
  | "sign"
  | "optimize"
  | "word_to_pdf"
  | "powerpoint_to_pdf"
  | "excel_to_pdf"
  | "html_to_pdf"
  | "ocr_pdf"
  | "pdf_to_pdfa"
  | "crop"
  | "organize";

import { ToolInfo } from "../components/ToolInfo";

export const PdfTools: React.FC<{ initialMode?: string }> = ({
  initialMode,
}) => {
  const { t } = useTranslation();
  const { execute } = usePython();
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<PdfMode>(
    (initialMode as PdfMode) || "merge"
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  React.useEffect(() => {
    if (initialMode) {
      setMode(initialMode as PdfMode);
    }
  }, [initialMode]);

  // React Dropzone configuration
  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setFiles((prev) => {
          const existingNames = new Set(prev.map((f) => f.name));
          const newAssets: FileAsset[] = acceptedFiles
            .filter((f) => !existingNames.has(f.name))
            .map((f) => {
              const possiblePath = (f as any).path;
              const name = f.name;
              return {
                id: uuidv4(),
                name: name,
                path: possiblePath || name,
                file: f,
              };
            });

          if (newAssets.length === 0) return prev;
          return [...prev, ...newAssets];
        });
      }
    },
    [mode]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true, // we have custom buttons for clicking
    noKeyboard: true,
  });

  // --- TAURI DRAG & DROP HANDLING ---
  const [isTauriDragActive, setIsTauriDragActive] = useState(false);

  useEffect(() => {
    if (!IS_TAURI) return;

    let unlistenDrop: (() => void) | undefined;
    let unlistenEnter: (() => void) | undefined;
    let unlistenLeave: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenEnter = await listen("tauri://drag-enter", () => {
        setIsTauriDragActive(true);
      });

      unlistenLeave = await listen("tauri://drag-leave", () => {
        setIsTauriDragActive(false);
      });

      unlistenDrop = await listen<{ paths: string[] }>(
        "tauri://drag-drop",
        (event) => {
          setIsTauriDragActive(false);
          const paths = event.payload.paths;

          if (paths && paths.length > 0) {
            // Filter duplicates based on path - we need to check inside setFiles callback
            setFiles((prev) => {
              const existingPaths = new Set(prev.map((f) => f.path));
              const uniqueNewAssets = paths
                .filter((path) => !existingPaths.has(path))
                .map((path) => {
                  const name = path.split(/[/\\]/).pop() || path;
                  return {
                    id: uuidv4(),
                    name: name,
                    path: path,
                    file: undefined as any,
                  };
                });

              // If no new unique files, return previous state
              if (uniqueNewAssets.length === 0) return prev;

              return [...prev, ...uniqueNewAssets];
            });
          }
        }
      );
    };

    setupListeners();

    return () => {
      if (unlistenDrop) unlistenDrop();
      if (unlistenEnter) unlistenEnter();
      if (unlistenLeave) unlistenLeave();
    };
  }, [mode]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // Fetch Preview for specific modes
  // Fetch Preview for specific modes
  React.useEffect(() => {
    if ((mode === "watermark" || mode === "page_numbers") && files.length > 0) {
      const target = files[0];
      // If web, usePython sends the file. If desktop, sends path.
      // For simple parity, we pass 'file' as the object, usePython handles it
      const actualPayload = {
        file: IS_TAURI ? target.path : target.file,
        page: 0,
      };

      execute("pdf_tools", "preview", actualPayload)
        .then((res: any) => {
          if (res.image) {
            setPreviewSrc(res.image);
          }
        })
        .catch((err: any) => console.error("Preview failed", err));
    } else {
      setPreviewSrc(null);
    }
  }, [mode, files]);

  // Load previews for thumbnails
  React.useEffect(() => {
    let isMounted = true;

    const loadThumbnails = async () => {
      // Only load thumbnails for image modes or if files look like images
      const imageExtensions = ["jpg", "jpeg", "png", "webp", "bmp"];

      const missing = files.filter(
        (f) =>
          !thumbnails[f.id] &&
          f.path &&
          imageExtensions.some((ext) => f.name.toLowerCase().endsWith(ext)) &&
          IS_TAURI
      );
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
        setThumbnails((prev) => ({ ...prev, ...newThumbs }));
      }
    };

    loadThumbnails();

    return () => {
      isMounted = false;
    };
  }, [files]);

  // Settings
  const [splitMode, setSplitMode] = useState<"all" | "range">("all");
  const [splitRange, setSplitRange] = useState("");
  const [compressLevel, setCompressLevel] = useState(2); // 0-4
  const [imageFormat, setImageFormat] = useState("png");
  const [imageDpi, setImageDpi] = useState(150);

  // Privacy Settings
  const [password, setPassword] = useState("");
  const [rotationAngle, setRotationAngle] = useState(90);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkOpacity, setWatermarkOpacity] = useState(30); // %

  // Page Num Settings
  const [pageNumPos, setPageNumPos] = useState("bottom-right");

  // Delete Settings
  const [deletePages, setDeletePages] = useState("");

  // Extract Tables Settings
  const [extractFormat, setExtractFormat] = useState("csv");

  // Redact/Sign Settings
  const [redactText, setRedactText] = useState("");
  const [certFile, setCertFile] = useState<FileAsset | null>(null);

  // OCR Settings
  const [ocrLanguage, setOcrLanguage] = useState("eng");

  // Crop Settings
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropWidth, setCropWidth] = useState<number | null>(null);
  const [cropHeight, setCropHeight] = useState<number | null>(null);
  const [cropPages, setCropPages] = useState("");

  // Organize Settings
  const [pageOrder, setPageOrder] = useState("");

  const tools = [
    {
      id: "merge",
      label: t("tools.merge"),
      icon: Merge,
      desc: t("tools.merge_desc"),
      cat: t("common.categories.basic"),
    },
    {
      id: "split",
      label: t("tools.split"),
      icon: Scissors,
      desc: t("tools.split_desc"),
      cat: t("common.categories.basic"),
    },
    {
      id: "rotate",
      label: t("tools.rotate"),
      icon: RotateCw,
      desc: t("tools.rotate_desc"),
      cat: t("common.categories.basic"),
    },
    {
      id: "page_numbers",
      label: t("tools.page_numbers"),
      icon: Hash,
      desc: t("tools.page_numbers_desc"),
      cat: t("common.categories.basic"),
    },
    {
      id: "delete_pages",
      label: t("tools.delete_pages"),
      icon: XCircle,
      desc: t("tools.delete_pages_desc"),
      cat: t("common.categories.basic"),
    },
    {
      id: "crop",
      label: t("tools.crop_pdf"),
      icon: Crop,
      desc: t("tools.crop_pdf_desc"),
      cat: t("common.categories.basic"),
    },
    {
      id: "organize",
      label: t("tools.organize_pdf"),
      icon: Layers,
      desc: t("tools.organize_pdf_desc"),
      cat: t("common.categories.basic"),
    },

    {
      id: "protect",
      label: t("tools.protect"),
      icon: Lock,
      desc: t("tools.protect_desc"),
      cat: t("common.categories.privacy"),
    },
    {
      id: "unlock",
      label: t("tools.unlock"),
      icon: Unlock,
      desc: t("tools.unlock_desc"),
      cat: t("common.categories.privacy"),
    },
    {
      id: "watermark",
      label: t("tools.watermark"),
      icon: Stamp,
      desc: t("tools.watermark_desc"),
      cat: t("common.categories.privacy"),
    },
    {
      id: "remove_metadata",
      label: t("tools.remove_metadata"),
      icon: Shield,
      desc: t("tools.remove_metadata_desc"),
      cat: t("common.categories.privacy"),
    },
    {
      id: "flatten",
      label: t("tools.flatten"),
      icon: Layers,
      desc: t("tools.flatten_desc"),
      cat: t("common.categories.privacy"),
    },

    {
      id: "pdf_to_word",
      label: t("tools.pdf_to_word"),
      icon: FileType2,
      desc: t("tools.pdf_to_word_desc"),
      cat: t("common.categories.convert"),
    },
    {
      id: "word_to_pdf",
      label: t("tools.word_to_pdf"),
      icon: FileType2,
      desc: t("tools.word_to_pdf_desc"),
      cat: t("common.categories.convert"),
    },
    {
      id: "powerpoint_to_pdf",
      label: t("tools.powerpoint_to_pdf"),
      icon: FileType2,
      desc: t("tools.powerpoint_to_pdf_desc"),
      cat: t("common.categories.convert"),
    },
    {
      id: "excel_to_pdf",
      label: t("tools.excel_to_pdf"),
      icon: FileType2,
      desc: t("tools.excel_to_pdf_desc"),
      cat: t("common.categories.convert"),
    },
    {
      id: "html_to_pdf",
      label: t("tools.html_to_pdf"),
      icon: FileType2,
      desc: t("tools.html_to_pdf_desc"),
      cat: t("common.categories.convert"),
    },
    {
      id: "pdf_to_images",
      label: t("tools.pdf_to_images"),
      icon: ImageIcon,
      desc: t("tools.pdf_to_images_desc"),
      cat: t("common.categories.convert"),
    },
    {
      id: "extract_images_from_pdf",
      label: t("tools.extract_images_from_pdf"),
      icon: ImageIcon,
      desc: t("tools.extract_images_from_pdf_desc"),
      cat: t("common.categories.convert"),
    },
    {
      id: "images_to_pdf",
      label: t("tools.images_to_pdf"),
      icon: FileUp,
      desc: t("tools.images_to_pdf_desc"),
      cat: t("common.categories.convert"),
    },
    {
      id: "ocr_pdf",
      label: t("tools.ocr_pdf"),
      icon: Type,
      desc: t("tools.ocr_pdf_desc"),
      cat: t("common.categories.convert"),
    },
    {
      id: "pdf_to_pdfa",
      label: t("tools.pdf_to_pdfa"),
      icon: Shield,
      desc: t("tools.pdf_to_pdfa_desc"),
      cat: t("common.categories.convert"),
    },

    {
      id: "compress",
      label: t("tools.compress_pdf"),
      icon: Minimize2,
      desc: t("tools.compress_pdf_desc"),
      cat: t("common.categories.utils"),
    },
    {
      id: "extract_text",
      label: t("tools.extract_text"),
      icon: Type,
      desc: t("tools.extract_text_desc"),
      cat: t("common.categories.utils"),
    },

    {
      id: "extract_tables",
      label: "Extract Tables",
      icon: FileText,
      desc: "Extract tables to CSV/Excel",
      cat: t("common.categories.utils"),
    },
    {
      id: "diff",
      label: "Visual Diff",
      icon: GitCompare,
      desc: "Compare 2 PDFs",
      cat: t("common.categories.utils"),
    },
    {
      id: "booklet",
      label: "Booklet Maker",
      icon: Book,
      desc: "Create printable booklets",
      cat: t("common.categories.utils"),
    },
    {
      id: "scrub",
      label: "Privacy Scrub",
      icon: ShieldAlert,
      desc: "Remove metadata & history",
      cat: t("common.categories.privacy"),
    },
    {
      id: "redact",
      label: "Secure Redactor",
      icon: Eraser,
      desc: "Permanently remove text",
      cat: t("common.categories.privacy"),
    },
    {
      id: "sign",
      label: "Digital Signer",
      icon: PenTool,
      desc: "Sign with Certificate",
      cat: t("common.categories.privacy"),
    },
    {
      id: "optimize",
      label: "Web Optimize",
      icon: Zap,
      desc: "Fast Web View",
      cat: t("common.categories.utils"),
    },
    {
      id: "grayscale",
      label: t("tools.grayscale"),
      icon: Droplet,
      desc: t("tools.grayscale_desc"),
      cat: t("common.categories.utils"),
    },
    {
      id: "repair",
      label: t("tools.repair"),
      icon: Wrench,
      desc: t("tools.repair_desc"),
      cat: t("common.categories.utils"),
    },
  ];

  const currentTool = tools.find((t) => t.id === mode) || tools[0];
  const ActiveIcon = currentTool.icon;

  const handleSelectFiles = async (append: boolean = false) => {
    const isImageInput = mode === "images_to_pdf";
    const isOfficeInput =
      mode === "word_to_pdf" ||
      mode === "powerpoint_to_pdf" ||
      mode === "excel_to_pdf";
    const isHtmlInput = mode === "html_to_pdf";

    let acceptTypes: string[] = ["pdf"];
    let description = "PDF Files";

    if (isImageInput) {
      acceptTypes = ["jpg", "png", "jpeg", "webp"];
      description = "Images";
    } else if (mode === "word_to_pdf") {
      acceptTypes = ["docx", "doc"];
      description = "Word Documents";
    } else if (mode === "powerpoint_to_pdf") {
      acceptTypes = ["pptx", "ppt"];
      description = "PowerPoint Presentations";
    } else if (mode === "excel_to_pdf") {
      acceptTypes = ["xlsx", "xls"];
      description = "Excel Spreadsheets";
    } else if (mode === "html_to_pdf") {
      acceptTypes = ["html", "htm"];
      description = "HTML Files";
    }

    const newAssets = await pickFiles({
      multiple: true,
      accept: acceptTypes,
      description: description,
    });

    if (newAssets.length > 0) {
      if (append) {
        // Filter duplicates by name for simplicity (or path if available)
        setFiles((prev) => {
          const existingNames = new Set(prev.map((f) => f.name));
          return [
            ...prev,
            ...newAssets.filter((f) => !existingNames.has(f.name)),
          ];
        });
      } else {
        setFiles(newAssets);
      }
      setResult(null);
      setError(null);
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      let payload: any = {};

      // Unified File Handling
      if (IS_TAURI) {
        payload.files = files.map((f) => f.path);
      } else {
        payload.files = files.map((f) => f.file);
      }

      if (mode === "split") {
        if (files.length > 1) {
          throw new Error("Split mode currently supports one file at a time.");
        }
        // For Split, we use payload.file (singular) often in backend
        // Need to ensure backend handles list or singular
        // python-backend usually expects 'file' for single ops
        payload.file = IS_TAURI ? files[0].path : files[0].file;

        payload.mode = splitMode;
        payload.pages = splitRange;
      } else if (mode === "compress") {
        payload.level = compressLevel;
      } else if (mode === "pdf_to_images") {
        payload.format = imageFormat;
        payload.dpi = imageDpi;
      } else if (mode === "protect" || mode === "unlock") {
        payload.password = password;
      } else if (mode === "rotate") {
        payload.angle = rotationAngle;
      } else if (mode === "watermark") {
        payload.text = watermarkText;
        payload.opacity = watermarkOpacity / 100.0;
        if (files[0]) {
          // Watermark mode typically operates on the first file for preview, but batch for process?
          // Backend usually iterates over 'files'
        }
      } else if (mode === "page_numbers") {
        payload.position = pageNumPos;
      } else if (mode === "delete_pages") {
        payload.pages = deletePages;
      } else if (mode === "extract_tables") {
        payload.output_format = extractFormat;
      } else if (mode === "redact") {
        payload.text = redactText;
      } else if (mode === "sign") {
        payload.password = password;
        if (certFile) {
          payload.cert_file = IS_TAURI ? certFile.path : certFile.file;
        }
      } else if (mode === "ocr_pdf") {
        payload.language = ocrLanguage;
      } else if (mode === "crop") {
        payload.x = cropX;
        payload.y = cropY;
        payload.width = cropWidth;
        payload.height = cropHeight;
        if (cropPages) {
          payload.pages = cropPages;
        }
      } else if (mode === "organize") {
        payload.page_order = pageOrder;
      }

      // Ensure payload has 'files' for batch ops if not set above
      if (!payload.files && !payload.file) {
        if (IS_TAURI) payload.files = files.map((f) => f.path);
        else payload.files = files.map((f) => f.file);
      }

      const res = await execute("pdf_tools", mode, payload);
      setResult(res);

      if (res.errors && res.errors.length > 0) {
        setError(`Partial success. ${res.errors.length} errors occurred.`);
      } else if (res.error) {
        setError(res.error);
        setResult(null); // Do not show success if top-level error
      }
    } catch (err: any) {
      console.error("Processing Error:", err);
      setError(err.message || String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="h-full flex flex-col bg-transparent relative overflow-hidden"
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      {(isDragActive || isTauriDragActive) && (
        <div className="absolute inset-0 z-[100] bg-primary/20 backdrop-blur-sm border-2 border-primary border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="bg-background/80 p-6 rounded-xl shadow-xl flex flex-col items-center animate-bounce">
            <FileUp className="w-12 h-12 text-primary mb-2" />
            <p className="text-lg font-bold text-primary">Drop files here</p>
          </div>
        </div>
      )}
      {/* Top Bar */}
      <div className="h-16 shrink-0 border-b border-border flex items-center justify-between px-6 bg-background/40 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <ActiveIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-foreground leading-none">
              {currentTool.label}
            </h2>
            <p className="text-[10px] text-muted-foreground mt-1">
              {currentTool.desc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {files.length > 0 && (
            <button
              onClick={() => handleSelectFiles(true)}
              className="px-4 py-2 text-xs font-semibold text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg transition-all border border-primary/20"
            >
              {t("common.add_more")}
            </button>
          )}
          <button
            onClick={() => handleSelectFiles(false)}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"
          >
            {files.length > 0
              ? t("common.replace_all")
              : t("common.select_files")}
          </button>
          <button
            onClick={handleProcess}
            disabled={
              files.length === 0 ||
              isProcessing ||
              (mode === "split" && splitMode === "range" && !splitRange) ||
              (mode === "protect" && !password) ||
              (mode === "delete_pages" && !deletePages) ||
              (mode === "redact" && !redactText)
            }
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {t("common.process")}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content */}
        <div className="flex-1 bg-black/5 dark:bg-black/40 relative overflow-y-auto p-8">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div
                onClick={() => handleSelectFiles(false)}
                className="border-2 border-dashed border-border p-12 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-secondary/10 transition-all group max-w-md w-full"
              >
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {t("common.select_files")}
                </h3>
                <p className="text-sm text-muted-foreground text-center">
                  {t("common.drag_drop")}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {/* Preview Area (Watermark/Page Numbers) */}
              {previewSrc &&
                (mode === "watermark" || mode === "page_numbers") && (
                  <div className="mb-8 bg-card/50 rounded-xl border border-border flex flex-col items-center relative">
                    <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider p-4">
                      Preview (First Page)
                    </p>
                    <div className="relative shadow-2xl rounded-lg overflow-hidden border border-border/50 bg-white inline-block">
                      <img
                        src={previewSrc}
                        className="max-w-full max-h-[60vh] object-contain block"
                        draggable={false}
                      />

                      {/* Watermark Overlay Preview (Client Side Visual) */}
                      {mode === "watermark" && (
                        <div
                          className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
                          style={{ opacity: watermarkOpacity / 100 }}
                        >
                          <span
                            className="text-gray-500 font-bold whitespace-nowrap select-none"
                            style={{
                              fontSize: "4vw",
                              transform: "rotate(-45deg)",
                            }}
                          >
                            {watermarkText}
                          </span>
                        </div>
                      )}

                      {mode === "page_numbers" && (
                        <div className="absolute inset-0 pointer-events-none">
                          <span
                            className={cn(
                              "absolute text-xs font-mono text-black bg-white/80 px-1.5 py-0.5 rounded border border-black/10 shadow-sm",
                              pageNumPos === "bottom-right" &&
                                "bottom-[5%] right-[5%]",
                              pageNumPos === "bottom-center" &&
                                "bottom-[5%] left-1/2 -translate-x-1/2",
                              pageNumPos === "top-right" &&
                                "top-[5%] right-[5%]"
                            )}
                          >
                            1
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={files.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2 mb-8">
                    {files.map((file) => (
                      <SortableFileCard
                        key={file.id}
                        file={file}
                        thumbnail={thumbnails[file.id] || file.preview}
                        onRemove={(id) =>
                          setFiles(files.filter((f) => f.id !== id))
                        }
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Result Area */}
              {result && (
                <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-green-500">
                      Processing Complete
                    </h3>
                  </div>
                  <div className="pl-8 text-sm text-muted-foreground space-y-2">
                    {result.processed_files?.map((f: string) => (
                      <div
                        key={f}
                        className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/10"
                      >
                        <div
                          className="flex-1 truncate font-mono text-xs"
                          title={f}
                        >
                          {f}
                        </div>
                        {IS_TAURI && (
                          <button
                            onClick={async () => {
                              try {
                                await invoke("plugin:opener|open", { path: f });
                              } catch (e) {
                                console.error("Failed to open file", e);
                                // Fallback try open_path if open fails (common v2 ambiguity without docs)
                                try {
                                  await invoke("plugin:opener|open_path", {
                                    path: f,
                                  });
                                } catch (ignored) {}
                              }
                            }}
                            className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs rounded-md transition-colors font-medium shrink-0 flex items-center gap-1"
                          >
                            <ArrowRight className="w-3 h-3" />
                            Open
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-6 bg-destructive/5 border border-destructive/20 rounded-xl mb-8 flex items-start gap-4 shadow-lg shadow-destructive/5">
                  <div className="p-2 bg-destructive/10 rounded-full shrink-0">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-destructive text-lg mb-1">
                      Process Failed
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                      {error.includes("os error 232") ||
                      error.includes("The pipe is being closed")
                        ? "The background service stopped unexpectedly. This might be due to a missing dependency or a crash in the processing engine."
                        : error}
                    </p>
                    <div className="bg-black/30 p-3 rounded-lg border border-white/5 font-mono text-xs text-muted-foreground break-all">
                      {error}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Programmatic SEO Content Section */}
          <div className="mt-12">
            <ToolInfo
              slug={
                currentTool.id === "merge"
                  ? "merge-pdf"
                  : currentTool.id === "split"
                    ? "split-pdf"
                    : undefined
              }
            />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-card border-l border-border flex flex-col shadow-xl z-20">
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex-1">
                {t("common.settings")}
              </h4>
            </div>

            {mode === "split" && (
              <div className="space-y-4">
                <div className="flex bg-secondary rounded-lg p-1">
                  <button
                    onClick={() => setSplitMode("all")}
                    className={cn(
                      "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
                      splitMode === "all"
                        ? "bg-background text-foreground shadow"
                        : "text-muted-foreground"
                    )}
                  >
                    Extract All
                  </button>
                  <button
                    onClick={() => setSplitMode("range")}
                    className={cn(
                      "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
                      splitMode === "range"
                        ? "bg-background text-foreground shadow"
                        : "text-muted-foreground"
                    )}
                  >
                    Select
                  </button>
                </div>
                {splitMode === "range" && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Pages (e.g. 1-5)
                    </label>
                    <input
                      value={splitRange}
                      onChange={(e) => setSplitRange(e.target.value)}
                      placeholder="1-3"
                      className="w-full bg-secondary rounded py-2 px-3 text-sm outline-none focus:ring-1 ring-primary"
                    />
                  </div>
                )}
              </div>
            )}

            {mode === "delete_pages" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Pages to Delete (e.g. 1, 3-5)
                  </label>
                  <input
                    value={deletePages}
                    onChange={(e) => setDeletePages(e.target.value)}
                    placeholder="1, 3-5"
                    className="w-full bg-secondary rounded py-2 px-3 text-sm outline-none focus:ring-1 ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Comma separated or ranges.
                  </p>
                </div>
              </div>
            )}

            {(mode === "protect" || mode === "unlock") && (
              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground">
                  {mode === "protect" ? "Set Password" : "Password"}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === "protect"
                      ? "Enter new password"
                      : "Enter file password"
                  }
                  className="w-full bg-secondary rounded py-2 px-3 text-sm outline-none focus:ring-1 ring-primary"
                />
                {mode === "unlock" && (
                  <p className="text-[10px] text-muted-foreground">
                    Leave empty if the file is encrypted but has no user
                    password (rare).
                  </p>
                )}
              </div>
            )}

            {mode === "rotate" && (
              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground">
                  Rotation (Clockwise)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      onClick={() => setRotationAngle(deg)}
                      className={cn(
                        "px-3 py-2 text-xs rounded-lg transition-all border",
                        rotationAngle === deg
                          ? "bg-primary/10 border-primary text-primary font-medium"
                          : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === "watermark" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="w-full bg-secondary rounded py-2 px-3 text-sm outline-none focus:ring-1 ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex justify-between">
                    <span>Opacity</span> <span>{watermarkOpacity}%</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={watermarkOpacity}
                    onChange={(e) =>
                      setWatermarkOpacity(parseInt(e.target.value))
                    }
                    className="w-full accent-primary h-2 bg-secondary rounded-lg"
                  />
                </div>
              </div>
            )}

            {mode === "page_numbers" && (
              <div className="space-y-4">
                <label className="text-xs text-muted-foreground block">
                  Position
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["bottom-right", "bottom-center", "top-right"].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setPageNumPos(pos)}
                      className={cn(
                        "px-3 py-2 text-xs rounded-lg transition-all border capitalize",
                        pageNumPos === pos
                          ? "bg-primary/10 border-primary text-primary font-medium"
                          : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {pos.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === "compress" && (
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low Comp.</span>
                  <span>High Comp.</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={compressLevel}
                  onChange={(e) => setCompressLevel(parseInt(e.target.value))}
                  className="w-full accent-primary h-2 bg-secondary rounded-lg"
                />
                <p className="text-xs text-center text-muted-foreground font-mono">
                  Level: {compressLevel}
                </p>
              </div>
            )}

            {mode === "pdf_to_images" && (
              <div className="space-y-4">
                <label className="text-xs text-muted-foreground block">
                  Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["png", "jpg"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setImageFormat(f)}
                      className={cn(
                        "px-3 py-2 text-xs rounded transition-all border uppercase",
                        imageFormat === f
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-secondary border-transparent text-muted-foreground"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-2">
                    DPI: {imageDpi}
                  </label>
                  <input
                    type="range"
                    min="72"
                    max="300"
                    step="10"
                    value={imageDpi}
                    onChange={(e) => setImageDpi(parseInt(e.target.value))}
                    className="w-full accent-primary h-2 bg-secondary rounded-lg"
                  />
                </div>
              </div>
            )}

            {mode === "extract_tables" && (
              <div className="space-y-4">
                <label className="text-xs text-muted-foreground block">
                  Output Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["csv", "xlsx"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setExtractFormat(f)}
                      className={cn(
                        "px-3 py-2 text-xs rounded transition-all border uppercase",
                        extractFormat === f
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-secondary border-transparent text-muted-foreground"
                      )}
                    >
                      {f === "xlsx" ? "Excel" : f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === "redact" && (
              <div className="space-y-4">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Text to Redact
                </label>
                <input
                  type="text"
                  value={redactText}
                  onChange={(e) => setRedactText(e.target.value)}
                  placeholder="Confidential"
                  className="w-full bg-secondary rounded py-2 px-3 text-sm outline-none focus:ring-1 ring-primary"
                />
              </div>
            )}

            {mode === "sign" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Certificate (.pfx)
                  </label>
                  <button
                    onClick={async () => {
                      const f = await pickFiles({
                        multiple: false,
                        accept: ["pfx", "p12"],
                        description: "Certificate",
                      });
                      if (f.length) setCertFile(f[0]);
                    }}
                    className="w-full bg-secondary hover:bg-secondary/80 text-left px-3 py-2 rounded text-xs text-muted-foreground truncate border border-transparent hover:border-border transition-all"
                  >
                    {certFile ? certFile.name : "Select Certificate..."}
                  </button>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Cert Password"
                    className="w-full bg-secondary rounded py-2 px-3 text-sm outline-none focus:ring-1 ring-primary"
                  />
                </div>
              </div>
            )}

            {mode === "diff" && (
              <div className="p-4 bg-secondary/20 rounded-lg text-xs text-muted-foreground">
                Select exactly 2 PDF files to compare.
              </div>
            )}

            {[
              "merge",
              "images_to_pdf",
              "extract_text",
              "remove_metadata",
              "pdf_to_word",
              "flatten",
              "grayscale",
              "repair",
              "extract_images_from_pdf",
              "booklet",
              "scrub",
              "optimize",
              "word_to_pdf",
              "powerpoint_to_pdf",
              "excel_to_pdf",
              "html_to_pdf",
              "pdf_to_pdfa",
            ].includes(mode) && (
              <div className="text-xs text-muted-foreground p-4 bg-secondary/20 rounded-lg">
                No specific settings needed.
              </div>
            )}

            {mode === "ocr_pdf" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Language
                  </label>
                  <select
                    value={ocrLanguage}
                    onChange={(e) => setOcrLanguage(e.target.value)}
                    className="w-full bg-secondary rounded py-2 px-3 text-sm outline-none focus:ring-1 ring-primary"
                  >
                    <option value="eng">English</option>
                    <option value="fra">French</option>
                    <option value="deu">German</option>
                    <option value="spa">Spanish</option>
                    <option value="ita">Italian</option>
                    <option value="jpn">Japanese</option>
                    <option value="kor">Korean</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Select OCR language. Install Tesseract language packs for
                    additional languages.
                  </p>
                </div>
              </div>
            )}

            {mode === "crop" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    X (Left Margin)
                  </label>
                  <input
                    type="number"
                    value={cropX}
                    onChange={(e) => setCropX(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-secondary rounded py-2 px-3 text-sm outline-none focus:ring-1 ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Y (Top Margin)
                  </label>
                  <input
                    type="number"
                    value={cropY}
                    onChange={(e) => setCropY(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-secondary rounded py-2 px-3 text-sm outline-none focus:ring-1 ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Width *
                  </label>
                  <input
                    type="number"
                    value={cropWidth || ""}
                    onChange={(e) =>
                      setCropWidth(
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    placeholder="Required"
                    min="1"
                    className="w-full bg-secondary rounded py-2 px-3 text-sm outline-none focus:ring-1 ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Height *
                  </label>
                  <input
                    type="number"
                    value={cropHeight || ""}
                    onChange={(e) =>
                      setCropHeight(
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    placeholder="Required"
                    min="1"
                    className="w-full bg-secondary rounded py-2 px-3 text-sm outline-none focus:ring-1 ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Pages (Optional)
                  </label>
                  <input
                    value={cropPages}
                    onChange={(e) => setCropPages(e.target.value)}
                    placeholder="1-5 or 1,3,5 (leave empty for all)"
                    className="w-full bg-secondary rounded py-2 px-3 text-sm outline-none focus:ring-1 ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Comma separated or ranges.
                  </p>
                </div>
              </div>
            )}

            {mode === "organize" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Page Order *
                  </label>
                  <input
                    value={pageOrder}
                    onChange={(e) => setPageOrder(e.target.value)}
                    placeholder="3,1,2,5,4 or 1-5,10,8-9"
                    className="w-full bg-secondary rounded py-2 px-3 text-sm outline-none focus:ring-1 ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Enter page numbers in desired order. Use commas for
                    individual pages or dashes for ranges (e.g., "3,1,2" or
                    "1-5,10,8-9").
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="border-t border-border bg-card/30 flex-shrink-0 flex flex-col max-h-[50vh]">
            <div className="px-4 py-3 bg-card/50 backdrop-blur-sm border-b border-border/50">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-70">
                PDF Tools
              </h4>
            </div>
            <div className="overflow-y-auto p-3 custom-scrollbar space-y-6">
              {["Basic", "Convert", "Privacy", "Utils"].map((cat) => {
                const catLabel =
                  t(`common.categories.${cat.toLowerCase()}`) || cat;
                const catTools = tools.filter((t) => t.cat === catLabel);

                if (!catTools.length) return null;
                return (
                  <div key={cat} className="space-y-2">
                    <h5 className="text-[10px] font-bold text-muted-foreground/40 px-2 uppercase tracking-widest">
                      {catLabel}
                    </h5>
                    <div className="flex flex-col gap-1">
                      {catTools.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            if (
                              (mode === "images_to_pdf") !==
                              (t.id === "images_to_pdf")
                            ) {
                              setFiles([]);
                            }
                            setMode(t.id as any);
                            setResult(null);
                            setError(null);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left border",
                            mode === t.id
                              ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                              : "bg-secondary/30 border-transparent hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <t.icon
                            className={cn(
                              "w-4 h-4",
                              mode === t.id ? "text-primary" : "opacity-70"
                            )}
                          />
                          <span>{t.label}</span>
                          {mode === t.id && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-lg shadow-primary/50" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content / Info Sections - Only show on Web, hide on Desktop */}
      {!IS_TAURI && (
        <div className="mt-20">
          <ToolInfo slug={mode} />
        </div>
      )}
    </div>
  );
};
