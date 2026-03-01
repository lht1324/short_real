import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. /admin 하위 경로 보호
  if (path.startsWith('/admin')) {
    const secretParam = request.nextUrl.searchParams.get('secret');
    const adminSecretKey = process.env.ADMIN_SECRET_KEY;

    // secret 파라미터가 없거나, 환경 변수 값과 다르면 메인으로 리다이렉트
    if (!secretParam || secretParam !== adminSecretKey) {
      // 404를 반환하거나 메인으로 보낼 수 있습니다. 여기서는 메인으로 보냅니다.
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // 미들웨어가 실행될 경로 지정
  matcher: [
    '/admin/:path*', // /admin 및 그 하위 모든 경로
  ],
};