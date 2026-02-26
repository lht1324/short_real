import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';
// docker-compose.yml 확인
const isDocker = process.env.DOCKER === 'true';

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
    ...(isDev && isDocker ? {
        webpack: (config) => {
            config.watchOptions = {
                poll: 800,
                aggregateTimeout: 300,
                ignored: /node_modules|\.git/
            };
            return config;
        }
    } : isDev ? {
        turbopack: {}  // dev 로컬 + production 모두 Turbopack
    } : {

    }),

    async headers() {
        return [
            {
                // 모든 API 경로에 대해
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: process.env.NODE_ENV === 'production' ? "https://shortreal.ai" : "http://localhost:3000" }, // 보안상 특정 도메인을 넣는 게 좋지만, 개발 중이니 일단 * (모두 허용)
                    { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
                    { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, ngrok-skip-browser-warning" },
                ]
            }
        ]
    },

    async rewrites() {
        return [
            {
                source: '/assets/demo/:path*',
                destination: 'https://sqwqmyhniwn4m1bu.public.blob.vercel-storage.com/:path*'
            }
        ]
    }
};

export default nextConfig;
