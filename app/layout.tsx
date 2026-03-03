import type { Metadata } from "next";
import { ReactNode } from "react";
import { Rajdhani } from "next/font/google";
import ConditionalHeader from "@/components/public/header/ConditionalHeader";
import { Analytics } from "@vercel/analytics/next";
import {AuthProvider} from "@/context/AuthContext";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
    metadataBase: new URL('https://shortreal.ai'), // 실제 도메인으로 변경 필수
    applicationName: "ShortReal AI",
    title: {
        template: '%s | ShortReal AI', // 서비스명으로 변경
        default: 'ShortReal AI - AI Faceless Shorts Generator',
    },
    icons: {
        icon: [
            { url: '/icon.png', type: 'image/png', sizes: '48x48' },
        ],
        apple: '/apple-icon.png', // 선택사항
    },
    description: 'Turn text scripts into viral faceless YouTube Shorts, TikTok & Reels instantly. Best AI Faceless Video Generator with Storyboard, Voiceover, Songwriting & Captions.',
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://shortreal.ai',
        title: 'ShortReal AI - AI Faceless Shorts Generator',
        description: 'Create AI faceless shorts from scripts. No editing, composing skills needed.',
        siteName: 'ShortReal AI',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'ShortReal AI - AI Faceless Shorts Generator',
        description: 'Turn scripts into true motion faceless shorts instantly. No more AI slideshows.',
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
                <Analytics/>
            </body>
            <Script
                src="https://analytics.ahrefs.com/analytics.js"
                data-key="KbAbbQcLHVZfMmqadNvU3g"
                strategy="afterInteractive"
            />
        </html>
    );
}
