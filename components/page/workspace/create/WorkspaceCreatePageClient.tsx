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
    Film,
} from 'lucide-react';
import { openAIClientAPI } from '@/api/client/openAIClientAPI';
import {ScriptGenerationRequest} from "@/api/types/open-ai/ScriptGeneration";
import {Voice} from "@/api/types/eleven-labs/Voice";
import {voiceClientAPI} from "@/api/client/voiceClientAPI";
import {Style} from "@/api/types/supabase/Styles";
import {SceneData, VideoGenerationRequest} from "@/api/types/supabase/VideoGenerationTasks";
import {videoClientAPI} from "@/api/client/videoClientAPI";
import {postFetch} from "@/api/client/baseFetch";
import {StoryboardData} from "@/app/api/open-ai/scene/PostSceneResponse";
import StoryboardItem from "@/components/page/workspace/create/StoryboardItem";

function WorkspaceCreatePageClient() {
    // 음성, 음악 선택 기능 추가
    // 음성은 영상 생성할 때 함께 생성한 뒤, 에디터에서 뺀다
    // 음악은 선택한 거 그대로 에디터에서 틀어주고, 실시간으로 바꾸는 것처럼 만들어준다.
    // 자막은 캡션 폰트, 크기, 색상, 위치 정도만.
    // 다 지정됐으면 생성된 영상 + 생성된 음성 + 에디터 최종 음악 + 에디터 최종 자막을 합쳐준다.
    // 음성만 재생성해주는 기능 추가 - 크레딧 받는 걸로

    const [voiceList, setVoiceList] = useState<Voice[]>([]);
    const [voiceTagRecord, setVoiceTagRecord] = useState<Record<string, boolean>>({ });
    const isAllTagSelected = useMemo(() => {
        return Object.values(voiceTagRecord).every((isTagSelected) => isTagSelected);
    }, [voiceTagRecord]);
    const filteredVoiceList = useMemo(() => {
        return voiceList.filter((voice) => {
            return voiceTagRecord[voice.labels.gender] || voiceTagRecord[voice.labels.age];
        })
    }, [voiceList, voiceTagRecord]);

    // Section states
    const [script, setScript] = useState<string>('');
    const [selectedStyleId, setSelectedStyleId] = useState<string>('');
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    
    // Storyboard states
    const [sceneDataList, setSceneDataList] = useState<SceneData[]>([]);
    const [videoMainSubject, setVideoMainSubject] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingStoryboardData, setIsGeneratingStoryboardData] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    
    // Audio state management
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
    
    // Collapse states for sections
    const [isStyleExpanded, setIsStyleExpanded] = useState(true);

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
            };

            console.log('Generating script with data:', requestData);

            // OpenAI API 호출
            const result = await openAIClientAPI.postOpenAIScript(requestData);

            if (result && result.success && result.data) {
                console.log("Script generation result", result);
                console.log('Script generated successfully:', result.data);
                setScript(result.data.script);
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
    }, [aiPrompt]);
    
    const onClickGenerateStoryboard = useCallback(async () => {
        try {
            if (!script || !selectedVoiceId) {
                throw new Error("Write script or select voice first.")
            }

            setIsGeneratingStoryboardData(true);

            const result: StoryboardData | null = await openAIClientAPI.postOpenAIScene({
                narrationScript: script,
                voiceId: selectedVoiceId,
            });
            
            if (!result || !result.sceneDataList || !result.videoMainSubject) {
                throw new Error("Storyboard generation is failed.")
            }
            
            const newSceneDataList = result.sceneDataList;
            const newVideoMainSubject = result.videoMainSubject;
            
            setSceneDataList(newSceneDataList);
            setVideoMainSubject(newVideoMainSubject);

            setIsGeneratingStoryboardData(false);
        } catch (error) {
            console.error('onClickGenerateStoryboard', error);
            alert('An error occurred while generating script. Please try again.');
            setIsGeneratingStoryboardData(false);
        }
    }, [script, selectedVoiceId]);

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
        if (!script.trim()) return 0;
        const wordCount = script.split(' ').length;
        return Math.round(wordCount / 2.5);
    }, [script]);

    const onSubmitProject = useCallback(async () => {
        if (!script.trim()) {
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

            // VideoData API 요청 데이터 구성
            const requestData: VideoGenerationRequest = {
                userId: "",
                narrationScript: script,
                style: selectedStyle,
                voice: selectedVoice,
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
    }, [script, selectedStyleId, selectedVoiceId, styleList, voiceList]);

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
            "https://tbgymsmwuljvewatnvqg.supabase.co/storage/v1/object/sign/processed_video_storage/jhebnme2v1rm80csbbptfpqber.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZjk2NWFiNi1hYmE4LTRkYTEtYTM5Yy0yMDk3ZmQ1ZGU1MGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9jZXNzZWRfdmlkZW9fc3RvcmFnZS9qaGVibm1lMnYxcm04MGNzYmJwdGZwcWJlci5tcDQiLCJpYXQiOjE3NTgyNzk1MTgsImV4cCI6MTc4OTgxNTUxOH0.pf1J1oCPsZFVcUFOtnjZp7JMrNvEsOev1BsRf7U198w",
            "https://tbgymsmwuljvewatnvqg.supabase.co/storage/v1/object/sign/processed_video_storage/n5h5k5e2zdrma0csbbptq7xcq0.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZjk2NWFiNi1hYmE4LTRkYTEtYTM5Yy0yMDk3ZmQ1ZGU1MGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9jZXNzZWRfdmlkZW9fc3RvcmFnZS9uNWg1azVlMnpkcm1hMGNzYmJwdHE3eGNxMC5tcDQiLCJpYXQiOjE3NTgyNzk1MjgsImV4cCI6MTc4OTgxNTUyOH0.ARTmGkgTsSvbflZb7orYGmnwMonz-ZPff9WAR9Kfhig",
            "https://tbgymsmwuljvewatnvqg.supabase.co/storage/v1/object/sign/processed_video_storage/24qj3ve2vxrme0csbbpre22aew.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZjk2NWFiNi1hYmE4LTRkYTEtYTM5Yy0yMDk3ZmQ1ZGU1MGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9jZXNzZWRfdmlkZW9fc3RvcmFnZS8yNHFqM3ZlMnZ4cm1lMGNzYmJwcmUyMmFldy5tcDQiLCJpYXQiOjE3NTgyNzk1NjcsImV4cCI6MTc4OTgxNTU2N30.PoZ8hpqBHiG0w0JBZLbu6HEBAO0gga70A0iFmwgfUGE",
            "https://tbgymsmwuljvewatnvqg.supabase.co/storage/v1/object/sign/processed_video_storage/ejtpsvy2x5rmc0csbbpte50q0m.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZjk2NWFiNi1hYmE4LTRkYTEtYTM5Yy0yMDk3ZmQ1ZGU1MGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9jZXNzZWRfdmlkZW9fc3RvcmFnZS9lanRwc3Z5Mng1cm1jMGNzYmJwdGU1MHEwbS5tcDQiLCJpYXQiOjE3NTgyNzk1NzYsImV4cCI6MTc4OTgxNTU3Nn0.i5ys7M2cAdwsDOzgXw_aWc_E8Yd1kBV9bgSdJFI9Xjw",
            "https://tbgymsmwuljvewatnvqg.supabase.co/storage/v1/object/sign/processed_video_storage/w59ebwe2vdrmc0csbbprhab7qw.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZjk2NWFiNi1hYmE4LTRkYTEtYTM5Yy0yMDk3ZmQ1ZGU1MGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9jZXNzZWRfdmlkZW9fc3RvcmFnZS93NTllYndlMnZkcm1jMGNzYmJwcmhhYjdxdy5tcDQiLCJpYXQiOjE3NTgyNzk1ODgsImV4cCI6MTc4OTgxNTU4OH0.GMPY4WHyWD1N0hHRBmqfo5TeMw6A-QWyz03fpQ_wPXs"
        ]
    }, []);
    const onTestWebhook = useCallback(async () => {
        for (let i = 0; i < requestIdList.length; i++) {
            try {
                await postFetch(`/webhook/replicate?generationTaskId=1519017a-1f2f-4c59-8ef1-4b8d692e7905`, {
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

            // 모든 gender와 age 값들을 수집
            const allTags = new Set<string>();

            voiceDataList.forEach((voiceData) => {
                const labels = voiceData.labels;
                if (labels?.gender) {
                    allTags.add(labels.gender);
                }
                if (labels?.age) {
                    allTags.add(labels.age);
                }
            });

            // 중복 제거된 태그들을 isSelected: true로 설정하여 배열로 변환
            const uniqueTagNameList = Array.from(allTags).map(tagName => {
                return tagName;
            });
            const uniqueTagRecord: Record<string, boolean> = { }
            uniqueTagNameList.forEach((uniqueTagName) => {
                uniqueTagRecord[uniqueTagName] = true;
            })

            setVoiceList(voiceDataList);
            setVoiceTagRecord(uniqueTagRecord);
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
                    '/api/music',
                    '/api/video',
                    '/api/video/merge',
                    '/webhook/replicate',
                    '/webhook/suno-api'
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
                                        {script.trim() && (
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
                                    value={script}
                                    onChange={(e) => setScript(e.target.value)}
                                    placeholder="Describe what you want to create. Be as detailed as possible..."
                                    rows={6}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all resize-none text-base"
                                />
                            </div>

                            {/* Storyboard Section */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <label className="block text-xl font-semibold text-purple-300">
                                        Storyboard
                                    </label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={onClickGenerateStoryboard}
                                            disabled={isGeneratingStoryboardData || !script.trim() || !selectedVoiceId}
                                            className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 peer"
                                            title={
                                                isGeneratingStoryboardData
                                                    ? "Generating storyboard..."
                                                    : !script.trim()
                                                    ? "Please write a script first"
                                                    : !selectedVoiceId
                                                    ? "Please select a voice first"
                                                    : "Generate Storyboard"
                                            }
                                        >
                                        {isGeneratingStoryboardData ? (
                                            <>
                                                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Generating...</span>
                                            </>
                                        ) : (
                                            <span>Generate Storyboard</span>
                                        )}
                                        </button>
                                    </div>
                                </div>

                                {/* Main Subject 표시 */}
                                {videoMainSubject && (
                                    <div className="mb-4 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                            <span className="text-sm font-medium text-purple-300">Main Subject:</span>
                                            <span className="text-sm text-white">{videoMainSubject}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Storyboard 그리드 */}
                                {sceneDataList.length !== 0 && videoMainSubject && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
                                        {sceneDataList.sort((a, b) => {
                                            return a.sceneNumber - b.sceneNumber;
                                        }).map((sceneData) => {
                                            return <StoryboardItem key={sceneData.sceneNumber} sceneData={sceneData} />
                                        })}
                                    </div>
                                )}

                                {/* 로딩 상태 또는 빈 상태 메시지 */}
                                {sceneDataList.length === 0 && (
                                    <div className="text-center py-8 px-4 bg-gray-800/30 border border-gray-600/30 rounded-lg">
                                        {isGeneratingStoryboardData ? (
                                            // 로딩 중 상태
                                            <>
                                                <div className="text-purple-400 mb-4">
                                                    <div className="w-16 h-16 mx-auto mb-4 relative">
                                                        <div className="absolute inset-0 border-4 border-purple-200/20 rounded-full"></div>
                                                        <div className="absolute inset-0 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                                                        <div className="absolute inset-2 border-2 border-purple-300/40 border-b-transparent rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                                                    </div>
                                                </div>
                                                <p className="text-base text-purple-300 font-medium mb-2">AI Screenwriter at Work</p>
                                                <p className="text-sm text-gray-400">Crafting your storyboard with cinematic precision...</p>
                                                <div className="mt-4 flex justify-center space-x-1">
                                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                                </div>
                                            </>
                                        ) : (
                                            // 빈 상태
                                            <>
                                                <div className="text-gray-400 mb-2">
                                                    <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                </div>
                                                <p className="text-base text-gray-400 font-medium">No storyboard generated yet</p>
                                                <p className="text-sm text-gray-500 mt-1">Generate a storyboard to see scene breakdown</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Visual Style Selection */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setIsStyleExpanded(!isStyleExpanded)}
                                    className="flex items-center text-xl font-semibold text-purple-300 mb-4 hover:text-purple-200 transition-colors"
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
                                            className={`w-full p-3 rounded-lg border transition-all text-left ${
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

                            {/* VideoData API Test Section */}
                            {/*<div>*/}
                            {/*    <label className="block text-xl font-medium text-white mb-3">*/}
                            {/*        VideoData API Test*/}
                            {/*    </label>*/}
                            {/*    <div className="bg-gray-800/50 border border-purple-500/30 rounded-xl p-4">*/}
                            {/*        <div className="flex items-center justify-between mb-3">*/}
                            {/*            <span className="text-purple-300 text-sm font-medium">JSON Response</span>*/}
                            {/*            <button*/}
                            {/*                onClick={onTestWebhook}*/}
                            {/*                type="button"*/}
                            {/*                className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-300"*/}
                            {/*            >*/}
                            {/*                Test VideoData API*/}
                            {/*            </button>*/}
                            {/*        </div>*/}
                            {/*        <pre className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3 text-xs text-green-400 overflow-x-auto font-mono">*/}
                            {/*            {`{ }`}*/}
                            {/*        </pre>*/}
                            {/*    </div>*/}
                            {/*</div>*/}
                        </div>
                    </div>
                </div>

                {/* Voice Selection Panel */}
                <div className="w-[400px] flex-shrink-0 bg-gray-900/30 backdrop-blur-sm border-r border-purple-500/20 overflow-y-auto">
                    <div className="p-6">
                        <div className="text-purple-300 text-2xl font-medium mb-4">Voice</div>

                        {/* Voice Filters */}
                        <div className="mb-6">
                            {/* Select All Button */}
                            <div className="mb-3">
                                <button
                                    onClick={() => {
                                        setVoiceTagRecord(prev => {
                                            const newRecord: Record<string, boolean> = {};
                                            Object.keys(prev).forEach((tagName) => {
                                                newRecord[tagName] = !isAllTagSelected;
                                            });
                                            return newRecord;
                                        });
                                    }}
                                    className={`${isAllTagSelected
                                        ? "text-sm px-3 py-1.5 rounded-lg border font-medium transition-all bg-indigo-500/20 text-indigo-300 border-indigo-400/30 hover:bg-indigo-500/30"
                                        : "text-sm px-3 py-1.5 rounded-lg border font-medium transition-all bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30"
                                    }`}
                                >
                                    Select All
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(voiceTagRecord).map((tagName) => {
                                    const isActive = voiceTagRecord[tagName];

                                    // 태그별 색상 결정
                                    const getTagColor = () => {
                                        switch (tagName) {
                                            case 'male':
                                                return isActive
                                                    ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                                                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30';
                                            case 'female':
                                                return isActive
                                                    ? 'bg-red-500/20 text-red-300 border-red-400/30'
                                                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30';
                                            case 'young':
                                                return isActive
                                                    ? 'bg-green-500/20 text-green-300 border-green-400/30'
                                                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30';
                                            case 'middle_aged':
                                                return isActive
                                                    ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                                                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30';
                                            case 'old':
                                                return isActive
                                                    ? 'bg-orange-500/20 text-orange-300 border-orange-400/30'
                                                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30';
                                            default:
                                                return isActive
                                                    ? 'bg-gray-500/20 text-gray-300 border-gray-400/30'
                                                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30';
                                        }
                                    };

                                    // 표시할 라벨 결정
                                    const getDisplayLabel = () => {
                                        switch (tagName) {
                                            case 'male': return 'Male';
                                            case 'female': return 'Female';
                                            case 'young': return 'Young';
                                            case 'middle_aged': return 'Adult';
                                            case 'old': return 'Senior';
                                            case 'neutral': return 'Neutral';
                                            default: return tagName;
                                        }
                                    };

                                    return (
                                        <button
                                            key={tagName}
                                            onClick={() => {
                                                setVoiceTagRecord(prev => ({
                                                    ...prev,
                                                    [tagName]: !prev[tagName]
                                                }));
                                            }}
                                            className={`text-xs px-2 py-1 rounded-full border font-medium transition-all ${getTagColor()}`}
                                        >
                                            {getDisplayLabel()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Voice Selection */}
                            <div>
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredVoiceList.map((voice) => {
                                        const labels = voice.labels;
                                        const genderDisplay = labels?.gender === 'male'
                                            ? 'Male'
                                            : labels?.gender === 'female'
                                                ? 'Female'
                                                : labels?.gender === 'neutral'
                                                    ? 'Neutral'
                                                    : '';
                                        const ageDisplay = labels?.age === 'young'
                                            ? 'Young'
                                            : labels?.age === 'middle_aged'
                                                ? 'Adult'
                                                : labels?.age === 'old'
                                                    ? 'Senior'
                                                    : '';

                                        return (
                                            <div
                                                key={voice.id}
                                                onClick={() => setSelectedVoiceId(voice.id)}
                                                className={`pt-3 pr-3 pb-3 rounded-lg border transition-all text-left cursor-pointer ${
                                                    voice.id === selectedVoiceId
                                                        ? 'border-pink-500 bg-pink-500/10'
                                                        : 'border-purple-500/30 bg-gray-800/30 hover:border-purple-400/50'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="pl-3 text-white font-medium text-base">{voice.name}</div>
                                                            <div className="flex pl-2 gap-1.5">
                                                                {genderDisplay && (
                                                                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                                                                        labels?.gender === 'male'
                                                                            ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                                                                            : labels?.gender === 'female'
                                                                                ? 'bg-red-500/20 text-red-300 border-red-400/30'
                                                                                : 'bg-gray-500/20 text-gray-300 border-gray-400/30'
                                                                    }`}>
                                                                        {genderDisplay}
                                                                    </span>
                                                                )}
                                                                {ageDisplay && (
                                                                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                                                                        labels?.age === 'young'
                                                                            ? 'bg-green-500/20 text-green-300 border-green-400/30'
                                                                            : labels?.age === 'middle_aged'
                                                                            ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                                                                            : labels?.age === 'old'
                                                                            ? 'bg-orange-500/20 text-orange-300 border-orange-400/30'
                                                                            : 'bg-gray-500/20 text-gray-300 border-gray-400/30'
                                                                    }`}>
                                                                        {ageDisplay}
                                                                    </span>
                                                                )}
                                                            </div>
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
                            disabled={!script || isSubmitting}
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