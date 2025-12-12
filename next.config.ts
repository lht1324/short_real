import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // 외부 이미지 허용
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'tbgymsmwuljvewatnvqg.supabase.co',
                port: '',
                pathname: '/**',
            },
        ]
    },
    async headers() {
        return [
            {
                // 모든 API 경로에 대해
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "*" }, // 보안상 특정 도메인을 넣는 게 좋지만, 개발 중이니 일단 * (모두 허용)
                    { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
                    { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, ngrok-skip-browser-warning" },
                ]
            }
        ]
    }
};

export default nextConfig;
