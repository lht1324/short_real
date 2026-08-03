import type { Metadata } from "next";
import { ReactNode } from "react";
import { Rajdhani } from "next/font/google";
import ConditionalHeader from "@/components/public/header/ConditionalHeader";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { Analytics as HellyeahAnalytics } from "@hellyeah/x-ray/next";
import {AuthProvider} from "@/context/AuthContext";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
    metadataBase: new URL('https://shortreal.ai'), // 실제 도메인으로 변경 필수
    applicationName: "ShortReal AI",
    title: {
        template: 'ShortReal AI | %s',
        default: 'ShortReal AI | Harnessed AI Video Studio',
    },
    icons: {
        icon: [
            { url: '/icon.png', type: 'image/png', sizes: '48x48' },
        ],
        apple: '/apple-icon.png', // 선택사항
    },
    description: 'We harness the complex AI pipeline. Just bring the idea. Create videos with identical characters and high-end visuals in minutes.',
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://shortreal.ai',
        title: 'ShortReal AI | Harnessed AI Video Studio',
        description: 'We harness the complex AI video generation pipeline. Just bring the idea to create videos with identical characters and high-end visuals in minutes.',
        siteName: 'ShortReal AI',
        images: [
            {
                url: 'https://shortreal.ai/opengraph-image.png',
                width: 1200,
                height: 630,
                alt: 'ShortReal AI | Harnessed AI Video Studio',
            }
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'ShortReal AI | Harnessed AI Video Studio',
        description: 'We harness the complex AI pipeline. Just bring the idea. Create videos with identical characters and high-end visuals in minutes.',
        images: ['https://shortreal.ai/opengraph-image.png'],
    },
    robots: {
        index: true,
        follow: true,
    }
};

const defaultFont = Rajdhani({
    weight: ['300', '400', '500', '600', '700'],
    subsets: ["latin"],
});

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <script
                    src="https://analytics.ahrefs.com/analytics.js"
                    data-key="KbAbbQcLHVZfMmqadNvU3g"
                    async
                />
            </head>
            <body
                className={`${defaultFont.className} antialiased`}
            >
                <AuthProvider>
                    <div className="min-h-screen">
                        <ConditionalHeader/>
                        <main>
                            {children}
                        </main>
                    </div>
                </AuthProvider>
                <VercelAnalytics />
                {process.env.NEXT_PUBLIC_HELLYEAH_TRACKER_ID && (
                    <HellyeahAnalytics
                        websiteId={process.env.NEXT_PUBLIC_HELLYEAH_TRACKER_ID}
                        env={process.env.NEXT_PUBLIC_HELLYEAH_TRACKER_ENV}
                    />
                )}
            </body>
        </html>
    );
}
