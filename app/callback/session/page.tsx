import CallbackSessionClient from "@/components/page/callback/CallbackSessionClient";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: 'Signing In',
    robots: { index: false },
}

// useSearchParams를 쓰므로 prerender 대상에서 제외해야 한다 (빌드타임 CSR bailout 에러 방지).
// 세션 교환 페이지는 쿼리(verifier)마다 다른 동적 페이지라 정적 렌더 자체가 무의미.
export const dynamic = 'force-dynamic';

export default function CallbackSessionPage() {
    return <CallbackSessionClient />
}
