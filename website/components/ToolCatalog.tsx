'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowRight, Layers, FileImage, Files, Scissors, Minimize2, FileText, Lock, LockOpen, RotateCw, Palette, Stamp, Wrench, ImageMinus, Workflow, BoxSelect, SquareUser, Grid3x3, Crop, FileSpreadsheet, GitCompare, Book, ShieldAlert, Eraser, PenTool, Zap, FileSearch, ArrowUpDown, Search, Maximize2 } from 'lucide-react';

export function ToolCatalog() {
    const t = useTranslations('Tools');
    const locale = useLocale();
    const [searchQuery, setSearchQuery] = useState('');

    // Categorized Tools Data
    const categories = [
        {
            title: t('cat_pdf'),
            tools: [
                { slug: 'merge-pdf', icon: Layers, title: t('merge-pdf.title'), desc: t('merge-pdf.desc'), color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
                { slug: 'split-pdf', icon: Scissors, title: t('split-pdf.title'), desc: t('split-pdf.desc'), color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
                { slug: 'compress-pdf', icon: Minimize2, title: t('compress-pdf.title'), desc: t('compress-pdf.desc'), color: 'text-green-400 bg-green-400/10 border-green-400/20' },
                { slug: 'pdf-to-word', icon: FileText, title: t('pdf-to-word.title'), desc: t('pdf-to-word.desc'), color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
                { slug: 'pdf-to-images', icon: FileImage, title: t('pdf-to-images.title'), desc: t('pdf-to-images.desc'), color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
                { slug: 'images-to-pdf', icon: Files, title: t('images-to-pdf.title'), desc: t('images-to-pdf.desc'), color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
                { slug: 'protect-pdf', icon: Lock, title: t('protect-pdf.title'), desc: t('protect-pdf.desc'), color: 'text-red-400 bg-red-400/10 border-red-400/20' },
                { slug: 'unlock-pdf', icon: LockOpen, title: t('unlock-pdf.title'), desc: t('unlock-pdf.desc'), color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
                { slug: 'rotate-pdf', icon: RotateCw, title: t('rotate-pdf.title'), desc: t('rotate-pdf.desc'), color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
                { slug: 'grayscale-pdf', icon: Palette, title: t('grayscale-pdf.title'), desc: t('grayscale-pdf.desc'), color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
                { slug: 'watermark-pdf', icon: Stamp, title: t('watermark-pdf.title'), desc: t('watermark-pdf.desc'), color: 'text-teal-400 bg-teal-400/10 border-teal-400/20' },
                { slug: 'repair-pdf', icon: Wrench, title: t('repair-pdf.title'), desc: t('repair-pdf.desc'), color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
                { slug: 'extract-images-from-pdf', icon: FileImage, title: t('extract-images-from-pdf.title'), desc: t('extract-images-from-pdf.desc'), color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
                { slug: 'extract-tables', icon: FileSpreadsheet, title: t('extract-tables.title'), desc: t('extract-tables.desc'), color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
                { slug: 'pdf-diff', icon: GitCompare, title: t('pdf-diff.title'), desc: t('pdf-diff.desc'), color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
                { slug: 'booklet-maker', icon: Book, title: t('booklet-maker.title'), desc: t('booklet-maker.desc'), color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
                { slug: 'pdf-scrubber', icon: ShieldAlert, title: t('pdf-scrubber.title'), desc: t('pdf-scrubber.desc'), color: 'text-red-500 bg-red-500/10 border-red-500/20' },
                { slug: 'pdf-redactor', icon: Eraser, title: t('pdf-redactor.title'), desc: t('pdf-redactor.desc'), color: 'text-gray-500 bg-gray-500/10 border-gray-500/20' },
                { slug: 'pdf-signer', icon: PenTool, title: t('pdf-signer.title'), desc: t('pdf-signer.desc'), color: 'text-blue-600 bg-blue-600/10 border-blue-600/20' },
                { slug: 'pdf-web-optimize', icon: Zap, title: t('pdf-web-optimize.title'), desc: t('pdf-web-optimize.desc'), color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
                { slug: 'extract-metadata', icon: FileSearch, title: t('extract-metadata.title'), desc: t('extract-metadata.desc'), color: 'text-cyan-600 bg-cyan-600/10 border-cyan-600/20' },
                { slug: 'extract-form-data', icon: FileSpreadsheet, title: t('extract-form-data.title'), desc: t('extract-form-data.desc'), color: 'text-emerald-600 bg-emerald-600/10 border-emerald-600/20' },
                { slug: 'reorder-pages', icon: ArrowUpDown, title: t('reorder-pages.title'), desc: t('reorder-pages.desc'), color: 'text-violet-600 bg-violet-600/10 border-violet-600/20' },
            ]
        },
        {
            title: t('cat_image'),
            tools: [
                { slug: 'remove-image-background', icon: ImageMinus, title: t('remove-image-background.title'), desc: t('remove-image-background.desc'), color: 'text-pink-500 bg-pink-500/10 border-pink-500/20' },
                { slug: 'convert-image', icon: Workflow, title: t('convert-image.title'), desc: t('convert-image.desc'), color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
                { slug: 'resize-image', icon: BoxSelect, title: t('resize-image.title'), desc: t('resize-image.desc'), color: 'text-green-500 bg-green-500/10 border-green-500/20' },
                { slug: 'upscale-image', icon: Maximize2, title: t('upscale-image.title'), desc: t('upscale-image.desc'), color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
                { slug: 'compress-image', icon: Minimize2, title: t('compress-image.title'), desc: t('compress-image.desc'), color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
                { slug: 'passport-photo', icon: SquareUser, title: t('passport-photo.title'), desc: t('passport-photo.desc'), color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
                { slug: 'generate-icons', icon: Grid3x3, title: t('generate-icons.title'), desc: t('generate-icons.desc'), color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
                { slug: 'extract-palette', icon: Palette, title: t('extract-palette.title'), desc: t('extract-palette.desc'), color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
                { slug: 'crop-image', icon: Crop, title: t('crop-image.title'), desc: t('crop-image.desc'), color: 'text-green-500 bg-green-500/10 border-green-500/20' },
                { slug: 'watermark-image', icon: Stamp, title: t('watermark-image.title'), desc: t('watermark-image.desc'), color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
                { slug: 'heic-to-jpg', icon: Files, title: t('heic-to-jpg.title'), desc: t('heic-to-jpg.desc'), color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
            ]
        }
    ];

    const [activeCategory, setActiveCategory] = useState(categories[0]?.title || "PDF Tools");

    // Filter tools based on search query
    const filteredCategories = categories.map(category => ({
        ...category,
        tools: category.tools.filter(tool => 
            tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.slug.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }));

    return (
        <div className="space-y-12">
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search tools by name, description, or keyword..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-card border border-white/10 rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
                {categories.map((cat) => (
                    <button
                        key={cat.title}
                        onClick={() => setActiveCategory(cat.title)}
                        className={`px-8 py-3 rounded-full text-sm font-bold transition-all border ${activeCategory === cat.title
                            ? 'bg-primary text-black border-primary shadow-[0_0_20px_rgba(0,243,255,0.3)]'
                            : 'bg-card/50 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {cat.title}
                    </button>
                ))}
            </div>

            {filteredCategories.map((category, catIndex) => (
                <div key={catIndex} className={category.title === activeCategory ? 'block' : 'hidden'}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        key={activeCategory} // Force re-render animation on tab change
                    >
                        {category.tools.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No tools found matching "{searchQuery}"</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {category.tools.map((tool, i) => (
                                <motion.div
                                    key={tool.slug}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    viewport={{ once: true }}
                                >
                                    <Link
                                        href={`/${locale}/tools/${tool.slug}`}
                                        className="block p-8 rounded-2xl bg-card border border-white/5 hover:border-primary/20 transition-all hover:-translate-y-1 hover:bg-white/5 group h-full"
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${tool.color}`}>
                                            <tool.icon className="w-7 h-7" />
                                        </div>
                                        <h3 className="font-bold mb-2 text-xl group-hover:text-primary transition-colors">{tool.title}</h3>
                                        <p className="text-muted-foreground mb-6 line-clamp-2">{tool.desc}</p>

                                        <div className="flex items-center font-bold text-primary">
                                            Open Tool <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </Link>
                                </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>
            ))}
        </div>
    );
}
