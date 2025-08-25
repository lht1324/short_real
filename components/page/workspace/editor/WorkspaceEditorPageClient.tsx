'use client'

import {memo, useCallback, useEffect, useMemo, useState, useRef} from "react";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { Image, Type, Music, Play, RotateCcw, ChevronLeft, Edit, Eye, EyeOff } from 'lucide-react';
import { getFontWeightName } from "@/utils/fontUtils";
import { fontMap, type FontName } from "@/lib/fonts";
import FONT_FAMILY_LIST, {FontFamily} from "@/lib/FontFamilyList";

interface VideoProject {
    id: string;
    title: string;
    description: string;
    theme: string;
    duration: string;
    style: string;
    voice: string;
    music: string;
    status: 'processing' | 'editing' | 'completed';
    videoUrl?: string;
    createdAt: string;
}

interface CaptionSegment {
    id: string;
    text: string;
    startTime: number; // seconds
    endTime: number; // seconds
}

interface VideoSequence {
    id: string;
    text: string;
    duration: string;
    isSelected?: boolean;
    segmentList: CaptionSegment[];
}

enum SidebarType {
    Scene = 'scene',
    Caption = 'caption',
    Music = 'music'
}

const VIDEO_WIDTH = 36 * 9;
const VIDEO_HEIGHT = VIDEO_WIDTH / 9 * 16;

function WorkspaceEditorPageClient() {
    const searchParams = useSearchParams();
    const taskId = searchParams.get('task_id');
    
    const [project, setProject] = useState<VideoProject | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeSidebar, setActiveSidebar] = useState<SidebarType>(SidebarType.Scene);
    const [selectedSequence, setSelectedSequence] = useState<string | null>(null);
    const [musicStartSeconds, setMusicStartSeconds] = useState(45); // Start time in seconds
    const musicStartInputRef = useRef<HTMLInputElement>(null);
    
    // Edit script state
    const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
    const [tempScriptText, setTempScriptText] = useState('');
    const fontSizeInputRef = useRef<HTMLInputElement>(null);
    const captionRef = useRef<HTMLParagraphElement>(null);

    const [selectedFontFamilyName, setSelectedFontFamilyName] = useState('');
    const [selectedFontWeight, setSelectedFontWeight] = useState(400);
    const [fontFamilyList, setFontFamilyList] = useState<FontFamily[]>([]);
    const selectedFontFamily = useMemo(() => {
        return fontFamilyList.find((fontFamily) => {
            return fontFamily.name === selectedFontFamilyName;
        }) ?? fontFamilyList[0];
    }, [fontFamilyList, selectedFontFamilyName]);
    const selectedFontFamilyWeightList = useMemo(() => {
        return selectedFontFamily?.weightList ?? [];
    }, [selectedFontFamily]);

    const selectedFontFamilyFull = useMemo(() => {
        const fontName = selectedFontFamily?.name as FontName;
        const nextFont = fontMap[fontName];
        return nextFont ? nextFont.style.fontFamily : `'${selectedFontFamily?.name}', '${selectedFontFamily?.generic}'`;
    }, [selectedFontFamily]);
    
    const setCaptionRef = useCallback((node: HTMLParagraphElement | null) => {
        captionRef.current = node;
        if (node) {
            setCaptionHeight(node.offsetHeight);
        }
    }, []);
    
    // Caption settings state
    const [fontSize, setFontSize] = useState(32);
    const [captionPosition, setCaptionPosition] = useState(80); // percentage from top (0-100)
    const [captionHeight, setCaptionHeight] = useState(0);
    const [showCaptionLine, setShowCaptionLine] = useState(true);
    
    // Shadow settings state
    const [shadowEnabled, setShadowEnabled] = useState(true);
    const [shadowIntensity, setShadowIntensity] = useState(80); // 0-100 (maps to opacity)
    const [shadowThickness, setShadowThickness] = useState(50); // 0-100 (maps to blur-radius)
    
    // Color settings state
    const [activeColor, setActiveColor] = useState('#FFFFFF');
    const [inactiveColor, setInactiveColor] = useState('#A0A0A0');
    const [activeOutlineEnabled, setActiveOutlineEnabled] = useState(false);
    const [activeOutlineColor, setActiveOutlineColor] = useState('#000000');
    const [inactiveOutlineEnabled, setInactiveOutlineEnabled] = useState(false);
    const [inactiveOutlineColor, setInactiveOutlineColor] = useState('#404040');

    const sliderHeight = useMemo(() => {
        return VIDEO_HEIGHT - captionHeight;
    }, [captionHeight]);

    // Mock project data
    const mockProject: VideoProject = useMemo(() => ({
        id: taskId || '1',
        title: 'Ancient Egyptian Mystery',
        description: 'A mysterious tale unfolds in the shadows of an ancient castle. The protagonist discovers hidden secrets that challenge everything they believed to be true.',
        theme: 'historical',
        duration: '30',
        style: 'cinematic',
        voice: 'josh',
        music: 'ghost_arpeggios',
        status: 'editing',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        createdAt: '2025-01-15'
    }), [taskId]);

    // Mock video sequences
    const mockSequences: VideoSequence[] = useMemo(() => [
        {
            id: '0',
            text: 'Nefertiti just the name alone conjure images of beauty power, and mystery',
            duration: '4:73s',
            imageUrl: '/api/placeholder/120/80',
            segmentList: [
                { id: '0-1', text: 'Nefertiti just the name alone', startTime: 0, endTime: 1.5 },
                { id: '0-2', text: 'conjure images of beauty', startTime: 1.5, endTime: 3 },
                { id: '0-3', text: 'power, and mystery', startTime: 3, endTime: 4.73 }
            ]
        },
        {
            id: '1',
            text: 'But who was she really picture this ancient Egypt over 3,000 000 years ago',
            duration: '5:09s',
            imageUrl: '/api/placeholder/120/80',
            isSelected: true,
            segmentList: [
                { id: '1-1', text: 'But who was she really', startTime: 0, endTime: 1.8 },
                { id: '1-2', text: 'picture this ancient Egypt', startTime: 1.8, endTime: 3.5 },
                { id: '1-3', text: 'over 3,000 years ago', startTime: 3.5, endTime: 5.09 }
            ]
        },
        {
            id: '2',
            text: 'The sun shines brightly over the Nile, and in the bustling city of Akhetaten a queen rises',
            duration: '5:71s',
            imageUrl: '/api/placeholder/120/80',
            segmentList: [
                { id: '2-1', text: 'The sun shines brightly over the Nile', startTime: 0, endTime: 2 },
                { id: '2-2', text: 'and in the bustling city of Akhetaten', startTime: 2, endTime: 4 },
                { id: '2-3', text: 'a queen rises', startTime: 4, endTime: 5.71 }
            ]
        },
        {
            id: '3',
            text: 'Nefertiti, the wife of pharaoh akhenaten was more than just a beautiful face',
            duration: '4:82s',
            imageUrl: '/api/placeholder/120/80',
            segmentList: [
                { id: '3-1', text: 'Nefertiti, the wife of pharaoh akhenaten', startTime: 0, endTime: 2.5 },
                { id: '3-2', text: 'was more than just a beautiful face', startTime: 2.5, endTime: 4.82 }
            ]
        }
    ], []);

    useEffect(() => {
        // Simulate loading project data
        const loadProject = async () => {
            setIsLoading(true);
            // await new Promise(resolve => setTimeout(resolve, 1000));

            const newFamilyList = FONT_FAMILY_LIST.sort((a, b) => {
                return a.name.localeCompare(b.name);
            });
            setFontFamilyList(newFamilyList);
            setSelectedFontFamilyName(newFamilyList[0].name);
            setProject(mockProject);
            setIsLoading(false);
        };
        
        if (taskId) {
            loadProject();
        }
    }, [taskId, mockProject]);

    // Measure caption height when fontSize changes
    useEffect(() => {
        if (captionRef.current) {
            setCaptionHeight(captionRef.current.offsetHeight);
        }
    }, [fontSize]);

    useEffect(() => {
        // Calculate current handle position in pixels
        setCaptionPosition((prevPosition) => {
            const maxSliderPercentage = (sliderHeight / VIDEO_HEIGHT) * 100;
            return prevPosition > maxSliderPercentage
                ? 100
                : prevPosition;
        })
    }, [sliderHeight]);

    const onPlayPause = useCallback(() => {
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const onSaveChanges = useCallback(async () => {
        setIsSaving(true);
        console.log('Saving changes...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSaving(false);
    }, []);

    const onExportVideo = useCallback(async () => {
        console.log('Exporting video...');
        // Download or redirect logic
    }, []);

    const onSelectSequence = useCallback((sequenceId: string) => {
        setSelectedSequence(sequenceId);
    }, []);

    const onRerunSequence = useCallback((sequenceId: string) => {
        console.log('Re-running sequence:', sequenceId);
    }, []);

    const onEditScript = useCallback((sequenceId: string) => {
        const sequence = mockSequences.find(s => s.id === sequenceId);
        if (sequence) {
            setEditingScriptId(sequenceId);
            setTempScriptText(sequence.text);
        }
    }, []);

    const onSaveScript = useCallback((sequenceId: string) => {
        console.log('Saving script for sequence:', sequenceId, 'New text:', tempScriptText);
        // Here you would update the sequence text in your state/backend
        setEditingScriptId(null);
        setTempScriptText('');
    }, [tempScriptText]);

    const onCancelEditScript = useCallback(() => {
        setEditingScriptId(null);
        setTempScriptText('');
    }, []);

    // Video duration in seconds (from project creation)
    const videoDuration = 30;

    const onSelectFontFamily = useCallback((fontFamilyName: string) => {
        setSelectedFontFamilyName(fontFamilyName);
    }, [])

    // Mock background music data
    const backgroundMusic = useMemo(() => [
        { id: 'ghost_arpeggios', title: 'Ghost Arpeggios', artist: 'Violin, Scary', duration: 180, isSelected: true },
        { id: 'epic_adventure', title: 'Epic Adventure', artist: 'Orchestral, Heroic', duration: 240, isSelected: false },
        { id: 'synthwave_nights', title: 'Synthwave Nights', artist: 'Electronic, Retro', duration: 200, isSelected: false },
        { id: 'mysterious_forest', title: 'Mysterious Forest', artist: 'Ambient, Nature', duration: 160, isSelected: false },
        { id: 'urban_beats', title: 'Urban Beats', artist: 'Hip Hop, Modern', duration: 190, isSelected: false },
        { id: 'peaceful_morning', title: 'Peaceful Morning', artist: 'Piano, Calm', duration: 220, isSelected: false },
        { id: 'space_odyssey', title: 'Space Odyssey', artist: 'Sci-Fi, Atmospheric', duration: 300, isSelected: false },
        { id: 'comedy_sketch', title: 'Comedy Sketch', artist: 'Upbeat, Funny', duration: 150, isSelected: false }
    ], []);

    const sidebarItems = useMemo(() => [
        { id: SidebarType.Scene, icon: Image, name: 'Scene' },
        { id: SidebarType.Caption, icon: Type, name: 'Caption' },
        { id: SidebarType.Music, icon: Music, name: 'Music' }
    ], []);

    useEffect(() => {
        if (shadowEnabled) {
            document.getElementById("shadow-section")?.scrollIntoView({
                behavior: "smooth",
                block: "end",
            })
        }
    }, [shadowEnabled])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading your pure video...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-400 mb-4">Project Not Found</h1>
                    <p className="text-gray-400 mb-6">Looks like this project doesn&#39;t exist.</p>
                    <Link 
                        href="/workspace/dashboard"
                        className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Top Header */}
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
                        <span className="text-white font-bold text-sm">⚡</span>
                    </div>
                    <div className="flex flex-col ml-4">
                        <span className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                            Video Editor
                        </span>
                        <p className="text-gray-400 text-base pl-0.5">
                            We&#39;re almost there.
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-4 px-6">
                    <button className="text-gray-400 hover:text-pink-400 transition-colors">
                        <RotateCcw size={20} />
                    </button>
                    <button className="text-gray-400 hover:text-pink-400 transition-colors">
                        <RotateCcw size={20} className="transform scale-x-[-1]" />
                    </button>
                    <div className="flex items-center space-x-2 text-gray-400">
                        <span className="text-sm">Watermark</span>
                        <button className="w-10 h-6 bg-gray-800 rounded-full relative border border-purple-500/30">
                            <div className="w-4 h-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full absolute top-1 right-1"></div>
                        </button>
                    </div>
                    <button 
                        onClick={onExportVideo}
                        className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    >
                        Export / Share
                    </button>
                </div>
            </div>

            <div className="flex h-[calc(100vh-73px)]">
                {/* Left Sidebar */}
                <div className="w-20 bg-gray-900/50 backdrop-blur-sm border-r border-purple-500/20 flex flex-col items-center py-4 space-y-4">
                    {sidebarItems.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveSidebar(item.id)}
                                className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-all border ${
                                    activeSidebar === item.id 
                                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-purple-400/50 shadow-lg' 
                                        : 'text-gray-400 hover:text-pink-400 hover:bg-gray-800/50 border-transparent hover:border-purple-500/30'
                                }`}
                                title={item.name}
                            >
                                <IconComponent size={24} />
                                <span className="text-sm mt-1 leading-tight">{item.name}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Sequences Panel */}
                <div className="flex-1 bg-gray-900/30 backdrop-blur-sm border-r border-purple-500/20 overflow-y-auto">
                    {activeSidebar === SidebarType.Scene && (
                        <div className="p-4 space-y-4">
                            <div className="text-purple-300 text-2xl font-medium mb-4">Scene</div>
                            {mockSequences.map((sequence, index) => (
                            <div 
                                key={sequence.id}
                                onClick={() => onSelectSequence(sequence.id)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer backdrop-blur-sm bg-gray-800/30 ${
                                    sequence.isSelected || selectedSequence === sequence.id
                                        ? 'border-pink-500'
                                        : 'border-purple-500/20 hover:border-purple-400/40'
                                }`}
                            >
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="text-purple-300 text-lg font-medium">Scene #{index + 1}</div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditScript(sequence.id);
                                                }}
                                                className="flex items-center space-x-1 text-gray-400 hover:text-blue-400 text-base transition-colors"
                                                title="Edit Scene Script"
                                            >
                                                <Edit size={12} />
                                                <span>Edit Script</span>
                                            </button>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRerunSequence(sequence.id);
                                            }}
                                            className="flex items-center space-x-1 text-gray-400 hover:text-pink-400 text-base transition-colors"
                                        >
                                            <Play size={14} />
                                            <span>Re-Run</span>
                                        </button>
                                    </div>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 mr-4">
                                            {editingScriptId === sequence.id ? (
                                                <div className="space-y-3">
                                                    <textarea
                                                        value={tempScriptText}
                                                        onChange={(e) => setTempScriptText(e.target.value)}
                                                        className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-base leading-relaxed focus:border-purple-400 focus:outline-none resize-none"
                                                        rows={4}
                                                        placeholder="Enter scene script..."
                                                    />
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSaveScript(sequence.id);
                                                            }}
                                                            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onCancelEditScript();
                                                            }}
                                                            className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-white text-base leading-relaxed">
                                                    {sequence.text}
                                                </p>
                                            )}
                                        </div>
                                        <div className="w-32 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 rounded-lg overflow-hidden border border-purple-500/30" style={{aspectRatio: '9/16'}}>
                                            <div className="w-full h-full bg-gradient-to-t from-black/20 to-transparent"></div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0">
                                        <span className="text-purple-300 text-base">⏱ Scene Start: {sequence.duration}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                    )}

                    {activeSidebar === SidebarType.Caption && (
                        <div id="shadow-section" className="p-4 space-y-6">
                            <div className="text-purple-300 text-2xl font-medium mb-4">Caption</div>
                            
                            {/* Fonts */}
                            <div className="text-white text-lg font-medium">Fonts</div>
                            
                            {/* Font Family */}
                            <div className="space-y-2">
                                <label className="text-white text-base font-medium">Font Family</label>
                                <select 
                                    value={selectedFontFamilyName}
                                    onChange={(e) => onSelectFontFamily(e.target.value)}
                                    style={{
                                        fontFamily: selectedFontFamilyFull,
                                        fontWeight: selectedFontWeight,
                                    }}
                                    className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none cursor-pointer"
                                >
                                    {fontFamilyList.map((fontFamily, index) => {
                                        return <option
                                            key={`${fontFamily.name}_${index}`}
                                            value={fontFamily.name}
                                            style={{ fontFamily: `${fontFamily.name}` }}
                                        >
                                            {fontFamily.name}
                                        </option>
                                    })}
                                </select>
                            </div>

                            {/* Font Size */}
                            <div className="space-y-2">
                                <label className="text-white text-base font-medium">Font Size</label>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <input 
                                            ref={fontSizeInputRef}
                                            type="number" 
                                            min="0" 
                                            max="72" 
                                            value={fontSize}
                                            onInput={(e) => {
                                                const input = e.target as HTMLInputElement;
                                                let inputValue = input.value;
                                                
                                                // Remove leading zeros except for just "0"
                                                if (inputValue.length > 1 && inputValue.startsWith('0')) {
                                                    inputValue = inputValue.replace(/^0+/, '');
                                                    if (inputValue === '') inputValue = '0';
                                                    input.value = inputValue;
                                                }
                                                
                                                // Allow empty or 0 values, but limit max to 72
                                                if (inputValue === '') {
                                                    setFontSize(0);
                                                } else {
                                                    const numValue = parseInt(inputValue) || 0;
                                                    setFontSize(Math.min(72, numValue));
                                                }
                                            }}
                                            className="w-20 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="text-gray-400 text-base">px</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="72" 
                                        value={fontSize}
                                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                                        className="flex-1 accent-purple-500"
                                    />
                                </div>
                            </div>

                            {/* Font Weight */}
                            <div className="space-y-2">
                                <label className="text-white text-base font-medium">Font Weight</label>
                                <div className="flex items-center space-x-4">
                                    <select
                                        className="w-48 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none cursor-pointer"
                                        onChange={(e) => { setSelectedFontWeight(parseInt(e.target.value)) }}
                                        value={selectedFontWeight}
                                        style={{
                                            fontFamily: selectedFontFamilyName,
                                            fontWeight: selectedFontWeight
                                        }}
                                    >
                                        {selectedFontFamilyWeightList.map((fontVariant, index) => {
                                            return <option
                                                key={`${fontVariant.weight}_${index}`}
                                                value={fontVariant.weight}
                                            >
                                                {`${getFontWeightName(fontVariant.weight)} (${fontVariant.weight})`}
                                            </option>
                                        })}
                                    </select>
                                    <input 
                                        type="range" 
                                        min={selectedFontFamilyWeightList.length > 0 ? Math.min(...selectedFontFamilyWeightList.map(w => w.weight)) : 100}
                                        max={selectedFontFamilyWeightList.length > 0 ? Math.max(...selectedFontFamilyWeightList.map(w => w.weight)) : 900}
                                        step="100"
                                        value={selectedFontWeight}
                                        onChange={(e) => setSelectedFontWeight(parseInt(e.target.value))}
                                        className="flex-1 accent-purple-500"
                                    />
                                </div>
                            </div>

                            {/* Colors */}
                            <div className="space-y-4">
                                <div className="text-white text-lg font-medium">Colors</div>
                                
                                {/* Active Color */}
                                <div className="space-y-2">
                                    <label className="text-gray-300 text-base">Active Color</label>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-6 h-6 rounded-full border border-purple-500/30" style={{backgroundColor: activeColor}}></div>
                                        <div className="flex items-center flex-1">
                                            <span className="bg-gray-800/50 border border-purple-500/30 border-r-0 rounded-l-lg px-3 py-2 text-white text-base">#</span>
                                            <input 
                                                type="text" 
                                                value={activeColor.replace('#', '')}
                                                onKeyDown={(e) => {
                                                    if (!/[0-9A-Fa-f]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                // onChange={(e) => setActiveColor('#' + e.target.value)}
                                                onChange={(e) => setActiveColor(`#${e.target.value.toUpperCase()}`)}
                                                placeholder="FFFFFF"
                                                maxLength={6}
                                                className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-r-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Inactive Color */}
                                <div className="space-y-2">
                                    <label className="text-gray-300 text-base">Inactive Color</label>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-6 h-6 rounded-full border border-purple-500/30" style={{backgroundColor: inactiveColor}}></div>
                                        <div className="flex items-center flex-1">
                                            <span className="bg-gray-800/50 border border-purple-500/30 border-r-0 rounded-l-lg px-3 py-2 text-white text-base">#</span>
                                            <input 
                                                type="text" 
                                                value={inactiveColor.replace('#', '')}
                                                onKeyDown={(e) => {
                                                    if (!/[0-9A-Fa-f]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                // onChange={(e) => setInactiveColor('#' + e.target.value)}
                                                onChange={(e) => setInactiveColor(`#${e.target.value.toUpperCase()}`)}
                                                placeholder="A0A0A0"
                                                maxLength={6}
                                                className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-r-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Active Outline Color */}
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-3">
                                        <label className="text-gray-300 text-base">Active Outline Color</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={activeOutlineEnabled}
                                                onChange={(e) => setActiveOutlineEnabled(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border border-purple-500/30 peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-600"></div>
                                        </label>
                                    </div>
                                    {activeOutlineEnabled && (
                                        <div className="flex items-center space-x-3">
                                            <div className="w-6 h-6 rounded-full border border-purple-500/30" style={{backgroundColor: activeOutlineColor}}></div>
                                            <div className="flex items-center flex-1">
                                                <span className="bg-gray-800/50 border border-purple-500/30 border-r-0 rounded-l-lg px-3 py-2 text-white text-base">#</span>
                                                <input 
                                                    type="text" 
                                                    value={activeOutlineColor.replace('#', '')}
                                                    onKeyDown={(e) => {
                                                        if (!/[0-9A-Fa-f]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    // onChange={(e) => setActiveOutlineColor('#' + e.target.value)}
                                                    onChange={(e) => setActiveOutlineColor(`#${e.target.value.toUpperCase()}`)}
                                                    placeholder="000000"
                                                    maxLength={6}
                                                    className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-r-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Inactive Outline Color */}
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-3">
                                        <label className="text-gray-300 text-base">Inactive Outline Color</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={inactiveOutlineEnabled}
                                                onChange={(e) => setInactiveOutlineEnabled(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border border-purple-500/30 peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-600"></div>
                                        </label>
                                    </div>
                                    {inactiveOutlineEnabled && (
                                        <div className="flex items-center space-x-3">
                                            <div className="w-6 h-6 rounded-full border border-purple-500/30" style={{backgroundColor: inactiveOutlineColor}}></div>
                                            <div className="flex items-center flex-1">
                                                <span className="bg-gray-800/50 border border-purple-500/30 border-r-0 rounded-l-lg px-3 py-2 text-white text-base">#</span>
                                                <input 
                                                    type="text" 
                                                    value={inactiveOutlineColor.replace('#', '')}
                                                    onKeyDown={(e) => {
                                                        if (!/[0-9A-Fa-f]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    // onChange={(e) => setInactiveOutlineColor('#' + e.target.value)}
                                                    onChange={(e) => setInactiveOutlineColor(`#${e.target.value.toUpperCase()}`)}
                                                    placeholder="404040"
                                                    maxLength={6}
                                                    className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-r-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Shadow */}
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3">
                                    <label className="text-white text-lg font-medium">Shadow</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={shadowEnabled}
                                            onChange={(e) => setShadowEnabled(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border border-purple-500/30 peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-600"></div>
                                    </label>
                                </div>
                                
                                {shadowEnabled && (
                                    <div className="space-y-4">
                                        {/* Intensity */}
                                        <div className="space-y-2">
                                            <label className="text-white text-base font-medium">Intensity</label>
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center space-x-2">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max="100" 
                                                        value={shadowIntensity}
                                                        onInput={(e) => {
                                                            const input = e.target as HTMLInputElement;
                                                            let inputValue = input.value;
                                                            
                                                            // Remove leading zeros except for just "0"
                                                            if (inputValue.length > 1 && inputValue.startsWith('0')) {
                                                                inputValue = inputValue.replace(/^0+/, '');
                                                                if (inputValue === '') inputValue = '0';
                                                                input.value = inputValue;
                                                            }
                                                            
                                                            // Allow empty or 0 values, but limit max to 100
                                                            if (inputValue === '') {
                                                                setShadowIntensity(0);
                                                            } else {
                                                                const numValue = parseInt(inputValue) || 0;
                                                                setShadowIntensity(Math.min(100, numValue));
                                                            }
                                                        }}
                                                        className="w-20 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <span className="text-gray-400 text-base">%</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="100" 
                                                    value={shadowIntensity}
                                                    onChange={(e) => setShadowIntensity(parseInt(e.target.value))}
                                                    className="flex-1 accent-purple-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Thickness */}
                                        <div className="space-y-2">
                                            <label className="text-white text-base font-medium">Thickness</label>
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center space-x-2">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max="100" 
                                                        value={shadowThickness}
                                                        onInput={(e) => {
                                                            const input = e.target as HTMLInputElement;
                                                            let inputValue = input.value;
                                                            
                                                            // Remove leading zeros except for just "0"
                                                            if (inputValue.length > 1 && inputValue.startsWith('0')) {
                                                                inputValue = inputValue.replace(/^0+/, '');
                                                                if (inputValue === '') inputValue = '0';
                                                                input.value = inputValue;
                                                            }
                                                            
                                                            // Allow empty or 0 values, but limit max to 100
                                                            if (inputValue === '') {
                                                                setShadowThickness(0);
                                                            } else {
                                                                const numValue = parseInt(inputValue) || 0;
                                                                setShadowThickness(Math.min(100, numValue));
                                                            }
                                                        }}
                                                        className="w-20 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="100" 
                                                    value={shadowThickness}
                                                    onChange={(e) => setShadowThickness(parseInt(e.target.value))}
                                                    className="flex-1 accent-purple-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSidebar === SidebarType.Music && (
                        <div className="p-4 space-y-4">
                            <div className="text-purple-300 text-2xl font-medium mb-4">Music</div>
                            {backgroundMusic.map((music) => (
                                <div
                                    key={music.id}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer backdrop-blur-sm ${
                                        music.isSelected
                                            ? 'border-pink-500 bg-pink-500/10'
                                            : 'border-purple-500/20 bg-gray-800/30 hover:border-purple-400/40 hover:bg-gray-800/50'
                                    }`}
                                    onClick={() => console.log('Selected music:', music.id)}
                                >
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-white text-base font-medium leading-tight">{music.title}</p>
                                                    <p className="text-gray-400 text-sm mt-1">{music.artist} • {Math.floor(music.duration/60)}:{(music.duration%60).toString().padStart(2, '0')}</p>
                                                </div>
                                            </div>
                                            <button
                                                className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors flex-shrink-0 ml-3"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    console.log('Play music preview:', music.id);
                                                }}
                                            >
                                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z"/>
                                                </svg>
                                            </button>
                                        </div>
                                        
                                        {/* Music Settings - Only show for selected music */}
                                        {music.isSelected && (
                                            <div className="mt-4 pt-3 border-t border-purple-500/20">
                                                <div className="space-y-4">
                                                    {/* Start Time Input */}
                                                    <div className="space-y-2">
                                                        <label className="text-white text-sm font-medium">Start Time</label>
                                                        <div className="flex items-center space-x-3">
                                                            <div className="flex items-center space-x-2">
                                                                <input 
                                                                    ref={musicStartInputRef}
                                                                    type="number" 
                                                                    min="0" 
                                                                    max={music.duration - videoDuration}
                                                                    value={musicStartSeconds}
                                                                    onInput={(e) => {
                                                                        const input = e.target as HTMLInputElement;
                                                                        let inputValue = input.value;
                                                                        
                                                                        // Remove leading zeros except for just "0"
                                                                        if (inputValue.length > 1 && inputValue.startsWith('0')) {
                                                                            inputValue = inputValue.replace(/^0+/, '');
                                                                            if (inputValue === '') inputValue = '0';
                                                                            input.value = inputValue;
                                                                        }
                                                                        
                                                                        const numValue = parseInt(inputValue) || 0;
                                                                        setMusicStartSeconds(Math.max(0, Math.min(music.duration - videoDuration, numValue)));
                                                                    }}
                                                                    className="w-20 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                />
                                                                <span className="text-gray-400 text-sm">seconds</span>
                                                            </div>
                                                            <span className="text-gray-400 text-sm">({Math.floor(musicStartSeconds / 60)}:{(musicStartSeconds % 60).toString().padStart(2, '0')})</span>
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            Used: {Math.floor(musicStartSeconds / 60)}:{(musicStartSeconds % 60).toString().padStart(2, '0')} - {Math.floor((musicStartSeconds + videoDuration) / 60)}:{((musicStartSeconds + videoDuration) % 60).toString().padStart(2, '0')}
                                                        </div>
                                                    </div>

                                                    {/* Timeline Visualization */}
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between text-xs text-gray-400">
                                                            <span>Timeline</span>
                                                            <span>Total: {Math.floor(music.duration/60)}:{(music.duration%60).toString().padStart(2, '0')}</span>
                                                        </div>
                                                        
                                                        {/* Timeline Track */}
                                                        <div className="relative h-6 bg-gray-700/50 rounded-lg border border-gray-600">
                                                            {/* Timeline background */}
                                                            <div className="absolute inset-1 bg-gray-800 rounded-md"></div>
                                                            
                                                            {/* Selected section rectangle (non-interactive) */}
                                                            <div 
                                                                className="absolute top-1 h-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-md border border-purple-400/30"
                                                                style={{
                                                                    left: `${(musicStartSeconds / music.duration) * 100}%`,
                                                                    width: `${(videoDuration / music.duration) * 100}%`
                                                                }}
                                                            >
                                                                {/* Inner highlight */}
                                                                <div className="absolute inset-0.5 bg-white/10 rounded-sm"></div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Time markers */}
                                                        <div className="flex justify-between text-xs text-gray-500">
                                                            <span>0:00</span>
                                                            <span>{Math.floor(music.duration/60)}:{(music.duration%60).toString().padStart(2, '0')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Video Player */}
                <div className="flex-1 bg-black flex flex-col relative">
                    {/* Vaporwave Background Effects */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-3xl"></div>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center p-8 relative z-10">
                        <div className="flex items-start space-x-6 relative">
                            {fontSize > 0 && <div
                                className="absolute w-full flex flex-row items-center space-x-6"
                                style={{
                                    top: `${16 + (captionPosition / 100) * (VIDEO_HEIGHT - captionHeight - 16)}px`
                                }}
                            >
                                {/* Caption Position Toggle Button */}
                                <button
                                    onClick={() => setShowCaptionLine((prev) => { return !prev; })}
                                    className="absolute z-30 p-1 rounded-full bg-gray-800/50 hover:bg-gray-700/70 border border-gray-600/50 transition-all"
                                    style={{
                                        left: '-24px',
                                    }}
                                    title={showCaptionLine ? "Hide caption guideline" : "Show caption guideline"}
                                >
                                    {showCaptionLine ? (
                                        <Eye size={12} className="text-gray-300" />
                                    ) : (
                                        <EyeOff size={12} className="text-gray-500" />
                                    )}
                                </button>

                                {/* Caption Position Line */}
                                {showCaptionLine && (
                                    <div
                                        className="absolute border-t-2 border-dashed border-gray-300/80 z-20"
                                        style={{
                                            left: '-8px',
                                            right: '-20px',
                                            // width: `calc(24px + 6px + 324px + 12px)` // slider width + gap + video width + extension
                                        }}
                                    ></div>
                                )}
                            </div>}
                            
                            {/* Caption Position Slider */}
                            {/*<div className="relative" style={{ height: `${VIDEO_HEIGHT - captionHeight}px` }}>*/}
                            <div className={`relative`} style={{ height: `${sliderHeight}px` }}>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={100 - captionPosition} // Inverted: top of slider = top of video
                                    onChange={(e) => setCaptionPosition(100 - parseInt(e.target.value))}
                                    className="w-6 h-full cursor-grab active:cursor-grabbing
                                        [&::-webkit-slider-runnable-track]:px-0.5
                                        [&::-webkit-slider-runnable-track]:py-0.5
                                        [&::-webkit-slider-runnable-track]:bg-white
                                        [&::-webkit-slider-runnable-track]:rounded-md
                                        [&::-moz-range-track]:px-0.5
                                        [&::-moz-range-track]:py-0.5
                                        [&::-moz-range-track]:bg-white
                                        [&::-moz-range-track]:rounded-md
                                    "
                                    style={{
                                        writingMode: 'vertical-lr',
                                        direction: 'rtl',
                                        accentColor: "#A855F7",
                                    }}
                                />
                            </div>
                            
                            <div className="w-[324px] bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-purple-500/30 overflow-hidden shadow-2xl relative" style={{ aspectRatio: '9/16' }}>
                            {project.videoUrl ? (
                                <div className="w-full h-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 flex items-center justify-center relative">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                                    
                                    {/* Caption Overlay */}
                                    {(() => {
                                        const currentSequence = mockSequences.find(seq => seq.isSelected) || 
                                                                mockSequences.find(seq => seq.id === selectedSequence) || 
                                                                mockSequences[0];
                                        
                                        if (!currentSequence) return null;
                                        
                                        // Find the current segment based on currentTime
                                        const currentSegment = currentSequence.segmentList.find(segment => 
                                            currentTime >= segment.startTime && currentTime < segment.endTime
                                        );
                                        
                                        // Calculate actual top position based on available slider range
                                        const paddingTop = 16; // px
                                        const availableHeight = VIDEO_HEIGHT - captionHeight - paddingTop;
                                        const actualTopPx = paddingTop + (captionPosition / 100) * availableHeight;
                                        const actualTop = (actualTopPx / VIDEO_HEIGHT) * 100;
                                        
                                        return currentSegment && fontSize > 0 && (
                                            <div 
                                                className="absolute left-4 right-4 z-20"
                                                style={{ 
                                                    top: `${actualTop}%`,
                                                }}
                                            >
                                                <p 
                                                    ref={setCaptionRef}
                                                    className="text-center leading-tight px-2 py-1 cursor-default"
                                                    style={{ 
                                                        fontFamily: selectedFontFamilyFull,
                                                        fontSize: `${fontSize}px`,
                                                        fontWeight: selectedFontWeight,
                                                        color: activeColor,
                                                        WebkitTextStroke: activeOutlineEnabled ? `1px ${activeOutlineColor}` : '0px transparent',
                                                        textShadow: shadowEnabled 
                                                            ? `2px 2px ${(shadowThickness / 100) * 8}px rgba(0,0,0,${shadowIntensity / 100})`
                                                            : 'none'
                                                    }}
                                                >
                                                    {currentSegment.text}
                                                </p>
                                            </div>
                                        );
                                    })()}
                                    
                                    <div className="text-center relative z-10">
                                        <button 
                                            onClick={onPlayPause}
                                            className="w-16 h-16 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 hover:bg-black/60 transition-all border border-purple-400/50"
                                        >
                                            <Play size={24} className="text-white ml-1" />
                                        </button>
                                    </div>
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <div className="flex items-center justify-between text-white text-sm mb-2">
                                            <span>0:00</span>
                                            <span>1:11</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/20 rounded-full">
                                            <div className="w-1/3 h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-800 to-gray-900">
                                    <p className="text-sm">No video generated yet</p>
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-purple-500/20 bg-gray-900/50 backdrop-blur-sm relative z-10">
                        <p className="text-purple-300 text-sm text-center">
                            <span className="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent font-medium">
                                Video generation complete!
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(WorkspaceEditorPageClient);