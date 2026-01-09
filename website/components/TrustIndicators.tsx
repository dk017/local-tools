'use client';

import { motion } from 'framer-motion';
import { Scale, Heart, Building2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function TrustIndicators() {
    const t = useTranslations('TrustIndicators');

    const industries = [
        {
            icon: Scale,
            title: t('legal'),
            desc: t('legal_desc'),
            color: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
        },
        {
            icon: Heart,
            title: t('healthcare'),
            desc: t('healthcare_desc'),
            color: 'text-red-400 bg-red-400/10 border-red-400/20'
        },
        {
            icon: Building2,
            title: t('finance'),
            desc: t('finance_desc'),
            color: 'text-green-400 bg-green-400/10 border-green-400/20'
        },
        {
            icon: Users,
            title: t('hr'),
            desc: t('hr_desc'),
            color: 'text-purple-400 bg-purple-400/10 border-purple-400/20'
        }
    ];

    return (
        <section className="py-16 px-6 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-10"
            >
                <h2 className="text-xl md:text-2xl font-semibold text-muted-foreground">
                    {t('title')}
                </h2>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {industries.map((industry, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group"
                    >
                        <div className={`w-12 h-12 rounded-xl ${industry.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            <industry.icon className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-foreground mb-1">{industry.title}</h3>
                        <p className="text-sm text-muted-foreground">{industry.desc}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
