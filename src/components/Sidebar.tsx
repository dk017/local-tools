import React from 'react';
import { cn } from '../lib/utils';
import { Home, Image, FileText, Settings, Menu } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

export const Sidebar: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();

    const navItems = [
        { id: 'home', icon: Home, label: t('sidebar.home'), path: '/' },
        { id: 'image', icon: Image, label: t('sidebar.images'), path: '/image-converter' },
        { id: 'pdf', icon: FileText, label: t('sidebar.pdf_tools'), path: '/pdf-tools' },
        { id: 'settings', icon: Settings, label: t('sidebar.settings'), path: '/settings' },
    ];

    const isActive = (path: string) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className="w-64 bg-background/60 backdrop-blur-xl border-r border-white/5 h-screen flex flex-col relative z-50">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-foreground/10 rounded-lg flex items-center justify-center border border-foreground/5">
                    <Menu className="w-4 h-4 text-foreground/80" />
                </div>
                <h1 className="font-bold text-xl tracking-tight text-foreground/90">
                    Local<span className="opacity-50">Tools</span>
                </h1>
            </div>

            <nav className="flex-1 px-3 space-y-1">
                {navItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 relative group overflow-hidden text-sm",
                                active
                                    ? "text-primary-foreground font-semibold"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            )}
                        >
                            {active && (
                                <div
                                    className="absolute inset-0 bg-primary rounded-lg"
                                />
                            )}
                            <item.icon className={cn("w-4 h-4 relative z-10", active ? "text-primary-foreground" : "opacity-70")} />
                            <span className="relative z-10">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border mt-auto">
                <div className="rounded-lg p-2 flex items-center justify-between text-[10px] text-muted-foreground bg-muted/20">
                    <span className="font-medium opacity-70">{t('sidebar.alpha')}</span>
                    <div className="flex items-center gap-1.5 opacity-60">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                        <span>{t('sidebar.status_online')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
