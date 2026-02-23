'use client'

import {memo} from 'react'
import {OAuthProvider} from "@/context/AuthContext";
import GoogleSignInButton from "@/components/public/GoogleSignInButton";
import DefaultSignInButton from "@/components/public/DefaultSignInButton";

interface AuthFormProps {
    title: string
    subtitle: string
    footerText: string
    loading?: boolean
    error?: string | null
    oAuthSignIn: (provider: OAuthProvider) => void
}

function AuthForm({ 
    title, 
    subtitle, 
    footerText, 
    loading = false,
    error = null,
    oAuthSignIn,
}: AuthFormProps) {
    return (
        <div className="w-full h-fit max-w-md mx-auto bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-purple-500/30 shadow-2xl p-8">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent mb-3">
                    {title}
                </h1>
                <p className="text-gray-300 text-base">
                    {subtitle}
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* OAuth Buttons */}
            <div className="space-y-4 mb-6 flex flex-col items-center">
                <GoogleSignInButton
                    text="Continue with Google"
                    onClick={() => oAuthSignIn(OAuthProvider.Google)}
                    disabled={loading}
                />
                <DefaultSignInButton
                    text="Continue with GitHub"
                    src="/icons/service-logo-github.svg"
                    onClick={() => oAuthSignIn(OAuthProvider.GitHub)}
                    disabled={loading}
                />
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                    {footerText}
                </p>
            </div>

            {/* Legal Disclaimer (Click-wrap) - 가장 중요한 부분 */}
            <div className="pt-4 text-center space-y-2">
                <p className="text-[14px] text-gray-500 leading-tight">
                    By continuing, you agree to our{' '}
                    <a href="/legal/terms" target="_blank" className="text-gray-400 hover:text-white underline decoration-gray-600 underline-offset-2 transition-colors">
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/legal/privacy" target="_blank" className="text-gray-400 hover:text-white underline decoration-gray-600 underline-offset-2 transition-colors">
                        Privacy Policy
                    </a>.
                </p>
                {/* EU 환불 방어용 문구 (작지만 명확하게) */}
                <p className="text-[12px] text-gray-600">
                    * You acknowledge that the service begins immediately and waive the right of withdrawal.
                </p>
            </div>
        </div>
    )
}

export default memo(AuthForm)