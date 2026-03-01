'use client'

import {memo, useCallback, useEffect, useState} from "react";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {Loader2, ListTodo, Plus} from "lucide-react";
import {roadmapClientAPI} from "@/lib/api/client/roadmapClientAPI";
import {RoadmapItem, RoadmapStatus} from "@/lib/api/types/supabase/RoadmapItem";
import AddRoadmapItemModal from "@/components/page/admin/AddRoadmapItemModal";

function AdminPageClient() {
    const router = useRouter();
    const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchRoadmaps = useCallback(async () => {
        setIsLoading(true);
        try {
            const items = await roadmapClientAPI.getRoadmaps();
            setRoadmapItems(items || []);
        } catch (error) {
            console.error("Failed to fetch roadmaps", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadData = async () => { // 확장 대비
            await fetchRoadmaps();
        }

        loadData().then();
    }, [fetchRoadmaps]);

    const handleStatusChange = useCallback(async (id: string, newStatus: RoadmapStatus) => {
        setSavingId(id);
        try {
            const updated = await roadmapClientAPI.patchRoadmapItemById(id, {status: Number(newStatus)});
            if (updated) {
                setRoadmapItems(prev => prev.map(item => item.id === id ? {...item, status: Number(newStatus)} : item));
            }
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update status.");
        } finally {
            setSavingId(null);
        }
    }, []);

    const handleAddRoadmapItem = useCallback(async (title: string, description: string, status: RoadmapStatus) => {
        try {
            const newItem = await roadmapClientAPI.postRoadmapItem({
                title,
                description,
                status
            });

            if (newItem) {
                setRoadmapItems(prev => [newItem, ...prev]);
                setShowAddModal(false);
            } else {
                alert("Failed to create roadmap item.");
            }
        } catch (error) {
            console.error("Failed to add roadmap item", error);
            alert("Error creating roadmap item.");
        }
    }, []);

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* Vaporwave Background Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
            </div>

            {/* Top Header */}
            <div className="flex items-center justify-between py-4 border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-sm relative z-20">
                <div className="flex items-center" style={{paddingLeft: '16px'}}>
                    <Image
                        src="/logo/logo-64.png"
                        alt="Short Real"
                        width={64}
                        height={64}
                        className="w-16 h-16 cursor-pointer"
                        onClick={() => router.push('/')}
                    />
                    <div className="flex flex-col ml-4">
                        <span className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                            Admin Dashboard
                        </span>
                        <p className="text-gray-400 text-base pl-0.5">
                            Manage application data and roadmaps.
                        </p>
                    </div>
                </div>

                <div className="pr-6">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-purple-500/25"
                    >
                        <Plus size={20} />
                        <span>Add New Item</span>
                    </button>
                </div>
            </div>

            <div className="flex h-[calc(100vh-97px)] relative z-10">
                {/* Left Virtual Tab Sidebar */}
                <div className="w-20 bg-gray-900/50 backdrop-blur-sm border-r border-purple-500/20 flex flex-col items-center py-4 space-y-4">
                    <div 
                        className="w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-all border bg-gradient-to-r from-pink-500 to-purple-600 text-white border-purple-400/50 shadow-lg cursor-pointer" 
                        title="Roadmaps"
                    >
                        <ListTodo size={24} />
                        <span className="text-xs mt-1 leading-tight">Roadmaps</span>
                    </div>
                </div>

                {/* Main Content Panel */}
                <div className="flex-1 bg-gray-900/30 backdrop-blur-sm overflow-y-auto">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 max-w-5xl">
                            <div className="text-purple-300 text-2xl font-medium">Roadmap Items</div>
                            <button 
                                onClick={fetchRoadmaps} 
                                disabled={isLoading} 
                                className="text-sm px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Refresh
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-16 max-w-5xl">
                                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                            </div>
                        ) : roadmapItems.length === 0 ? (
                            <div className="text-center py-16 text-gray-400 max-w-5xl">No roadmap items found.</div>
                        ) : (
                            <div className="space-y-4 max-w-5xl pb-10">
                                {roadmapItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((item) => (
                                    <div key={item.id} className="bg-gray-800/50 border border-purple-500/20 rounded-xl p-5 hover:border-purple-500/50 transition-all shadow-lg shadow-purple-500/5">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                                                <p className="text-gray-400 text-sm">{item.description}</p>
                                                <div className="text-xs text-gray-500 mt-3 flex gap-4">
                                                    <span className="bg-gray-900/50 px-2 py-1 rounded">ID: {item.id}</span>
                                                    <span className="bg-gray-900/50 px-2 py-1 rounded">Created: {new Date(item.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-gray-700 pt-4 md:pt-0 md:pl-6 mt-2 md:mt-0">
                                                <div className="flex flex-col gap-1 w-full md:w-auto">
                                                    <label className="text-xs text-purple-300 font-medium">Status</label>
                                                    <div className="relative">
                                                        <select
                                                            className="appearance-none w-full md:w-40 bg-gray-900 border border-purple-500/30 rounded-lg pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer disabled:opacity-50 transition-colors"
                                                            value={item.status}
                                                            disabled={savingId === item.id}
                                                            onChange={(e) => handleStatusChange(item.id, Number(e.target.value))}
                                                        >
                                                            <option value={RoadmapStatus.LIVE}>Live</option>
                                                            <option value={RoadmapStatus.IN_PROGRESS}>In Progress</option>
                                                            <option value={RoadmapStatus.COMING_SOON}>Coming Soon</option>
                                                            <option value={RoadmapStatus.SKETCH}>Sketch</option>
                                                        </select>
                                                        {savingId === item.id ? (
                                                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 animate-spin" />
                                                        ) : (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                                                                ▼
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showAddModal && <AddRoadmapItemModal
                onClose={() => setShowAddModal(false)}
                onSave={handleAddRoadmapItem}
            />}
        </div>
    );
}

export default memo(AdminPageClient);