import {Loader2, Mic} from "lucide-react";
import {memo, useCallback, MouseEvent, useState, useRef, useEffect} from "react";
import {VoiceProfile} from "@/components/page/landing/how-it-works-section/HowItWorksSection";
import VoiceSelectionItem from "@/components/page/landing/how-it-works-section/VoiceSelectionItem";

interface VoiceSelectionPanelProps {
    voiceDataList: VoiceProfile[];
    selectedVoiceId: string;
    onSelectVoiceId: (voiceId: string) => void;
}

function VoiceSelectionPanel({
    voiceDataList,
    selectedVoiceId,
    onSelectVoiceId,
}: VoiceSelectionPanelProps) {
    // Audio State
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

    const onClickPlay = useCallback((e: MouseEvent, voice: VoiceProfile) => {
        e.stopPropagation();

        if (!voice.previewUrl) return;

        if (playingVoiceId === voice.id) {
            audioRef.current?.pause();
            setPlayingVoiceId(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }

        const audio = new Audio(voice.previewUrl);
        audioRef.current = audio;
        setPlayingVoiceId(voice.id);

        audio.play().catch(err => console.error("Audio play failed", err));

        audio.onended = () => {
            setPlayingVoiceId(null);
        };
    }, [playingVoiceId]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    return (
        <div className="flex-1 bg-[#0f0f16] border border-white/10 rounded-3xl p-6 relative flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-4 text-pink-400 shrink-0">
                <div className="p-1.5 bg-pink-500/10 rounded-md">
                    <Mic size={16} />
                </div>
                <span className="text-sm font-bold tracking-wide">STEP 2: CASTING</span>
            </div>

            {/* [수정] max-h-[320px] 추가로 높이 제한 및 스크롤 활성화 */}
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[320px]">
                {voiceDataList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                        <Loader2 className="animate-spin mb-2" />
                        <span className="text-xs">Loading voices...</span>
                    </div>
                ) : (
                    voiceDataList.map((voice) => {
                        return <VoiceSelectionItem
                            key={voice.id}
                            voice={voice}
                            isSelected={selectedVoiceId === voice.id}
                            isPlaying={playingVoiceId === voice.id}
                            onClickPlay={onClickPlay}
                            onSelectVoiceId={onSelectVoiceId}
                        />;
                    })
                )}
            </div>
        </div>
    )
}

export default memo(VoiceSelectionPanel);