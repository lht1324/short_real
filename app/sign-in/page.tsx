import SignInPageServer from "@/components/page/sign-in/SignInPageServer";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: 'Sign In', // 템플릿에 의해 "Sign In | ShortReal AI"가 됩니다.
    description: 'Log in to ShortReal AI dashboard. Create viral faceless shortforms with just scripts.',
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