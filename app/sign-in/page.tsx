import SignInPageServer from "@/components/page/sign-in/SignInPageServer";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: 'Sign In', // 템플릿에 의해 "ShortReal AI | Sign In"이 됩니다.
    description: 'Log in to ShortReal AI. Bring your ideas and let our harnessed pipeline handle the complex generation process to create high-quality videos.',
    openGraph: {
        title: 'Sign In to ShortReal AI',
        description: 'Access your AI video creation dashboard.',
        url: 'https://shortreal.ai/sign-in',
    },
    alternates: {
        canonical: 'https://shortreal.ai/sign-in',
    },
    robots: {
        index: true,
        follow: true,
    }
};

export default async function SignInPage() {
    return (<SignInPageServer/>)
}