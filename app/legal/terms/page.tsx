import LegalPageServer from "@/components/page/legal/LegalPageServer";
import { Metadata } from "next";
import { LegalDataType } from "@/components/page/legal/LegalDataType";

export const metadata: Metadata = {
    title: 'Terms of Service', // 템플릿에 의해 "Sign In | ShortReal AI"가 됩니다.
    description: 'Read ShortReal AI Terms of Service. User rights and responsibilities.',
    openGraph: {
        title: 'Terms of Service - ShortReal AI',
        description: 'Read ShortReal AI Terms of Service. User rights and responsibilities.',
        url: 'https://shortreal.ai/legal/terms',
    },
    alternates: {
        canonical: 'https://shortreal.ai/legal/terms',
    },
    robots: {
        index: true,
        follow: true,
    }
};

// 2. 페이지 컴포넌트
export default async function LegalTermsPage() {
    return <LegalPageServer legalDataType={LegalDataType.TERMS}/>;
}
