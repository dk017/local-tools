'use client';

import { motion } from 'framer-motion';
import { FileText, Image as ImageIcon, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function Features() {
    const t = useTranslations('Features');

    const categories = [
        {
            title: t('cat_pdf'),
            desc: t('cat_pdf_desc'),
            tools: t('pdf_tools'),
            icon: FileText,
            color: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
        },
        {
            title: t('cat_image'),
            desc: t('cat_image_desc'),
            tools: t('image_tools'),
            icon: ImageIcon,
            color: 'text-purple-400 bg-purple-400/10 border-purple-400/20'
        },
        {
            title: t('cat_security'),
            desc: t('cat_security_desc'),
            tools: t('security_tools'),
            icon: Shield,
            color: 'text-green-400 bg-green-400/10 border-green-400/20'
        }
    ];

    return (
        <section className="py-20 px-6 max-w-7xl mx-auto" id="features">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-16"
            >
                <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                    {t('title')}
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    {t('subtitle')}
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categories.map((cat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="p-8 rounded-3xl bg-secondary/5 border border-white/5 hover:border-primary/30 transition-all hover:bg-white/5 group"
                    >
                        <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                            <cat.icon className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                            {cat.title}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            {cat.desc}
                        </p>
                        <div className="text-sm text-muted-foreground/70 border-t border-white/5 pt-4">
                            {cat.tools}
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
