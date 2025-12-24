'use client';

import { motion } from 'framer-motion';
import { Image as ImageIcon, Lock, ShieldCheck, Zap, Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function Features() {
    const t = useTranslations('Features');

    const features = [
        {
            title: t('f1_title'),
            desc: t('f1_desc'),
            icon: Layers,
            className: "md:col-span-2",
        },
        {
            title: t('f2_title'),
            desc: t('f2_desc'),
            icon: ShieldCheck,
            className: "md:col-span-1",
        },
        {
            title: t('f3_title'),
            desc: t('f3_desc'),
            icon: ImageIcon,
            className: "md:col-span-1",
        },
        {
            title: t('f4_title'),
            desc: t('f4_desc'),
            icon: Lock,
            className: "md:col-span-2",
        },
        {
            title: t('f5_title'),
            desc: t('f5_desc'),
            icon: Zap,
            className: "md:col-span-3",
        }
    ];

    return (
        <section className="py-20 px-6 max-w-7xl mx-auto" id="features">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">{t('title')}</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t('subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {features.map((f, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className={`p-8 rounded-3xl bg-secondary/5 border border-white/5 hover:border-primary/30 transition-all hover:bg-white/5 group ${f.className}`}
                    >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <f.icon className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                        <p className="text-muted-foreground">{f.desc}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
