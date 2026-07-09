import { Metadata } from "next";
import LandingPageServer from "@/components/page/landing/LandingPageServer";

export const metadata: Metadata = {
    title: 'Harnessed AI Video Studio',
    alternates: {
        canonical: 'https://shortreal.ai',
    },
};

export default async function Home() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ShortReal AI',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        browserRequirements: 'Requires HTML5 compatible browser',
        softwareVersion: '1.0.0',
        offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'USD',
            lowPrice: '149',
            highPrice: '569',
            offerCount: 4,
        },
        description: 'A harnessed AI-powered video generation studio. We handle the complex pipeline—you just drop your script and select your preferred models.',
        potentialAction: {
            '@type': 'CreateAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://shortreal.ai',
            },
            name: 'Create Harnessed AI Video'
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <LandingPageServer />
        </>
    );
}