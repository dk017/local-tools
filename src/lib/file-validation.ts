import { FileAsset } from './file-picker';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Get the file extension from a file name or path
 */
const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Get the maximum number of files allowed for a tool mode
 */
const getMaxFiles = (mode: string): number => {
  // Special case: diff requires exactly 2 files
  if (mode === 'diff') {
    return 2;
  }
  
  // Single-file tools
  const singleFileTools = [
    'split',
    'compress',
    'pdf_to_word',
    'pdf_to_images',
    'protect',
    'unlock',
    'extract_tables',
    'rotate',
    'watermark',
    'grayscale',
    'repair',
    'scrub',
    'redact',
    'sign',
    'optimize',
    'word_to_pdf',
    'powerpoint_to_pdf',
    'excel_to_pdf',
    'html_to_pdf',
    'ocr_pdf',
    'pdf_to_pdfa',
    'crop',
    'organize',
    'delete_pages',
    'page_numbers',
    'extract_text',
    'remove_metadata',
    'extract_images_from_pdf',
    'flatten',
    // Image tools
    'passport',
    'icon',
    'palette',
    'crop', // image crop
    'heic_to_jpg',
    'design',
    'grid',
  ];
  
  return singleFileTools.includes(mode) ? 1 : 10;
};

/**
 * Get the expected file type name for error messages
 */
const getFileTypeName = (mode: string): string => {
  if (mode.includes('word') || mode === 'word_to_pdf') {
    return 'Word document';
  } else if (mode.includes('powerpoint') || mode === 'powerpoint_to_pdf') {
    return 'PowerPoint presentation';
  } else if (mode.includes('excel') || mode === 'excel_to_pdf') {
    return 'Excel spreadsheet';
  } else if (mode.includes('html') || mode === 'html_to_pdf') {
    return 'HTML file';
  } else if (mode.includes('heic') || mode === 'heic_to_jpg') {
    return 'HEIC image';
  } else if (mode === 'images_to_pdf') {
    return 'image';
  } else if (mode.includes('pdf') || mode === 'diff') {
    return 'PDF';
  } else {
    return 'image';
  }
};

/**
 * Validate file type by extension
 */
const validateFileType = (file: FileAsset, mode: string): boolean => {
  const extension = getFileExtension(file.name);
  
  // PDF tools
  const isPdfTool = mode.includes('pdf') || 
                    mode === 'diff' ||
                    mode === 'extract_tables' ||
                    mode === 'extract_text' ||
                    mode === 'extract_images_from_pdf' ||
                    mode === 'remove_metadata' ||
                    mode === 'flatten' ||
                    mode === 'organize' ||
                    mode === 'delete_pages' ||
                    mode === 'page_numbers' ||
                    mode === 'rotate' ||
                    mode === 'watermark' ||
                    mode === 'grayscale' ||
                    mode === 'repair' ||
                    mode === 'scrub' ||
                    mode === 'redact' ||
                    mode === 'sign' ||
                    mode === 'optimize' ||
                    mode === 'protect' ||
                    mode === 'unlock' ||
                    mode === 'compress' ||
                    mode === 'split' ||
                    mode === 'crop' ||
                    mode === 'ocr_pdf' ||
                    mode === 'pdf_to_pdfa' ||
                    mode === 'pdf_to_word' ||
                    mode === 'pdf_to_images';
  
  // Image tools
  const isImageTool = mode === 'convert' ||
                     mode === 'resize' ||
                     mode === 'compress' ||
                     mode === 'passport' ||
                     mode === 'watermark' ||
                     mode === 'icon' ||
                     mode === 'palette' ||
                     mode === 'crop' ||
                     mode === 'remove_bg' ||
                     mode === 'design' ||
                     mode === 'metadata' ||
                     mode === 'grid';
  
  // Office tools
  const isWordTool = mode === 'word_to_pdf';
  const isPowerPointTool = mode === 'powerpoint_to_pdf';
  const isExcelTool = mode === 'excel_to_pdf';
  const isHtmlTool = mode === 'html_to_pdf';
  const isHeicTool = mode === 'heic_to_jpg';
  
  if (isPdfTool) {
    return extension === 'pdf';
  }
  
  if (isImageTool) {
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(extension);
  }
  
  if (isWordTool) {
    return ['docx', 'doc'].includes(extension);
  }
  
  if (isPowerPointTool) {
    return ['pptx', 'ppt'].includes(extension);
  }
  
  if (isExcelTool) {
    return ['xlsx', 'xls'].includes(extension);
  }
  
  if (isHtmlTool) {
    return ['html', 'htm'].includes(extension);
  }
  
  if (isHeicTool) {
    return ['heic', 'heif'].includes(extension);
  }
  
  if (mode === 'images_to_pdf') {
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(extension);
  }
  
  return true; // Unknown mode, allow
};

/**
 * Validate files for a given tool mode
 */
export const validateFiles = (
  mode: string,
  files: FileAsset[],
  settings?: {
    password?: string;
    pageOrder?: string;
    deletePages?: string;
    redactText?: string;
    certFile?: FileAsset | null;
    cropWidth?: number | null;
    cropHeight?: number | null;
    splitRange?: string;
    splitMode?: string;
  }
): ValidationResult => {
  // File count validation
  const maxFiles = getMaxFiles(mode);
  
  if (maxFiles === 1 && files.length > 1) {
    return {
      valid: false,
      error: `This tool only accepts one file. Please select a single ${getFileTypeName(mode)} file.`
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
  
  if (files.length === 0) {
    return {
      valid: false,
      error: "Please select at least one file to process."
    };
  }
  
  // File type validation
  for (const file of files) {
    if (!validateFileType(file, mode)) {
      const expectedType = getFileTypeName(mode);
      return {
        valid: false,
        error: `Invalid file type. This tool only accepts ${expectedType} files. "${file.name}" is not a ${expectedType} file.`
      };
    }
  }
  
  // Tool-specific validations
  if (mode === 'protect') {
    if (!settings?.password || settings.password.trim().length < 3) {
      return {
        valid: false,
        error: "Password is required to protect your PDF. Please enter a password (minimum 3 characters)."
      };
    }
  }
  
  if (mode === 'organize') {
    if (!settings?.pageOrder || settings.pageOrder.trim().length === 0) {
      return {
        valid: false,
        error: "Page order is required. Please enter the desired page order (e.g., '3,1,2' or '1-5,10')."
      };
    }
  }
  
  if (mode === 'delete_pages') {
    if (!settings?.deletePages || settings.deletePages.trim().length === 0) {
      return {
        valid: false,
        error: "Pages to delete are required. Please enter page numbers (e.g., '1,3-5' or '2,4,6')."
      };
    }
  }
  
  if (mode === 'redact') {
    if (!settings?.redactText || settings.redactText.trim().length === 0) {
      return {
        valid: false,
        error: "Text to redact is required. Please enter the text you want to remove from the PDF."
      };
    }
  }
  
  if (mode === 'sign') {
    if (!settings?.certFile) {
      return {
        valid: false,
        error: "Certificate file is required. Please select a certificate file (.pfx or .p12)."
      };
    }
    if (!settings?.password || settings.password.trim().length === 0) {
      return {
        valid: false,
        error: "Certificate password is required. Please enter the password for your certificate."
      };
    }
  }
  
  // PDF crop validation (image crop is interactive, no dimension validation needed)
  // Only validate if cropWidth and cropHeight are explicitly provided (PDF crop)
  if (mode === 'crop' && settings?.cropWidth !== undefined && settings?.cropHeight !== undefined) {
    if (settings.cropWidth === null || settings.cropHeight === null) {
      return {
        valid: false,
        error: "Crop dimensions are required. Please enter width and height values."
      };
    }
    if (settings.cropWidth <= 0 || settings.cropHeight <= 0) {
      return {
        valid: false,
        error: "Crop dimensions must be greater than 0. Please enter valid width and height values."
      };
    }
  }
  
  if (mode === 'split' && settings?.splitMode === 'range') {
    if (!settings?.splitRange || settings.splitRange.trim().length === 0) {
      return {
        valid: false,
        error: "Page range is required. Please enter the page range (e.g., '1-5' or '1,3,5')."
      };
    }
  }
  
  return { valid: true };
};

