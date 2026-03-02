'use client'

import {memo, useCallback, useState} from "react";
import {X, Loader2} from "lucide-react";
import {RoadmapStatus} from "@/lib/api/types/supabase/RoadmapItem";

interface AddRoadmapItemModalProps {
    onClose: () => void;
    onSave: (title: string, description: string, status: RoadmapStatus) => Promise<void>;
}

function AddRoadmapItemModal({
    onClose,
    onSave
}: AddRoadmapItemModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<RoadmapStatus>(RoadmapStatus.SKETCH);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = useCallback(async (e: React.SubmitEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSaving(true);
        try {
            await onSave(title, description, status);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }, [description, onSave, status, title]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div 
                className="w-full max-w-lg bg-gray-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-gray-800/50">
                    <h2 className="text-xl font-bold text-white">Add New Roadmap Item</h2>
                    <button 
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-purple-300">Title</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter title..."
                            className="w-full bg-gray-800 border border-purple-500/20 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-purple-300">Description (Number)</label>
                        <input
                            type="text"
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter description..."
                            className="w-full bg-gray-800 border border-purple-500/20 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-purple-300">Initial Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(Number(e.target.value))}
                            className="w-full bg-gray-800 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value={RoadmapStatus.SKETCH}>Sketch</option>
                            <option value={RoadmapStatus.COMING_SOON}>Coming Soon</option>
                            <option value={RoadmapStatus.IN_PROGRESS}>In Progress</option>
                            <option value={RoadmapStatus.LIVE}>Live</option>
                        </select>
                    </div>

                    {/* Footer / Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !title.trim()}
                            className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-sm font-bold text-white hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/25"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
                            Create Item
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default memo(AddRoadmapItemModal);