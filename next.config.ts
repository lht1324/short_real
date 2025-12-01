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
    webpack: (config, { isServer }) => {
        // 서버 측에서만 이 설정을 적용합니다.
        if (isServer) {
            config.resolve.mainFields = ['main', 'module'];
        }

        // ffprobe-installer의 README.md 파일 처리 문제 해결
        config.module.rules.push({
            test: /\.md$/,
            type: 'asset/source',
        });

        // ffprobe-installer의 불필요한 파일들을 무시
        config.resolve.alias = {
            ...config.resolve.alias,
            '@ffprobe-installer/ffprobe/README.md': false,
        };

        // 수정된 설정을 반환합니다.
        return config;
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
