'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { 
    Layers, FileImage, Scissors, Minimize2, FileText, Lock, 
    RotateCw, ImageMinus, BoxSelect, ChevronDown, Type, RefreshCw, ArrowRight,
    Wrench, Palette, Stamp, Crop, LockOpen, PenTool, Eraser, ShieldAlert, Table
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Tool {
    slug: string;
    icon: any;
    title: string;
    desc: string;
    color: string;
}

export function ToolsDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const locale = useLocale();
    const t = useTranslations('Tools');

    // Categorized tools like iLovePDF - minimalistic and organized
    const categories = [
        {
            title: 'ORGANIZE PDF',
            tools: [
                { slug: 'merge-pdf', icon: Layers, title: t('merge-pdf.title'), desc: t('merge-pdf.desc') },
                { slug: 'split-pdf', icon: Scissors, title: t('split-pdf.title'), desc: t('split-pdf.desc') },
            ]
        },
        {
            title: 'OPTIMIZE PDF',
            tools: [
                { slug: 'compress-pdf', icon: Minimize2, title: t('compress-pdf.title'), desc: t('compress-pdf.desc') },
                { slug: 'repair-pdf', icon: Wrench, title: t('repair-pdf.title'), desc: t('repair-pdf.desc') },
            ]
        },
        {
            title: 'CONVERT PDF',
            tools: [
                { slug: 'pdf-to-word', icon: FileText, title: t('pdf-to-word.title'), desc: t('pdf-to-word.desc') },
                { slug: 'images-to-pdf', icon: FileImage, title: t('images-to-pdf.title'), desc: t('images-to-pdf.desc') },
                { slug: 'ocr-pdf', icon: Type, title: t('ocr-pdf.title'), desc: t('ocr-pdf.desc') },
            ]
        },
        {
            title: 'EDIT PDF',
            tools: [
                { slug: 'rotate-pdf', icon: RotateCw, title: t('rotate-pdf.title'), desc: t('rotate-pdf.desc') },
                { slug: 'crop-pdf', icon: Crop, title: t('crop-pdf.title'), desc: t('crop-pdf.desc') },
                { slug: 'watermark-pdf', icon: Stamp, title: t('watermark-pdf.title'), desc: t('watermark-pdf.desc') },
            ]
        },
        {
            title: 'PDF SECURITY',
            tools: [
                { slug: 'protect-pdf', icon: Lock, title: t('protect-pdf.title'), desc: t('protect-pdf.desc') },
                { slug: 'unlock-pdf', icon: LockOpen, title: t('unlock-pdf.title'), desc: t('unlock-pdf.desc') },
            ]
        },
        {
            title: 'IMAGE TOOLS',
            tools: [
                { slug: 'remove-image-background', icon: ImageMinus, title: t('remove-image-background.title'), desc: t('remove-image-background.desc') },
                { slug: 'convert-image', icon: RefreshCw, title: t('convert-image.title'), desc: t('convert-image.desc') },
                { slug: 'resize-image', icon: BoxSelect, title: t('resize-image.title'), desc: t('resize-image.desc') },
                { slug: 'compress-image', icon: Minimize2, title: t('compress-image.title'), desc: t('compress-image.desc') },
            ]
        }
    ];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative hidden md:block" ref={dropdownRef}>
            <button
                onMouseEnter={() => setIsOpen(true)}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
                Tools
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        onMouseLeave={() => setIsOpen(false)}
                        className="absolute top-full left-0 mt-2 w-[800px] max-w-[calc(100vw-2rem)] bg-background border border-white/10 rounded-xl shadow-2xl p-6 z-50"
                    >
                        <div className="grid grid-cols-4 gap-6">
                            {categories.map((category, catIndex) => (
                                <div key={catIndex} className="min-w-0">
                                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                        {category.title}
                                    </h3>
                                    <div className="space-y-1">
                                        {category.tools.map((tool) => {
                                            const Icon = tool.icon;
                                            return (
                                                <Link
                                                    key={tool.slug}
                                                    href={`/${locale}/tools/${tool.slug}`}
                                                    onClick={() => setIsOpen(false)}
                                                    className="flex items-center gap-2.5 py-2 px-0 rounded hover:bg-white/5 transition-colors group"
                                                >
                                                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-tight">
                                                            {tool.title}
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 pt-5 border-t border-white/10">
                            <Link
                                href={`/${locale}/tools`}
                                onClick={() => setIsOpen(false)}
                                className="block w-full text-center px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-sm font-semibold text-primary hover:text-cyan-400 transition-all flex items-center justify-center gap-2 group"
                            >
                                <span>View All Tools</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
