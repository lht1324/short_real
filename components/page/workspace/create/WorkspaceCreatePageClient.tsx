'use client'

import {memo, useCallback, useEffect, useMemo, useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {
    AlertTriangle,
    X,
    Sparkles,
    ListTodo,
    Plus,
    Play,
    Square,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { openAIClientAPI } from '@/api/client/openAIClientAPI';
import {ScriptGenerationRequest} from "@/api/types/open-ai/ScriptGeneration";
import {Voice} from "@/api/types/eleven-labs/Voice";
import {voiceClientAPI} from "@/api/client/voiceClientAPI";
import {BGMInfo} from "@/api/types/supabase/BackgroundMusics";
import {musicClientAPI} from "@/api/client/musicClientAPI";
import {Style} from "@/api/types/supabase/Styles";
import {VideoGenerationRequest} from "@/api/types/supabase/VideoGenerationTasks";
import {videoClientAPI} from "@/api/client/videoClientAPI";
import {postFetch} from "@/api/client/baseFetch";

interface ThemeFilterData {
    themeName: string,
    isSelected: boolean,
}

function WorkspaceCreatePageClient() {
    // 음성, 음악 선택 기능 추가
    // 음성은 영상 생성할 때 함께 생성한 뒤, 에디터에서 뺀다
    // 음악은 선택한 거 그대로 에디터에서 틀어주고, 실시간으로 바꾸는 것처럼 만들어준다.
    // 자막은 캡션 폰트, 크기, 색상, 위치 정도만.
    // 다 지정됐으면 생성된 영상 + 생성된 음성 + 에디터 최종 음악 + 에디터 최종 자막을 합쳐준다.
    // 음성만 재생성해주는 기능 추가 - 크레딧 받는 걸로

    const [voiceList, setVoiceList] = useState<Voice[]>([]);
    const [backgroundMusicList, setBackgroundMusicList] = useState<BGMInfo[]>([]);
    const [backgroundMusicThemeFilterItemList, setBackgroundMusicThemeFilterItemList] = useState<ThemeFilterData[]>([]);
    const selectedBackgroundMusicList = useMemo(() => {
        return backgroundMusicList.filter((backgroundMusic) => {
            return backgroundMusic.themes.some((theme) => {
                return backgroundMusicThemeFilterItemList.find((themeFilterItem) => {
                    return themeFilterItem.themeName === theme;
                })?.isSelected ?? false;
            })
        })
    }, [backgroundMusicList, backgroundMusicThemeFilterItemList]);

    // Section states
    const [description, setDescription] = useState<string>('');
    const [duration, setDuration] = useState<number>(15);
    const [selectedStyleId, setSelectedStyleId] = useState<string>('');
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    const [selectedBackgroundMusicId, setSelectedBackgroundMusicId] = useState<string>('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [selectedDuration, setSelectedDuration] = useState(15);

    const [videoDataResponse, setVideoDataResponse] = useState({ });
    
    // Audio state management
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
    
    // Collapse states for sections
    const [isStyleExpanded, setIsStyleExpanded] = useState(true);
    const [isVoiceExpanded, setIsVoiceExpanded] = useState(true);
    const [isMusicExpanded, setIsMusicExpanded] = useState(true);

    // 어차피 Scene별로 나눈다고 할 때, 나레이션 만드는 건 그대로 놔둔다
    // 영상을 각 Scene마다 생성한 뒤 합쳐야 하니, 에디터에서 각 Scene 누를 때마다 해당 Scene 영상을 보여주는 거다
    // 나레이션은 Scene마다 생성된 영상에 그대로 보여주는 거고.
    /**
     * 🎨 공식 지원 스타일 (확인된 것들)
     * 애니메이션 스타일
     *
     * Pixar style: 3D 렌더링에 유연하고 일관성 있는 스타일
     * Studio Ghibli: 애니메이션에서 가장 일관성 있게 생성되는 스타일
     * Disney style: 클래식한 서구 만화 스타일
     * Anime style: 일본 애니메이션 스타일 (horror anime 등 세부 변형 가능)
     * Pixel art: 마인크래프트나 메이플스토리 같은 픽셀 아트 Pika Scenes (v2.2) | Image to Video | API Documentation | fal.ai
     *
     * 실사/시네마틱 스타일
     *
     * Stop motion: 찰흙 애니메이션이나 액션 피규어 스타일
     * Claymation: 찰흙 인형 애니메이션
     * Tilt-shift photography: 미니어처 모델 효과
     * Cinematic shots: 영화적 카메라워크
     */
    // Style examples for preview
    const styleList = useMemo((): Style[] => [
        {
            id: 'realistic',
            name: 'Realistic',
            description: 'Photorealistic rendering with high detail and lifelike accuracy.',
            stylePrompt: 'photorealistic, DSLR quality, professional photography, high detail, natural lighting, lifelike textures, 8K resolution, sharp focus',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        {
            id: 'cinematic',
            name: 'Cinematic',
            description: 'Film-like quality with dramatic lighting and professional color grading.',
            stylePrompt: 'cinematic lighting, film grain, dramatic shadows, professional color grading, movie still, widescreen aspect ratio, depth of field',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        {
            id: 'vintage',
            name: 'Vintage',
            description: 'Emulates the look of old film stock with grain, light leaks, and faded colors.',
            stylePrompt: 'vintage photography, film grain, retro colors, aged paper texture, light leaks, faded colors, nostalgic mood, old film aesthetic',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        {
            id: 'line_art',
            name: 'Line Art',
            description: 'Clean, minimalist style focusing on outlines and contours with little to no shading.',
            stylePrompt: 'line art, clean lineart, minimalist design, black and white, simple outlines, no shading, vector style, contour drawing',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        {
            id: 'cartoon',
            name: 'Cartoon',
            description: 'Stylized with exaggerated features, bold outlines, and vibrant, flat colors.',
            stylePrompt: 'cartoon style, bold outlines, flat colors, exaggerated features, vibrant colors, cell shading, animated style, colorful',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        {
            id: 'anime',
            name: 'Anime',
            description: 'Japanese animation style, characterized by large expressive eyes and vibrant scenes.',
            stylePrompt: 'anime style, manga art, cel-shading, vibrant colors, Japanese animation, large expressive eyes, clean lineart, anime aesthetic',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        {
            id: 'pop_art',
            name: 'Pop Art',
            description: 'Inspired by Andy Warhol, featuring bold, saturated colors and comic book aesthetics.',
            stylePrompt: 'pop art, Andy Warhol style, bold saturated colors, comic book aesthetic, halftone dots, high contrast, retro poster style',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        {
            id: 'pixel_art',
            name: 'Pixel Art',
            description: 'Retro digital art made of visible pixels, reminiscent of 8-bit and 16-bit video games.',
            stylePrompt: 'pixel art, 8-bit style, 16-bit graphics, retro gaming, visible pixels, low resolution, pixelated, retro digital art',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        {
            id: 'concept_art',
            name: 'Concept Art',
            description: 'Painterly and atmospheric style used in film and game development to visualize ideas.',
            stylePrompt: 'concept art, digital painting, atmospheric lighting, painterly style, matte painting, cinematic concept, detailed artwork',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        {
            id: 'steampunk',
            name: 'Steampunk',
            description: 'A retrofuturistic style combining Victorian-era aesthetics with industrial steam-powered machinery.',
            stylePrompt: 'steampunk aesthetic, Victorian era, brass machinery, industrial design, steam-powered, gears and cogs, retrofuturistic, copper tones',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        {
            id: 'neon_synth',
            name: 'Neon Synth',
            description: 'An 80s retro-futuristic aesthetic with glowing neon grids, vibrant pinks, and purples.',
            stylePrompt: 'synthwave aesthetic, neon lights, 80s retro, glowing grids, vibrant pinks and purples, cyberpunk neon, retrowave, vaporwave',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        {
            id: 'cyberpunk',
            name: 'Cyberpunk',
            description: 'A dystopian futuristic setting with neon-drenched cityscapes and advanced technology.',
            stylePrompt: 'cyberpunk aesthetic, neon-drenched cityscape, futuristic technology, dark atmosphere, sci-fi, dystopian future, holographic displays',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        {
            id: 'fantasy',
            name: 'Fantasy',
            description: 'Epic and magical settings featuring mythical creatures, castles, and enchanted forests.',
            stylePrompt: 'fantasy art, magical atmosphere, mythical creatures, enchanted forest, medieval castles, epic landscape, mystical lighting, magical realism',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        {
            id: 'gothic',
            name: 'Gothic',
            description: 'A dark, mysterious, and moody style with macabre themes and ornate architecture.',
            stylePrompt: 'gothic architecture, dark atmosphere, mysterious mood, ornate details, dramatic shadows, macabre themes, medieval gothic, dark romanticism',
            thumbnailUrl: '/api/placeholder/200/356'
        }
    ], []);

    // Virtual tabs for navigation consistency
    const virtualTabs = useMemo(() => [
        { id: 'dashboard', icon: ListTodo, name: 'Tasks', href: '/workspace/dashboard' },
        { id: 'create', icon: Plus, name: 'Create', href: '/workspace/create', active: true }
    ], []);

    const onGenerateScript = useCallback(async () => {
        if (!aiPrompt.trim()) return;
        
        setIsGenerating(true);
        
        try {
            // API 요청 데이터 구성
            const requestData: ScriptGenerationRequest = {
                userPrompt: aiPrompt,
                duration: duration,
            };

            console.log('Generating script with data:', requestData);

            // OpenAI API 호출
            const result = await openAIClientAPI.postScript(requestData);

            if (result && result.success && result.data) {
                console.log("Script generation result", result);
                console.log('Script generated successfully:', result.data);
                setDescription(result.data.script);
                setIsGenerating(false);
                setShowAIModal(false);
                setAiPrompt('');
            } else {
                console.error('Script generation failed:', result?.error);
                alert(result?.error?.message || 'Failed to generate script. Please try again.');
                setIsGenerating(false);
            }

        } catch (error) {
            console.error('Error generating script:', error);
            alert('An error occurred while generating script. Please try again.');
            setIsGenerating(false);
        }
    }, [aiPrompt, duration]);

    const openAIModal = useCallback(() => {
        setShowAIModal(true);
    }, []);

    const closeAIModal = useCallback(() => {
        setShowAIModal(false);
        setAiPrompt('');
        setIsGenerating(false);
    }, []);

    const onClickPlaySoundPreview = useCallback((soundId: string, soundPreviewUrl?: string) => {
        // 음성 재생 중 다른 음성 재생
        if (playingSoundId !== soundId && currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            setCurrentAudio(null);
            setPlayingSoundId(null);
        }

        // 새로운 음성 재생
        if (soundPreviewUrl) {
            const audio = new Audio(soundPreviewUrl);
            
            // 재생 종료 시 state 초기화 (해당 오디오만)
            audio.addEventListener('ended', () => {
                setCurrentAudio((current) => {
                    if (current === audio) {
                        setPlayingSoundId(null);
                        return null;
                    }

                    return current;
                });
            });

            // 에러 처리 (해당 오디오만)
            audio.addEventListener('error', (error) => {
                console.error('Audio playback error:', error);
                setCurrentAudio((current) => {
                    if (current === audio) {
                        setPlayingSoundId(null);
                        return null;
                    }
                    return current;
                });
            });

            audio.play().then(() => {
                setCurrentAudio(audio);
                setPlayingSoundId(soundId);
            }).catch((error) => {
                console.error('Failed to play audio:', error);
                setCurrentAudio(null);
                setPlayingSoundId(null);
                // 재생 실패 시에만 state 초기화 (기존 오디오는 그대로 유지)
            });
        } else {
            console.log('No preview URL available for:', soundId);
        }
    }, [currentAudio, playingSoundId]);
    
    const onClickStopSoundPreview = useCallback(() => {
        currentAudio?.pause();
        setCurrentAudio(null);
        setPlayingSoundId(null);
    }, [currentAudio]);

    // 예상 영상 시간 계산 (2.5단어/초 기준)
    const estimatedDuration = useMemo(() => {
        if (!description.trim()) return 0;
        const wordCount = description.split(' ').length;
        return Math.round(wordCount / 2.5);
    }, [description]);

    const onSubmitProject = useCallback(async () => {
        if (!description.trim()) {
            alert('스크립트를 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        
        try {
            // 선택된 스타일, 음성, 음악 정보 가져오기
            const selectedStyle = styleList.find((style) => {
                return style.id === selectedStyleId;
            });
            const selectedVoice = voiceList.find((voice) => {
                return voice.id === selectedVoiceId;
            });
            const selectedMusic = backgroundMusicList.find((backgroundMusic) => {
                return backgroundMusic.id === selectedBackgroundMusicId;
            });

            // VideoData API 요청 데이터 구성
            const requestData: VideoGenerationRequest = {
                userId: "",
                narrationScript: description,
                duration: duration,
                style: selectedStyle,
                voice: selectedVoice,
                music: selectedMusic,
            };

            console.log('Creating video project with data:', requestData);

            // Video API 호출
            const result = await videoClientAPI.postVideoGeneration(requestData);

            if (result) {
                console.log('Video data generation succeed.');
                // setVideoDataResponse(result.data);
                
                // 성공 시 대시보드로 이동
                alert('비디오 프로젝트 생성이 완료되었습니다!');
                // window.location.href = '/workspace/dashboard';
            } else {
                console.error('Video data generation failed.');
                alert('비디오 프로젝트 생성에 실패했습니다. 다시 시도해주세요.');
                throw Error('Video data generation failed.');
            }

        } catch (error) {
            console.error('Error creating video project:', error);
            alert('비디오 프로젝트 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    }, [description, duration, selectedStyleId, selectedVoiceId, selectedBackgroundMusicId, styleList, voiceList, backgroundMusicList]);

    const requestIdList = useMemo(() => {
        return [
            "3fstybtmjhrm80cs8cevx5g1r0",
            "dnje5ptmd1rme0cs8cer2f29sr",
            "5bmpfvtmr5rme0cs8ces82rt9r",
            "x8yrzd2khsrmc0cs8cev8zjc3m",
            "zthtr9tkm5rmc0cs8cesqzj08m"
        ]
    }, []);

    const videoUrlList = useMemo(() => {
        return [
            "https://tbgymsmwuljvewatnvqg.supabase.co/storage/v1/object/sign/processed_video_storage/3fstybtmjhrm80cs8cevx5g1r0.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZjk2NWFiNi1hYmE4LTRkYTEtYTM5Yy0yMDk3ZmQ1ZGU1MGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9jZXNzZWRfdmlkZW9fc3RvcmFnZS8zZnN0eWJ0bWpocm04MGNzOGNldng1ZzFyMC5tcDQiLCJpYXQiOjE3NTc3Njc5NjUsImV4cCI6MTc4OTMwMzk2NX0.A3o-tGQWw5oVgNNfWBXJZ9I5tY9OCbzfYcU_K2WpP-0",
            "https://tbgymsmwuljvewatnvqg.supabase.co/storage/v1/object/sign/processed_video_storage/dnje5ptmd1rme0cs8cer2f29sr.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZjk2NWFiNi1hYmE4LTRkYTEtYTM5Yy0yMDk3ZmQ1ZGU1MGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9jZXNzZWRfdmlkZW9fc3RvcmFnZS9kbmplNXB0bWQxcm1lMGNzOGNlcjJmMjlzci5tcDQiLCJpYXQiOjE3NTc3Njc5NzgsImV4cCI6MTc4OTMwMzk3OH0.gRY8mXPnck57IaQzBjCCisKDCg-CecFjN4rD1DPwIuw",
            "https://tbgymsmwuljvewatnvqg.supabase.co/storage/v1/object/sign/processed_video_storage/5bmpfvtmr5rme0cs8ces82rt9r.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZjk2NWFiNi1hYmE4LTRkYTEtYTM5Yy0yMDk3ZmQ1ZGU1MGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9jZXNzZWRfdmlkZW9fc3RvcmFnZS81Ym1wZnZ0bXI1cm1lMGNzOGNlczgycnQ5ci5tcDQiLCJpYXQiOjE3NTc3Njc5OTYsImV4cCI6MTc4OTMwMzk5Nn0.MM31D3yOH7_WubhiA0eRoWg_29fMMEyoe_25FUkAABo",
            "https://tbgymsmwuljvewatnvqg.supabase.co/storage/v1/object/sign/processed_video_storage/x8yrzd2khsrmc0cs8cev8zjc3m.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZjk2NWFiNi1hYmE4LTRkYTEtYTM5Yy0yMDk3ZmQ1ZGU1MGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9jZXNzZWRfdmlkZW9fc3RvcmFnZS94OHlyemQya2hzcm1jMGNzOGNldjh6amMzbS5tcDQiLCJpYXQiOjE3NTc3NjgwMDgsImV4cCI6MTc4OTMwNDAwOH0.5EgQf1E2BoCdAhUzTuvYoOVNXlhu97FVTs1JTPEC4gc",
            "https://tbgymsmwuljvewatnvqg.supabase.co/storage/v1/object/sign/processed_video_storage/zthtr9tkm5rmc0cs8cesqzj08m.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZjk2NWFiNi1hYmE4LTRkYTEtYTM5Yy0yMDk3ZmQ1ZGU1MGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9jZXNzZWRfdmlkZW9fc3RvcmFnZS96dGh0cjl0a201cm1jMGNzOGNlc3F6ajA4bS5tcDQiLCJpYXQiOjE3NTc3NjgwMjEsImV4cCI6MTc4OTMwNDAyMX0.d0ywlFVanLdBub6fJ1CqpZAkwYq7A87Z8kM9KJmTwxw"
        ]
    }, []);
    const onTestWebhook = useCallback(async () => {
        for (let i = 0; i < requestIdList.length; i++) {
            try {
                await postFetch(`/webhook/replicate?generationTaskId=ea380b39-0761-4936-a684-c5685ee6fd42`, {
                    id: requestIdList[i],
                    output: videoUrlList[i],
                    // "starting" | "processing" | "succeeded" | "failed" | "canceled" | "aborted"
                    status: "succeeded",
                    error: undefined,
                });

                // 마지막 요청이 아닌 경우에만 딜레이 적용
                if (i < requestIdList.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                console.log(`Webhook test ${i + 1} succeeded.`);
            } catch (error) {
                console.error(`Webhook test ${i + 1} failed:`, error);
            }
        }
    }, [requestIdList, videoUrlList]);

    useEffect(() => {
        const loadData = async () => {
            const voiceDataList = await voiceClientAPI.getVoices();
            const bgmDataList = await musicClientAPI.getBackgroundMusics();

            console.log("voiceDataList", voiceDataList);
            setVoiceList(voiceDataList);
            setBackgroundMusicList(bgmDataList);

            // themes 추출 및 중복 제거 후 ThemeFilterData로 매핑
            const allThemes = bgmDataList.flatMap(bgm => bgm.themes);
            const uniqueThemes = [...new Set(allThemes)];
            const themeFilterItems: ThemeFilterData[] = uniqueThemes.map(theme => ({
                themeName: theme,
                isSelected: true // 기본적으로 모든 theme 선택됨
            }));
            setBackgroundMusicThemeFilterItemList(themeFilterItems);
        }

        loadData().then();
    }, []);

    // 컴포넌트 언마운트 시 오디오 정리
    useEffect(() => {
        return () => {
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
                setCurrentAudio(null);
                setPlayingSoundId(null);
            }
        };
    }, [currentAudio]);

    // API 엔드포인트 미리 컴파일 (Next.js 서버리스 함수 초기화)
    useEffect(() => {
        const precompileAPIs = async () => {
            try {
                console.log('Pre-compiling API routes...');
                
                // 모든 API 라우트들을 병렬로 프리컴파일
                const apiRoutes = [
                    '/api/open-ai/script',
                    '/api/video',
                    '/api/video/merge',
                    '/webhook/replicate'
                ];
                
                const precompilePromises = apiRoutes.map(route => 
                    fetch(route, { 
                        method: 'OPTIONS',
                        headers: { 'Content-Type': 'application/json' }
                    }).catch(() => {}) // 에러 무시
                );
                
                await Promise.all(precompilePromises);
                console.log('All API routes pre-compiled');
            } catch (error) {
                console.log('API pre-compilation completed:', error);
            }
        };
        
        // 컴포넌트 마운트 후 바로 실행
        precompileAPIs().then();
    }, []);

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Top Header - Same as Editor */}
            <div className="flex items-center justify-between py-4 border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-sm">
                <div className="flex items-center" style={{paddingLeft: '16px'}}>
                    <Image
                        src="/logo/logo-64.png"
                        alt="Short Real"
                        width={64}
                        height={64}
                        className="w-16 h-16"
                    />
                    <div className="flex flex-col ml-4">
                        <span className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent cursor-default">
                            Create Video
                        </span>
                        <p className="text-gray-400 text-base pl-0.5 cursor-default">
                            Tell AI what you want to create.
                        </p>
                    </div>
                </div>
            </div>

            {/* Vaporwave Background Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-3xl"></div>
            </div>

            <div className="flex h-[calc(100vh-97px)]">
                {/* Left Virtual Tab Sidebar */}
                <div className="w-20 bg-gray-900/50 backdrop-blur-sm border-r border-purple-500/20 flex flex-col items-center py-4 space-y-4">
                    {virtualTabs.map((tab) => {
                        const IconComponent = tab.icon;
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-all border ${
                                    tab.active 
                                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-purple-400/50 shadow-lg' 
                                        : 'text-gray-400 hover:text-pink-400 hover:bg-gray-800/50 border-transparent hover:border-purple-500/30'
                                }`}
                                title={tab.name}
                            >
                                <IconComponent size={24} />
                                <span className="text-sm mt-1 leading-tight">{tab.name}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Create Form Panel */}
                <div className="flex-1 bg-gray-900/30 backdrop-blur-sm border-r border-purple-500/20 overflow-y-auto">
                    <div className="p-6">
                        <div className="text-purple-300 text-2xl font-medium mb-6">Create New Video</div>
                        
                        <div className="space-y-6">

                            {/* Script Section */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <label className="block text-xl font-semibold text-purple-300">
                                            Script
                                        </label>
                                        {description.trim() && (
                                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-sm font-medium rounded border border-blue-400/30">
                                                ~{estimatedDuration}s
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openAIModal}
                                        className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center space-x-1"
                                    >
                                        <Sparkles size={14} />
                                        <span>Generate with AI</span>
                                    </button>
                                </div>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what you want to create. Be as detailed as possible..."
                                    rows={6}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all resize-none text-base"
                                />
                            </div>

                            {/* VideoData API Test Section */}
                            <div>
                                <label className="block text-xl font-medium text-white mb-3">
                                    VideoData API Test
                                </label>
                                <div className="bg-gray-800/50 border border-purple-500/30 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-purple-300 text-sm font-medium">JSON Response</span>
                                        <button
                                            onClick={onTestWebhook}
                                            type="button"
                                            className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-300"
                                        >
                                            Test VideoData API
                                        </button>
                                    </div>
                                    <pre className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3 text-xs text-green-400 overflow-x-auto font-mono">
                                        {JSON.stringify(videoDataResponse, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            {/* Duration Selection */}
                            <div>
                                <label className="block text-xl font-medium text-white mb-3">
                                    Duration
                                </label>
                                <div className="flex gap-3">
                                    {[15, 30].map(seconds => (
                                        <button
                                            key={seconds}
                                            onClick={() => setDuration(seconds)}
                                            className={`px-4 py-2 rounded-lg text-base font-medium transition-all ${
                                                duration === seconds
                                                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border border-pink-400/50'
                                                    : 'bg-gray-800/30 text-gray-300 hover:bg-gray-700/50 border border-purple-500/30'
                                            }`}
                                        >
                                            {seconds}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Visual Style Cards */}
                            <div>
                                <button 
                                    type="button"
                                    onClick={() => setIsStyleExpanded(!isStyleExpanded)}
                                    className="flex items-center text-xl font-medium text-white mb-3 hover:text-purple-300 transition-colors"
                                >
                                    <span>Visual Style</span>
                                    <span className="ml-2">
                                        {isStyleExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    </span>
                                </button>
                                {isStyleExpanded && (
                                    <div className="grid grid-cols-2 gap-3">
                                    {styleList.map((style) => (
                                        <button
                                            key={style.id}
                                            onClick={() => { setSelectedStyleId(style.id); }}
                                            className={`p-3 rounded-lg border transition-all text-left ${
                                                selectedStyleId === style.id
                                                    ? 'border-pink-500 bg-pink-500/10'
                                                    : 'border-purple-500/30 bg-gray-800/30 hover:border-purple-400/50'
                                            }`}
                                        >
                                            <div className="text-white font-medium text-base">{style.name}</div>
                                            <div className="text-gray-400 text-sm mt-1">{style.description}</div>
                                        </button>
                                    ))}
                                    </div>
                                )}
                            </div>

                            {/* Voice Selection */}
                            <div>
                                <button 
                                    type="button"
                                    onClick={() => setIsVoiceExpanded(!isVoiceExpanded)}
                                    className="flex items-center text-xl font-medium text-white mb-3 hover:text-purple-300 transition-colors"
                                >
                                    <span>Voice</span>
                                    <span className="ml-2">
                                        {isVoiceExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    </span>
                                </button>
                                {isVoiceExpanded && (
                                    <div className="grid grid-cols-2 gap-3">
                                    {voiceList.map((voice) => {
                                        const labels = voice.labels;
                                        const genderIcon = labels?.gender === 'male' ? '♂' : labels?.gender === 'female' ? '♀' : '';
                                        const ageDisplay = labels?.age === 'young' ? 'Young' : labels?.age === 'middle_aged' ? 'Adult' : labels?.age === 'old' ? 'Senior' : '';
                                        const accentDisplay = labels?.accent === 'american' ? 'US' : labels?.accent === 'british' ? 'UK' : labels?.accent === 'australian' ? 'AU' : labels?.accent || '';
                                        
                                        return (
                                            <div
                                                key={voice.id}
                                                onClick={() => setSelectedVoiceId(voice.id)}
                                                className={`p-3 rounded-lg border transition-all text-left cursor-pointer ${
                                                    voice.id === selectedVoiceId
                                                        ? 'border-pink-500 bg-pink-500/10'
                                                        : 'border-purple-500/30 bg-gray-800/30 hover:border-purple-400/50'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="text-white font-medium text-base">{voice.name}</div>
                                                            {genderIcon && (
                                                                <span className="text-purple-300 text-sm font-medium">{genderIcon}</span>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Labels as tags */}
                                                        <div className="flex flex-wrap gap-1 mb-2">
                                                            {ageDisplay && (
                                                                <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">
                                                                    {ageDisplay}
                                                                </span>
                                                            )}
                                                            {accentDisplay && (
                                                                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded border border-green-400/30">
                                                                    {accentDisplay}
                                                                </span>
                                                            )}
                                                            {labels?.descriptive && (
                                                                <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-400/30">
                                                                    {labels.descriptive}
                                                                </span>
                                                            )}
                                                            {labels?.use_case && (
                                                                <span className="text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded border border-orange-400/30">
                                                                    {labels.use_case.replace('_', ' ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="text-gray-300 text-sm leading-relaxed mt-2 break-words">
                                                            {voice.description}
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="p-1.5 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors flex-shrink-0 ml-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();

                                                            if (!currentAudio || playingSoundId !== voice.id) {
                                                                onClickPlaySoundPreview(voice.id, voice.previewUrl);
                                                            } else {
                                                                onClickStopSoundPreview();
                                                            }
                                                        }}
                                                    >
                                                        {playingSoundId === voice.id ? (
                                                            <Square size={14} className="text-white" />
                                                        ) : (
                                                            <Play size={14} className="text-white" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    </div>
                                )}
                            </div>

                            {/* Background Music Selection */}
                            <div>
                                <button 
                                    type="button"
                                    onClick={() => setIsMusicExpanded(!isMusicExpanded)}
                                    className="flex items-center text-xl font-medium text-white mb-3 hover:text-purple-300 transition-colors"
                                >
                                    <span>Background Music</span>
                                    <span className="ml-2">
                                        {isMusicExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    </span>
                                </button>
                                {isMusicExpanded && (
                                    <div className="space-y-4">
                                        {/* Theme Filter */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <label className="text-sm font-medium text-purple-300">
                                                    Filter by Theme
                                                </label>
                                                {/* 전체 선택 버튼 */}
                                                <button
                                                    onClick={() => {
                                                        const allSelected = backgroundMusicThemeFilterItemList.every(item => item.isSelected);
                                                        setBackgroundMusicThemeFilterItemList(prev => 
                                                            prev.map(item => ({ ...item, isSelected: !allSelected }))
                                                        );
                                                    }}
                                                    className="text-xs px-2 py-1 rounded border bg-pink-500/20 text-pink-300 border-pink-400/50 font-medium hover:bg-pink-500/30 transition-all"
                                                >
                                                    {backgroundMusicThemeFilterItemList.every(item => item.isSelected) ? 'Deselect All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {backgroundMusicThemeFilterItemList.map((themeFilter) => (
                                                    <button
                                                        key={themeFilter.themeName}
                                                        onClick={() => {
                                                            setBackgroundMusicThemeFilterItemList(prev => 
                                                                prev.map(item => 
                                                                    item.themeName === themeFilter.themeName 
                                                                        ? { ...item, isSelected: !item.isSelected }
                                                                        : item
                                                                )
                                                            );
                                                        }}
                                                        className={`text-xs px-2 py-1 rounded border transition-all ${
                                                            themeFilter.isSelected
                                                                ? 'bg-purple-500/20 text-purple-300 border-purple-400/50'
                                                                : 'bg-gray-700/50 text-gray-400 border-gray-600/50 hover:bg-gray-600/50'
                                                        }`}
                                                    >
                                                        {themeFilter.themeName}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Music Grid */}
                                        <div className="grid grid-cols-2 gap-3">
                                        {selectedBackgroundMusicList.map((backgroundMusic) => (
                                            <div
                                                key={backgroundMusic.id}
                                                onClick={() => setSelectedBackgroundMusicId(backgroundMusic.id)}
                                                className={`p-3 rounded-lg border transition-all text-left cursor-pointer ${
                                                    selectedBackgroundMusicId === backgroundMusic.id
                                                        ? 'border-pink-500 bg-pink-500/10'
                                                        : 'border-purple-500/30 bg-gray-800/30 hover:border-purple-400/50'
                                                }`}
                                            >
                                            <div className="flex items-center justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-white font-medium text-base truncate">{backgroundMusic.title}</div>
                                                    <div className="text-gray-400 text-sm truncate">{backgroundMusic.themes.join(', ')}</div>
                                                </div>
                                                <button
                                                    className="p-1.5 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors flex-shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();

                                                        if (!currentAudio || playingSoundId !== backgroundMusic.id) {
                                                            onClickPlaySoundPreview(backgroundMusic.id, backgroundMusic.previewUrl);
                                                        } else {
                                                            onClickStopSoundPreview();
                                                        }
                                                    }}
                                                >
                                                    {playingSoundId === backgroundMusic.id ? (
                                                        <Square size={14} className="text-white" />
                                                    ) : (
                                                        <Play size={14} className="text-white" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Style Preview Panel */}
                <div className="flex-1 bg-black flex flex-col relative">
                    {/* Vaporwave Background Effects */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-3xl"></div>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center px-8 py-2 relative z-10">
                        <div className="text-center">
                            <h3 className="text-purple-300 text-2xl font-medium mb-6">
                                Style Preview
                            </h3>
                            
                            {/* Selected Style Preview */}
                            <div className="w-[280px] bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-purple-500/30 overflow-hidden shadow-2xl mx-auto" style={{aspectRatio: '9/16'}}>
                                {selectedStyleId ? (
                                    <div className="w-full h-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 flex items-center justify-center relative">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                                        
                                        {/* Preview Content */}
                                        <div className="text-center relative z-10">
                                            <div className="w-16 h-16 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto border border-purple-400/50">
                                                <Play size={24} className="text-white ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-800 to-gray-900">
                                        <p className="text-sm">Style preview</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Style Info */}
                            <div className="mt-6 text-center">
                                <p className="text-purple-300 text-base mb-1">
                                    Selected: <span className="text-white font-medium text-lg">{styleList.find((style) => { return style.id === selectedStyleId; })?.name || selectedStyleId}</span>
                                </p>
                                <p className="text-gray-300 text-sm mb-3">
                                    {styleList.find((style) => { return style.id === selectedStyleId; })?.description}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    This preview shows how your video will look with the selected visual style.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 border-t border-purple-500/20 bg-gray-900/50 backdrop-blur-sm relative z-10">
                        <button
                            onClick={onSubmitProject}
                            disabled={!description || isSubmitting}
                            className="mx-auto max-w-xs w-full group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-4 rounded-xl text-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Requesting...</span>
                                </>
                            ) : (
                                <>
                                    <span>Generate Video</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* AI Generation Modal */}
                {showAIModal && (
                    <div
                        onClick={closeAIModal}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                    >
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gray-900/95 backdrop-blur-sm border border-purple-500/30 rounded-xl max-w-lg w-full mx-4 overflow-hidden shadow-2xl"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-purple-300">
                                        Generate Script with AI
                                    </h3>
                                    <button
                                        onClick={closeAIModal}
                                        className="text-gray-400 hover:text-pink-400 transition-colors p-1 rounded-lg hover:bg-gray-800/50"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">What do you want to create?</label>
                                        <textarea 
                                            placeholder="Tell me about Elon Musk's early SpaceX struggles"
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            rows={4}
                                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-400 focus:outline-none resize-none placeholder-gray-400 transition-all"
                                        />
                                    </div>
                                    
                                    {/* Duration Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Length</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[15, 30].map(seconds => (
                                                <button
                                                    key={seconds}
                                                    onClick={() => setDuration(seconds)}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                                        duration === seconds
                                                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border border-pink-400/50'
                                                            : 'bg-gray-800/30 text-gray-300 hover:bg-gray-700/50 border border-purple-500/30'
                                                    }`}
                                                >
                                                    {seconds}s
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Warning Message - Simplified */}
                                    <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3">
                                        <div className="flex items-start space-x-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-sm text-amber-100">
                                                <p className="font-medium">Be specific to avoid wasting credits</p>
                                                <p className="text-xs text-amber-200 mt-1">Vague requests may produce unwanted results.</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={onGenerateScript} 
                                        disabled={isGenerating || !aiPrompt.trim()}
                                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Generating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={16} />
                                                <span>Generate Script</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default memo(WorkspaceCreatePageClient);