import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
