'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslations } from 'next-intl';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    accept?: Record<string, string[]>;
    maxFiles?: number;
    className?: string;
}

export function FileUploader({ onFilesSelected, accept, maxFiles = 1, className }: FileUploaderProps) {
    const t = useTranslations('FileUploader');

    const onDrop = useCallback((acceptedFiles: File[]) => {
        onFilesSelected(acceptedFiles);
    }, [onFilesSelected]);

    // Environment Check
    const isDesktop = typeof window !== 'undefined' && '__TAURI__' in window;
    
    // Determine file type from accept prop
    const isImageTool = accept && (
        Object.keys(accept).some(key => key.startsWith('image/')) ||
        Object.values(accept).some(exts => exts.some(ext => /\.(jpg|jpeg|png|webp|gif|bmp|heic|heif)$/i.test(ext)))
    );
    const isPdfTool = accept && (
        Object.keys(accept).some(key => key === 'application/pdf') ||
        Object.values(accept).some(exts => exts.some(ext => /\.pdf$/i.test(ext)))
    );
    
    // File size limits: Web only (Desktop is unlimited)
    // Images: 3MB, PDFs: 5MB for web version
    let MAX_SIZE: number;
    let sizeLimitText: string;
    
    if (isDesktop) {
        MAX_SIZE = Infinity;
        sizeLimitText = 'Unlimited';
    } else if (isImageTool) {
        MAX_SIZE = 3 * 1024 * 1024; // 3MB
        sizeLimitText = '3MB';
    } else if (isPdfTool) {
        MAX_SIZE = 5 * 1024 * 1024; // 5MB
        sizeLimitText = '5MB';
    } else {
        // Fallback for unknown types
        MAX_SIZE = 5 * 1024 * 1024; // 5MB default
        sizeLimitText = '5MB';
    }

    const onDropRejected = useCallback((fileRejections: any[]) => {
        const file = fileRejections[0];
        if (file?.errors[0]?.code === 'file-too-large') {
            alert(t('file_too_large', { limit: sizeLimitText }));
        }
    }, [t, sizeLimitText]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
        accept,
        maxFiles,
        maxSize: MAX_SIZE
    });

    return (
        <div
            {...getRootProps()}
            className={cn(
                "border-2 border-dashed rounded-xl p-10 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 group",
                isDragActive ? "border-primary bg-primary/10" : "border-white/10 hover:border-primary/50 hover:bg-white/5",
                className
            )}
        >
            <input {...getInputProps()} />
            <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
                isDragActive ? "bg-primary text-black" : "bg-white/5 group-hover:bg-primary/20 text-muted-foreground group-hover:text-primary"
            )}>
                <UploadCloud className="w-8 h-8" />
            </div>

            <div className="text-center">
                <h3 className="text-lg font-bold mb-1">
                    {isDragActive ? t('drop_active') : t('drop_idle')}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {maxFiles === 1 ? t('supports') : t('limit', { count: maxFiles })}
                </p>
            </div>
        </div>
    );
}
