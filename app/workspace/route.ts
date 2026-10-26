import { NextRequest, NextResponse } from 'next/server'

// NEXT_PUBLIC_BASE_URL 의존 제거 — 요청 오리진 기준 상대 리다이렉트 (dev/prod 공통)
export async function GET(request: NextRequest) {
    return NextResponse.redirect(new URL('/workspace/dashboard', request.url))
}
