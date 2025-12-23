import { Helmet } from 'react-helmet-async';
import { useLocation, matchPath } from 'react-router-dom';
import TOOLS_CONFIG from '../tools_config.json';
import { useTranslation } from 'react-i18next';

export const SeoHead = () => {
    const { t } = useTranslation();
    const location = useLocation();

    // Extract slug manually since SeoHead is outside the Routes
    const toolMatch = matchPath("/tool/:slug", location.pathname) || matchPath("/:slug", location.pathname);
    const slug = toolMatch?.params.slug;

    // Default metadata
    let title = "Offline Tools - Private & Secure PDF & Image Utility";
    let description = "Free, offline, and private tools for PDF merging, splitting, image conversion, and passport photos. No data leaves your device.";

    // Try to get dynamic SEO from slug
    if (slug) {
        // Use i18n key if available (see i18n.ts for structure: seo.slug.title)
        // Fallback to static config if not found in current language (though we should ensure parity)
        const i18nTitle = t(`seo.${slug}.title`, { defaultValue: '' });
        const i18nDesc = t(`seo.${slug}.desc`, { defaultValue: '' });

        const config = TOOLS_CONFIG.find(c => c.slug === slug);

        if (i18nTitle) {
            title = i18nTitle;
            description = i18nDesc;
        } else if (config) {
            title = config.title;
            description = config.description;
        }
    } else {
        // Static route overrides
        if (location.pathname === '/image') {
            title = t('sidebar.images') + " - Offline Tools";
            description = "Convert, resize, and edit images offline. Supports JPG, PNG, WebP and more.";
        } else if (location.pathname === '/pdf') {
            title = t('sidebar.pdf_tools') + " - Offline Tools";
            description = "Merge, split, compress, and protect PDF files offline. 100% private.";
        } else if (location.pathname === '/settings') {
            title = t('sidebar.settings') + " - Offline Tools";
        }
        // Home uses defaults
    }

    return (
        <Helmet>
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <link rel="canonical" href={`https://offlinetools.app${location.pathname}`} />
        </Helmet>
    );
};
