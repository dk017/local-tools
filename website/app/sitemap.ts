import { MetadataRoute } from 'next';
import { tools } from '@/data/tools';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://localtools.pro';
    const defaultLocale = 'en';
    const locales = ['en', 'jp', 'kr', 'fr', 'es', 'it'];

    const entries: MetadataRoute.Sitemap = [];

    // Helper: Get URL with locale prefix (no prefix for default locale)
    const getLocalizedUrl = (locale: string, path: string = '') => {
        if (locale === defaultLocale) {
            return `${baseUrl}${path}`;
        }
        return `${baseUrl}/${locale}${path}`;
    };

    // 1. Home pages (priority: 1.0)
    locales.forEach(locale => {
        entries.push({
            url: getLocalizedUrl(locale),
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        });
    });

    // 2. Tools catalog pages (priority: 0.9)
    locales.forEach(locale => {
        entries.push({
            url: getLocalizedUrl(locale, '/tools'),
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        });
    });

    // 3. Individual tool pages (priority: 0.8)
    tools.forEach(tool => {
        locales.forEach(locale => {
            entries.push({
                url: getLocalizedUrl(locale, `/tools/${tool.slug}`),
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 0.8,
            });
        });
    });

    // 4. Download page (priority: 0.7)
    locales.forEach(locale => {
        entries.push({
            url: getLocalizedUrl(locale, '/download'),
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        });
    });

    // 5. Legal pages (priority: 0.5)
    const legalPages = ['privacy', 'terms'];
    legalPages.forEach(page => {
        locales.forEach(locale => {
            entries.push({
                url: getLocalizedUrl(locale, `/${page}`),
                lastModified: new Date(),
                changeFrequency: 'yearly',
                priority: 0.5,
            });
        });
    });

    return entries;
}
