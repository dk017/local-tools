'use client';

import { motion } from 'framer-motion';
import { Download, Key, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function Process() {
    const t = useTranslations('Process');

    const steps = [
        {
            number: '1',
            icon: Download,
            title: t('step1_title'),
            desc: t('step1_desc')
        },
        {
            number: '2',
            icon: Key,
            title: t('step2_title'),
            desc: t('step2_desc')
        },
        {
            number: '3',
            icon: Sparkles,
            title: t('step3_title'),
            desc: t('step3_desc')
        }
    ];

    return (
        <section className="py-20 px-6 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-16"
            >
                <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                    {t('title')}
                </h2>
            </motion.div>

            <div className="relative">
                {/* Connection line */}
                <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2 z-0" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                    {steps.map((step, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                            className="relative flex flex-col items-center text-center"
                        >
                            {/* Step number badge */}
                            <div className="relative mb-6">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <step.icon className="w-8 h-8 text-primary" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-black font-bold text-sm flex items-center justify-center shadow-lg shadow-primary/30">
                                    {step.number}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                            <p className="text-muted-foreground max-w-xs">{step.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
