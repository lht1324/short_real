import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: [
                '/',
                '/legal/privacy',
                '/legal/terms',
            ],
            disallow: [
                '/api/',
                '/admin/',
                '/workspace/',
                '/profile/',
                '/sign-in',
                '/callback',
            ],
        },
        sitemap: 'https://shortreal.ai/sitemap.xml',
    }
}
