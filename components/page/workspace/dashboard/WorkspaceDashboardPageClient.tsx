'use client'

import {memo, useCallback, useMemo} from "react";
import Link from "next/link";

enum CurrentStage {
    Processing = 'processing',
    Editing = 'editing',
    Completed = 'completed'
}

interface WorkItem {
    id: string;
    startDate: string;
    currentStage: CurrentStage;
    title: string;
}

function WorkspaceDashboardPageClient() {
    const mockWorkItems: WorkItem[] = useMemo(() => [
        {
            id: '1',
            startDate: '2025-01-15',
            currentStage: CurrentStage.Editing,
            title: 'Summer vacation highlights'
        },
        {
            id: '2', 
            startDate: '2025-01-10',
            currentStage: CurrentStage.Completed,
            title: 'Birthday party memories'
        },
        {
            id: '3',
            startDate: '2025-01-18',
            currentStage: CurrentStage.Processing,
            title: 'Weekend trip footage'
        }
    ], []);

    const handleCancelWork = useCallback((workId: string) => {
        console.log('Cancel work:', workId);
    }, []);

    const handleDownload = useCallback((workId: string) => {
        console.log('Download video:', workId);
    }, []);

    const getStageText = useCallback((stage: WorkItem['currentStage']) => {
        switch (stage) {
            case 'processing':
                return 'Processing';
            case 'editing':
                return 'Ready for editing';
            case 'completed':
                return 'Completed';
            default:
                return 'Unknown';
        }
    }, []);

    const getStageColor = useCallback((stage: WorkItem['currentStage']) => {
        switch (stage) {
            case 'processing':
                return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
            case 'editing':
                return 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white';
            case 'completed':
                return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
            default:
                return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
        }
    }, []);

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden">
            {/* Vaporwave Background Effects */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-3xl"></div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex justify-between items-center mb-12">
                    <h1 className="text-4xl sm:text-5xl font-bold">
                        <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                            Video
                        </span>{" "}
                        <span className="bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent">
                            Workspace
                        </span>
                    </h1>
                    <Link 
                        href="/workspace/create"
                        className="group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-purple-500/25"
                    >
                        <span>Start New Project</span>
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </Link>
                </div>

                <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-500/20">
                    <div className="px-8 py-6 border-b border-purple-500/20">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                            Current Projects
                        </h2>
                    </div>

                    {mockWorkItems.length === 0 ? (
                        <div className="px-8 py-16 text-center">
                            <p className="text-gray-400 text-lg">No projects yet. Start your first project!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-purple-500/10">
                            {mockWorkItems.map((item) => (
                                <div key={item.id} className="px-8 py-6 hover:bg-purple-500/5 transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-semibold text-white mb-3">
                                                {item.title}
                                            </h3>
                                            <div className="flex items-center space-x-6 text-gray-300">
                                                <span className="flex items-center space-x-2">
                                                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>Started: {item.startDate}</span>
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStageColor(item.currentStage)} backdrop-blur-sm`}>
                                                    {getStageText(item.currentStage)}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-4">
                                            {item.currentStage === CurrentStage.Editing && (
                                                <Link
                                                    href={`/workspace/editor?task_id=${item.id}`}
                                                    className="group bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/25"
                                                >
                                                    Edit Video
                                                </Link>
                                            )}
                                            
                                            {item.currentStage === CurrentStage.Completed && (
                                                <button
                                                    onClick={() => handleDownload(item.id)}
                                                    className="group bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25"
                                                >
                                                    Download
                                                </button>
                                            )}

                                            {item.currentStage !== CurrentStage.Completed && <button
                                                onClick={() => handleCancelWork(item.id)}
                                                className="group bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:from-red-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25"
                                            >
                                                Cancel
                                            </button>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default memo(WorkspaceDashboardPageClient);