'use client'

import {memo, useMemo, useRef, useState} from "react";

interface MusicPanelProps {

}

function MusicPanel({

}: MusicPanelProps) {
    // 생성된 음악 사용하거나, 사용자가 올리는 방식으로 수정
    const [musicStartSeconds, setMusicStartSeconds] = useState(45); // Start time in seconds
    const musicStartInputRef = useRef<HTMLInputElement>(null);

    // Video duration in seconds (from project creation)
    const videoDuration = 30;

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

    return (
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
    )
}

export default memo(MusicPanel);