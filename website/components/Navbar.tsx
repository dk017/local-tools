'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Download } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Navbar() {
    const t = useTranslations('Common');
    const locale = useLocale();

    const scrollToPricing = (e: React.MouseEvent) => {
        e.preventDefault();
        const el = document.getElementById('pricing');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/50 border-b border-white/5"
        >
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-colors">
                        <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        Local Tools
                    </span>
                </Link>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                    <Link href="/#features" className="hover:text-primary transition-colors">{t('features')}</Link>
                    <Link href="/#pricing" className="hover:text-primary transition-colors">{t('pricing')}</Link>
                    <Link href={`/${locale}/tools`} className="hover:text-primary transition-colors">{t('tools')}</Link>
                </div>

                <div className="flex items-center gap-4">
                    <LanguageSwitcher />
                    <Link
                        href="/#pricing"
                        onClick={scrollToPricing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-white text-black rounded-lg hover:bg-cyan-50 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_-5px_rgba(0,243,255,0.5)]"
                    >
                        <Download className="w-4 h-4" />
                        {t('download_app_short')}
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}
