import { MetadataRoute } from 'next';
import { tools } from '@/data/tools';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://offlinetools.com';
    const locales = ['en', 'jp', 'kr', 'fr', 'es', 'it'];

    const entries: MetadataRoute.Sitemap = [];

    // Home pages
    locales.forEach(locale => {
        entries.push({
            url: `${baseUrl}/${locale}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        });
    });

    // Tool pages
    tools.forEach(tool => {
        locales.forEach(locale => {
            entries.push({
                url: `${baseUrl}/${locale}/tools/${tool.slug}`,
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 0.8,
            });
        });
    });

    return entries;
}
