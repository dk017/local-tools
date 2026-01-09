'use client';

import { motion } from 'framer-motion';
import { Download, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

export function FinalCTA() {
    const t = useTranslations('FinalCTA');
    const locale = useLocale();

    return (
        <section className="py-24 px-6 relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 blur-[150px] rounded-full opacity-30 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        {t('title')}
                    </h2>
                    <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                        {t('subtitle')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="#pricing"
                            onClick={(e) => {
                                e.preventDefault();
                                const el = document.getElementById('pricing');
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                            className="group relative px-10 py-5 bg-primary text-black rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_-10px_rgba(0,243,255,0.4)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <div className="relative flex items-center gap-2">
                                <Download className="w-5 h-5" />
                                {t('cta_primary')}
                            </div>
                        </Link>

                        <Link
                            href={`/${locale}/tools`}
                            className="px-8 py-5 text-muted-foreground hover:text-white font-medium transition-colors flex items-center gap-2 group"
                        >
                            {t('cta_secondary')}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
