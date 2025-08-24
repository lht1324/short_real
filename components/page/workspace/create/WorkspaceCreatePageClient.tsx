'use client'

import {memo, useCallback, useMemo, useState} from "react";
import Link from "next/link";
import { ChevronLeft, AlertTriangle, X, Sparkles, Home, Plus, Play, ChevronDown, ChevronRight } from 'lucide-react';

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

    // Section states
    const [description, setDescription] = useState<string>('');
    const [duration, setDuration] = useState<number>(15);
    const [style, setStyle] = useState<string>('cinematic');
    const [voice, setVoice] = useState<string>('josh');
    const [music, setMusic] = useState<string>('ghost_arpeggios');

    // Form data for API
    const formData = useMemo(() => ({
        description,
        duration,
        style,
        voice,
        music
    }), [description, duration, style, voice, music]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [selectedDuration, setSelectedDuration] = useState(15);
    
    // Collapse states for sections
    const [isStyleExpanded, setIsStyleExpanded] = useState(true);
    const [isVoiceExpanded, setIsVoiceExpanded] = useState(true);
    const [isMusicExpanded, setIsMusicExpanded] = useState(true);

    // Style examples for preview
    const styleExamples = useMemo(() => ({
        cinematic: {
            name: 'Cinematic',
            description: 'Film-like visuals with dramatic lighting',
            thumbnail: '/api/placeholder/200/356',
            videoUrl: '/examples/cinematic-sample.mp4'
        },
        anime: {
            name: 'Anime',
            description: 'Japanese animation style with vibrant colors',
            thumbnail: '/api/placeholder/200/356',
            videoUrl: '/examples/anime-sample.mp4'
        },
        realistic: {
            name: 'Realistic',
            description: 'Photo-realistic renders and environments',
            thumbnail: '/api/placeholder/200/356',
            videoUrl: '/examples/realistic-sample.mp4'
        },
        cartoon: {
            name: 'Cartoon',
            description: 'Stylized and colorful cartoon graphics',
            thumbnail: '/api/placeholder/200/356',
            videoUrl: '/examples/cartoon-sample.mp4'
        },
        vintage: {
            name: 'Vintage',
            description: 'Retro aesthetics with film grain effects',
            thumbnail: '/api/placeholder/200/356',
            videoUrl: '/examples/vintage-sample.mp4'
        }
    }), []);

    // Virtual tabs for navigation consistency
    const virtualTabs = useMemo(() => [
        { id: 'dashboard', icon: Home, name: 'Dashboard', href: '/workspace/dashboard' },
        { id: 'create', icon: Plus, name: 'Create', href: '/workspace/create', active: true }
    ], []);

    const onGenerateScript = useCallback(async () => {
        if (!aiPrompt.trim()) return;
        
        setIsGenerating(true);
        
        // Simulate AI script generation based on user prompt
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock response based on user prompt
        const generatedScript = `Based on your request: "${aiPrompt}", here's a generated script. This would be a detailed script that matches your requirements for a ${selectedDuration}-second video.`;
        
        setDescription(generatedScript);
        setIsGenerating(false);
        setShowAIModal(false);
        setAiPrompt('');
    }, [aiPrompt, selectedDuration]);

    const openAIModal = useCallback(() => {
        setShowAIModal(true);
    }, [duration]);

    const closeAIModal = useCallback(() => {
        setShowAIModal(false);
        setAiPrompt('');
        setIsGenerating(false);
    }, []);

    // Check if prompt is too vague
    const isVaguePrompt = useMemo(() => {
        const vague = /^(make|create|show|tell).{0,10}(something|anything|뭔가|재밌는)/.test(aiPrompt.toLowerCase());
        const tooShort = aiPrompt.length < 10;
        return vague || tooShort;
    }, [aiPrompt]);

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
        <div className="min-h-screen bg-black text-white">
            {/* Top Header - Same as Editor */}
            <div className="flex items-center justify-between py-4 border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-sm">
                <div className="flex items-center pl-3">
                    <Link 
                        href="/workspace/dashboard"
                        className="text-gray-400 hover:text-pink-400 transition-colors"
                        title="Back to Dashboard"
                    >
                        <ChevronLeft size={40} />
                    </Link>
                    <div className="w-12 h-12 ml-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">✨</span>
                    </div>
                    <div className="flex flex-col ml-4">
                        <span className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                            Create Video
                        </span>
                        <p className="text-gray-400 text-base pl-0.5">
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
                                    <label className="block text-xl font-semibold text-purple-300">
                                        Script
                                    </label>
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
                                    {Object.entries(styleExamples).map(([key, styleExample]) => (
                                        <button
                                            key={key}
                                            onClick={() => setStyle(key)}
                                            className={`p-3 rounded-lg border transition-all text-left ${
                                                style === key
                                                    ? 'border-pink-500 bg-pink-500/10'
                                                    : 'border-purple-500/30 bg-gray-800/30 hover:border-purple-400/50'
                                            }`}
                                        >
                                            <div className="text-white font-medium text-base">{styleExample.name}</div>
                                            <div className="text-gray-400 text-sm mt-1">{styleExample.description}</div>
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
                                    {voices.map((voiceOption) => (
                                        <div
                                            key={voiceOption.id}
                                            onClick={() => setVoice(voiceOption.id)}
                                            className={`p-3 rounded-lg border transition-all text-left cursor-pointer ${
                                                voice === voiceOption.id
                                                    ? 'border-pink-500 bg-pink-500/10'
                                                    : 'border-purple-500/30 bg-gray-800/30 hover:border-purple-400/50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-white font-medium text-base">{voiceOption.name}</div>
                                                    <div className="text-gray-400 text-sm truncate">{voiceOption.characteristics}</div>
                                                </div>
                                                <button
                                                    className="p-1.5 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors flex-shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        console.log('Play voice preview:', voiceOption.id);
                                                    }}
                                                >
                                                    <Play size={14} className="text-white" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
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
                                    <div className="grid grid-cols-2 gap-3">
                                    {backgroundMusic.map((musicOption) => (
                                        <div
                                            key={musicOption.id}
                                            onClick={() => setMusic(musicOption.id)}
                                            className={`p-3 rounded-lg border transition-all text-left cursor-pointer ${
                                                music === musicOption.id
                                                    ? 'border-pink-500 bg-pink-500/10'
                                                    : 'border-purple-500/30 bg-gray-800/30 hover:border-purple-400/50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-white font-medium text-base truncate">{musicOption.title}</div>
                                                    <div className="text-gray-400 text-sm truncate">{musicOption.artist}</div>
                                                </div>
                                                <button
                                                    className="p-1.5 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors flex-shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        console.log('Play music preview:', musicOption.id);
                                                    }}
                                                >
                                                    <Play size={14} className="text-white" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
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
                                {styleExamples[style as keyof typeof styleExamples] ? (
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
                                    Selected: <span className="text-white font-medium text-lg">{styleExamples[style as keyof typeof styleExamples]?.name || style}</span>
                                </p>
                                <p className="text-gray-300 text-sm mb-3">
                                    {styleExamples[style as keyof typeof styleExamples]?.description}
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