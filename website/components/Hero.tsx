'use client';

import { motion } from 'framer-motion';
import { Download, Globe, Cpu, Zap, Shield } from 'lucide-react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

export function Hero() {
    const t = useTranslations('Hero');
    const locale = useLocale();

    return (
        <section className="relative pt-40 pb-32 overflow-hidden">
            {/* Neural Background Effects */}
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 blur-[150px] rounded-full opacity-30 pointer-events-none mix-blend-screen" />
            <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-secondary/20 blur-[100px] rounded-full opacity-20 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
                <div className="flex flex-col items-center text-center max-w-5xl mx-auto">

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-tight"
                    >
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-primary animate-gradient-x bg-[length:200%_auto]">
                            {t('title')}
                        </span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl leading-relaxed"
                    >
                        {t('subtitle')}
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col items-center gap-4 w-full justify-center"
                    >
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <Link
                                href="#pricing"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const el = document.getElementById('pricing');
                                    if (el) {
                                        el.scrollIntoView({ behavior: 'smooth' });
                                    } else {
                                        // If not on homepage, navigate first then scroll
                                        window.location.href = '/#pricing';
                                    }
                                }}
                                className="group relative px-10 py-5 bg-primary text-black rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_-10px_rgba(0,243,255,0.4)] overflow-hidden min-w-[280px] text-center"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <div className="relative flex items-center justify-center gap-2">
                                    <Download className="w-5 h-5" />
                                    {t('cta_primary')}
                                </div>
                            </Link>

                            <Link
                                href={`/${locale}/tools`}
                                className="px-8 py-5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold text-lg transition-all border border-white/10 flex items-center gap-2 hover:border-white/30 backdrop-blur-md"
                            >
                                <Globe className="w-5 h-5" />
                                {t('cta_secondary')}
                            </Link>
                        </div>

                        <Link
                            href={`/${locale}/tools`}
                            className="text-sm text-muted-foreground hover:text-white transition-colors underline underline-offset-4"
                        >
                            {t('cta_secondary_link')}
                        </Link>
                    </motion.div>

                    {/* Tech Stats */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm font-medium text-muted-foreground border-t border-white/5 pt-10 w-full max-w-4xl"
                    >
                        <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-colors group">
                            <Cpu className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-foreground">{t('stat_offline')}</span>
                        </div>
                        <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-colors group">
                            <Shield className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-foreground">{t('stat_privacy')}</span>
                        </div>
                        <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-colors group">
                            <Zap className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-foreground">{t('stat_speed')}</span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
