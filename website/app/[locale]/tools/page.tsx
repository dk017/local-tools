import { ToolCatalog } from '@/components/ToolCatalog';
import { Footer } from '@/components/Footer';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Common' });
    return {
        title: `${t('tools')} | Local Tools`,
        description: 'Explore our suite of privacy-first PDF and Image tools running 100% offline in your browser or desktop.'
    };
}

export default function ToolsPage() {
    const t = useTranslations('Tools');

    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1 pt-32 pb-20 px-6 max-w-7xl mx-auto w-full">
                <div className="text-center mb-20">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                        {t('suite_title')}
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        {t('suite_desc')}
                    </p>
                </div>

                <ToolCatalog />
            </main>
            <Footer />
        </div>
    );
}
