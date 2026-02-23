import LegalPageServer from "@/components/page/legal/LegalPageServer";
import { Metadata } from "next";
import { LegalDataType } from "@/components/page/legal/LegalDataType";

export const metadata: Metadata = {
    title: 'Privacy Policy', // 템플릿에 의해 "Sign In | ShortReal AI"가 됩니다.
    description: 'Read ShortReal AI Privacy Policy. Learn how we handle your data.',
    openGraph: {
        title: 'Privacy Policy - ShortReal AI',
        description: 'Read ShortReal AI Privacy Policy. Learn how we handle your data.',
        url: 'https://shortreal.ai/legal/privacy',
    },
    alternates: {
        canonical: 'https://shortreal.ai/legal/privacy',
    },
    robots: {
        index: true,
        follow: true,
    }
};

// 2. 페이지 컴포넌트
export default async function LegalPrivacyPage() {
    return <LegalPageServer legalDataType={LegalDataType.PRIVACY}/>;
}
