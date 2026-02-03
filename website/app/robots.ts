import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                // Default rule for all bots
                userAgent: '*',
                allow: '/',
                disallow: '/private/',
            },
            {
                // Explicitly allow OpenAI bots (ChatGPT)
                userAgent: 'GPTBot',
                allow: '/',
            },
            {
                userAgent: 'ChatGPT-User',
                allow: '/',
            },
            {
                // Explicitly allow Anthropic bots (Claude)
                userAgent: 'ClaudeBot',
                allow: '/',
            },
            {
                userAgent: 'Claude-Web',
                allow: '/',
            },
            {
                // Explicitly allow Perplexity
                userAgent: 'PerplexityBot',
                allow: '/',
            },
            {
                // Explicitly allow Google AI
                userAgent: 'Google-Extended',
                allow: '/',
            },
            {
                // Explicitly allow Bing/Microsoft Copilot
                userAgent: 'Bingbot',
                allow: '/',
            },
            {
                // Explicitly allow Cohere
                userAgent: 'cohere-ai',
                allow: '/',
            },
        ],
        sitemap: 'https://localtools.pro/sitemap.xml',
        host: 'https://localtools.pro',
    };
}
