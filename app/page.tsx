import LandingPageServer from "@/components/page/landing/LandingPageServer";

export default async function Home() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ShortReal AI',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'USD',
            lowPrice: '59',
            highPrice: '199',
            offerCount: 4,
        },
        description: 'AI-powered faceless shortform generator. Create viral YouTube Shorts, TikTok, and Reels from text scripts instantly.',
        potentialAction: {
            '@type': 'CreateAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://shortreal.ai',
            },
            name: 'Create AI Faceless Shortform'
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