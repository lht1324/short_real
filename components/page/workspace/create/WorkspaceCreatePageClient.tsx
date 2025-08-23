'use client'

import {memo, useCallback, useMemo, useState} from "react";
import Link from "next/link";

interface Voice {
    id: string;
    name: string;
    characteristics: string;
    preview?: string;
}

interface BackgroundMusic {
    id: string;
    title: string;
    artist: string;
    preview?: string;
}

interface CreateFormData {
    description: string;
    theme: string;
    duration: string;
    style: string;
    voice: string;
    music: string;
}

function WorkspaceCreatePageClient() {
    // 음성, 음악 선택 기능 추가
    // 음성은 영상 생성할 때 함께 생성한 뒤, 에디터에서 뺀다
    // 음악은 선택한 거 그대로 에디터에서 틀어주고, 실시간으로 바꾸는 것처럼 만들어준다.
    // 자막은 캡션 폰트, 크기, 색상, 위치 정도만.
    // 다 지정됐으면 생성된 영상 + 생성된 음성 + 에디터 최종 음악 + 에디터 최종 자막을 합쳐준다.
    // 음성만 재생성해주는 기능 추가 - 크레딧 받는 걸로
    const voices: Voice[] = useMemo(() => [
        { id: 'josh', name: 'Josh', characteristics: 'Narration, Deep, Young' },
        { id: 'emma', name: 'Emma', characteristics: 'Friendly, Clear, Professional' },
        { id: 'alex', name: 'Alex', characteristics: 'Energetic, Upbeat, Modern' },
        { id: 'sarah', name: 'Sarah', characteristics: 'Calm, Soothing, Mature' },
        { id: 'mike', name: 'Mike', characteristics: 'Dramatic, Bold, Storytelling' },
        { id: 'lily', name: 'Lily', characteristics: 'Youthful, Bright, Engaging' }
    ], []);

    const backgroundMusic: BackgroundMusic[] = useMemo(() => [
        { id: 'ghost_arpeggios', title: 'Ghost Arpeggios', artist: 'Violin, Scary' },
        { id: 'epic_adventure', title: 'Epic Adventure', artist: 'Orchestral, Heroic' },
        { id: 'synthwave_nights', title: 'Synthwave Nights', artist: 'Electronic, Retro' },
        { id: 'mysterious_forest', title: 'Mysterious Forest', artist: 'Ambient, Nature' },
        { id: 'urban_beats', title: 'Urban Beats', artist: 'Hip Hop, Modern' },
        { id: 'peaceful_morning', title: 'Peaceful Morning', artist: 'Piano, Calm' },
        { id: 'space_odyssey', title: 'Space Odyssey', artist: 'Sci-Fi, Atmospheric' },
        { id: 'comedy_sketch', title: 'Comedy Sketch', artist: 'Upbeat, Funny' }
    ], []);

    const [formData, setFormData] = useState<CreateFormData>({
        description: '',
        theme: 'historical',
        duration: '30',
        style: 'cinematic',
        voice: 'josh',
        music: 'ghost_arpeggios'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
    const [showMusicDropdown, setShowMusicDropdown] = useState(false);

    const onInputChange = useCallback((field: keyof CreateFormData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const onGenerateScript = useCallback(async () => {
        setIsGenerating(true);
        
        // Simulate AI script generation
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const generatedScript = `A mysterious tale unfolds in the shadows of an ancient castle. The protagonist discovers hidden secrets that challenge everything they believed to be true. With each step deeper into the mystery, the stakes grow higher and the truth becomes more elusive.`;
        
        onInputChange('description', generatedScript);
        setIsGenerating(false);
    }, [onInputChange]);

    const onSubmitProject = useCallback(async () => {
        setIsSubmitting(true);
        console.log('Creating project with data:', formData);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setIsSubmitting(false);
        // Redirect to dashboard after creation
        window.location.href = '/workspace/dashboard';
    }, [formData]);

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden">
            {/* Vaporwave Background Effects */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-3xl"></div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                                Details,
                            </span>{" "}
                            <span className="bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent">
                                Please.
                            </span>
                        </h1>
                        <p className="text-gray-400 text-lg">
                            I know why you&#39;re here, but AI needs this at least.
                        </p>
                    </div>
                    <Link 
                        href="/workspace/dashboard"
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>

                <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-500/20">
                    <div className="p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Left Column - Script */}
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="block text-lg font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                            Script
                                        </label>
                                        <button
                                            type="button"
                                            onClick={onGenerateScript}
                                            disabled={isGenerating}
                                            className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>AI is writing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                    <span>Generate with AI</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => onInputChange('description', e.target.value)}
                                        placeholder="Describe what you want to create. Be as detailed as possible..."
                                        rows={12}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all resize-none text-sm"
                                    />
                                </div>
                            </div>

                            {/* Middle Column - Settings */}
                            <div className="space-y-6">
                                {/* Theme */}
                                <div>
                                    <label className="block text-lg font-semibold mb-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                        Theme
                                    </label>
                                    <select
                                        value={formData.theme}
                                        onChange={(e) => onInputChange('theme', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-purple-500/30 text-white focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all"
                                    >
                                        <option value="historical">Historical</option>
                                        <option value="sci-fi">Sci-Fi</option>
                                        <option value="mystery">Mystery</option>
                                        <option value="adventure">Adventure</option>
                                        <option value="comedy">Comedy</option>
                                        <option value="documentary">Documentary</option>
                                    </select>
                                </div>

                                {/* Visual Style */}
                                <div>
                                    <label className="block text-lg font-semibold mb-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                        Visual Style
                                    </label>
                                    <select
                                        value={formData.style}
                                        onChange={(e) => onInputChange('style', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-purple-500/30 text-white focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all"
                                    >
                                        <option value="cinematic">Cinematic</option>
                                        <option value="anime">Anime</option>
                                        <option value="realistic">Realistic</option>
                                        <option value="cartoon">Cartoon</option>
                                        <option value="vintage">Vintage</option>
                                    </select>
                                </div>

                                {/* Duration */}
                                <div>
                                    <label className="block text-lg font-semibold mb-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                        Duration
                                    </label>
                                    <select
                                        value={formData.duration}
                                        onChange={(e) => onInputChange('duration', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-purple-500/30 text-white focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all"
                                    >
                                        <option value="15">15s</option>
                                        <option value="30">30s</option>
                                    </select>
                                </div>
                            </div>

                            {/* Right Column - Voice, Music, Submit */}
                            <div className="space-y-6">
                                {/* Voice Selection */}
                                <div className="relative">
                                    <label className="block text-lg font-semibold mb-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                        Voice
                                    </label>
                                    <div 
                                        className="w-full p-4 rounded-xl bg-gray-800/50 border border-purple-500/30 cursor-pointer hover:border-purple-400 transition-all flex items-center justify-between"
                                        onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center">
                                                <span className="text-white font-medium text-sm">
                                                    {voices.find(v => v.id === formData.voice)?.name.charAt(0)}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{voices.find(v => v.id === formData.voice)?.name}</p>
                                                <p className="text-gray-400 text-xs">{voices.find(v => v.id === formData.voice)?.characteristics}</p>
                                            </div>
                                        </div>
                                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${showVoiceDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                    {showVoiceDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-purple-500/30 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                                            {voices.map((voice) => (
                                                <div
                                                    key={voice.id}
                                                    className={`p-3 cursor-pointer hover:bg-gray-700/50 transition-colors flex items-center justify-between ${
                                                        formData.voice === voice.id ? 'bg-purple-500/20' : ''
                                                    }`}
                                                    onClick={() => {
                                                        onInputChange('voice', voice.id);
                                                        setShowVoiceDropdown(false);
                                                    }}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
                                                            <span className="text-white font-medium text-xs">{voice.name.charAt(0)}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-white text-sm font-medium">{voice.name}</p>
                                                            <p className="text-gray-400 text-xs">{voice.characteristics}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="p-1 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            console.log('Play voice preview:', voice.id);
                                                        }}
                                                    >
                                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Background Music Selection */}
                                <div className="relative">
                                    <label className="block text-lg font-semibold mb-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                        Background Music
                                    </label>
                                    <div 
                                        className="w-full p-4 rounded-xl bg-gray-800/50 border border-purple-500/30 cursor-pointer hover:border-purple-400 transition-all flex items-center justify-between"
                                        onClick={() => setShowMusicDropdown(!showMusicDropdown)}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center">
                                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{backgroundMusic.find(m => m.id === formData.music)?.title}</p>
                                                <p className="text-gray-400 text-xs">{backgroundMusic.find(m => m.id === formData.music)?.artist}</p>
                                            </div>
                                        </div>
                                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${showMusicDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                    {showMusicDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-purple-500/30 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                                            {backgroundMusic.map((music) => (
                                                <div
                                                    key={music.id}
                                                    className={`p-3 cursor-pointer hover:bg-gray-700/50 transition-colors flex items-center justify-between ${
                                                        formData.music === music.id ? 'bg-purple-500/20' : ''
                                                    }`}
                                                    onClick={() => {
                                                        onInputChange('music', music.id);
                                                        setShowMusicDropdown(false);
                                                    }}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-6 h-6 rounded-xl bg-indigo-500 flex items-center justify-center">
                                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-white text-sm font-medium">{music.title}</p>
                                                            <p className="text-gray-400 text-xs">{music.artist}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="p-1 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            console.log('Play music preview:', music.id);
                                                        }}
                                                    >
                                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4">
                                    <button
                                        onClick={onSubmitProject}
                                        disabled={!formData.description || isSubmitting}
                                        className="w-full group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-4 rounded-xl text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(WorkspaceCreatePageClient);