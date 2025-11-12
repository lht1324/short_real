'use client'

import {memo, useCallback, useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {OAuthProvider, useAuth} from "@/context/AuthContext";
import AuthForm from "@/components/page/sign-in/AuthForm";

function SignInPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { user, isInitializingAuthContext, signInWithOAuth } = useAuth();

    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const urlError = searchParams.get('error')
        if (urlError === 'oauth_failed') {
            setError('OAuth sign-in failed. Please try again.')
        }
    }, [searchParams]);

    useEffect(() => {
        if (isInitializingAuthContext) return;

        if (user) {
            router.push('/workspace/dashboard')
        }
    }, [isInitializingAuthContext, user, router]);

    const handleOAuthSignIn = useCallback(async (provider: OAuthProvider) => {
        setError(null)
        setIsLoading(true)

        try {
            const result = await signInWithOAuth(provider);
            if (result.error) {
                setError(result.error)
                setIsLoading(false)
            }
            // OAuth는 리다이렉트되므로 로딩 상태 유지
        } catch (error) {
            setError('Google 로그인 중 오류가 발생했습니다.')
            setIsLoading(false)
        }
    }, [signInWithOAuth]);

    return (
        <div className="min-h-screen bg-black relative">
            {/* Vaporwave Background Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-3xl"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex items-start justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{paddingTop: 'calc(40vh - 16rem)'}}>
                <AuthForm
                    title="Welcome to ShortReal"
                    subtitle="Sign in. Create short. Keep it real."
                    footerText="New here? No problem - just pick any option above!"
                    loading={isLoading}
                    error={error}
                    oAuthSignIn={handleOAuthSignIn}
                />
            </div>
        </div>
    )
}

export default memo(SignInPageClient);