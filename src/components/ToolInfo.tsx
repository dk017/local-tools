import React from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Info, ListOrdered } from 'lucide-react';

interface ToolInfoProps {
    slug?: string;
}

export const ToolInfo: React.FC<ToolInfoProps> = ({ slug }) => {
    const { t, i18n } = useTranslation();

    if (!slug) return null;

    // Check if content exists for this slug by checking specific key
    const hasContent = i18n.exists(`content.${slug}.about.title`);

    if (!hasContent) return null;

    const about = t(`content.${slug}.about`, { returnObjects: true }) as any;
    const steps = t(`content.${slug}.steps`, { returnObjects: true }) as any;
    const faq = t(`content.${slug}.faq`, { returnObjects: true }) as any;

    return (
        <div className="w-full max-w-4xl mx-auto mt-16 pb-12 px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* About & Steps */}
                <div className="space-y-10">
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Info className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">{about.title}</h2>
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-base">
                            {about.text}
                        </p>
                    </section>

                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <ListOrdered className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">{steps.title}</h2>
                        </div>
                        <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                            {steps.items && steps.items.map((item: string, i: number) => (
                                <li key={i} className="pl-2 marker:font-bold marker:text-primary">{item}</li>
                            ))}
                        </ol>
                    </section>
                </div>

                {/* FAQ */}
                <div>
                    <section className="bg-card/50 border border-border rounded-2xl p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <HelpCircle className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">{faq.title}</h2>
                        </div>

                        <div className="space-y-6">
                            {faq.items && faq.items.map((item: any, i: number) => (
                                <div key={i}>
                                    <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
