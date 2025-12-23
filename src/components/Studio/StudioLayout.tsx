import React, { useState, useRef, useEffect } from 'react';
import { StudioLayerData } from './StudioCanvas';
import StudioCanvas from './StudioCanvas';
import {
    Layout, Type, Image as LucideImage, Square, Layers,
    Download, ZoomIn, ZoomOut,
    Undo, Redo
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StudioLayoutProps {
    initialBackground?: string | null;
    initialDim?: { w: number, h: number };
    onExport: (blob: Blob) => void;
}

export default function StudioLayout({ initialBackground, initialDim, onExport }: StudioLayoutProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'templates' | 'text' | 'photos' | 'elements' | 'layers'>('text');
    const [layers, setLayers] = useState<StudioLayerData[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [background, setBackground] = useState<string | null>(initialBackground || null);
    const [canvasDim, setCanvasDim] = useState(initialDim || { w: 800, h: 600 });
    const [zoom, setZoom] = useState(1); // Canvas zoom, not image zoom
    const exportRef = useRef<any>(null);
    const idCounter = useRef(1);

    // Initialize background if provided
    useEffect(() => {
        if (initialBackground) setBackground(initialBackground);
        if (initialDim) setCanvasDim(initialDim);
    }, [initialBackground, initialDim]);

    // Helpers
    const addLayer = (type: 'text' | 'image' | 'rect' | 'circle', data: Partial<StudioLayerData>) => {
        const id = `layer-${idCounter.current++}`;
        const newLayer: StudioLayerData = {
            id,
            type,
            x: canvasDim.w / 2,
            y: canvasDim.h / 2,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            ...data
        } as StudioLayerData;

        // Center the new object
        if (newLayer.type === 'text') {
            newLayer.x -= 50; // approx half width
        } else if (newLayer.type === 'image' && newLayer.width && newLayer.height) {
            newLayer.x -= newLayer.width / 2;
            newLayer.y -= newLayer.height / 2;
        } else if (newLayer.type === 'rect') {
            newLayer.x -= (newLayer.width || 100) / 2;
            newLayer.y -= (newLayer.height || 100) / 2;
        }

        setLayers(prev => [...prev, newLayer]);
        setSelectedId(id);
    };

    const handleExport = () => {
        if (exportRef.current) {
            const dataUrl = exportRef.current();
            // Convert dataURL to blob for consistency with parent
            fetch(dataUrl)
                .then(res => res.blob())
                .then(blob => onExport(blob));
        }
    };

    return (
        <div className="flex h-[85vh] bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            {/* LEFT SIDEBAR (Icons) */}
            <div className="w-16 bg-black/40 border-r border-white/10 flex flex-col items-center py-4 gap-4 z-20">
                <SidebarIcon icon={<Layout size={20} />} label={t('DesignStudio.templates')} active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} />
                <SidebarIcon icon={<Type size={20} />} label={t('DesignStudio.text')} active={activeTab === 'text'} onClick={() => setActiveTab('text')} />
                <SidebarIcon icon={<LucideImage size={20} />} label={t('DesignStudio.photos')} active={activeTab === 'photos'} onClick={() => setActiveTab('photos')} />
                <SidebarIcon icon={<Square size={20} />} label={t('DesignStudio.elements')} active={activeTab === 'elements'} onClick={() => setActiveTab('elements')} />
                <SidebarIcon icon={<Layers size={20} />} label={t('DesignStudio.layers')} active={activeTab === 'layers'} onClick={() => setActiveTab('layers')} />
            </div>

            {/* SIDE DRAWER (Content) */}
            <div className="w-64 bg-neutral-900 border-r border-white/10 flex flex-col z-10">
                <div className="p-4 border-b border-white/5 font-bold text-lg text-white/90 capitalize">
                    {t(`DesignStudio.${activeTab}`)}
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {activeTab === 'templates' && (
                        <div className="space-y-4">
                            <button
                                onClick={() => {
                                    if (confirm('Clear all layers?')) setLayers([]);
                                }}
                                className="w-full text-left p-3 rounded bg-white/5 hover:bg-white/10 transition"
                            >
                                <span className="block font-bold text-sm">Empty Canvas</span>
                                <span className="text-xs text-muted-foreground">Start from scratch</span>
                            </button>
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-500 text-xs">
                                More templates coming soon.
                            </div>
                        </div>
                    )}
                    {activeTab === 'text' && (
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => addLayer('text', { text: 'Heading', fontSize: 60, fontWeight: 'bold' })}
                                className="h-16 bg-neutral-800 rounded flex items-center justify-center text-2xl font-bold hover:bg-neutral-700 transition"
                            >
                                Heading
                            </button>
                            <button
                                onClick={() => addLayer('text', { text: 'Subheading', fontSize: 40, fontWeight: 'medium' })}
                                className="h-12 bg-neutral-800 rounded flex items-center justify-center text-lg font-medium hover:bg-neutral-700 transition"
                            >
                                Subheading
                            </button>
                            <button
                                onClick={() => addLayer('text', { text: 'Body Text', fontSize: 24 })}
                                className="h-10 bg-neutral-800 rounded flex items-center justify-center text-sm hover:bg-neutral-700 transition"
                            >
                                Body Text
                            </button>
                        </div>
                    )}
                    {activeTab === 'elements' && (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => addLayer('rect', { width: 100, height: 100, fill: '#cccccc' })}
                                className="aspect-square bg-white/10 hover:bg-white/20 rounded flex flex-col gap-2 items-center justify-center transition"
                            >
                                <Square size={24} />
                                <span className="text-xs text-muted-foreground">Rectangle</span>
                            </button>
                            <button
                                onClick={() => addLayer('circle', { radius: 50, fill: '#cccccc' })}
                                className="aspect-square bg-white/10 hover:bg-white/20 rounded flex flex-col gap-2 items-center justify-center transition"
                            >
                                <div className="w-6 h-6 rounded-full border-2 border-white" />
                                <span className="text-xs text-muted-foreground">Circle</span>
                            </button>
                        </div>
                    )}
                    {activeTab === 'photos' && (
                        <div className="space-y-4">
                            <div
                                onClick={() => document.getElementById('studio-upload-input')?.click()}
                                className="p-4 border-2 border-dashed border-white/10 rounded-lg text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition"
                            >
                                <LucideImage className="mx-auto mb-2 opacity-50" />
                                <span className="text-xs text-muted-foreground">Upload Image</span>
                                <input
                                    id="studio-upload-input"
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            const url = URL.createObjectURL(e.target.files[0]);
                                            const img = new Image();
                                            img.onload = () => {
                                                addLayer('image', { src: url, width: 300, height: 300 * (img.height / img.width) });
                                            };
                                            img.src = url;
                                        }
                                    }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">Unsplash integration coming soon</p>
                        </div>
                    )}
                    {activeTab === 'layers' && (
                        <div className="flex flex-col gap-2">
                            {[...layers].reverse().map(l => (
                                <div
                                    key={l.id}
                                    onClick={() => setSelectedId(l.id)}
                                    className={`p-2 rounded text-sm flex items-center gap-2 cursor-pointer ${selectedId === l.id ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/5 hover:bg-white/10'}`}
                                >
                                    {l.type === 'text' ? <Type size={14} /> : <LucideImage size={14} />}
                                    <span className="truncate">{l.type === 'text' ? l.text : 'Image Layer'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN WORKSPACE */}
            <div className="flex-1 bg-neutral-950 relative flex flex-col overflow-hidden">
                {/* Top Bar */}
                <div className="h-12 border-b border-white/10 bg-neutral-900 flex items-center justify-between px-4 z-10">
                    <div className="flex items-center gap-4">
                        <ZoomOut size={18} className="cursor-pointer hover:text-primary" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} />
                        <span className="text-xs font-mono text-muted-foreground">{Math.round(zoom * 100)}%</span>
                        <ZoomIn size={18} className="cursor-pointer hover:text-primary" onClick={() => setZoom(z => Math.min(3, z + 0.1))} />
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-white/5 rounded" title="Undo"><Undo size={16} /></button>
                        <button className="p-2 hover:bg-white/5 rounded" title="Redo"><Redo size={16} /></button>
                    </div>

                    <button
                        onClick={handleExport}
                        className="bg-primary text-black px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 hover:bg-primary/90"
                    >
                        <Download size={14} />
                        Export
                    </button>
                </div>

                {/* Canvas Scroll Area */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[url('/grid-pattern.svg')] bg-repeat relative">
                    <div
                        style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: 'center',
                            transition: 'transform 0.1s ease-out',
                            boxShadow: '0 0 40px rgba(0,0,0,0.5)'
                        }}
                    >
                        <StudioCanvas
                            width={canvasDim.w}
                            height={canvasDim.h}
                            backgroundSrc={background}
                            layers={layers}
                            setLayers={setLayers}
                            selectedId={selectedId}
                            setSelectedId={setSelectedId}
                            onExportRef={(func) => exportRef.current = func}
                        />
                    </div>
                </div>
            </div>

            {/* RIGHT PROPERTIES PANEL (Context Aware) */}
            {selectedId && (
                <div className="w-64 bg-neutral-900 border-l border-white/10 flex flex-col z-10">
                    <div className="p-4 border-b border-white/5 font-bold text-sm text-white/90">
                        Properties
                    </div>
                    <div className="p-4">
                        {(() => {
                            const layer = layers.find(l => l.id === selectedId);
                            if (!layer) return null;

                            return (
                                <div className="space-y-4">
                                    <div className="text-xs font-mono uppercase text-muted-foreground mb-4 bg-white/5 p-1 px-2 rounded w-fit">{layer.type} Layer</div>

                                    {/* Text Specific */}
                                    {layer.type === 'text' && (
                                        <>
                                            <div>
                                                <label className="text-xs text-muted-foreground mb-1 block">Text Content</label>
                                                <input
                                                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50"
                                                    value={layer.text || ''}
                                                    onChange={(e) => setLayers(prev => prev.map(l => l.id === selectedId ? { ...l, text: e.target.value } : l))}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted-foreground mb-1 block">Font Size</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50"
                                                    value={layer.fontSize || 12}
                                                    onChange={(e) => setLayers(prev => prev.map(l => l.id === selectedId ? { ...l, fontSize: Number(e.target.value) } : l))}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Common: Color (Fill) */}
                                    {(layer.type === 'text' || layer.type === 'rect' || layer.type === 'circle') && (
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1 block">Color</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    className="w-8 h-8 bg-transparent cursor-pointer rounded border border-white/10 p-0"
                                                    value={layer.fill || '#ffffff'}
                                                    onChange={(e) => setLayers(prev => prev.map(l => l.id === selectedId ? { ...l, fill: e.target.value } : l))}
                                                />
                                                <span className="text-xs self-center text-muted-foreground font-mono">{layer.fill}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Common: Opacity */}
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Opacity</label>
                                        <input
                                            type="range" min="0" max="1" step="0.1"
                                            className="w-full accent-primary"
                                            value={layer.opacity ?? 1}
                                            onChange={(e) => setLayers(prev => prev.map(l => l.id === selectedId ? { ...l, opacity: Number(e.target.value) } : l))}
                                        />
                                    </div>

                                    <button
                                        onClick={() => {
                                            setLayers(prev => prev.filter(l => l.id !== selectedId));
                                            setSelectedId(null);
                                        }}
                                        className="w-full bg-red-500/10 text-red-500 border border-red-500/20 py-2 rounded text-xs font-bold hover:bg-red-500/20 mt-4"
                                    >
                                        Delete Layer
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}

function SidebarIcon({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors p-2 rounded-lg w-full ${active ? 'text-white bg-white/10' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
        >
            {icon}
            <span className="text-[10px] lowercase">{label}</span>
        </div>
    );
}
