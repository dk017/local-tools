"use client";

import { useState, useEffect, useRef } from "react";
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

  // Watermark State
  const [watermarkType, setWatermarkType] = useState<"text" | "image">("text");
  const [watermarkText, setWatermarkText] = useState<string>("CONFIDENTIAL");
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.5);
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkColor, setWatermarkColor] = useState<string>("#000000");
  const [watermarkFontSize, setWatermarkFontSize] = useState<number>(60);
  const [watermarkPosition, setWatermarkPosition] = useState<string>("center");
  const [watermarkPosPercent, setWatermarkPosPercent] = useState({
    x: 0.5,
    y: 0.5,
  });

  // Crop State (Visual)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewParams, setPreviewParams] = useState<any>({});
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
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

  // Crop State
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const [cropWidth, setCropWidth] = useState<number>(500);
  const [cropHeight, setCropHeight] = useState<number>(500);

  // Studio State
  const [studioBackground, setStudioBackground] = useState<string | null>(null);
  const [studioDim, setStudioDim] = useState({ w: 800, h: 600 });
  const [extractFormat, setExtractFormat] = useState("csv");
  // Advanced Tools State
  const [redactText, setRedactText] = useState("");
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState("");
  const [pdfPassword, setPdfPassword] = useState("");
  const [heicQuality, setHeicQuality] = useState(95);
  const [compressionLevel, setCompressionLevel] = useState(1);

  const [resizeMode, setResizeMode] = useState<"pixel" | "percentage">("pixel");
  const [resizeWidth, setResizeWidth] = useState<number>(0);
  const [resizeHeight, setResizeHeight] = useState<number>(0);
  const [resizePercentage, setResizePercentage] = useState<number>(50);
  const [extractPaletteResult, setExtractPaletteResult] = useState<Record<
    string,
    { rgb: number[]; hex: string }[]
  > | null>(null);

  // PDF Crop State
  const [pdfCropX, setPdfCropX] = useState<number>(0);
  const [pdfCropY, setPdfCropY] = useState<number>(0);
  const [pdfCropWidth, setPdfCropWidth] = useState<number | null>(null);
  const [pdfCropHeight, setPdfCropHeight] = useState<number | null>(null);
  const [pdfCropPages, setPdfCropPages] = useState<string>("");

  // PDF Organize State
  const [pageOrder, setPageOrder] = useState<string>("");

  // PDF Rotate State
  const [rotationAngle, setRotationAngle] = useState<number>(0);

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

  // Generate cache key from params
  const getCacheKey = (params: any): string => {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join("|");
    return `${previewFile?.name || ""}|${toolSlug}|${sortedParams}`;
  };

  // Fetch preview with parameters
  const fetchPreview = async (params: any, debounceMs: number = 300) => {
    if (!previewFile) return;
    
    // Check cache first
    const cacheKey = getCacheKey(params);
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
      formData.append("files", previewFile);
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
        } else if (data.errors && data.errors.length > 0) {
          console.error("Preview error:", data.errors);
        }
      } catch (e) {
        console.error("Preview failed", e);
      } finally {
        setIsLoadingPreview(false);
      }
    }, debounceMs);
  };

  const handleFileSelect = (files: File[]) => {
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

    if (
      (toolSlug === "crop-image" ||
        toolSlug === "passport-photo" ||
        toolSlug === "convert-image" ||
        toolSlug === "heic-to-jpg" ||
        toolSlug === "compress-image" ||
        toolSlug === "resize-image") &&
      files.length > 0
    ) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
        setPreviewFile(file);

        // Init resize dims
        if (toolSlug === "resize-image") {
          const img = new Image();
          img.onload = () => {
            setResizeWidth(img.width);
            setResizeHeight(img.height);
          };
          img.src = reader.result as string;
        }
      };
      reader.readAsDataURL(file);
      // Return early to prevent auto-upload
      return;
      // Return early to prevent auto-upload
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

    // Auto-preview for tools that need preview
    if (
      (toolSlug === "watermark-pdf" ||
        toolSlug === "watermark-image" ||
        toolSlug === "extract-palette" ||
        toolSlug === "protect-pdf" ||
        toolSlug === "unlock-pdf" ||
        toolSlug === "pdf-signer" ||
        toolSlug === "pdf-redactor" ||
        toolSlug === "rotate-pdf" ||
        toolSlug === "crop-pdf" ||
        toolSlug === "grayscale-pdf") &&
      files.length > 0
    ) {
      const file = files[0];
      if (toolSlug === "watermark-image" || toolSlug === "extract-palette") {
        // Client-side preview for image
        const reader = new FileReader();
        reader.onload = () => {
          setPreviewUrl(reader.result as string);
          setPreviewFile(file);
        };
        reader.readAsDataURL(file);
      } else if (
        toolSlug === "protect-pdf" ||
        toolSlug === "unlock-pdf" ||
        toolSlug === "pdf-signer" ||
        toolSlug === "pdf-redactor"
      ) {
        // No visual preview, but stage the file and wait for user to click Process
        setPreviewFile(file);
        // We don't set previewUrl, effectively kept null
      } else {
        // Server-side preview for PDF
        setPreviewFile(file);
        // Load initial preview based on tool type
        if (toolSlug === "rotate-pdf") {
          fetchPreview({ angle: 0 }, 0); // No debounce for initial load
        } else if (toolSlug === "crop-pdf") {
          // Load initial preview without crop (will show full page)
          fetchPreview({}, 0);
        } else if (toolSlug === "grayscale-pdf") {
          fetchPreview({}, 0);
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
    handleFiles(files);
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFiles = async (files: File[]) => {
    // If we are in watermark mode and just loaded a preview, DO NOT auto-process
    if (
      (toolSlug === "watermark-pdf" || toolSlug === "watermark-image") &&
      !previewUrl
    ) {
      return;
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
      if (watermarkType === "text") {
        formData.append("text", watermarkText);
        formData.append("color", watermarkColor);
        formData.append("font_size", watermarkFontSize.toString());
        formData.append("position", watermarkPosition);
        formData.append("x", watermarkPosPercent.x.toString());
        formData.append("y", watermarkPosPercent.y.toString());
      } else if (watermarkFile) {
        formData.append("watermark_file", watermarkFile);
        formData.append("position", watermarkPosition);
        formData.append("x", watermarkPosPercent.x.toString());
        formData.append("y", watermarkPosPercent.y.toString());
      }
    }

    // Append Crop Params
    if (toolSlug === "crop-image" || toolSlug === "passport-photo") {
      const cropBox = {
        x: cropX || 0,
        y: cropY || 0,
        width: cropWidth || 0,
        height: cropHeight || 0,
      };
      formData.append("crop_box", JSON.stringify(cropBox));
    }

    if (toolSlug === "extract-tables") {
      formData.append("output_format", extractFormat);
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

    if (toolSlug === "protect-pdf" || toolSlug === "unlock-pdf") {
      formData.append("password", pdfPassword);
    }

    if (toolSlug === "pdf-signer") {
      if (certFile) formData.append("cert_file", certFile);
      formData.append("password", certPassword);
    }

    if (toolSlug === "pdf-redactor") {
      formData.append("text", redactText);
    }

    if (toolSlug === "resize-image") {
      formData.append("resize_mode", resizeMode);
      formData.append("width", resizeWidth.toString());
      formData.append("height", resizeHeight.toString());
      formData.append("percentage", resizePercentage.toString());
    }

    if (toolSlug === "passport-photo") {
      formData.append("country", passportCountry);
    }

    // Advanced Params
    if (toolSlug === "pdf-redactor") {
      formData.append("text", redactText);
    }
    if (toolSlug === "pdf-signer") {
      formData.append("password", certPassword);
      if (certFile) formData.append("cert_file", certFile);
    }
    if (toolSlug === "heic-to-jpg") {
      formData.append("quality", heicQuality.toString());
    }

    // PDF Rotate Params
    if (toolSlug === "rotate-pdf") {
      formData.append("angle", rotationAngle.toString());
    }

    // PDF Crop Params
    if (toolSlug === "crop-pdf") {
      formData.append("x", pdfCropX.toString());
      formData.append("y", pdfCropY.toString());
      if (pdfCropWidth !== null)
        formData.append("width", pdfCropWidth.toString());
      if (pdfCropHeight !== null)
        formData.append("height", pdfCropHeight.toString());
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
        toolSlug === "extract-images-from-pdf"
      ) {
        // Usually returns zip or first image, server handles naming usually, but for output logic:
        // Server currently returns first file. If image:
        outputName = `${nameWithoutExt}_converted.png`; // Fallback, usually server sets this
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

      // Set timeout for 120 seconds (2 minutes)
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 120000);

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
          throw new Error(
            "Request timed out (took longer than 2 mins) or was cancelled."
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
          if (jsonErr.detail) errText = jsonErr.detail;
        } catch {
          /* ignore json parse error */
        }

        throw new Error(
          `Processing failed: ${res.status} ${res.statusText} - ${errText}`
        );
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);

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

        // Check for ZIP files by content type or tool type
        if (contentType === "application/zip" || 
            contentType === "application/x-zip-compressed" ||
            toolSlug === "split-pdf" ||
            toolSlug === "extract-images-from-pdf" ||
            toolSlug === "pdf-to-images") {
          filename = `processed_${nameWithoutExt}.zip`;
        } else if (toolSlug === "images-to-pdf" || toolSlug === "merge-pdf") {
          filename = `processed_${nameWithoutExt}.pdf`;
        } else if (toolSlug === "pdf-to-word") {
          filename = `processed_${nameWithoutExt}.docx`;
        }
      }

      // Final check: if filename doesn't have extension but we know it should be ZIP
      if ((toolSlug === "split-pdf" || 
           toolSlug === "extract-images-from-pdf" || 
           toolSlug === "pdf-to-images") && 
          !filename.toLowerCase().endsWith(".zip")) {
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
                accept={acceptedFileTypes}
                maxFiles={10}
                className="h-14 p-0 border-white/20 hover:border-primary/50"
              />
            </div>
            <button
              onClick={() => handleFiles(stagedFiles.map((f) => f.file))}
              className="w-1/2 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,243,255,0.2)]"
            >
              {toolSlug === "merge-pdf" ? "Merge PDF" : "Convert to PDF"}
            </button>
          </div>
        </div>
      )}

      {/* Default Uploader (Hidden if staged files exist or preview is active) */}
      {stagedFiles.length === 0 &&
        status !== "complete" &&
        status !== "processing" &&
        status !== "uploading" &&
        !(previewFile && (toolSlug === "rotate-pdf" || toolSlug === "crop-pdf")) && (
          <div>
              <FileUploader
              onFilesSelected={handleFileSelect}
              accept={acceptedFileTypes}
              maxFiles={10}
            />
            {/* File Size Limit Info (Web Version Only) */}
            {typeof window !== 'undefined' && !('__TAURI__' in window) && (
              <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10 text-sm text-muted-foreground">
                <p className="font-semibold mb-1">Web Version File Size Limits:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {acceptedFileTypes && Object.keys(acceptedFileTypes).some(key => key.startsWith('image/')) ? (
                    <li>Images: Maximum 3MB per file</li>
                  ) : null}
                  {acceptedFileTypes && Object.keys(acceptedFileTypes).some(key => key === 'application/pdf') ? (
                    <li>PDFs: Maximum 5MB per file</li>
                  ) : null}
                  <li className="text-primary/80">💡 For larger files, use our desktop app (unlimited file sizes)</li>
                </ul>
              </div>
            )}
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
            {toolSlug === "extract-tables" && (
              <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold mb-4">Output Format</h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => setExtractFormat("csv")}
                    className={`px-4 py-2 rounded border transition-colors flex items-center gap-2 ${extractFormat === "csv" ? "bg-primary text-black border-primary" : "border-white/20 text-muted-foreground hover:bg-white/5"}`}
                  >
                    <FileSpreadsheet size={16} /> CSV (Separate Files)
                  </button>
                  <button
                    onClick={() => setExtractFormat("xlsx")}
                    className={`px-4 py-2 rounded border transition-colors flex items-center gap-2 ${extractFormat === "xlsx" ? "bg-primary text-black border-primary" : "border-white/20 text-muted-foreground hover:bg-white/5"}`}
                  >
                    <FileSpreadsheet size={16} /> Excel (One File)
                  </button>
                </div>
              </div>
            )}

            {/* Redactor Options */}
            {toolSlug === "pdf-redactor" && (
              <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Eraser size={20} /> {t("redact_settings")}
                </h3>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {t("redact_label")}
                  </label>
                  <input
                    type="text"
                    value={redactText}
                    onChange={(e) => setRedactText(e.target.value)}
                    placeholder="e.g. Confidential"
                    className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                  />
                </div>
              </div>
            )}

            {toolSlug === "pdf-signer" && (
              <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <PenTool size={20} /> {t("sign_settings")}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("sign_cert")}
                    </label>
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                      className="w-full bg-black/20 text-sm border border-white/10 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("sign_pass")}
                    </label>
                    <input
                      type="password"
                      value={certPassword}
                      onChange={(e) => setCertPassword(e.target.value)}
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
                    placeholder="Enter password to protect PDF"
                    className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                  />
                </div>

                {previewFile && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-muted-foreground mb-4">
                      {t("selected")}:{" "}
                      <span className="text-white">{previewFile.name}</span>
                    </div>
                    <button
                      onClick={() => handleFiles([previewFile])}
                      className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                      disabled={!pdfPassword}
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
                    placeholder="Enter password to unlock PDF"
                    className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                  />
                </div>

                {previewFile && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-muted-foreground mb-4">
                      {t("selected")}:{" "}
                      <span className="text-white">{previewFile.name}</span>
                    </div>
                    <button
                      onClick={() => handleFiles([previewFile])}
                      className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                      disabled={!pdfPassword}
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

            {/* Crop PDF Options with Preview */}
            {toolSlug === "crop-pdf" && (
              <div className="mb-8">
                {previewUrl && previewFile ? (
                  <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Crop size={20} /> Crop PDF
                    </h3>
                    
                    {/* Preview Display */}
                    <div className="mb-6 relative bg-black/20 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
                      {isLoadingPreview ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Updating preview...</span>
                        </div>
                      ) : (
                        <div className="relative">
                          <img
                            src={previewUrl}
                            alt="PDF Preview"
                            className="max-w-full max-h-[400px] object-contain rounded-lg shadow-lg"
                          />
                          {/* Crop overlay indicator */}
                          {(pdfCropWidth !== null && pdfCropHeight !== null) && (
                            <div
                              className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
                              style={{
                                left: `${(pdfCropX / (previewUrl ? 800 : 1)) * 100}%`,
                                top: `${(pdfCropY / (previewUrl ? 600 : 1)) * 100}%`,
                                width: `${(pdfCropWidth / (previewUrl ? 800 : 1)) * 100}%`,
                                height: `${(pdfCropHeight / (previewUrl ? 600 : 1)) * 100}%`,
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Crop Controls */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            X (Left Margin)
                          </label>
                          <input
                            type="number"
                            value={pdfCropX}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setPdfCropX(val);
                              fetchPreview({ x: val, y: pdfCropY, width: pdfCropWidth, height: pdfCropHeight });
                            }}
                            placeholder="0"
                            min="0"
                            className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Y (Top Margin)
                          </label>
                          <input
                            type="number"
                            value={pdfCropY}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setPdfCropY(val);
                              fetchPreview({ x: pdfCropX, y: val, width: pdfCropWidth, height: pdfCropHeight });
                            }}
                            placeholder="0"
                            min="0"
                            className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Width *
                          </label>
                          <input
                            type="number"
                            value={pdfCropWidth || ""}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              setPdfCropWidth(val);
                              fetchPreview({ x: pdfCropX, y: pdfCropY, width: val, height: pdfCropHeight });
                            }}
                            placeholder="Required"
                            min="1"
                            className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Height *
                          </label>
                          <input
                            type="number"
                            value={pdfCropHeight || ""}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              setPdfCropHeight(val);
                              fetchPreview({ x: pdfCropX, y: pdfCropY, width: pdfCropWidth, height: val });
                            }}
                            placeholder="Required"
                            min="1"
                            className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Pages (Optional)
                        </label>
                        <input
                          type="text"
                          value={pdfCropPages}
                          onChange={(e) => setPdfCropPages(e.target.value)}
                          placeholder="1-5 or 1,3,5 (leave empty for all)"
                          className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Comma separated or ranges. Leave empty to crop all pages.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10">
                      <div className="text-xs text-muted-foreground mb-4">
                        {t("selected")}: <span className="text-white">{previewFile.name}</span>
                      </div>
                      <button
                        onClick={() => previewFile && handleFiles([previewFile])}
                        disabled={pdfCropWidth === null || pdfCropHeight === null}
                        className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Crop size={16} /> Apply Crop
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-lg font-bold mb-4">Crop Settings</h3>
                    <div className="text-center text-muted-foreground py-8">
                      Upload a PDF file to see preview and crop options
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rotate PDF Options with Preview */}
            {toolSlug === "rotate-pdf" && (
              <div className="mb-8">
                {previewUrl && previewFile ? (
                  <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <RotateCw size={20} /> Rotate PDF
                    </h3>
                    
                    {/* Preview Display */}
                    <div className="mb-6 relative bg-black/20 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
                      {isLoadingPreview ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Updating preview...</span>
                        </div>
                      ) : (
                        <img
                          src={previewUrl}
                          alt="PDF Preview"
                          className="max-w-full max-h-[400px] object-contain rounded-lg shadow-lg"
                        />
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
                ) : (
                  <div className="p-6 bg-white/5 rounded-xl border border-white/10 text-center text-muted-foreground">
                    Upload a PDF file to see preview and rotate options
                  </div>
                )}
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
                    onChange={(e) => setPageOrder(e.target.value)}
                    placeholder="3,1,2,5,4 or 1-5,10,8-9"
                    className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use commas for individual pages (e.g., "3,1,2") or dashes
                    for ranges (e.g., "1-5,10,8-9").
                  </p>
                </div>
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

                  <div className="relative h-96 w-full bg-black/50 rounded-xl overflow-hidden mb-6 border border-white/10">
                    <Cropper
                      image={previewUrl}
                      crop={crop}
                      zoom={zoom}
                      aspect={
                        toolSlug === "passport-photo"
                          ? COUNTRIES.find((c) => c.code === passportCountry)
                              ?.aspect || 1
                          : undefined
                      }
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                    />
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

            {/* Watermark Options - Inputs */}
            {(toolSlug === "watermark-pdf" ||
              toolSlug === "watermark-image") && (
              <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Type size={20} /> {t("watermark_settings")}
                </h3>

                {/* Type Selection */}
                <div className="flex gap-2 p-1 bg-black/20 rounded-lg mb-6">
                  <button
                    onClick={() => setWatermarkType("text")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${watermarkType === "text" ? "bg-primary text-black shadow-lg" : "text-gray-400 hover:text-white"}`}
                  >
                    {t("wm_type_text")}
                  </button>
                  <button
                    onClick={() => setWatermarkType("image")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${watermarkType === "image" ? "bg-primary text-black shadow-lg" : "text-gray-400 hover:text-white"}`}
                  >
                    {t("wm_type_image")}
                  </button>
                </div>

                {watermarkType === "text" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        {t("wm_text_label")}
                      </label>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10 focus:border-primary outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          {t("wm_opacity")}
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.1"
                          value={watermarkOpacity}
                          onChange={(e) =>
                            setWatermarkOpacity(parseFloat(e.target.value))
                          }
                          className="w-full accent-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          {t("wm_size")}
                        </label>
                        <input
                          type="number"
                          value={watermarkFontSize}
                          onChange={(e) =>
                            setWatermarkFontSize(parseInt(e.target.value))
                          }
                          className="w-full bg-black/20 rounded py-2 px-3 text-sm border border-white/10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        {t("wm_color")}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={watermarkColor}
                          onChange={(e) => setWatermarkColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-none"
                        />
                        <span className="text-xs font-mono opacity-50">
                          {watermarkColor}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="block w-full border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:bg-white/5 cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          e.target.files && setWatermarkFile(e.target.files[0])
                        }
                      />
                      <LucideImage className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <span className="text-xs text-muted-foreground">
                        {watermarkFile
                          ? watermarkFile.name
                          : t("wm_upload_logo")}
                      </span>
                    </label>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        {t("wm_opacity")}
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={watermarkOpacity}
                        onChange={(e) =>
                          setWatermarkOpacity(parseFloat(e.target.value))
                        }
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                )}

                {/* Position Grid */}
                <div className="mt-4">
                  <label className="text-xs text-muted-foreground mb-2 block">
                    {t("wm_position")}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      "top-left",
                      "top-center",
                      "top-right",
                      "center-left",
                      "center",
                      "center-right",
                      "bottom-left",
                      "bottom-center",
                      "bottom-right",
                    ].map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setWatermarkPosition(pos)}
                        className={`h-8 rounded border ${watermarkPosition === pos ? "bg-primary border-primary" : "border-white/10 hover:bg-white/5"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Watermark Preview (Consolidated) */}
            {(toolSlug === "watermark-pdf" || toolSlug === "watermark-image") &&
              previewUrl && (
                <>
                  <div className="mb-8 relative border border-white/20 rounded-xl overflow-hidden bg-black/50 select-none flex items-center justify-center min-h-[400px]">
                    {/* Preview Background */}
                    <img
                      src={previewUrl}
                      className="w-full h-auto object-contain max-h-[600px] pointer-events-none"
                      alt="Preview"
                      id="watermark-preview-img"
                    />

                    {/* Watermark Overlay Logic */}
                    <div
                      className="absolute cursor-move border border-primary/50 hover:border-primary bg-black/10 transition-colors"
                      style={{
                        left: `${watermarkPosPercent.x * 100}%`,
                        top: `${watermarkPosPercent.y * 100}%`,
                        transform: "translate(-50%, -50%)",
                        userSelect: "none",
                      }}
                      onMouseDown={(e) => {
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
                          let newX = Math.max(
                            0,
                            Math.min(1, startPosX + percentDx)
                          );
                          let newY = Math.max(
                            0,
                            Math.min(1, startPosY + percentDy)
                          );
                          setWatermarkPosPercent({ x: newX, y: newY });
                          setWatermarkPosition("custom");
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
                          style={{
                            fontSize: `${watermarkFontSize}px`,
                            color: watermarkColor,
                            opacity: watermarkOpacity,
                            whiteSpace: "nowrap",
                            padding: "8px",
                            textShadow: "0 0 2px rgba(0,0,0,0.5)",
                            fontFamily: "Arial, sans-serif",
                          }}
                        >
                          {watermarkText}
                        </div>
                      ) : (
                        watermarkFile && (
                          <div style={{ opacity: watermarkOpacity }}>
                            <img
                              src={URL.createObjectURL(watermarkFile)}
                              className="max-h-32 object-contain"
                              alt="Watermark"
                            />
                          </div>
                        )
                      )}
                    </div>
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded">
                      Preview Mode (Drag to move)
                    </div>
                  </div>

                  <div className="flex gap-4 mb-8">
                    <button
                      onClick={() => {
                        setPreviewUrl(null);
                        setPreviewFile(null);
                        setWatermarkPosPercent({ x: 0.5, y: 0.5 });
                      }}
                      className="px-6 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => previewFile && handleFiles([previewFile])}
                      className="flex-1 px-6 py-2 rounded-lg bg-primary text-black font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Apply Watermark
                    </button>
                  </div>
                </>
              )}

            {/* Preview & Options for Image Tools */}
            {previewUrl &&
              (toolSlug === "convert-image" ||
                toolSlug === "heic-to-jpg" ||
                toolSlug === "compress-image" ||
                toolSlug === "resize-image") && (
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
                      }}
                      className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-semibold transition-colors w-1/3"
                    >
                      {t("change_file")}
                    </button>
                    <button
                      onClick={() => previewFile && handleFiles([previewFile])}
                      className="flex-1 px-6 py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.2)]"
                    >
                      <Zap size={20} />
                      {toolSlug === "convert-image"
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
