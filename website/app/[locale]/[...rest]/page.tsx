import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TOOL_SLUGS } from '../../../lib/slugs';
import { useLocale } from 'next-intl';

export default function NotFoundPage({ params }: { params: { rest: string[] } }) {
    const t = useTranslations('NotFound');
    const locale = useLocale();

    // Smart Redirect Logic
    // Check if any part of the path matches a known tool slug
    // Specifically looking for the last segment which might be the tool name
    if (params.rest && params.rest.length > 0) {
        const potentialSlug = params.rest[params.rest.length - 1];

        if (TOOL_SLUGS.includes(potentialSlug)) {
            // Redirect to the correct tool URL
            redirect(`/${locale}/tools/${potentialSlug}`);
        }
    }

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 backdrop-blur-sm max-w-lg w-full">
                <h1 className="text-6xl font-black bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-6">
                    404
                </h1>
                <h2 className="text-2xl font-bold mb-4 text-white">
                    {t('title')}
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                    {t('desc')}
                </p>
                <Link
                    href={`/${locale}`}
                    className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-all hover:scale-105"
                >
                    {t('return_home')}
                </Link>
            </div>
        </div>
    );
}
