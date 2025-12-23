import React, { useState, useEffect } from 'react';
// import { motion } from 'framer-motion';
import {
    Image as ImageIcon, Star, ArrowRight,
    Merge, Scissors, Lock, Minimize2, Crop, Wand2,
    Search, LayoutGrid, Shield // Icons
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import TOOLS_CONFIG from '../tools_config.json';

// Define the interface for a Tool
export interface ToolDef {
    id: string;
    labelKey: string;
    descKey: string;
    icon: any;
    tab: 'pdf' | 'image';
    mode: string;
    color: string; // Tailwind color class for icon background or accent
}

// Define available tools manually to curry them to specific tabs/modes
const FEATURED_TOOLS: ToolDef[] = [
    // PDF Tools
    { id: 'merge', labelKey: 'tools.merge', descKey: 'tools.merge_desc', icon: Merge, tab: 'pdf', mode: 'merge', color: 'text-purple-400' },
    { id: 'split', labelKey: 'tools.split', descKey: 'tools.split_desc', icon: Scissors, tab: 'pdf', mode: 'split', color: 'text-pink-400' },
    { id: 'compress_pdf', labelKey: 'tools.compress_pdf', descKey: 'tools.compress_pdf_desc', icon: Minimize2, tab: 'pdf', mode: 'compress', color: 'text-red-400' },
    { id: 'protect', labelKey: 'tools.protect', descKey: 'tools.protect_desc', icon: Lock, tab: 'pdf', mode: 'protect', color: 'text-orange-400' },

    // Image Tools
    { id: 'convert', labelKey: 'tools.convert', descKey: 'tools.convert_desc', icon: Wand2, tab: 'image', mode: 'convert', color: 'text-blue-400' },
    { id: 'compress_img', labelKey: 'tools.compress_img', descKey: 'tools.compress_img_desc', icon: Minimize2, tab: 'image', mode: 'compress', color: 'text-cyan-400' },
    { id: 'crop', labelKey: 'tools.crop', descKey: 'tools.crop_desc', icon: Crop, tab: 'image', mode: 'crop', color: 'text-green-400' },
    { id: 'studio', labelKey: 'tools.studio', descKey: 'tools.studio_desc', icon: ImageIcon, tab: 'image', mode: 'studio', color: 'text-emerald-400' },
];

export const Home: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Load favorites from local storage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('offline_tools_favs');
            if (saved) {
                setFavorites(JSON.parse(saved));
            } else {
                // Default favorites
                setFavorites(['merge', 'convert', 'studio']);
            }
        } catch (e) {
            console.error("Failed to load favorites", e);
        }
    }, []);

    const toggleFavorite = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newFavs = favorites.includes(id)
            ? favorites.filter(f => f !== id)
            : [...favorites, id];

        setFavorites(newFavs);
        localStorage.setItem('offline_tools_favs', JSON.stringify(newFavs));
    };

    const handleToolClick = (tool: ToolDef) => {
        // Find best slug from config
        const config = TOOLS_CONFIG.find(c => c.mode === tool.mode && c.tool === tool.tab);
        if (config) {
            navigate(`/tool/${config.slug}`);
        } else {
            // Fallback (this might not work if PdfTools/ImageConverter don't read from state, 
            // but we modified App.tsx to route based on slug mostly.
            // If no slug, we might not have a direct route for it unless we use state)
            // Ideally we should have slugs for everything.
            // For now, let's navigate to the main tab.
            navigate(`/${tool.tab}`);
        }
    };

    // Filter tools
    const filteredTools = FEATURED_TOOLS.filter(tool => {
        const label = t(tool.labelKey);
        const desc = t(tool.descKey);
        return label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            desc.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const favoriteTools = FEATURED_TOOLS.filter(t => favorites.includes(t.id));

    return (
        <div className="min-h-full p-8 relative overflow-hidden">
            {/* Aurora Background Effects (Global in App) */}

            <div className="relative z-10 max-w-6xl mx-auto space-y-12">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight mb-2">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                                {t('home.welcome_back')}
                            </span>
                        </h1>
                        <p className="text-muted-foreground text-lg">{t('home.subtitle')}</p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-96 group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur transition-opacity opacity-0 group-hover:opacity-100" />
                        <div className="relative bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl flex items-center px-4 py-3 shadow-sm transition-all focus-within:ring-1 focus-within:ring-white/20">
                            <Search className="w-5 h-5 text-muted-foreground mr-3" />
                            <input
                                type="text"
                                placeholder={t('home.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-white placeholder:text-muted-foreground flex-1 text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Favorites Section */}
                {favoriteTools.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">{t('home.favorites')}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {favoriteTools.map(tool => (
                                <ToolCard key={tool.id} tool={tool} isFav={true} onToggleFav={toggleFavorite} onClick={() => handleToolClick(tool)} text={t} />
                            ))}
                        </div>
                    </section>
                )}

                {/* All Tools Section */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <LayoutGrid className="w-5 h-5 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">{t('home.all_tools')}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTools.length > 0 ? (
                            filteredTools.map(tool => (
                                <ToolCard key={tool.id} tool={tool} isFav={favorites.includes(tool.id)} onToggleFav={toggleFavorite} onClick={() => handleToolClick(tool)} text={t} />
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center text-muted-foreground">
                                No tools found matching "{searchQuery}"
                            </div>
                        )}
                    </div>
                </section>

                {/* Footer */}
                <footer className="pt-12 border-t border-white/5 flex items-center justify-between text-muted-foreground text-sm">
                    <p className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        {t('home.footer_privacy')}
                    </p>
                    <p>{t('home.footer_desc')}</p>
                </footer>

            </div>
        </div>
    );
};

// Subcomponent for cleaner code
const ToolCard: React.FC<{ tool: ToolDef, isFav: boolean, onToggleFav: any, onClick: any, text: any }> = ({ tool, isFav, onToggleFav, onClick, text }) => {
    return (
        <div
            onClick={onClick}
            className="group relative bg-card/40 backdrop-blur-sm border border-white/5 hover:border-white/10 rounded-2xl p-5 cursor-pointer transition-all hover:bg-card/60 overflow-hidden hover:-translate-y-0.5"
        >
            <div className={`absolute top-0 right-0 p-4 transition-all ${isFav ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button
                    onClick={(e) => onToggleFav(e, tool.id)}
                    className="hover:scale-110 transition-transform"
                >
                    <Star className={cn("w-5 h-5", isFav ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground hover:text-yellow-500")} />
                </button>
            </div>

            <div className="flex items-start gap-4">
                <div className={cn("p-3 rounded-xl bg-background/50 border border-white/5", tool.color)}>
                    <tool.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 pr-6">
                    <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{text(tool.labelKey)}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{text(tool.descKey)}</p>
                </div>
            </div>

            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <div className="flex items-center gap-1 text-xs font-bold text-primary uppercase tracking-wider">
                    {text('home.open_tool')} <ArrowRight className="w-3 h-3" />
                </div>
            </div>
        </div>
    );
};
