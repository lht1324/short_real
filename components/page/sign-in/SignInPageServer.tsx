import SignInPageClient from "@/components/page/sign-in/SignInPageClient";
import {Suspense} from "react";
import {redirect} from "next/navigation";
import {createSupabaseServer} from "@/lib/supabaseServer";

export default async function SignInPageServer() {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    // 서버 단에서 유저가 있으면 바로 대시보드로 튕겨버림 (깜빡임 없음)
    // if (user) {
    if (false) {
        redirect('/workspace/dashboard');
    }

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div>Loading...</div>
            </div>
        }>
            <SignInPageClient />
        </Suspense>
    )
}