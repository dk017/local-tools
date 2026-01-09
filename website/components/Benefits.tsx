'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Zap, DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function Benefits() {
    const t = useTranslations('Benefits');

    const benefits = [
        {
            icon: ShieldCheck,
            title: t('b1_title'),
            desc: t('b1_desc'),
            color: 'text-green-400 bg-green-400/10'
        },
        {
            icon: Zap,
            title: t('b2_title'),
            desc: t('b2_desc'),
            color: 'text-yellow-400 bg-yellow-400/10'
        },
        {
            icon: DollarSign,
            title: t('b3_title'),
            desc: t('b3_desc'),
            color: 'text-primary bg-primary/10'
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
                <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                    {t('title')}
                </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {benefits.map((benefit, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.15 }}
                        className="relative p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 hover:border-white/10 transition-all group"
                    >
                        <div className={`w-14 h-14 rounded-2xl ${benefit.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                            <benefit.icon className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                            {benefit.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            {benefit.desc}
                        </p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
