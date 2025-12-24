import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
    // A list of all locales that are supported
    locales: ['en', 'jp', 'kr', 'fr', 'es', 'it'],

    // Used when no locale matches
    defaultLocale: 'en',
    localePrefix: 'as-needed',
    localeDetection: false
});

export const config = {
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
