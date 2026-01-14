"use client";

import { useState, useEffect, useRef, useReducer, useCallback } from "react";
import { FileUploader } from "./FileUploader";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Download,
  CheckCircle,
  Lock,
  Unlock,
  Type,
  Image as LucideImage,
  Plus,
  X,
  FileSpreadsheet,
  ShieldAlert,
  PenTool,
  Eraser,
  Zap,
  Book,
  GitCompare,
  Archive,
  RotateCw,
  RotateCcw,
  Crop,
  Maximize2,
  Hash,
} from "lucide-react";
import Cropper, { Area } from "react-easy-crop";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const StudioCanvas = dynamic(() => import("../Studio/StudioCanvas"), {
  ssr: false,
});
const StudioLayout = dynamic(() => import("../Studio/StudioLayout"), {
  ssr: false,
});
import { StudioLayerData } from "../Studio/StudioCanvas";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface StagedFile {
  id: string;
  file: File;
  preview?: string;
}

const SortableFileItem = ({
  file,
  onRemove,
}: {
  file: StagedFile;
  onRemove: (id: string) => void;
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
      className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5 group touch-none cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors"
    >
      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0 border border-white/5">
        {file.preview ? (
          <img
            src={file.preview}
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <div className="text-muted-foreground">
            <CheckCircle size={20} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium truncate text-white/90">
          {file.file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {(file.file.size / 1024).toFixed(1)} KB
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(file.id);
        }}
        className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Eraser size={16} />{" "}
        {/* Using Eraser as Trash icon replacement since Trash2 is not imported and I want to match imports */}
      </button>
    </div>
  );
};

const COUNTRIES = [
  { code: "US", label: "United States (2x2 inch)", aspect: 1 },
  { code: "UK", label: "United Kingdom (35x45mm)", aspect: 35 / 45 },
  { code: "EU", label: "Europe (35x45mm)", aspect: 35 / 45 },
  { code: "AU", label: "Australia (35x45mm)", aspect: 35 / 45 },
  { code: "JP", label: "Japan (35x45mm)", aspect: 35 / 45 },
  { code: "CN", label: "China (33x48mm)", aspect: 33 / 48 },
  { code: "IN", label: "India (35x45mm)", aspect: 35 / 45 },
  { code: "CA", label: "Canada (50x70mm)", aspect: 50 / 70 },
];

import { API_BASE_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
// Note: This component has grown organically and has many individual useState
// calls. The states are logically grouped into categories below for clarity.
// A full refactor to useReducer for all states is a larger effort that would
// require extensive testing. The watermark state has been consolidated as an
// example pattern for future refactoring.
//
// State Categories:
// 1. Core Status: status, downloadUrl, fileName, errorMessage
// 2. File Staging: stagedFiles (for reordering/merge tools)
// 3. Watermark Settings: consolidated into watermarkState reducer
// 4. Preview/Crop: previewUrl, crop, zoom, croppedAreaPixels, etc.
// 5. PDF Tools: pdfCropX/Y/Width/Height, pageOrder, rotationAngle, etc.
// 6. Image Tools: resizeMode/Width/Height, compressionLevel, etc.
// 7. Advanced Tools: redactTexts, certFile, signatureText, etc.
// ============================================================================

// Watermark state consolidated using useReducer pattern
interface WatermarkState {
  type: "text" | "image";
  text: string;
  opacity: number;
  file: File | null;
  color: string;
  fontSize: number;
  position: string;
  posPercent: { x: number; y: number };
  scale: number;
}

type WatermarkAction =
  | { type: "SET_TYPE"; payload: "text" | "image" }
  | { type: "SET_TEXT"; payload: string }
  | { type: "SET_OPACITY"; payload: number }
  | { type: "SET_FILE"; payload: File | null }
  | { type: "SET_COLOR"; payload: string }
  | { type: "SET_FONT_SIZE"; payload: number }
  | { type: "SET_POSITION"; payload: string }
  | { type: "SET_POS_PERCENT"; payload: { x: number; y: number } }
  | { type: "SET_SCALE"; payload: number }
  | { type: "RESET" };

const watermarkInitialState: WatermarkState = {
  type: "text",
  text: "CONFIDENTIAL",
  opacity: 0.5,
  file: null,
  color: "#000000",
  fontSize: 60,
  position: "center",
  posPercent: { x: 0.5, y: 0.5 },
  scale: 1,
};

function watermarkReducer(
  state: WatermarkState,
  action: WatermarkAction
): WatermarkState {
  switch (action.type) {
    case "SET_TYPE":
      return { ...state, type: action.payload };
    case "SET_TEXT":
      return { ...state, text: action.payload };
    case "SET_OPACITY":
      return { ...state, opacity: action.payload };
    case "SET_FILE":
      return { ...state, file: action.payload };
    case "SET_COLOR":
      return { ...state, color: action.payload };
    case "SET_FONT_SIZE":
      return { ...state, fontSize: action.payload };
    case "SET_POSITION":
      return { ...state, position: action.payload };
    case "SET_POS_PERCENT":
      return { ...state, posPercent: action.payload };
    case "SET_SCALE":
      return { ...state, scale: action.payload };
    case "RESET":
      return watermarkInitialState;
    default:
      return state;
  }
}

interface ToolProcessorProps {
  toolSlug: string;
  apiEndpoint: string;
  acceptedFileTypes?: Record<string, string[]>;
}

export function ToolProcessor({
  toolSlug,
  apiEndpoint,
  acceptedFileTypes,
}: ToolProcessorProps) {
  const t = useTranslations("ToolProcessor");
  
  // Determine max files based on tool type
  const getMaxFiles = (): number => {
    // Special case: pdf-diff requires exactly 2 files
    if (toolSlug === "pdf-diff") {
      return 2;
    }
    
    // Single-file tools (require interactive UI)
    // Note: Batch-capable image tools (convert, resize, compress, etc.) are NOT in this list
    const singleFileTools = [
      // PDF tools (single file)
      "rotate-pdf",
      "compress-pdf",
      "pdf-to-word",
      "pdf-to-images",
      "protect-pdf",
      "unlock-pdf",
      "pdf-signer",
      "pdf-redactor",
      "crop-pdf",
      "grayscale-pdf",
      "repair-pdf",
      "pdf-web-optimize",
      "pdf-to-pdfa",
      "ocr-pdf",
      "word-to-pdf",
      "powerpoint-to-pdf",
      "excel-to-pdf",
      "html-to-pdf",
      "organize-pdf",
      "split-pdf",
      "watermark-pdf",
      "extract-tables",
      "extract-text",
      "remove-metadata",
      "extract-metadata",
      "extract-form-data",
      "reorder-pages",
      "flatten-pdf",
      "extract-images-from-pdf",
      "delete-pages",
      "page-numbers",
      "pdf-scrubber",
      // Image tools that MUST remain single-file (interactive UI)
      "passport-photo",     // Interactive cropper with country selection
      "generate-icons",     // Single image to icon set
      "extract-palette",    // Single image color analysis
      "crop-image",         // Interactive cropper
      "photo-studio",       // Interactive editor
      "grid-split",         // Single image split
    ];
    
    return singleFileTools.includes(toolSlug) ? 1 : 10;
  };
  
  const maxFiles = getMaxFiles();
  
  // Get file type name for error messages
  const getFileTypeName = (): string => {
    if (toolSlug === "images-to-pdf") {
      return "image";  // images-to-pdf accepts images, not PDFs
    } else if (toolSlug.includes("pdf") || toolSlug === "pdf-diff") {
      return "PDF";
    } else if (toolSlug.includes("word") || toolSlug === "word-to-pdf") {
      return "Word document";
    } else if (toolSlug.includes("powerpoint") || toolSlug === "powerpoint-to-pdf") {
      return "PowerPoint presentation";
    } else if (toolSlug.includes("excel") || toolSlug === "excel-to-pdf") {
      return "Excel spreadsheet";
    } else if (toolSlug.includes("html") || toolSlug === "html-to-pdf") {
      return "HTML file";
    } else if (toolSlug.includes("heic") || toolSlug === "heic-to-jpg") {
      return "HEIC image";
    } else {
      return "image";
    }
  };
  
  // Check if running in web (not desktop)
  const isWeb = typeof window !== 'undefined' && !('__TAURI__' in window);
  
  // Comprehensive file validation function
  interface ValidationResult {
    valid: boolean;
    error?: string;
  }
  
  const validateFiles = (files: File[]): ValidationResult => {
    // Clear previous errors
    setErrorMessage(null);
    
    // File count validation
    if (maxFiles === 1 && files.length > 1) {
      return {
        valid: false,
        error: `This tool only accepts one file. Please select a single ${getFileTypeName()} file.`
      };
    }
    
    if (maxFiles === 2 && files.length !== 2) {
      if (files.length === 1) {
        return {
          valid: false,
          error: "This tool requires exactly 2 PDF files for comparison. Please select one more file."
        };
      } else if (files.length === 0) {
        return {
          valid: false,
          error: "This tool requires exactly 2 PDF files for comparison. Please select 2 files."
        };
      } else {
        return {
          valid: false,
          error: `This tool requires exactly 2 PDF files. You selected ${files.length} files. Please select exactly 2 files.`
        };
      }
    }
    
    if (maxFiles === 10 && files.length > 10) {
      return {
        valid: false,
        error: `This tool accepts up to 10 files. You selected ${files.length} files. Please select fewer files.`
      };
    }
    
    // File type validation
    const isPdfTool = (toolSlug.includes("pdf") &&
                      toolSlug !== "images-to-pdf" &&     // Exclude - accepts images
                      toolSlug !== "csv-to-pdf" &&        // Exclude - accepts CSV
                      toolSlug !== "txt-to-pdf" &&        // Exclude - accepts TXT
                      toolSlug !== "tiff-to-pdf" &&       // Exclude - accepts TIFF
                      toolSlug !== "rtf-to-pdf" &&        // Exclude - accepts RTF
                      toolSlug !== "xml-to-pdf" &&        // Exclude - accepts XML
                      toolSlug !== "word-to-pdf" &&       // Exclude - accepts Word
                      toolSlug !== "excel-to-pdf" &&      // Exclude - accepts Excel
                      toolSlug !== "powerpoint-to-pdf" && // Exclude - accepts PPT
                      toolSlug !== "ppt-to-pdf" &&        // Exclude - accepts PPT
                      toolSlug !== "html-to-pdf") ||      // Exclude - accepts HTML
                      toolSlug === "pdf-diff" ||
                      toolSlug === "extract-tables" ||
                      toolSlug === "extract-text" ||
                      toolSlug === "extract-metadata" ||
                      toolSlug === "extract-form-data" ||
                      toolSlug === "extract-images-from-pdf";
    
    const isImageTool = (toolSlug.includes("image") &&
                        toolSlug !== "extract-images-from-pdf" &&
                        toolSlug !== "pdf-to-images") ||
                       toolSlug === "images-to-pdf" ||  // Accepts images as input
                       toolSlug === "remove-image-background" ||
                       toolSlug === "convert-image" ||
                       toolSlug === "resize-image" ||
                       toolSlug === "upscale-image" ||
                       toolSlug === "compress-image" ||
                       toolSlug === "passport-photo" ||
                       toolSlug === "generate-icons" ||
                       toolSlug === "extract-palette" ||
                       toolSlug === "crop-image" ||
                       toolSlug === "watermark-image" ||
                       toolSlug === "photo-studio" ||
                       toolSlug === "grid-split" ||
                       toolSlug === "remove-image-metadata";
    
    const isWordTool = toolSlug === "word-to-pdf";
    const isPowerPointTool = toolSlug === "powerpoint-to-pdf" || toolSlug === "ppt-to-pdf";
    const isExcelTool = toolSlug === "excel-to-pdf";
    const isHtmlTool = toolSlug === "html-to-pdf";
    const isHeicTool = toolSlug === "heic-to-jpg";
    const isCsvTool = toolSlug === "csv-to-pdf";
    const isTxtTool = toolSlug === "txt-to-pdf";
    const isTiffTool = toolSlug === "tiff-to-pdf";
    const isRtfTool = toolSlug === "rtf-to-pdf";
    const isXmlTool = toolSlug === "xml-to-pdf";
    
    for (const file of files) {
      const fileName = file.name.toLowerCase();
      const fileType = file.type;

      // Empty file check
      if (file.size === 0) {
        return {
          valid: false,
          error: `File "${file.name}" is empty (0 bytes). Please select a valid file.`
        };
      }

      // Minimum file size check (corrupted/invalid files)
      if (file.size < 100) {
        return {
          valid: false,
          error: `File "${file.name}" is too small (${file.size} bytes). This file appears to be corrupted or invalid.`
        };
      }

      // PDF validation
      if (isPdfTool && !fileName.endsWith('.pdf') && fileType !== 'application/pdf') {
        return {
          valid: false,
          error: `Invalid file type. This tool only accepts PDF files. "${file.name}" is not a PDF file.`
        };
      }
      
      // Image validation
      if (isImageTool && !fileName.match(/\.(jpg|jpeg|png|webp|gif|bmp|heic|heif)$/i) && !fileType.startsWith('image/')) {
        return {
          valid: false,
          error: `Invalid file type. This tool only accepts image files (PNG, JPG, JPEG, WebP). "${file.name}" is not an image file.`
        };
      }
      
      // Word validation
      if (isWordTool && !fileName.match(/\.(docx|doc)$/i) && !fileType.includes('wordprocessingml')) {
        return {
          valid: false,
          error: `Invalid file type. This tool only accepts Word documents (.docx, .doc). "${file.name}" is not a Word document.`
        };
      }
      
      // PowerPoint validation
      if (isPowerPointTool && !fileName.match(/\.(pptx|ppt)$/i) && !fileType.includes('presentationml')) {
        return {
          valid: false,
          error: `Invalid file type. This tool only accepts PowerPoint presentations (.pptx, .ppt). "${file.name}" is not a PowerPoint file.`
        };
      }
      
      // Excel validation
      if (isExcelTool && !fileName.match(/\.(xlsx|xls)$/i) && !fileType.includes('spreadsheetml')) {
        return {
          valid: false,
          error: `Invalid file type. This tool only accepts Excel spreadsheets (.xlsx, .xls). "${file.name}" is not an Excel file.`
        };
      }
      
      // HTML validation
      if (isHtmlTool && !fileName.match(/\.(html|htm)$/i) && fileType !== 'text/html') {
        return {
          valid: false,
          error: `Invalid file type. This tool only accepts HTML files (.html, .htm). "${file.name}" is not an HTML file.`
        };
      }
      
      // HEIC validation
      if (isHeicTool && !fileName.match(/\.(heic|heif)$/i) && fileType !== 'image/heic' && fileType !== 'image/heif') {
        return {
          valid: false,
          error: `Invalid file type. This tool only accepts HEIC images (.heic, .heif). "${file.name}" is not a HEIC file.`
        };
      }

      // CSV validation
      if (isCsvTool && !fileName.endsWith('.csv') && fileType !== 'text/csv') {
        return {
          valid: false,
          error: `Invalid file type. This tool only accepts CSV files (.csv). "${file.name}" is not a CSV file.`
        };
      }

      // TXT validation
      if (isTxtTool && !fileName.endsWith('.txt') && fileType !== 'text/plain') {
        return {
          valid: false,
          error: `Invalid file type. This tool only accepts text files (.txt). "${file.name}" is not a text file.`
        };
      }

      // TIFF validation
      if (isTiffTool && !fileName.match(/\.(tiff|tif)$/i) && fileType !== 'image/tiff') {
        return {
          valid: false,
          error: `Invalid file type. This tool only accepts TIFF images (.tiff, .tif). "${file.name}" is not a TIFF file.`
        };
      }

      // RTF validation
      if (isRtfTool && !fileName.endsWith('.rtf') && fileType !== 'application/rtf' && fileType !== 'text/rtf') {
        return {
          valid: false,
          error: `Invalid file type. This tool only accepts RTF files (.rtf). "${file.name}" is not an RTF file.`
        };
      }

      // XML validation
      if (isXmlTool && !fileName.endsWith('.xml') && fileType !== 'application/xml' && fileType !== 'text/xml') {
        return {
          valid: false,
          error: `Invalid file type. This tool only accepts XML files (.xml). "${file.name}" is not an XML file.`
        };
      }

      // File size validation (web only)
      if (isWeb) {
        const maxFileSize = 20 * 1024 * 1024; // 20MB for all file types

        if (file.size > maxFileSize) {
          return {
            valid: false,
            error: `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size for web version is 20MB. Please use the desktop app for larger files.`
          };
        }

        // Total file size validation (web only) - 50MB max for all files combined
        if (files.length > 1) {
          const maxTotalSize = 50 * 1024 * 1024; // 50MB total
          const totalSize = files.reduce((sum, f) => sum + f.size, 0);
          if (totalSize > maxTotalSize) {
            return {
              valid: false,
              error: `Total file size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds the 50MB limit for web version. Please use the desktop app for larger batches.`
            };
          }
        }
      }
    }

    return { valid: true };
  };
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "complete" | "error"
  >("idle");
  // console.log(`[ToolProcessor] Render. Slug: ${toolSlug}, Status: ${status}`); removed for production
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Staging State (for reordering)
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setStagedFiles((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRemoveFile = (id: string) => {
    setStagedFiles((prev) => {
      const newFiles = prev.filter((f) => f.id !== id);
      // Revoke URL if removed? Not strictly necessary for small number but good practice
      return newFiles;
    });
  };

  // Watermark State (consolidated with useReducer)
  const [watermarkState, dispatchWatermark] = useReducer(
    watermarkReducer,
    watermarkInitialState
  );

  // Backward-compatible setters for watermark state
  // These maintain the existing API while using the reducer internally
  const setWatermarkType = useCallback(
    (type: "text" | "image") => dispatchWatermark({ type: "SET_TYPE", payload: type }),
    []
  );
  const setWatermarkText = useCallback(
    (text: string) => dispatchWatermark({ type: "SET_TEXT", payload: text }),
    []
  );
  const setWatermarkOpacity = useCallback(
    (opacity: number) => dispatchWatermark({ type: "SET_OPACITY", payload: opacity }),
    []
  );
  const setWatermarkFile = useCallback(
    (file: File | null) => dispatchWatermark({ type: "SET_FILE", payload: file }),
    []
  );
  const setWatermarkColor = useCallback(
    (color: string) => dispatchWatermark({ type: "SET_COLOR", payload: color }),
    []
  );
  const setWatermarkFontSize = useCallback(
    (fontSize: number) => dispatchWatermark({ type: "SET_FONT_SIZE", payload: fontSize }),
    []
  );
  const setWatermarkPosition = useCallback(
    (position: string) => dispatchWatermark({ type: "SET_POSITION", payload: position }),
    []
  );
  const setWatermarkPosPercent = useCallback(
    (posPercent: { x: number; y: number }) =>
      dispatchWatermark({ type: "SET_POS_PERCENT", payload: posPercent }),
    []
  );
  const setWatermarkScale = useCallback(
    (scale: number) => dispatchWatermark({ type: "SET_SCALE", payload: scale }),
    []
  );

  // Destructure for backward compatibility with existing code
  const {
    type: watermarkType,
    text: watermarkText,
    opacity: watermarkOpacity,
    file: watermarkFile,
    color: watermarkColor,
    fontSize: watermarkFontSize,
    position: watermarkPosition,
    posPercent: watermarkPosPercent,
    scale: watermarkScale,
  } = watermarkState;

  // Crop State (Visual)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewParams, setPreviewParams] = useState<any>({});
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [passportCountry, setPassportCountry] = useState("US");

  // Auto-detect locale for Passport Country
  useEffect(() => {
    if (typeof window !== "undefined" && toolSlug === "passport-photo") {
      const lang = navigator.language;
      if (lang.startsWith("ja")) setPassportCountry("JP");
      else if (lang.startsWith("zh")) setPassportCountry("CN");
      else if (lang === "en-GB") setPassportCountry("UK");
      else if (lang === "en-AU") setPassportCountry("AU");
      else if (lang === "en-IN") setPassportCountry("IN");
      else if (lang === "en-CA") setPassportCountry("CA");
    }
  }, [toolSlug]);

  // Watermark preview doesn't need to reload on settings change
  // The overlay updates in real-time on the client side

  // Crop State
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const [cropWidth, setCropWidth] = useState<number>(500);
  const [cropHeight, setCropHeight] = useState<number>(500);

  // Studio State
  const [studioBackground, setStudioBackground] = useState<string | null>(null);
  const [studioDim, setStudioDim] = useState({ w: 800, h: 600 });
  const [extractFormat, setExtractFormat] = useState("csv");
  const [mergeTables, setMergeTables] = useState(true); // Enable merge by default
  const [detectionMode, setDetectionMode] = useState<"strict" | "balanced" | "aggressive">("balanced");
  // Table preview state
  const [tablePreview, setTablePreview] = useState<{
    tables: Array<{
      id: string;
      file: string;
      page: number;
      table_index: number;
      rows: number;
      columns: number;
      has_header: boolean;
      header: string[] | null;
      sample_data: string[][];
      column_types: string[];
    }>;
    merge_suggestions: Array<{
      tables: string[];
      reason: string;
      total_rows: number;
    }>;
    total_tables: number;
    total_pages: number;
    errors: Array<{ file: string; error: string }>;
  } | null>(null);
  const [isLoadingTablePreview, setIsLoadingTablePreview] = useState(false);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  // Advanced Tools State
  const [redactText, setRedactText] = useState("");
  const [redactTexts, setRedactTexts] = useState<string[]>([""]);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState("");
  const [pdfPassword, setPdfPassword] = useState("");
  // PDF Signer Configuration
  const [signatureText, setSignatureText] = useState("Digitally Signed");
  const [signatureLocation, setSignatureLocation] = useState("");
  const [signaturePosPercent, setSignaturePosPercent] = useState({ x: 0.5, y: 0.1 }); // Top center by default
  const [signatureScale, setSignatureScale] = useState(1);
  const [heicQuality, setHeicQuality] = useState(95);
  const [compressionLevel, setCompressionLevel] = useState(1);

  const [resizeMode, setResizeMode] = useState<"pixel" | "percentage">("pixel");
  const [resizeWidth, setResizeWidth] = useState<number>(0);
  const [resizeHeight, setResizeHeight] = useState<number>(0);
  const [resizePercentage, setResizePercentage] = useState<number>(50);
  const [upscaleFactor, setUpscaleFactor] = useState<2 | 4>(2);
  const [extractPaletteResult, setExtractPaletteResult] = useState<Record<
    string,
    { rgb: number[]; hex: string }[]
  > | null>(null);

  // PDF Crop State
  const [pdfCropX, setPdfCropX] = useState<number>(50);
  const [pdfCropY, setPdfCropY] = useState<number>(50);
  const [pdfCropWidth, setPdfCropWidth] = useState<number | null>(400);
  const [pdfCropHeight, setPdfCropHeight] = useState<number | null>(500);
  const [pdfCropPages, setPdfCropPages] = useState<string>("");
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [isResizingCrop, setIsResizingCrop] = useState(false);
  const cropPreviewRef = useRef<HTMLImageElement>(null);
  const [pdfPageWidth, setPdfPageWidth] = useState<number | null>(null);
  const [pdfPageHeight, setPdfPageHeight] = useState<number | null>(null);

  // Image Crop State (Custom)
  const [imgCropX, setImgCropX] = useState<number>(0);
  const [imgCropY, setImgCropY] = useState<number>(0);
  const [imgCropWidth, setImgCropWidth] = useState<number>(0);
  const [imgCropHeight, setImgCropHeight] = useState<number>(0);
  const imgCropPreviewRef = useRef<HTMLImageElement>(null);

  // PDF Organize State
  const [pageOrder, setPageOrder] = useState<string>("");

  // PDF Rotate State
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // Page Numbers State
  const [pageNumPos, setPageNumPos] = useState<string>("bottom-right");

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
    setCropX(croppedAreaPixels.x);
    setCropY(croppedAreaPixels.y);
    setCropWidth(croppedAreaPixels.width);
    setCropHeight(croppedAreaPixels.height);
  };

  // Debounce timer ref for preview
  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);
  // Cache for preview images
  const previewCacheRef = useRef<Map<string, string>>(new Map());

  // Initialize crop box when preview loads for crop-pdf or crop-image
  useEffect(() => {
    if (toolSlug === "crop-pdf" && previewUrl && cropPreviewRef.current && pdfPageWidth && pdfPageHeight) {
      const img = cropPreviewRef.current;
      // Wait for image to load
      if (img.complete && img.naturalWidth > 0) {
        const imgRect = img.getBoundingClientRect();
        // Set crop box to center 60% of the image
        const cropW = imgRect.width * 0.6;
        const cropH = imgRect.height * 0.6;
        const cropX = (imgRect.width - cropW) / 2;
        const cropY = (imgRect.height - cropH) / 2;
        setPdfCropX(cropX);
        setPdfCropY(cropY);
        setPdfCropWidth(cropW);
        setPdfCropHeight(cropH);
      } else {
        // If image not loaded yet, wait for it
        const onLoad = () => {
          const imgRect = img.getBoundingClientRect();
          const cropW = imgRect.width * 0.6;
          const cropH = imgRect.height * 0.6;
          const cropX = (imgRect.width - cropW) / 2;
          const cropY = (imgRect.height - cropH) / 2;
          setPdfCropX(cropX);
          setPdfCropY(cropY);
          setPdfCropWidth(cropW);
          setPdfCropHeight(cropH);
        };
        img.addEventListener('load', onLoad);
        return () => img.removeEventListener('load', onLoad);
      }
    } else if (toolSlug === "crop-image" && previewUrl && imgCropPreviewRef.current) {
        const img = imgCropPreviewRef.current;
        const initCrop = () => {
            const imgRect = img.getBoundingClientRect();
            const cropW = imgRect.width * 0.8;
            const cropH = imgRect.height * 0.8;
            const cropX = (imgRect.width - cropW) / 2;
            const cropY = (imgRect.height - cropH) / 2;
            setImgCropX(cropX);
            setImgCropY(cropY);
            setImgCropWidth(cropW);
            setImgCropHeight(cropH);
        };

        if (img.complete && img.naturalWidth > 0) {
            initCrop();
        } else {
            img.addEventListener('load', initCrop);
            return () => img.removeEventListener('load', initCrop);
        }
    }
  }, [toolSlug, previewUrl, pdfPageWidth, pdfPageHeight]);

    // Generate cache key from params
  const getCacheKey = (params: any, fileName?: string): string => {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join("|");
    return `${fileName || previewFile?.name || ""}|${toolSlug}|${sortedParams}`;
  };

  // Fetch preview with parameters
  const fetchPreview = async (params: any = {}, debounceMs: number = 300, fileOverride?: File) => {
    const fileToUse = fileOverride || previewFile;
    if (!fileToUse) return;
    
    // For rotate-pdf, ensure angle is included from params or current state
    if (toolSlug === "rotate-pdf" && params.angle === undefined) {
      params.angle = rotationAngle;
    }
    
    // Check cache first
    const cacheKey = getCacheKey(params, fileToUse.name);
    const cachedPreview = previewCacheRef.current.get(cacheKey);
    if (cachedPreview) {
      setPreviewUrl(cachedPreview);
      setPreviewParams(params);
      return;
    }
    
    // Clear previous debounce timer
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }
    
    // Set new debounce timer
    previewDebounceRef.current = setTimeout(async () => {
      setIsLoadingPreview(true);
      const formData = new FormData();
      formData.append("files", fileToUse);
      const actionType = toolSlug.replace("-pdf", "").replace("-image", "");
      formData.append("mode", actionType);
      formData.append("page", "0");
      
      // Add params to formData (excluding action as it comes from mode)
      Object.keys(params).forEach((key) => {
        if (key !== "action" && params[key] !== null && params[key] !== undefined) {
          formData.append(key, params[key].toString());
        }
      });
      
      try {
        const res = await fetch(`${API_BASE_URL}/api/pdf/preview`, {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Preview API error:", res.status, errorText);
          setIsLoadingPreview(false);
          return;
        }
        
        const data = await res.json();
        if (data.image) {
          // Cache the result
          previewCacheRef.current.set(cacheKey, data.image);
          // Limit cache size to prevent memory issues
          if (previewCacheRef.current.size > 20) {
            const firstKey = previewCacheRef.current.keys().next().value;
            if (firstKey) {
              previewCacheRef.current.delete(firstKey);
            }
          }
          setPreviewUrl(data.image);
          setPreviewParams(params);

          // Store PDF page dimensions for coordinate conversion
          if (data.page_width && data.page_height) {
            setPdfPageWidth(data.page_width);
            setPdfPageHeight(data.page_height);
          }
        } else if (data.errors && data.errors.length > 0) {
          console.error("Preview error:", data.errors);
        } else {
          console.warn("Preview response missing image:", data);
        }
      } catch (e) {
        console.error("Preview failed", e);
      } finally {
        setIsLoadingPreview(false);
      }
    }, debounceMs);
  };

  const handleFileSelect = (files: File[]) => {
    // Ignore empty file arrays (can happen when all files are rejected)
    if (!files || files.length === 0) {
      return;
    }

    // Clear previous errors
    setErrorMessage(null);

    // Validate files before processing
    const validation = validateFiles(files);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Invalid files selected.");
      setStatus("error");
      return;
    }
    
    // Validation passed - clear any previous error state
    if (status === "error") {
      setStatus("idle");
    }
    
    if (toolSlug === "design-studio" && files.length > 0) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setStudioDim({ w: img.width, h: img.height });
        setStudioBackground(url);
      };
      img.src = url;
      return;
    }

    // Single-file interactive tools: crop-image, passport-photo
    if (
      (toolSlug === "crop-image" || toolSlug === "passport-photo") &&
      files.length > 0
    ) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
        setPreviewFile(file);

        // Initialize custom crop box for crop-image
        if (toolSlug === "crop-image") {
          const img = new Image();
          img.onload = () => {
             // We can't know display size yet, but we can init roughly.
             // Better to init in the render phase or Effect when ref is available.
             // But let's set some defaults so it's not 0.
             // Actually, the useEffect below handling 'toolSlug === "crop-pdf"' logic
             // is a good place to mirror for "crop-image".
          };
          img.src = reader.result as string;
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    // BATCH TOOLS: Images-to-PDF, Merge-PDF -> Stage them first
    if (toolSlug === "images-to-pdf" || toolSlug === "merge-pdf") {
      const newStaged: StagedFile[] = files.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        preview:
          f.type.startsWith("image/") || f.name.match(/\.(jpg|jpeg|png|webp)$/i)
            ? URL.createObjectURL(f)
            : undefined,
      }));
      setStagedFiles((prev) => [...prev, ...newStaged]);
      return;
    }

    // BATCH IMAGE TOOLS: convert, resize, compress, heic-to-jpg, remove-bg, watermark, upscale
    const batchImageTools = [
      "convert-image",
      "resize-image",
      "compress-image",
      "heic-to-jpg",
      "remove-image-background",
      "remove-image-metadata",
      "upscale-image",
      "watermark-image",
    ];

    if (batchImageTools.includes(toolSlug) && files.length > 0) {
      const newStaged: StagedFile[] = files.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        preview:
          f.type.startsWith("image/") || f.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)
            ? URL.createObjectURL(f)
            : undefined,
      }));
      setStagedFiles((prev) => [...prev, ...newStaged]);

      // Set first file as preview for settings UI display
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
        setPreviewFile(files[0]);

        // For resize-image, also init dimensions from first file
        if (toolSlug === "resize-image") {
          const img = new Image();
          img.onload = () => {
            setResizeWidth(img.width);
            setResizeHeight(img.height);
          };
          img.src = reader.result as string;
        }
      };
      reader.readAsDataURL(files[0]);

      return;
    }

    // Auto-preview for PDF tools that need preview (including reorder-pages)
    // Note: watermark-image is now handled in batch image tools section above
    if (
      (toolSlug === "watermark-pdf" ||
        toolSlug === "extract-palette" ||
        toolSlug === "protect-pdf" ||
        toolSlug === "unlock-pdf" ||
        toolSlug === "pdf-signer" ||
        toolSlug === "pdf-redactor" ||
        toolSlug === "rotate-pdf" ||
        toolSlug === "crop-pdf" ||
        toolSlug === "grayscale-pdf" ||
        toolSlug === "page-numbers" ||
        toolSlug === "reorder-pages" ||
        toolSlug === "organize-pdf") &&
      files.length > 0
    ) {
      const file = files[0];
      if (toolSlug === "extract-palette") {
        // Client-side preview for image (single file)
        const reader = new FileReader();
        reader.onload = () => {
          setPreviewUrl(reader.result as string);
          setPreviewFile(file);
        };
        reader.readAsDataURL(file);
      } else if (
        toolSlug === "protect-pdf" ||
        toolSlug === "unlock-pdf" ||
        toolSlug === "pdf-redactor" ||
        toolSlug === "reorder-pages" ||
        toolSlug === "organize-pdf"
      ) {
        // No visual preview, but stage the file and wait for user to click Process
        setPreviewFile(file);
        // We don't set previewUrl, effectively kept null
        // DO NOT auto-process - wait for user to enter page order/password and click button
        return;
      } else if (toolSlug === "pdf-signer") {
        // PDF Signer - show preview with signature overlay positioning
        setPreviewFile(file);
        fetchPreview({}, 0, file);
        // DO NOT auto-process - wait for user to configure signature and click Sign button
        return;
      } else {
        // Server-side preview for PDF
        setPreviewFile(file);
        // Load initial preview based on tool type
        if (toolSlug === "rotate-pdf") {
          // Pass file directly since state update is async
          fetchPreview({ angle: rotationAngle }, 0, file); // Use current rotation angle for initial load
          // DO NOT auto-process - wait for user to adjust rotation and click Apply button
          return;
        } else if (toolSlug === "crop-pdf") {
          // Load initial preview without crop (will show full page)
          fetchPreview({}, 0, file);
          // DO NOT auto-process - wait for user to configure crop area and click Apply button
          return;
        } else if (toolSlug === "grayscale-pdf") {
          fetchPreview({}, 0);
        } else if (toolSlug === "watermark-pdf") {
          // Watermark PDF - show plain preview, watermark is overlaid on client side
          fetchPreview({}, 0, file);
          // DO NOT auto-process - wait for user to configure watermark and click Process button
          return;
        } else if (toolSlug === "page-numbers") {
          // Page Numbers - show preview with number overlay positioning
          fetchPreview({}, 0, file);
          // DO NOT auto-process - wait for user to configure position and click Apply button
          return;
        } else {
          // Default preview for other PDF tools
          const fd = new FormData();
          fd.append("files", file);
          fetch(`${API_BASE_URL}/api/pdf/preview`, {
            method: "POST",
            body: fd,
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.image) {
                setPreviewUrl(data.image);
              }
            })
            .catch((e) => console.error("Preview failed", e));
        }
      }
    }

    // Extract Tables: Load preview before processing
    if (toolSlug === "extract-tables" && files.length > 0) {
      setPreviewFile(files[0]);
      setIsLoadingTablePreview(true);
      setTablePreview(null);
      setSelectedTables(new Set());

      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));

      fetch(`${API_BASE_URL}/api/pdf/preview_tables`, {
        method: "POST",
        body: fd,
      })
        .then((res) => res.json())
        .then((data) => {
          setTablePreview(data);
          // Auto-select all tables by default
          if (data.tables) {
            setSelectedTables(new Set(data.tables.map((t: { id: string }) => t.id)));
          }
        })
        .catch((e) => {
          console.error("Table preview failed", e);
          setErrorMessage("Failed to preview tables: " + e.message);
        })
        .finally(() => {
          setIsLoadingTablePreview(false);
        });
      return; // Don't auto-process, wait for user to review and extract
    }

    handleFiles(files);
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFiles = async (files: File[]) => {
    // Validate files FIRST before any processing
    const validation = validateFiles(files);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Invalid files selected.");
      setStatus("error");
      return; // STOP - don't upload
    }

    // Manual-process tools should not auto-process - user must click Process button
    // These tools require additional configuration before processing
    const manualProcessTools = [
      "watermark-pdf",
      "watermark-image",
      "reorder-pages",
      "organize-pdf"
    ];

    if (manualProcessTools.includes(toolSlug)) {
      // Only proceed if explicitly called (user clicked Process button)
      // Check if preview is loaded (indicates file was staged)
      if (!previewFile) {
        return;
      }
    }

    setStatus("uploading");

    // Simulate upload delay for effect
    await new Promise((r) => setTimeout(r, 1000));

    setStatus("processing");

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    // Append Watermark Params
    if (toolSlug === "watermark-pdf" || toolSlug === "watermark-image") {
      formData.append("watermark_type", watermarkType);
      formData.append("opacity", watermarkOpacity.toString());
      formData.append("x", watermarkPosPercent.x.toString());
      formData.append("y", watermarkPosPercent.y.toString());
      if (watermarkType === "text") {
        formData.append("text", watermarkText);
        formData.append("color", watermarkColor);
        // Apply scale to font size for final output
        const effectiveFontSize = Math.round(watermarkFontSize * watermarkScale);
        formData.append("font_size", effectiveFontSize.toString());
      } else if (watermarkFile) {
        formData.append("watermark_file", watermarkFile);
      }
    }

    // Append Crop Params
    if (toolSlug === "crop-image") {
      if (imgCropPreviewRef.current) {
        const img = imgCropPreviewRef.current;
        const scaleX = img.naturalWidth / img.getBoundingClientRect().width;
        const scaleY = img.naturalHeight / img.getBoundingClientRect().height;

        const cropBox = {
          x: Math.round(imgCropX * scaleX),
          y: Math.round(imgCropY * scaleY),
          width: Math.round(imgCropWidth * scaleX),
          height: Math.round(imgCropHeight * scaleY),
        };
        formData.append("crop_box", JSON.stringify(cropBox));
      }
    } else if (toolSlug === "passport-photo") {
      const cropBox = {
        x: cropX || 0,
        y: cropY || 0,
        width: cropWidth || 0,
        height: cropHeight || 0,
      };
      formData.append("crop_box", JSON.stringify(cropBox));
    }

    if (toolSlug === "extract-tables" || toolSlug === "pdf-to-csv" || toolSlug === "pdf-to-excel") {
      // pdf-to-csv forces csv format, pdf-to-excel forces xlsx format
      let fmt = extractFormat;
      if (toolSlug === "pdf-to-csv") fmt = "csv";
      if (toolSlug === "pdf-to-excel") fmt = "xlsx";
      formData.append("output_format", fmt);
      formData.append("merge_tables", mergeTables ? "true" : "false");
      formData.append("detection_mode", detectionMode);
    }

    // PDF to image tools (pdf-to-jpg, pdf-to-png)
    if (toolSlug === "pdf-to-jpg" || toolSlug === "pdf-to-png") {
      const fmt = toolSlug === "pdf-to-jpg" ? "jpg" : "png";
      formData.append("output_format", fmt);
    }

    if (toolSlug === "convert-image" || toolSlug === "heic-to-jpg") {
      // Default to jpg if generic, though UI sets it.
      // Reuse extractFormat for simplicity or creation of new state would be better.
      // Current state: extractFormat initialized to 'csv'.
      // I should override or ensure the UI sets it.
      // Ideally let's use a dedicated state or ensure we send it.
      // If user hasn't selected anything, default?
      let fmt = extractFormat;
      if (fmt === "csv" || fmt === "xlsx") fmt = "jpg"; // Reset if carrying over from other tools default
      formData.append("target_format", fmt);

      if (toolSlug === "heic-to-jpg") {
        formData.append("quality", heicQuality.toString());
      }
    }

    if (toolSlug === "compress-pdf") {
      formData.append("level", compressionLevel.toString());
    }

    if (toolSlug === "compress-image") {
      formData.append("level", compressionLevel.toString());
    }

    // Password validation is handled by button disabled state
    // No need to validate here since button won't be enabled without valid password
    if (toolSlug === "protect-pdf" || toolSlug === "unlock-pdf") {
      formData.append("password", pdfPassword);
    }

    if (toolSlug === "pdf-signer") {
      if (certFile) formData.append("cert_file", certFile);
      formData.append("password", certPassword);
      // Signature appearance configuration
      formData.append("text", signatureText);
      formData.append("reason", "Document Authorization"); // Fixed value
      formData.append("location", signatureLocation);
      // Position (as percentages)
      formData.append("x", (signaturePosPercent.x * 100).toString());
      formData.append("y", (signaturePosPercent.y * 100).toString());
    }

    if (toolSlug === "pdf-redactor") {
      // Send all non-empty redaction texts as JSON array
      const textsToRedact = redactTexts.filter(t => t.trim().length > 0);
      console.log("Redaction texts being sent:", textsToRedact);
      console.log("JSON stringified:", JSON.stringify(textsToRedact));
      formData.append("texts", JSON.stringify(textsToRedact));
    }

    if (toolSlug === "resize-image") {
      formData.append("resize_mode", resizeMode);
      formData.append("width", resizeWidth.toString());
      formData.append("height", resizeHeight.toString());
      formData.append("percentage", resizePercentage.toString());
    }

    if (toolSlug === "upscale-image") {
      formData.append("scale_factor", upscaleFactor.toString());
    }

    if (toolSlug === "passport-photo") {
      formData.append("country", passportCountry);
    }
    // pdf-signer params already appended above (lines 912-915)
    if (toolSlug === "heic-to-jpg") {
      formData.append("quality", heicQuality.toString());
    }

    // PDF Rotate Params
    if (toolSlug === "rotate-pdf") {
      formData.append("angle", rotationAngle.toString());
    }

    // PDF Page Numbers Params
    if (toolSlug === "page-numbers") {
      formData.append("position", pageNumPos);
    }

    // PDF Crop Params
    if (toolSlug === "crop-pdf") {
      // Convert pixel coordinates from preview to PDF points
      if (cropPreviewRef.current && pdfPageWidth && pdfPageHeight) {
        const previewImg = cropPreviewRef.current;
        const imgRect = previewImg.getBoundingClientRect();

        // Calculate scaling factor: actual PDF size / preview display size
        const scaleX = pdfPageWidth / imgRect.width;
        const scaleY = pdfPageHeight / imgRect.height;

        // Convert coordinates to PDF points
        const pdfX = Math.round(pdfCropX * scaleX);
        const pdfY = Math.round(pdfCropY * scaleY);
        const pdfWidth = pdfCropWidth !== null ? Math.round(pdfCropWidth * scaleX) : null;
        const pdfHeight = pdfCropHeight !== null ? Math.round(pdfCropHeight * scaleY) : null;

        formData.append("x", pdfX.toString());
        formData.append("y", pdfY.toString());
        if (pdfWidth !== null) formData.append("width", pdfWidth.toString());
        if (pdfHeight !== null) formData.append("height", pdfHeight.toString());
      } else {
        // Fallback to raw values if conversion not possible
        formData.append("x", pdfCropX.toString());
        formData.append("y", pdfCropY.toString());
        if (pdfCropWidth !== null)
          formData.append("width", pdfCropWidth.toString());
        if (pdfCropHeight !== null)
          formData.append("height", pdfCropHeight.toString());
      }
      if (pdfCropPages) formData.append("pages", pdfCropPages);
    }

    // PDF Organize Params
    if (toolSlug === "organize-pdf" || toolSlug === "reorder-pages") {
      formData.append("page_order", pageOrder);
    }

    // Extract Form Data Params
    if (toolSlug === "extract-form-data") {
      formData.append("output_format", extractFormat);
    }

    if (files.length > 0) {
      let outputName = `processed_${files[0].name}`;
      const nameWithoutExt =
        files[0].name.substring(0, files[0].name.lastIndexOf(".")) ||
        files[0].name;

      // Fix extensions for specific tools
      if (toolSlug === "images-to-pdf" || toolSlug === "merge-pdf") {
        outputName = `${nameWithoutExt}.pdf`;
      } else if (toolSlug === "pdf-to-word") {
        outputName = `${nameWithoutExt}.docx`;
      } else if (
        toolSlug === "pdf-to-images" ||
        toolSlug === "extract-images-from-pdf" ||
        toolSlug === "pdf-to-png"
      ) {
        // Usually returns zip or first image, server handles naming usually, but for output logic:
        // Server currently returns first file. If image:
        outputName = `${nameWithoutExt}_converted.png`; // Fallback, usually server sets this
      } else if (toolSlug === "pdf-to-jpg") {
        outputName = `${nameWithoutExt}_converted.jpg`;
      } else if (toolSlug === "pdf-to-csv") {
        outputName = `${nameWithoutExt}_tables.csv`;
      } else if (toolSlug === "pdf-to-excel") {
        outputName = `${nameWithoutExt}_tables.xlsx`;
      } else if (toolSlug === "watermark-pdf") {
        outputName = `${nameWithoutExt}_watermarked.pdf`;
      }
      // For others, keep original extension or rely on server response

      formData.append("output_name", outputName);
    } else {
      formData.append("output_name", "processed_file");
    }

    try {
      // Ensure endpoint starts with slash if not already
      const path = apiEndpoint.startsWith("/")
        ? apiEndpoint
        : `/${apiEndpoint}`;
      const apiUrl = `${API_BASE_URL}${path}`;

      // Create new AbortController
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Set timeout - longer for table extraction (can take time for large PDFs)
      const isTableExtraction = toolSlug === "extract-tables" || toolSlug === "pdf-to-csv" || toolSlug === "pdf-to-excel";
      const timeoutDuration = isTableExtraction ? 300000 : 120000; // 5 minutes for table extraction, 2 minutes for others
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, timeoutDuration);

      let res;
      try {
        res = await fetch(apiUrl, {
          method: "POST",
          body: formData,
          signal,
        });
      } catch (networkError) {
        clearTimeout(timeoutId);
        const isAbort = (networkError as Error).name === "AbortError";
        if (isAbort) {
          const timeoutMinutes = isTableExtraction ? "5 mins" : "2 mins";
          throw new Error(
            `Request timed out (took longer than ${timeoutMinutes}) or was cancelled.`
          );
        }
        console.error("Network Error:", networkError);
        throw new Error("Connection failed. Is the backend server running?");
      }

      clearTimeout(timeoutId);

      if (toolSlug === "extract-palette") {
        try {
          const result = await res.json();
          if (result.errors && result.errors.length > 0) {
            throw new Error(
              result.errors[0].error || "Palette extraction failed"
            );
          }
          setExtractPaletteResult(result.data);
          setStatus("complete");
          return;
        } catch (e) {
          // If JSON parse fails, it might be an error text response
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Processing failed: ${txt}`);
          }
          throw e;
        }
      }

      if (!res.ok) {
        let errText = await res.text();
        console.error("Backend Error:", errText);

        try {
          // Try parsing JSON error if available
          const jsonErr = JSON.parse(errText);

          if (jsonErr.detail) {
            // Check if detail is an array of error objects
            if (Array.isArray(jsonErr.detail) && jsonErr.detail.length > 0) {
              // Extract just the error messages
              errText = jsonErr.detail.map((err: any) => {
                if (typeof err === 'string') return err;
                if (err.error) return err.error;
                if (err.message) return err.message;
                // Try to extract any meaningful text from object
                return JSON.stringify(err);
              }).join(', ');
            } else if (typeof jsonErr.detail === 'string') {
              // Clean up array notation if present (e.g., "['error message']" -> "error message")
              errText = jsonErr.detail
                .replace(/^\[['"]|['"]\]$/g, '')  // Remove leading [' and trailing ']
                .replace(/['"]/g, '');            // Remove remaining quotes
            } else if (typeof jsonErr.detail === 'object' && jsonErr.detail !== null) {
              // Handle object detail - extract error/message fields
              if (jsonErr.detail.error) {
                errText = jsonErr.detail.error;
              } else if (jsonErr.detail.message) {
                errText = jsonErr.detail.message;
              } else {
                // Fallback: try to extract any meaningful text
                const extracted = Object.values(jsonErr.detail)
                  .filter(v => typeof v === 'string' && v.length > 0)
                  .join(', ');
                errText = extracted || "Processing failed. Please try again.";
              }
            } else {
              // Last resort: convert to string but avoid "[object Object]"
              errText = String(jsonErr.detail);
            }
          } else if (jsonErr.message) {
            // Fallback to message field if detail doesn't exist
            errText = jsonErr.message;
          }
        } catch (parseErr) {
          console.warn("Failed to parse error JSON:", parseErr);
          // If not JSON, try to clean up the error text
          errText = errText.replace(/^.*?-\s*/, ''); // Remove status code prefix
        }

        // Clean up file paths in error messages - replace temp paths with just filenames
        // Match patterns like: C:\Users\...\tmpXXXXX.pdf or /tmp/tmpXXXXX.pdf
        errText = errText.replace(
          /[A-Za-z]:\\(?:Users\\[^\\]+\\AppData\\Local\\)?Temp\\(tmp[^\\.\s]+\.[a-z]+)/gi,
          (match, filename) => filename
        ).replace(
          /\/tmp\/(tmp[^\s\/]+\.[a-z]+)/gi,
          (match, filename) => filename
        );

        throw new Error(errText || "Processing failed. Please try again.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);

      // Check for partial success warning
      const processingWarning = res.headers.get("X-Processing-Warning");
      if (processingWarning) {
        console.warn("Partial success:", processingWarning);
        // Show warning but still allow download
        setErrorMessage(`⚠️ ${processingWarning}`);
      }

      // Try to extract filename from header or use default
      const contentDisposition = res.headers.get("Content-Disposition");
      const contentType = res.headers.get("Content-Type");
      let filename = `processed_${files[0].name}`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
          // Decode URL-encoded filename if needed
          try {
            filename = decodeURIComponent(filename);
          } catch {
            // If decoding fails, use as-is
          }
        }
      } else {
        // Fallback: determine extension from content type or tool
        const nameWithoutExt =
          files[0].name.substring(0, files[0].name.lastIndexOf(".")) ||
          files[0].name;

        // Check for ZIP files by content type (not tool type - server decides)
        if (contentType === "application/zip" ||
            contentType === "application/x-zip-compressed") {
          filename = `processed_${nameWithoutExt}.zip`;
        } else if (contentType === "text/csv" || contentType === "application/csv") {
          filename = `processed_${nameWithoutExt}.csv`;
        } else if (contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
          filename = `processed_${nameWithoutExt}.xlsx`;
        } else if (toolSlug === "split-pdf" ||
            toolSlug === "extract-images-from-pdf" ||
            toolSlug === "pdf-to-images") {
          // These tools typically produce multiple files = ZIP
          filename = `processed_${nameWithoutExt}.zip`;
        } else if (toolSlug === "images-to-pdf" || toolSlug === "merge-pdf") {
          filename = `processed_${nameWithoutExt}.pdf`;
        } else if (toolSlug === "pdf-to-word") {
          filename = `processed_${nameWithoutExt}.docx`;
        }
      }

      // Final check: only force ZIP for tools that ALWAYS produce multiple files
      // extract-tables can produce single file (CSV/XLSX) or ZIP depending on table count
      if ((toolSlug === "split-pdf" ||
           toolSlug === "extract-images-from-pdf" ||
           toolSlug === "pdf-to-images") &&
          !filename.toLowerCase().endsWith(".zip") &&
          (contentType === "application/zip" || contentType === "application/x-zip-compressed")) {
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf(".")) || filename;
        filename = `${nameWithoutExt}.zip`;
      }

      setFileName(filename);
      setStatus("complete");
    } catch (e) {
      console.error("Fetch Error:", e);
      setErrorMessage(
        e instanceof Error ? e.message : "Unknown error occurred"
      );
      setStatus("error");
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus("idle");
      setErrorMessage("Operation cancelled by user.");
    }
  };

  return (
    <div
      className={`w-full mx-auto bg-card/30 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden ${toolSlug === "design-studio" && studioBackground ? "max-w-[95vw]" : "max-w-2xl"}`}
    >
      {/* Staged Files List (Reorderable) */}
      {stagedFiles.length > 0 && status === "idle" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">
              {t("selected")} ({stagedFiles.length})
            </h3>
            <button
              onClick={() => setStagedFiles([])}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear All
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stagedFiles.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mb-6">
                {stagedFiles.map((file) => (
                  <SortableFileItem
                    key={file.id}
                    file={file}
                    onRemove={handleRemoveFile}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex gap-4">
            <div className="w-1/2">
              <FileUploader
                onFilesSelected={(files) => handleFileSelect(files)}
                onError={setErrorMessage}
                accept={acceptedFileTypes}
                maxFiles={maxFiles}
                compact
              />
            </div>
            <button
              onClick={() => handleFiles(stagedFiles.map((f) => f.file))}
              className="w-1/2 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,243,255,0.2)]"
            >
              {toolSlug === "merge-pdf" ? "Merge PDFs" :
               toolSlug === "images-to-pdf" ? "Convert to PDF" :
               toolSlug === "convert-image" ? "Convert Images" :
               toolSlug === "resize-image" ? "Resize Images" :
               toolSlug === "compress-image" ? "Compress Images" :
               toolSlug === "watermark-image" ? "Apply Watermark" :
               toolSlug === "heic-to-jpg" ? "Convert HEIC" :
               toolSlug === "remove-image-background" ? "Remove Background" :
               toolSlug === "remove-image-metadata" ? "Remove Metadata" :
               toolSlug === "upscale-image" ? "Upscale Images" :
               `Process ${stagedFiles.length} File${stagedFiles.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Default Uploader (Hidden if staged files exist or preview is active) */}
      {stagedFiles.length === 0 &&
        status !== "complete" &&
        status !== "processing" &&
        status !== "uploading" &&
        !(previewFile && (
          toolSlug === "rotate-pdf" ||
          toolSlug === "crop-pdf" ||
          toolSlug === "watermark-pdf" ||
          toolSlug === "watermark-image" ||
          toolSlug === "pdf-redactor" ||
          toolSlug === "protect-pdf" ||
          toolSlug === "unlock-pdf" ||
          toolSlug === "pdf-signer" ||
          toolSlug === "resize-image" ||
          toolSlug === "convert-image" ||
          toolSlug === "compress-image" ||
          toolSlug === "heic-to-jpg" ||
          toolSlug === "upscale-image" ||
          toolSlug === "crop-image" ||
          toolSlug === "passport-photo" ||
          toolSlug === "extract-palette" ||
          toolSlug === "extract-tables" ||
          toolSlug === "page-numbers"
        )) && (
          <div>
              <FileUploader
              onFilesSelected={handleFileSelect}
              onError={setErrorMessage}
              accept={acceptedFileTypes}
              maxFiles={maxFiles}
            />
            {/* Inline Error Message */}
            {errorMessage && status === "idle" && (
              <div className="mt-4 p-4 bg-red-950/30 rounded-lg border border-red-500/20 text-sm">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-200/90 whitespace-pre-wrap">{errorMessage}</p>
                    <button
                      onClick={() => setErrorMessage(null)}
                      className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* File Size Limit Info (Web Version Only) */}
            {typeof window !== 'undefined' && !('__TAURI__' in window) && (
              <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10 text-sm text-muted-foreground">
                <p className="font-semibold mb-1">Web Version File Size Limits:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {acceptedFileTypes && Object.keys(acceptedFileTypes).some(key => key.startsWith('image/')) ? (
                    <li>Images: Maximum 20MB per file</li>
                  ) : null}
                  {acceptedFileTypes && Object.keys(acceptedFileTypes).some(key => key === 'application/pdf') ? (
                    <li>PDFs: Maximum 20MB per file</li>
                  ) : null}
                  <li className="text-primary/80">For larger files, use our desktop app (unlimited file sizes)</li>
                </ul>
              </div>
            )}

            {/* Merge Tables Option for pdf-to-csv and pdf-to-excel */}
            {(toolSlug === "pdf-to-csv" || toolSlug === "pdf-to-excel") && status === "idle" && (
              <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={mergeTables}
                    onChange={(e) => setMergeTables(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black/20 text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium group-hover:text-primary transition-colors">
                      Merge similar tables across pages
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Uses smart fingerprinting to combine tables with matching structure that span multiple pages
                    </div>
                  </div>
                </label>

                {/* Detection Mode */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-sm font-medium mb-2">Detection Mode</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDetectionMode("strict")}
                      className={`px-3 py-1.5 rounded text-xs transition-colors ${detectionMode === "strict" ? "bg-primary text-black" : "border border-white/20 text-muted-foreground hover:bg-white/5"}`}
                    >
                      Strict
                    </button>
                    <button
                      onClick={() => setDetectionMode("balanced")}
                      className={`px-3 py-1.5 rounded text-xs transition-colors ${detectionMode === "balanced" ? "bg-primary text-black" : "border border-white/20 text-muted-foreground hover:bg-white/5"}`}
                    >
                      Balanced
                    </button>
                    <button
                      onClick={() => setDetectionMode("aggressive")}
                      className={`px-3 py-1.5 rounded text-xs transition-colors ${detectionMode === "aggressive" ? "bg-primary text-black" : "border border-white/20 text-muted-foreground hover:bg-white/5"}`}
                    >
                      Aggressive
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {detectionMode === "strict" && "Best for clean tables with clear borders. Fewer false positives."}
                    {detectionMode === "balanced" && "Good for most documents. Balances accuracy with coverage."}
                    {detectionMode === "aggressive" && "Best for forms and complex layouts. May include more noise."}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Watermark Tool - Show preview and settings in place of uploader */}
      {(toolSlug === "watermark-pdf" || toolSlug === "watermark-image") &&
        previewFile &&
        status !== "complete" &&
        status !== "processing" &&
        status !== "uploading" && (
          <div className="space-y-6">
            {/* Watermark Preview */}
            {previewUrl && (
              <div className="relative border border-white/20 rounded-xl overflow-hidden bg-black/50 flex items-center justify-center min-h-[400px]">
                {isLoadingPreview && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}

                {/* PDF Preview (background) */}
                <img
                  src={previewUrl}
                  className="w-full h-auto object-contain max-h-[600px] pointer-events-none"
                  alt="PDF Preview"
                  id="watermark-preview-base"
                />

                {/* Draggable & Resizable Watermark Overlay */}
                <div
                  className="absolute border-2 border-primary/60 hover:border-primary bg-primary/10 transition-colors rounded group"
                  style={{
                    left: `${watermarkPosPercent.x * 100}%`,
                    top: `${watermarkPosPercent.y * 100}%`,
                    transform: `translate(-50%, -50%) scale(${watermarkScale})`,
                    userSelect: "none",
                    display: "inline-block",
                    maxWidth: "90%",
                    cursor: "move",
                  }}
                  onMouseDown={(e) => {
                    // Only drag if not clicking on the text or resize handle
                    if ((e.target as HTMLElement).tagName === 'SPAN' ||
                        (e.target as HTMLElement).classList.contains('resize-handle')) {
                      return;
                    }

                    e.preventDefault();
                    const container = e.currentTarget.parentElement;
                    if (!container) return;

                    const rect = container.getBoundingClientRect();
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startPosX = watermarkPosPercent.x;
                    const startPosY = watermarkPosPercent.y;

                    const onMove = (moveEvent: MouseEvent) => {
                      const dx = moveEvent.clientX - startX;
                      const dy = moveEvent.clientY - startY;
                      const percentDx = dx / rect.width;
                      const percentDy = dy / rect.height;
                      let newX = Math.max(0, Math.min(1, startPosX + percentDx));
                      let newY = Math.max(0, Math.min(1, startPosY + percentDy));
                      setWatermarkPosPercent({ x: newX, y: newY });
                    };

                    const onUp = () => {
                      window.removeEventListener("mousemove", onMove);
                      window.removeEventListener("mouseup", onUp);
                    };

                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  }}
                >
                  {watermarkType === "text" ? (
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      dangerouslySetInnerHTML={{ __html: watermarkText }}
                      onBlur={(e) => setWatermarkText(e.currentTarget.textContent || "")}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        fontSize: `${watermarkFontSize}px`,
                        color: watermarkColor,
                        opacity: watermarkOpacity,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        whiteSpace: "nowrap",
                        padding: "8px",
                        textShadow: "0 0 3px rgba(0,0,0,0.8)",
                        fontFamily: "Arial, sans-serif",
                        cursor: "text",
                        display: "inline-block",
                        minWidth: "50px",
                      }}
                    />
                  ) : (
                    watermarkFile && (
                      <div style={{ opacity: watermarkOpacity, padding: "8px" }}>
                        <img
                          src={URL.createObjectURL(watermarkFile)}
                          className="max-h-32 object-contain pointer-events-none"
                          alt="Watermark"
                        />
                      </div>
                    )
                  )}

                  {/* Resize Handle */}
                  <div
                    className="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-primary border border-white cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      transform: "translate(50%, 50%)",
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      const startScale = watermarkScale;
                      const startX = e.clientX;
                      const startY = e.clientY;

                      const onMove = (moveEvent: MouseEvent) => {
                        const dx = moveEvent.clientX - startX;
                        const dy = moveEvent.clientY - startY;
                        const delta = (dx + dy) / 200; // Average of both dimensions
                        const newScale = Math.max(0.3, Math.min(3, startScale + delta));
                        setWatermarkScale(newScale);
                      };

                      const onUp = () => {
                        window.removeEventListener("mousemove", onMove);
                        window.removeEventListener("mouseup", onUp);
                      };

                      window.addEventListener("mousemove", onMove);
                      window.addEventListener("mouseup", onUp);
                    }}
                  />
                </div>

                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded flex flex-col gap-1">
                  <div>✋ Drag border to move</div>
                  <div>✏️ Click text to edit</div>
                  <div>↔️ Drag corner to resize</div>
                </div>
              </div>
            )}

            {/* Watermark Settings */}
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Type size={20} /> {t("watermark_settings")}
              </h3>

              {/* Type Selection */}
              <div className="flex gap-2 p-1 bg-black/20 rounded-lg mb-6">
                <button
                  onClick={() => setWatermarkType("text")}
                  className={`flex-1 py-2 rounded-md font-medium transition-all ${
                    watermarkType === "text"
                      ? "bg-primary text-black"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Type className="inline w-4 h-4 mr-2" />
                  Text
                </button>
                <button
                  onClick={() => setWatermarkType("image")}
                  className={`flex-1 py-2 rounded-md font-medium transition-all ${
                    watermarkType === "image"
                      ? "bg-primary text-black"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <LucideImage className="inline w-4 h-4 mr-2" />
                  Image
                </button>
              </div>

              {/* Text Watermark Settings */}
              {watermarkType === "text" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2">Watermark Text</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                      placeholder="Enter watermark text"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Size: {watermarkFontSize}px
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        step="5"
                        value={watermarkFontSize}
                        onChange={(e) => setWatermarkFontSize(parseInt(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Opacity: {watermarkOpacity.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={watermarkColor}
                        onChange={(e) => setWatermarkColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border border-white/20"
                      />
                      <span className="text-sm font-mono opacity-70">{watermarkColor}</span>
                    </div>
                  </div>

                  {/* Position Controls */}
                  <div>
                    <label className="block text-sm font-medium mb-3">Position</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Horizontal: {(watermarkPosPercent.x * 100).toFixed(0)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={watermarkPosPercent.x}
                          onChange={(e) => {
                            setWatermarkPosPercent({ ...watermarkPosPercent, x: parseFloat(e.target.value) });
                            setWatermarkPosition("custom");
                          }}
                          className="w-full accent-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Vertical: {(watermarkPosPercent.y * 100).toFixed(0)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={watermarkPosPercent.y}
                          onChange={(e) => {
                            setWatermarkPosPercent({ ...watermarkPosPercent, y: parseFloat(e.target.value) });
                            setWatermarkPosition("custom");
                          }}
                          className="w-full accent-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Scale Control */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Scale: {watermarkScale.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.3"
                      max="3"
                      step="0.1"
                      value={watermarkScale}
                      onChange={(e) => setWatermarkScale(parseFloat(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Small</span>
                      <span>Large</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Watermark Settings */}
              {watermarkType === "image" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2">Upload Watermark Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setWatermarkFile(e.target.files[0]);
                        }
                      }}
                      className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Opacity: {watermarkOpacity.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>

                  {/* Position Controls */}
                  <div>
                    <label className="block text-sm font-medium mb-3">Position</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Horizontal: {(watermarkPosPercent.x * 100).toFixed(0)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={watermarkPosPercent.x}
                          onChange={(e) => {
                            setWatermarkPosPercent({ ...watermarkPosPercent, x: parseFloat(e.target.value) });
                            setWatermarkPosition("custom");
                          }}
                          className="w-full accent-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Vertical: {(watermarkPosPercent.y * 100).toFixed(0)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={watermarkPosPercent.y}
                          onChange={(e) => {
                            setWatermarkPosPercent({ ...watermarkPosPercent, y: parseFloat(e.target.value) });
                            setWatermarkPosition("custom");
                          }}
                          className="w-full accent-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setPreviewFile(null);
                  setStagedFiles([]);
                  setWatermarkPosPercent({ x: 0.5, y: 0.5 });
                  setWatermarkScale(1);
                }}
                className="px-6 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // For watermark-image with staged files, process all of them
                  // For watermark-pdf or single file, process just the previewFile
                  const filesToProcess = (toolSlug === "watermark-image" && stagedFiles.length > 0)
                    ? stagedFiles.map((f) => f.file)
                    : previewFile ? [previewFile] : [];
                  if (filesToProcess.length > 0) {
                    handleFiles(filesToProcess);
                  }
                }}
                className="flex-1 px-6 py-2 rounded-lg bg-primary text-black font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {(toolSlug === "watermark-image" && stagedFiles.length > 1)
                  ? `Apply to ${stagedFiles.length} Images`
                  : "Apply Watermark"}
              </button>
            </div>
          </div>
        )}

      {/* PDF Signer Tool - Show preview and signature positioning */}
      {toolSlug === "pdf-signer" &&
        previewFile &&
        status !== "complete" &&
        status !== "processing" &&
        status !== "uploading" && (
          <div className="space-y-6">
            {/* PDF Preview with Signature Overlay */}
            {previewUrl && (
              <div className="relative border border-white/20 rounded-xl overflow-hidden bg-black/50 flex items-center justify-center min-h-[400px]">
                {isLoadingPreview && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}

                {/* PDF Preview (background) */}
                <img
                  src={previewUrl}
                  className="w-full h-auto object-contain max-h-[600px] pointer-events-none"
                  alt="PDF Preview"
                  id="signature-preview-base"
                />

                {/* Draggable Signature Overlay */}
                <div
                  className="absolute border-2 border-primary/60 hover:border-primary bg-primary/10 transition-colors rounded group cursor-move"
                  style={{
                    left: `${signaturePosPercent.x * 100}%`,
                    top: `${signaturePosPercent.y * 100}%`,
                    transform: `translate(-50%, -50%) scale(${signatureScale})`,
                    userSelect: "none",
                    padding: "12px 16px",
                    minWidth: "200px",
                    minHeight: "60px",
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const container = e.currentTarget.parentElement;
                    if (!container) return;

                    const rect = container.getBoundingClientRect();
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startPosX = signaturePosPercent.x;
                    const startPosY = signaturePosPercent.y;

                    const onMove = (moveEvent: MouseEvent) => {
                      const dx = moveEvent.clientX - startX;
                      const dy = moveEvent.clientY - startY;
                      const percentDx = dx / rect.width;
                      const percentDy = dy / rect.height;
                      let newX = Math.max(0, Math.min(1, startPosX + percentDx));
                      let newY = Math.max(0, Math.min(1, startPosY + percentDy));
                      setSignaturePosPercent({ x: newX, y: newY });
                    };

                    const onUp = () => {
                      window.removeEventListener("mousemove", onMove);
                      window.removeEventListener("mouseup", onUp);
                    };

                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  }}
                >
                  {/* Signature Appearance */}
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#000",
                      background: "linear-gradient(135deg, #fff 0%, #f0f0f0 100%)",
                      border: "2px solid #333",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      fontFamily: "Georgia, serif",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    }}
                  >
                    <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "4px" }}>
                      {signatureText || "Signature"}
                    </div>
                    {signatureLocation && (
                      <div style={{ fontSize: "11px", color: "#555" }}>
                        {signatureLocation}
                      </div>
                    )}
                    <div style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>
                      {new Date().toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded flex flex-col gap-1">
                  <div>✋ Drag to position signature</div>
                  <div>📝 Configure signature below</div>
                </div>
              </div>
            )}

            {/* Signature Configuration Settings */}
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <PenTool size={20} /> Signature Configuration
              </h3>

              <div className="space-y-5">
                {/* Certificate & Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Certificate File (.pfx or .p12) *
                    </label>
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                      className="w-full bg-black/20 text-xs border border-white/10 rounded py-2 px-3"
                    />
                    {certFile ? (
                      <p className="text-xs text-primary mt-1">✓ {certFile.name}</p>
                    ) : (
                      <p className="text-xs text-red-400 mt-1">⚠ Required</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Certificate Password *
                    </label>
                    <input
                      type="password"
                      value={certPassword}
                      onChange={(e) => setCertPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                    />
                    {certPassword && certPassword.trim().length > 0 ? (
                      <p className="text-xs text-primary mt-1">✓ Password entered</p>
                    ) : (
                      <p className="text-xs text-red-400 mt-1">⚠ Required</p>
                    )}
                  </div>
                </div>

                {/* Signature Text/Name & Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Signature Name</label>
                    <input
                      type="text"
                      value={signatureText}
                      onChange={(e) => setSignatureText(e.target.value)}
                      placeholder="Your Name"
                      className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Location (Optional)</label>
                    <input
                      type="text"
                      value={signatureLocation}
                      onChange={(e) => setSignatureLocation(e.target.value)}
                      placeholder="City, Country"
                      className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                {/* Scale Control */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Signature Size: {signatureScale.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={signatureScale}
                    onChange={(e) => setSignatureScale(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Small</span>
                    <span>Large</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setPreviewFile(null);
                  setSignaturePosPercent({ x: 0.5, y: 0.1 });
                  setSignatureScale(1);
                }}
                className="px-6 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Validation before processing
                  if (!certFile) {
                    setErrorMessage("Please upload a certificate file (.pfx or .p12)");
                    setStatus("error");
                    return;
                  }
                  if (!certPassword || certPassword.trim().length < 1) {
                    setErrorMessage("Please enter the certificate password");
                    setStatus("error");
                    return;
                  }
                  if (previewFile) {
                    handleFiles([previewFile]);
                  }
                }}
                className="flex-1 px-6 py-2 rounded-lg bg-primary text-black font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!certFile || !certPassword || certPassword.trim().length === 0}
              >
                <PenTool className="w-4 h-4" />
                Sign PDF
              </button>
            </div>
          </div>
        )}

      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />

      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Design Studio Mode */}
            {toolSlug === "design-studio" && studioBackground && (
              <div className="w-full text-left">
                <StudioLayout
                  initialBackground={studioBackground}
                  initialDim={studioDim}
                  onExport={(blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `design_${Date.now()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                />
              </div>
            )}

            {/* Compress Options */}
            {toolSlug === "compress-pdf" && (
              <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold mb-4">Compression Strength</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      val: 0,
                      label: "Low",
                      desc: "High Quality",
                      icon: <Book size={18} />,
                    },
                    {
                      val: 1,
                      label: "Medium",
                      desc: "Balanced",
                      icon: <Archive size={18} />,
                    },
                    {
                      val: 2,
                      label: "High",
                      desc: "Smallest Size",
                      icon: <Zap size={18} />,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setCompressionLevel(opt.val)}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-2 ${compressionLevel === opt.val ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(0,243,255,0.1)]" : "bg-black/20 border-white/10 text-muted-foreground hover:bg-white/5 hover:border-white/20"}`}
                    >
                      <div className="font-bold flex items-center gap-2">
                        {opt.icon}
                        {opt.label}
                      </div>
                      <div className="text-xs opacity-70">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Extract Tables Options */}
            {toolSlug === "extract-tables" && previewFile && (
              <div className="mb-8 space-y-6">
                {/* Selected File Info */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium">{previewFile.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(previewFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPreviewFile(null);
                        setTablePreview(null);
                        setSelectedTables(new Set());
                      }}
                      className="text-sm text-muted-foreground hover:text-white transition-colors"
                    >
                      Change File
                    </button>
                  </div>
                </div>

                {/* Loading State */}
                {isLoadingTablePreview && (
                  <div className="p-8 bg-white/5 rounded-xl border border-white/10 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-muted-foreground">Scanning PDF for tables...</p>
                  </div>
                )}

                {/* Table Preview Results */}
                {tablePreview && !isLoadingTablePreview && (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold">Tables Detected</h3>
                        <span className="text-sm text-muted-foreground">
                          {tablePreview.total_tables ?? 0} table{(tablePreview.total_tables ?? 0) !== 1 ? 's' : ''} in {tablePreview.total_pages ?? 0} page{(tablePreview.total_pages ?? 0) !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Merge Suggestions */}
                      {tablePreview.merge_suggestions && tablePreview.merge_suggestions.length > 0 && (
                        <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="text-sm font-medium text-primary mb-1">
                            Smart Merge Suggestion
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tablePreview.merge_suggestions.length} group{tablePreview.merge_suggestions.length !== 1 ? 's' : ''} of similar tables detected that can be merged:
                            {tablePreview.merge_suggestions.map((suggestion, idx) => (
                              <span key={idx} className="ml-2 text-primary">
                                {suggestion.tables.join(' + ')} ({suggestion.total_rows} rows)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Errors */}
                      {tablePreview.errors && tablePreview.errors.length > 0 && (
                        <div className="mt-3 p-3 bg-red-950/30 rounded-lg border border-red-500/20">
                          <div className="text-sm text-red-400">
                            {tablePreview.errors.map((err, idx) => (
                              <div key={idx}>{err.error}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Table List */}
                    {tablePreview.tables && tablePreview.tables.length > 0 && (
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Select Tables to Extract</h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedTables(new Set(tablePreview.tables.map(t => t.id)))}
                              className="text-xs text-primary hover:underline"
                            >
                              Select All
                            </button>
                            <span className="text-muted-foreground">|</span>
                            <button
                              onClick={() => setSelectedTables(new Set())}
                              className="text-xs text-muted-foreground hover:text-white"
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {tablePreview.tables.map((table) => (
                            <div
                              key={table.id}
                              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                selectedTables.has(table.id)
                                  ? 'bg-primary/10 border-primary/50'
                                  : 'bg-black/20 border-white/10 hover:border-white/20'
                              }`}
                              onClick={() => {
                                const newSelected = new Set(selectedTables);
                                if (newSelected.has(table.id)) {
                                  newSelected.delete(table.id);
                                } else {
                                  newSelected.add(table.id);
                                }
                                setSelectedTables(newSelected);
                              }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedTables.has(table.id)}
                                    onChange={() => {}}
                                    className="w-4 h-4 rounded border-white/20 bg-black/20 text-primary"
                                  />
                                  <div>
                                    <span className="font-medium">Page {table.page}, Table {table.table_index}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {table.rows} rows × {table.columns} cols
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  {table.column_types.slice(0, 4).map((type, idx) => (
                                    <span
                                      key={idx}
                                      className={`text-xs px-1.5 py-0.5 rounded ${
                                        type === 'numeric' ? 'bg-blue-500/20 text-blue-400' :
                                        type === 'date' ? 'bg-purple-500/20 text-purple-400' :
                                        type === 'text' ? 'bg-green-500/20 text-green-400' :
                                        'bg-gray-500/20 text-gray-400'
                                      }`}
                                    >
                                      {type}
                                    </span>
                                  ))}
                                  {table.column_types.length > 4 && (
                                    <span className="text-xs text-muted-foreground">+{table.column_types.length - 4}</span>
                                  )}
                                </div>
                              </div>

                              {/* Header Preview */}
                              {table.has_header && table.header && (
                                <div className="text-xs text-muted-foreground mb-2">
                                  <span className="text-primary/70">Headers:</span>{' '}
                                  {table.header.slice(0, 5).join(' | ')}
                                  {table.header.length > 5 && ' ...'}
                                </div>
                              )}

                              {/* Sample Data Preview */}
                              {table.sample_data && table.sample_data.length > 0 && (
                                <div className="mt-2 overflow-x-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <tbody>
                                      {table.sample_data.slice(0, 3).map((row, rowIdx) => (
                                        <tr key={rowIdx} className={rowIdx === 0 && table.has_header ? 'font-medium text-primary/80' : ''}>
                                          {row.slice(0, 5).map((cell, cellIdx) => (
                                            <td key={cellIdx} className="px-2 py-1 border border-white/10 truncate max-w-[100px]">
                                              {cell || '-'}
                                            </td>
                                          ))}
                                          {row.length > 5 && (
                                            <td className="px-2 py-1 border border-white/10 text-muted-foreground">...</td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {table.sample_data.length > 3 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      +{table.rows - 3} more rows
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Tables Found */}
                    {tablePreview.tables && tablePreview.tables.length === 0 && !tablePreview.errors?.length && (
                      <div className="p-8 bg-white/5 rounded-xl border border-white/10 text-center">
                        <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No tables detected in this PDF.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          The PDF may not contain structured tables with borders/gridlines.
                        </p>
                      </div>
                    )}

                    {/* Output Format & Options */}
                    {tablePreview.tables && tablePreview.tables.length > 0 && (
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <h4 className="font-medium mb-3">Output Options</h4>
                        <div className="flex gap-4 mb-4">
                          <button
                            onClick={() => setExtractFormat("csv")}
                            className={`px-4 py-2 rounded border transition-colors flex items-center gap-2 ${extractFormat === "csv" ? "bg-primary text-black border-primary" : "border-white/20 text-muted-foreground hover:bg-white/5"}`}
                          >
                            <FileSpreadsheet size={16} /> CSV
                          </button>
                          <button
                            onClick={() => setExtractFormat("xlsx")}
                            className={`px-4 py-2 rounded border transition-colors flex items-center gap-2 ${extractFormat === "xlsx" ? "bg-primary text-black border-primary" : "border-white/20 text-muted-foreground hover:bg-white/5"}`}
                          >
                            <FileSpreadsheet size={16} /> Excel
                          </button>
                        </div>

                        {/* Merge Tables Option */}
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={mergeTables}
                            onChange={(e) => setMergeTables(e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-black/20 text-primary focus:ring-primary focus:ring-offset-0"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium group-hover:text-primary transition-colors">
                              Merge similar tables across pages
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Uses smart fingerprinting to combine tables with matching structure
                            </div>
                          </div>
                        </label>

                        {/* Detection Mode */}
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="text-sm font-medium mb-2">Detection Mode</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDetectionMode("strict")}
                              className={`px-3 py-1.5 rounded text-xs transition-colors ${detectionMode === "strict" ? "bg-primary text-black" : "border border-white/20 text-muted-foreground hover:bg-white/5"}`}
                            >
                              Strict
                            </button>
                            <button
                              onClick={() => setDetectionMode("balanced")}
                              className={`px-3 py-1.5 rounded text-xs transition-colors ${detectionMode === "balanced" ? "bg-primary text-black" : "border border-white/20 text-muted-foreground hover:bg-white/5"}`}
                            >
                              Balanced
                            </button>
                            <button
                              onClick={() => setDetectionMode("aggressive")}
                              className={`px-3 py-1.5 rounded text-xs transition-colors ${detectionMode === "aggressive" ? "bg-primary text-black" : "border border-white/20 text-muted-foreground hover:bg-white/5"}`}
                            >
                              Aggressive
                            </button>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {detectionMode === "strict" && "Best for clean tables with clear borders. Fewer false positives."}
                            {detectionMode === "balanced" && "Good for most documents. Balances accuracy with coverage."}
                            {detectionMode === "aggressive" && "Best for forms and complex layouts. May include more noise."}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Extract Button */}
                    {tablePreview.tables && tablePreview.tables.length > 0 && selectedTables.size > 0 && (
                      <button
                        onClick={() => previewFile && handleFiles([previewFile])}
                        className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(0,243,255,0.3)]"
                      >
                        Extract {selectedTables.size} Table{selectedTables.size !== 1 ? 's' : ''} as {extractFormat.toUpperCase()}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Redactor Options */}
            {toolSlug === "pdf-redactor" && previewFile && (
              <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Eraser size={20} /> Secure Redaction
                </h3>

                {/* Selected File */}
                <div className="mb-4 p-3 bg-black/20 rounded-lg border border-white/10">
                  <div className="text-xs text-muted-foreground mb-1">Selected File:</div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{previewFile.name}</span>
                    <button
                      onClick={() => {
                        setPreviewFile(null);
                        setRedactTexts([""]);
                      }}
                      className="text-xs text-muted-foreground hover:text-white transition-colors"
                    >
                      Change File
                    </button>
                  </div>
                </div>

                {/* Redaction Texts */}
                <div className="space-y-3 mb-4">
                  <label className="text-sm font-medium block">
                    Text to Redact (Permanently Remove)
                  </label>
                  {redactTexts.map((text, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => {
                          const newTexts = [...redactTexts];
                          newTexts[index] = e.target.value;
                          setRedactTexts(newTexts);
                        }}
                        placeholder={index === 0 ? "e.g. Confidential" : "e.g. Secret, SSN, etc."}
                        className="flex-1 bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                      />
                      {redactTexts.length > 1 && (
                        <button
                          onClick={() => {
                            const newTexts = redactTexts.filter((_, i) => i !== index);
                            setRedactTexts(newTexts);
                          }}
                          className="px-3 py-2 rounded border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setRedactTexts([...redactTexts, ""])}
                    className="w-full py-2 rounded border border-dashed border-white/20 text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Plus size={16} /> Add Another Text to Redact
                  </button>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  All occurrences of the specified text will be permanently redacted (blacked out) from the PDF.
                </p>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPreviewFile(null);
                      setRedactTexts([""]);
                    }}
                    className="px-6 py-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Client-side validation before processing
                      const validTexts = redactTexts.filter(t => t.trim().length > 0);
                      if (validTexts.length === 0) {
                        setErrorMessage("Please enter at least one text to redact from the PDF.");
                        setStatus("error");
                        return;
                      }
                      handleFiles([previewFile]);
                    }}
                    className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={redactTexts.filter(t => t.trim().length > 0).length === 0}
                  >
                    <Eraser size={16} /> Redact PDF
                  </button>
                </div>
              </div>
            )}

            {toolSlug === "pdf-signer" && !previewFile && (
              <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <PenTool size={20} /> Certificate & Password Required
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Certificate File (.pfx or .p12)
                    </label>
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                      className="w-full bg-black/20 text-sm border border-white/10 rounded py-2 px-3"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload your PKCS#12 certificate containing private key
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Certificate Password
                    </label>
                    <input
                      type="password"
                      value={certPassword}
                      onChange={(e) => setCertPassword(e.target.value)}
                      placeholder="Enter certificate password"
                      className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {toolSlug === "protect-pdf" && (
              <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Lock size={20} /> {t("protect_settings")}
                </h3>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {t("protect_pass_label")}
                  </label>
                  <input
                    type="password"
                    value={pdfPassword}
                    onChange={(e) => setPdfPassword(e.target.value)}
                    placeholder="Enter password (minimum 3 characters)"
                    className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Password must be at least 3 characters long.
                  </p>
                </div>

                {previewFile && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-muted-foreground mb-4">
                      {t("selected")}:{" "}
                      <span className="text-white">{previewFile.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        // Client-side validation before processing
                        if (!pdfPassword || pdfPassword.trim().length < 3) {
                          setErrorMessage("Please enter a password (at least 3 characters) to protect your PDF.");
                          setStatus("error");
                          return;
                        }
                        handleFiles([previewFile]);
                      }}
                      className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!pdfPassword || pdfPassword.trim().length < 3}
                    >
                      <Lock size={16} /> {t("protect_btn")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {toolSlug === "unlock-pdf" && (
              <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Unlock size={20} /> {t("protect_settings")}
                </h3>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {t("unlock_pass_label")}
                  </label>
                  <input
                    type="password"
                    value={pdfPassword}
                    onChange={(e) => setPdfPassword(e.target.value)}
                    placeholder="Enter password (leave empty if PDF is not encrypted)"
                    className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Note: Leave empty if the PDF is not password-protected.
                  </p>
                </div>

                {previewFile && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-muted-foreground mb-4">
                      {t("selected")}:{" "}
                      <span className="text-white">{previewFile.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        // Client-side validation - password is optional for unlock (PDF might not be encrypted)
                        // But if user enters password, validate it's not empty
                        if (pdfPassword && pdfPassword.trim().length === 0) {
                          setErrorMessage("Please enter a valid password or leave it empty if the PDF is not encrypted.");
                          setStatus("error");
                          return;
                        }
                        handleFiles([previewFile]);
                      }}
                      className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={false}
                    >
                      <Unlock size={16} /> {t("unlock_btn")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Diff Options */}
            {toolSlug === "pdf-diff" && (
              <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm flex items-center gap-2">
                <GitCompare size={18} />
                <span>{t("wait_process")}</span>
              </div>
            )}

            {/* Crop PDF Options with Visual Drag-to-Crop */}
            {toolSlug === "crop-pdf" && previewUrl && previewFile && (
              <div className="space-y-6">
                {/* Visual Crop Interface */}
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Crop size={20} /> Crop PDF Pages
                  </h3>

                  {/* Preview with Draggable Crop Box */}
                  <div className="mb-6 relative bg-black/50 rounded-lg p-4 flex items-center justify-center min-h-[500px] overflow-hidden">
                    {isLoadingPreview ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Loading preview...</span>
                      </div>
                    ) : (
                      <div className="relative inline-block">
                        <img
                          ref={cropPreviewRef}
                          src={previewUrl}
                          alt="PDF Preview"
                          className="max-w-full max-h-[500px] object-contain select-none"
                          draggable={false}
                        />

                        {/* Draggable & Resizable Crop Box */}
                        {pdfCropWidth !== null && pdfCropHeight !== null && cropPreviewRef.current && (
                          <div
                            className="absolute border-2 border-primary bg-primary/20 cursor-move group"
                            style={{
                              left: `${pdfCropX}px`,
                              top: `${pdfCropY}px`,
                              width: `${pdfCropWidth}px`,
                              height: `${pdfCropHeight}px`,
                            }}
                            onMouseDown={(e) => {
                              if ((e.target as HTMLElement).classList.contains('resize-handle')) return;

                              e.preventDefault();
                              setIsDraggingCrop(true);
                              const imgRect = cropPreviewRef.current!.getBoundingClientRect();
                              const startX = e.clientX;
                              const startY = e.clientY;
                              const startCropX = pdfCropX;
                              const startCropY = pdfCropY;

                              const onMove = (moveEvent: MouseEvent) => {
                                const dx = moveEvent.clientX - startX;
                                const dy = moveEvent.clientY - startY;
                                const newX = Math.max(0, Math.min(imgRect.width - pdfCropWidth!, startCropX + dx));
                                const newY = Math.max(0, Math.min(imgRect.height - pdfCropHeight!, startCropY + dy));
                                setPdfCropX(Math.round(newX));
                                setPdfCropY(Math.round(newY));
                              };

                              const onUp = () => {
                                setIsDraggingCrop(false);
                                window.removeEventListener("mousemove", onMove);
                                window.removeEventListener("mouseup", onUp);
                              };

                              window.addEventListener("mousemove", onMove);
                              window.addEventListener("mouseup", onUp);
                            }}
                          >
                            {/* Resize Handles */}
                            {/* Bottom-right */}
                            <div
                              className="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-primary border border-white cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ transform: "translate(50%, 50%)" }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsResizingCrop(true);

                                const imgRect = cropPreviewRef.current!.getBoundingClientRect();
                                const startX = e.clientX;
                                const startY = e.clientY;
                                const startWidth = pdfCropWidth!;
                                const startHeight = pdfCropHeight!;

                                const onMove = (moveEvent: MouseEvent) => {
                                  const dx = moveEvent.clientX - startX;
                                  const dy = moveEvent.clientY - startY;
                                  const newWidth = Math.max(50, Math.min(imgRect.width - pdfCropX, startWidth + dx));
                                  const newHeight = Math.max(50, Math.min(imgRect.height - pdfCropY, startHeight + dy));
                                  setPdfCropWidth(Math.round(newWidth));
                                  setPdfCropHeight(Math.round(newHeight));
                                };

                                const onUp = () => {
                                  setIsResizingCrop(false);
                                  window.removeEventListener("mousemove", onMove);
                                  window.removeEventListener("mouseup", onUp);
                                };

                                window.addEventListener("mousemove", onMove);
                                window.addEventListener("mouseup", onUp);
                              }}
                            />

                            {/* Top-left */}
                            <div
                              className="resize-handle absolute top-0 left-0 w-4 h-4 bg-primary border border-white cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ transform: "translate(-50%, -50%)" }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsResizingCrop(true);

                                const startX = e.clientX;
                                const startY = e.clientY;
                                const startCropX = pdfCropX;
                                const startCropY = pdfCropY;
                                const startWidth = pdfCropWidth!;
                                const startHeight = pdfCropHeight!;

                                const onMove = (moveEvent: MouseEvent) => {
                                  const dx = moveEvent.clientX - startX;
                                  const dy = moveEvent.clientY - startY;
                                  const newX = Math.max(0, startCropX + dx);
                                  const newY = Math.max(0, startCropY + dy);
                                  const newWidth = Math.max(50, startWidth - dx);
                                  const newHeight = Math.max(50, startHeight - dy);

                                  setPdfCropX(Math.round(newX));
                                  setPdfCropY(Math.round(newY));
                                  setPdfCropWidth(Math.round(newWidth));
                                  setPdfCropHeight(Math.round(newHeight));
                                };

                                const onUp = () => {
                                  setIsResizingCrop(false);
                                  window.removeEventListener("mousemove", onMove);
                                  window.removeEventListener("mouseup", onUp);
                                };

                                window.addEventListener("mousemove", onMove);
                                window.addEventListener("mouseup", onUp);
                              }}
                            />

                            {/* Info overlay */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded pointer-events-none">
                              {Math.round(pdfCropWidth)} × {Math.round(pdfCropHeight)}
                            </div>
                          </div>
                        )}

                        {/* Instructions */}
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded flex flex-col gap-1">
                          <div>✋ Drag to move</div>
                          <div>↔️ Drag corners to resize</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pages Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Pages to Crop (Optional)</label>
                    <input
                      type="text"
                      value={pdfCropPages}
                      onChange={(e) => setPdfCropPages(e.target.value)}
                      placeholder="e.g., 1-5 or 1,3,5 (leave empty for all pages)"
                      className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty to apply crop to all pages
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setPreviewUrl(null);
                        setPreviewFile(null);
                        setPdfCropX(50);
                        setPdfCropY(50);
                        setPdfCropWidth(400);
                        setPdfCropHeight(500);
                      }}
                      className="px-6 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => previewFile && handleFiles([previewFile])}
                      className="flex-1 px-6 py-2 rounded-lg bg-primary text-black font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Crop className="w-4 h-4" />
                      Apply Crop to PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rotate PDF Options with Preview */}
            {toolSlug === "rotate-pdf" && previewFile && (
              <div className="mb-8">
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <RotateCw size={20} /> Rotate PDF
                  </h3>
                  
                  {/* Preview Display */}
                  <div className="mb-6 relative bg-black/20 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
                    {isLoadingPreview ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Loading preview...</span>
                      </div>
                    ) : previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="PDF Preview"
                        className="max-w-full max-h-[400px] object-contain rounded-lg shadow-lg"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-sm">Preparing preview...</span>
                      </div>
                    )}
                  </div>

                    {/* Rotate Controls */}
                    <div className="flex items-center gap-4 justify-center">
                      <button
                        onClick={() => {
                          const newAngle = (rotationAngle - 90) % 360;
                          setRotationAngle(newAngle);
                          fetchPreview({ angle: newAngle });
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl transition-all hover:scale-105"
                      >
                        <RotateCcw size={20} />
                        <span>Rotate Left</span>
                      </button>
                      
                      <div className="px-6 py-3 bg-primary/20 border border-primary/30 rounded-xl font-bold text-primary min-w-[100px] text-center">
                        {rotationAngle}°
                      </div>
                      
                      <button
                        onClick={() => {
                          const newAngle = (rotationAngle + 90) % 360;
                          setRotationAngle(newAngle);
                          fetchPreview({ angle: newAngle });
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl transition-all hover:scale-105"
                      >
                        <RotateCw size={20} />
                        <span>Rotate Right</span>
                      </button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10">
                      <div className="text-xs text-muted-foreground mb-4">
                        {t("selected")}: <span className="text-white">{previewFile.name}</span>
                      </div>
                      <button
                        onClick={() => previewFile && handleFiles([previewFile])}
                        className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                      >
                        <RotateCw size={16} /> Apply Rotation
                      </button>
                    </div>
                  </div>
                </div>
            )}

            {/* Page Numbers PDF Options with Preview */}
            {toolSlug === "page-numbers" && previewFile && (
              <div className="mb-8">
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Hash size={20} /> Add Page Numbers
                  </h3>
                  
                  {/* Preview Display with Overlay */}
                  <div className="mb-6 relative bg-black/20 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
                    {isLoadingPreview ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Loading preview...</span>
                      </div>
                    ) : previewUrl ? (
                      <div className="relative inline-block border border-white/10 shadow-2xl">
                        <img
                          src={previewUrl}
                          alt="PDF Preview"
                          className="max-w-full max-h-[400px] object-contain"
                        />
                        
                        {/* Page Number Visual Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                          <span
                            className={cn(
                              "absolute text-xs font-mono text-black bg-white/80 px-1.5 py-0.5 rounded border border-black/10 shadow-sm",
                              pageNumPos === "bottom-right" && "bottom-[5%] right-[5%]",
                              pageNumPos === "bottom-center" && "bottom-[5%] left-1/2 -translate-x-1/2",
                              pageNumPos === "bottom-left" && "bottom-[5%] left-[5%]",
                              pageNumPos === "top-right" && "top-[5%] right-[5%]",
                              pageNumPos === "top-center" && "top-[5%] left-1/2 -translate-x-1/2",
                              pageNumPos === "top-left" && "top-[5%] left-[5%]"
                            )}
                          >
                            1
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-sm">Preparing preview...</span>
                      </div>
                    )}
                  </div>

                  {/* Position Selector */}
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-foreground block">
                      Number Position
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "top-left", label: "Top Left" },
                        { id: "top-center", label: "Top Center" },
                        { id: "top-right", label: "Top Right" },
                        { id: "bottom-left", label: "Bottom Left" },
                        { id: "bottom-center", label: "Bottom Center" },
                        { id: "bottom-right", label: "Bottom Right" },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          onClick={() => setPageNumPos(pos.id)}
                          className={cn(
                            "px-3 py-2 text-xs rounded-lg transition-all border",
                            pageNumPos === pos.id
                              ? "bg-primary/20 border-primary text-primary font-medium"
                              : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="text-xs text-muted-foreground mb-4">
                      {t("selected")}: <span className="text-white">{previewFile.name}</span>
                    </div>
                    <button
                      onClick={() => previewFile && handleFiles([previewFile])}
                      className="w-full py-3 rounded-lg bg-primary text-black font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.2)]"
                    >
                      <Hash size={16} /> Add Page Numbers
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Organize PDF / Reorder Pages Options */}
            {(toolSlug === "organize-pdf" || toolSlug === "reorder-pages") && (
              <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold mb-4">Page Order</h3>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Enter page numbers in desired order *
                  </label>
                  <input
                    type="text"
                    value={pageOrder}
                    onChange={(e) => {
                      // Sanitize input: only allow digits, commas, dashes, and spaces
                      const sanitized = e.target.value.replace(/[^0-9,\-\s]/g, '');
                      setPageOrder(sanitized);
                    }}
                    placeholder="3,1,2,5,4 or 1-5,10,8-9"
                    className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use commas for individual pages (e.g., "3,1,2") or dashes
                    for ranges (e.g., "1-5,10,8-9").
                  </p>
                </div>

                {previewFile && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="text-xs text-muted-foreground mb-4">
                      {t("selected")}: <span className="text-white">{previewFile.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        // Validate page order before processing
                        if (!pageOrder || pageOrder.trim().length === 0) {
                          setErrorMessage("Page order is required. Please enter the desired page order (e.g., '3,1,2' or '1-5,10').");
                          setStatus("error");
                          return;
                        }
                        // Validate format
                        const validFormat = /^[\d\s,\-]+$/.test(pageOrder);
                        if (!validFormat) {
                          setErrorMessage("Invalid page order format. Use only numbers, commas, and dashes (e.g., '3,1,2' or '1-5,10').");
                          setStatus("error");
                          return;
                        }
                        handleFiles([previewFile]);
                      }}
                      disabled={!pageOrder || pageOrder.trim().length === 0}
                      className="w-full py-3 rounded-lg bg-primary text-black font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,243,255,0.2)]"
                    >
                      <CheckCircle size={16} /> Reorder Pages
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Extract Form Data Options */}
            {toolSlug === "extract-form-data" && (
              <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold mb-4">Output Format</h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => setExtractFormat("csv")}
                    className={`px-4 py-2 rounded border transition-colors flex items-center gap-2 ${extractFormat === "csv" ? "bg-primary text-black border-primary" : "border-white/20 text-muted-foreground hover:bg-white/5"}`}
                  >
                    <FileSpreadsheet size={16} /> CSV
                  </button>
                  <button
                    onClick={() => setExtractFormat("xlsx")}
                    className={`px-4 py-2 rounded border transition-colors flex items-center gap-2 ${extractFormat === "xlsx" ? "bg-primary text-black border-primary" : "border-white/20 text-muted-foreground hover:bg-white/5"}`}
                  >
                    <FileSpreadsheet size={16} /> Excel
                  </button>
                </div>
              </div>
            )}

            {/* Crop Options */}
            {(toolSlug === "crop-image" || toolSlug === "passport-photo") &&
              previewUrl && (
                <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="text-lg font-bold mb-4">
                    {toolSlug === "passport-photo"
                      ? t("passport_country")
                      : t("crop_options")}
                  </h3>

                  {toolSlug === "passport-photo" && (
                    <div className="mb-6">
                      <label className="block text-sm text-muted-foreground mb-2">
                        {t("passport_country")}
                      </label>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {COUNTRIES.map((c) => (
                          <button
                            key={c.code}
                            onClick={() => setPassportCountry(c.code)}
                            className={`px-3 py-2 text-left text-xs rounded-lg transition-all border ${passportCountry === c.code ? "bg-primary/20 border-primary text-primary font-medium" : "bg-black/20 border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white"}`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {toolSlug === "crop-image" && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 4 / 3, 16 / 9].map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                                setCropAspect(r);
                                // Resize crop box to match aspect ratio, centered
                                if (imgCropPreviewRef.current) {
                                    const imgRect = imgCropPreviewRef.current.getBoundingClientRect();
                                    let newW = imgRect.width * 0.8;
                                    let newH = newW / r;
                                    
                                    if (newH > imgRect.height * 0.9) {
                                        newH = imgRect.height * 0.8;
                                        newW = newH * r;
                                    }
                                    
                                    const newX = (imgRect.width - newW) / 2;
                                    const newY = (imgRect.height - newH) / 2;
                                    
                                    setImgCropWidth(newW);
                                    setImgCropHeight(newH);
                                    setImgCropX(newX);
                                    setImgCropY(newY);
                                }
                            }}
                            className={`px-3 py-2 text-xs rounded-lg transition-all border ${
                              cropAspect === r
                                ? "bg-primary/20 border-primary text-primary font-medium"
                                : "bg-black/20 border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            {r === 1 ? "1:1" : r === 4 / 3 ? "4:3" : "16:9"}
                          </button>
                        ))}
                        <button
                          onClick={() => setCropAspect(undefined)}
                          className={`px-3 py-2 text-xs rounded-lg transition-all border ${
                            cropAspect === undefined
                              ? "bg-primary/20 border-primary text-primary font-medium"
                              : "bg-black/20 border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          Free
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="relative h-96 w-full bg-black/50 rounded-xl overflow-hidden mb-6 border border-white/10 flex items-center justify-center">
                    {toolSlug === "passport-photo" ? (
                        <Cropper
                        image={previewUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={COUNTRIES.find((c) => c.code === passportCountry)?.aspect || 1}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        />
                    ) : (
                        <div className="relative inline-block">
                             <img
                                ref={imgCropPreviewRef}
                                src={previewUrl}
                                alt="Image Preview"
                                className="max-w-full max-h-[380px] object-contain select-none"
                                draggable={false}
                            />
                            {/* Custom Crop Box */}
                            {imgCropWidth > 0 && imgCropHeight > 0 && (
                                <div
                                    className="absolute border-2 border-primary bg-primary/20 cursor-move group"
                                    style={{
                                        left: `${imgCropX}px`,
                                        top: `${imgCropY}px`,
                                        width: `${imgCropWidth}px`,
                                        height: `${imgCropHeight}px`,
                                    }}
                                    onMouseDown={(e) => {
                                        if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
                                        e.preventDefault();
                                        
                                        const imgRect = imgCropPreviewRef.current!.getBoundingClientRect();
                                        const startX = e.clientX;
                                        const startY = e.clientY;
                                        const startCropX = imgCropX;
                                        const startCropY = imgCropY;

                                        const onMove = (moveEvent: MouseEvent) => {
                                            const dx = moveEvent.clientX - startX;
                                            const dy = moveEvent.clientY - startY;
                                            const newX = Math.max(0, Math.min(imgRect.width - imgCropWidth, startCropX + dx));
                                            const newY = Math.max(0, Math.min(imgRect.height - imgCropHeight, startCropY + dy));
                                            setImgCropX(newX);
                                            setImgCropY(newY);
                                        };

                                        const onUp = () => {
                                            window.removeEventListener("mousemove", onMove);
                                            window.removeEventListener("mouseup", onUp);
                                        };

                                        window.addEventListener("mousemove", onMove);
                                        window.addEventListener("mouseup", onUp);
                                    }}
                                >
                                    {/* Resize Handles */}
                                    {/* Bottom-right */}
                                    <div
                                        className="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-primary border border-white cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ transform: "translate(50%, 50%)" }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            
                                            const imgRect = imgCropPreviewRef.current!.getBoundingClientRect();
                                            const startX = e.clientX;
                                            const startY = e.clientY;
                                            const startWidth = imgCropWidth;
                                            const startHeight = imgCropHeight;
                                            const aspect = cropAspect;

                                            const onMove = (moveEvent: MouseEvent) => {
                                                const dx = moveEvent.clientX - startX;
                                                const dy = moveEvent.clientY - startY;
                                                
                                                let newWidth = Math.max(50, Math.min(imgRect.width - imgCropX, startWidth + dx));
                                                let newHeight = Math.max(50, Math.min(imgRect.height - imgCropY, startHeight + dy));

                                                if (aspect) {
                                                    // Constrain to aspect ratio
                                                    if (newWidth / newHeight > aspect) {
                                                        // Width is too big, adjust width based on height
                                                        newWidth = newHeight * aspect;
                                                    } else {
                                                        // Height is too big, adjust height based on width
                                                        newHeight = newWidth / aspect;
                                                    }
                                                }

                                                setImgCropWidth(newWidth);
                                                setImgCropHeight(newHeight);
                                            };

                                            const onUp = () => {
                                                window.removeEventListener("mousemove", onMove);
                                                window.removeEventListener("mouseup", onUp);
                                            };

                                            window.addEventListener("mousemove", onMove);
                                            window.addEventListener("mouseup", onUp);
                                        }}
                                    />

                                    {/* Info overlay */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded pointer-events-none whitespace-nowrap">
                                        {Math.round(imgCropWidth)} × {Math.round(imgCropHeight)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm text-muted-foreground mb-2">
                      Zoom
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setPreviewUrl(null);
                        setPreviewFile(null);
                        setCrop({ x: 0, y: 0 });
                        setZoom(1);
                      }}
                      className="px-6 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => previewFile && handleFiles([previewFile])}
                      className="flex-1 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {t("crop_btn")}
                    </button>
                  </div>
                </div>
              )}

            {/* Preview & Options for Image Tools */}
            {previewUrl &&
              (toolSlug === "convert-image" ||
                toolSlug === "heic-to-jpg" ||
                toolSlug === "compress-image" ||
                toolSlug === "resize-image" ||
                toolSlug === "upscale-image") && (
                <div className="space-y-6">
                  {/* Preview Card */}
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-64 object-contain rounded-lg shadow-lg mb-4"
                    />
                    <p className="text-sm text-muted-foreground font-mono">
                      {previewFile?.name}
                    </p>
                  </div>

                  {/* Options */}
                  {toolSlug === "convert-image" && (
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <LucideImage size={20} /> Target Format
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {["JPG", "PNG", "WEBP", "PDF"]
                          .filter((fmt) => {
                            if (!previewFile) return true;
                            const ext = previewFile.name
                              .split(".")
                              .pop()
                              ?.toUpperCase();
                            // If source is JPG/JPEG, filter out JPG
                            if (ext === "JPEG") return fmt !== "JPG";
                            return fmt !== ext;
                          })
                          .map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() =>
                                setExtractFormat(fmt.toLowerCase())
                              }
                              className={`px-4 py-2 rounded-lg border transition-all flex item-center justify-center font-medium ${extractFormat === fmt.toLowerCase() ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,243,255,0.2)]" : "border-white/20 text-muted-foreground hover:bg-white/5 hover:border-white/40"}`}
                            >
                              {fmt}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {toolSlug === "heic-to-jpg" && (
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                      <h3 className="text-lg font-bold mb-4">
                        {t("settings")}
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            {t("output_format")}
                          </label>
                          <div className="flex gap-2">
                            {["JPG", "PNG"].map((fmt) => (
                              <button
                                key={fmt}
                                onClick={() =>
                                  setExtractFormat(fmt.toLowerCase())
                                }
                                className={`px-4 py-2 rounded-lg border text-sm ${extractFormat === fmt.toLowerCase() ? "bg-primary text-black border-primary" : "border-white/20 text-muted-foreground"}`}
                              >
                                {fmt}
                              </button>
                            ))}
                          </div>
                        </div>
                        {extractFormat === "jpg" && (
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              {t("quality")} ({heicQuality}%)
                            </label>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={heicQuality}
                              onChange={(e) =>
                                setHeicQuality(Number(e.target.value))
                              }
                              className="w-full accent-primary"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {toolSlug === "compress-image" && (
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                      <h3 className="text-lg font-bold mb-4">
                        Compression Level
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { l: 0, t: "Low", d: "High Quality", tk: "comp_low" },
                          { l: 1, t: "Medium", d: "Balanced", tk: "comp_med" },
                          { l: 2, t: "High", d: "Small Size", tk: "comp_high" },
                        ].map((opt) => (
                          <button
                            key={opt.l}
                            onClick={() => setCompressionLevel(opt.l)}
                            className={`p-3 rounded-lg border text-left ${compressionLevel === opt.l ? "bg-primary/20 border-primary text-primary" : "border-white/20 hover:bg-white/5"}`}
                          >
                            <div className="font-bold text-sm">
                              {opt.tk ? t(opt.tk).split(" (")[0] : opt.t}
                            </div>
                            <div className="text-[10px] opacity-70">
                              {opt.tk
                                ? t(opt.tk).split(" (")[1].replace(")", "")
                                : opt.d}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {toolSlug === "resize-image" && (
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10 w-full mb-6">
                      <h3 className="text-lg font-bold mb-4">
                        {t("resize_settings")}
                      </h3>

                      <div className="flex gap-4 mb-6">
                        <button
                          onClick={() => setResizeMode("pixel")}
                          className={`flex-1 py-2 rounded-lg border transition-all ${resizeMode === "pixel" ? "bg-primary text-black border-primary" : "border-white/20 text-muted-foreground"}`}
                        >
                          {t("resize_px")}
                        </button>
                        <button
                          onClick={() => setResizeMode("percentage")}
                          className={`flex-1 py-2 rounded-lg border transition-all ${resizeMode === "percentage" ? "bg-primary text-black border-primary" : "border-white/20 text-muted-foreground"}`}
                        >
                          {t("resize_pct")}
                        </button>
                      </div>

                      {resizeMode === "pixel" ? (
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground mb-1 block">
                              {t("resize_width")}
                            </label>
                            <input
                              type="number"
                              value={resizeWidth}
                              onChange={(e) =>
                                setResizeWidth(Number(e.target.value))
                              }
                              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Height (px)
                            </label>
                            <input
                              type="number"
                              value={resizeHeight}
                              onChange={(e) =>
                                setResizeHeight(Number(e.target.value))
                              }
                              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Scale: {resizePercentage}%
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="200"
                            value={resizePercentage}
                            onChange={(e) =>
                              setResizePercentage(Number(e.target.value))
                            }
                            className="w-full accent-primary"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upscale Factor */}
                  {toolSlug === "upscale-image" && (
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Maximize2 size={20} /> Scale Factor
                      </h3>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setUpscaleFactor(2)}
                          className={`flex-1 py-3 rounded-lg border transition-all font-medium ${
                            upscaleFactor === 2
                              ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,243,255,0.2)]"
                              : "border-white/20 text-muted-foreground hover:bg-white/5 hover:border-white/40"
                          }`}
                        >
                          2x
                        </button>
                        <button
                          onClick={() => setUpscaleFactor(4)}
                          className={`flex-1 py-3 rounded-lg border transition-all font-medium ${
                            upscaleFactor === 4
                              ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,243,255,0.2)]"
                              : "border-white/20 text-muted-foreground hover:bg-white/5 hover:border-white/40"
                          }`}
                        >
                          4x
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        {upscaleFactor === 2
                          ? "Doubles image dimensions (2x width, 2x height)"
                          : "Quadruples image dimensions (4x width, 4x height)"}
                      </p>
                    </div>
                  )}

                  {/* HEIC Quality */}
                  {toolSlug === "heic-to-jpg" && (
                    <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                      <label className="text-xs text-muted-foreground mb-1 block">
                        {t("heic_quality")}: {Math.round(heicQuality * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={heicQuality}
                        onChange={(e) =>
                          setHeicQuality(parseFloat(e.target.value))
                        }
                        className="w-full accent-primary"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setPreviewUrl(null);
                        setPreviewFile(null);
                        setStagedFiles([]);
                      }}
                      className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-semibold transition-colors w-1/3"
                    >
                      {t("change_file")}
                    </button>
                    <button
                      onClick={() => {
                        // Process all staged files if available, otherwise single previewFile
                        const filesToProcess = stagedFiles.length > 0
                          ? stagedFiles.map((f) => f.file)
                          : previewFile ? [previewFile] : [];
                        if (filesToProcess.length > 0) {
                          handleFiles(filesToProcess);
                        }
                      }}
                      className="flex-1 px-6 py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.2)]"
                    >
                      <Zap size={20} />
                      {stagedFiles.length > 1
                        ? `Process ${stagedFiles.length} Images`
                        : toolSlug === "convert-image"
                        ? t("convert_now")
                        : t("process_image")}
                    </button>
                  </div>
                </div>
              )}

            {/* Existing Render Logic for Watermark Preview (simplified here, assume previous block unchanged) - actually I need not to break it. */}
            {/* The logic below handles FileUploader visibility */}

            {/* File Uploader - Hide if previewUrl exists for any tool that uses preview */}
            {/* Removed duplicate uploader block from here as it is now handled at the top of the component */}
          </motion.div>
        )}

        {/* Uploading State */}
        {status === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <div className="relative inline-block mb-6">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-primary/20 blur-xl rounded-full animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">{t("status_uploading")}</h3>
            <p className="text-muted-foreground">{t("wait_upload")}</p>
          </motion.div>
        )}

        {/* Processing State */}
        {status === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <div className="relative inline-block mb-6">
              <svg
                className="animate-spin text-primary w-20 h-20"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {t("status_processing")}
            </h3>
            <p className="text-muted-foreground mb-8">{t("wait_process")}</p>

            <div className="inline-flex gap-4">
              <button
                onClick={handleCancel}
                className="bg-red-500/10 border border-red-500/50 text-red-500 px-6 py-2 rounded-full hover:bg-red-500/20 transition-all font-semibold"
              >
                {t("cancel_op")}
              </button>
            </div>

            <div className="mt-8 mx-auto max-w-sm bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-left flex items-start gap-4">
              <Lock className="text-yellow-500 shrink-0 mt-1" />
              <div>
                <h4 className="text-yellow-500 font-bold text-sm mb-1">
                  {t("privacy_badge")}
                </h4>
                <p className="text-yellow-500/80 text-xs">
                  {t("desktop_app_promo")}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Complete State */}
        {status === "complete" && (downloadUrl || extractPaletteResult) && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            {extractPaletteResult ? (
              <div className="text-left w-full">
                <h3 className="text-xl font-bold mb-6 text-center">
                  {t("extract_palette")}
                </h3>
                {Object.entries(extractPaletteResult).map(([file, colors]) => (
                  <div key={file} className="mb-6">
                    <p className="text-sm text-muted-foreground mb-2 text-center">
                      {file}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {colors.map((c, i) => (
                        <div key={i} className="group relative">
                          <div
                            className="w-16 h-16 rounded-xl shadow-lg cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: c.hex }}
                            onClick={() => {
                              navigator.clipboard.writeText(c.hex);
                              // Could add toast here
                            }}
                          />
                          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {c.hex}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
                <h3 className="text-2xl font-bold mb-2 text-green-400">
                  {t("status_complete")}
                </h3>
                <p className="text-muted-foreground mb-8 text-sm max-w-md mx-auto">
                  {fileName}
                </p>

                <div className="flex justify-center gap-4">
                  <a
                    href={downloadUrl!}
                    download={fileName || "processed_file"}
                    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black px-8 py-4 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(74,222,128,0.2)] transition-all hover:scale-105"
                  >
                    {toolSlug === "extract-images-from-pdf" ||
                    toolSlug === "split-pdf" ? (
                      <Archive size={20} />
                    ) : (
                      <Download size={20} />
                    )}
                    {(toolSlug === "extract-images-from-pdf" ||
                      toolSlug === "split-pdf") &&
                    !fileName?.endsWith(".PDF")
                      ? t("download_zip")
                      : t("download")}
                  </a>
                </div>
              </>
            )}

            <button
              onClick={() => {
                setStatus("idle");
                setDownloadUrl(null);
                setExtractPaletteResult(null);
                setPreviewUrl(null);
                setPreviewFile(null);
              }}
              className="mt-8 text-sm text-muted-foreground hover:text-white underline"
            >
              {t("try_again")}
            </button>
          </motion.div>
        )}

        {/* Error State */}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <ShieldAlert className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-2 text-red-500">
              {t("status_error")}
            </h3>
            <p className="text-red-200/80 mb-8 max-w-lg mx-auto bg-red-950/30 p-4 rounded-lg border border-red-500/20 text-sm whitespace-pre-wrap">
              {errorMessage || "An unexpected error occurred."}
            </p>

            <button
              onClick={() => setStatus("idle")}
              className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              {t("try_again")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
