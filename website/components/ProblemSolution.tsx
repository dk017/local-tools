'use client';

import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ProblemSolution() {
    const t = useTranslations('ProblemSolution');

    return (
        <section className="py-20 px-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                {/* The Problem */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="bg-red-500/5 border border-red-500/10 p-10 rounded-3xl relative overflow-hidden"
                >
                    <div className="text-red-400 font-bold mb-8 flex items-center gap-2 text-2xl">
                        <X className="w-8 h-8" />
                        <span>{t('problem_title')}</span>
                    </div>
                    <ul className="space-y-8">
                        {[1, 2, 3].map((num) => (
                            <li key={num} className="flex gap-4">
                                <span className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 font-bold">{num}</span>
                                <div>
                                    <h4 className="font-bold text-foreground mb-1 text-lg">{t(`p${num}_title`)}</h4>
                                    <p className="text-sm text-muted-foreground">{t(`p${num}_desc`)}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </motion.div>

                {/* The Solution */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="bg-green-500/5 border border-green-500/10 p-10 rounded-3xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Check className="w-64 h-64 text-green-500" />
                    </div>

                    <div className="text-green-400 font-bold mb-8 flex items-center gap-2 relative z-10 text-2xl">
                        <Check className="w-8 h-8" />
                        <span>{t('solution_title')}</span>
                    </div>
                    <ul className="space-y-8 relative z-10">
                        {[1, 2, 3].map((num) => (
                            <li key={num} className="flex gap-4">
                                <span className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 shrink-0 font-bold">{num}</span>
                                <div>
                                    <h4 className="font-bold text-foreground mb-1 text-lg">{t(`s${num}_title`)}</h4>
                                    <p className="text-sm text-muted-foreground">{t(`s${num}_desc`)}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </div>
        </section>
    );
}
