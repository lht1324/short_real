// app/sitemap.ts
import { MetadataRoute } from 'next'

const BASE_URL = 'https://shortreal.ai'
const LAST_MODIFIED = new Date('2026-02-23T18:09:00+09:00')

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: BASE_URL,
            lastModified: LAST_MODIFIED,
            changeFrequency: 'weekly',
            priority: 1.0,
        },
        {
            url: `${BASE_URL}/legal/terms`,
            lastModified: LAST_MODIFIED,
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${BASE_URL}/legal/privacy`,
            lastModified: LAST_MODIFIED,
            changeFrequency: 'monthly',
            priority: 0.3,
        },
    ]
}