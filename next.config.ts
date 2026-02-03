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
    webpack: (config, { dev }) => {
        if (dev) {
            config.watchOptions = {
                poll: 800,             // 0.8초마다 변경 사항 강제 확인 (감시자 부활)
                aggregateTimeout: 300,  // 변경 후 0.3초 대기
                ignored: /node_modules|\.git/ // .git 폴더는 무시 (부하 방지)
            };
        }
        return config;
    },
    turbopack: {},
    async headers() {
        return [
            {
                // 모든 API 경로에 대해
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "http://localhost:3000" }, // 보안상 특정 도메인을 넣는 게 좋지만, 개발 중이니 일단 * (모두 허용)
                    { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
                    { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, ngrok-skip-browser-warning" },
                ]
            }
        ]
    }
};

export default nextConfig;
