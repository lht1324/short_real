'use client'

import {memo, useCallback, useMemo} from "react";
import Link from "next/link";
import { Plus, Calendar, Download, X, ListTodo } from 'lucide-react';

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

    // Virtual tabs for navigation consistency
    const virtualTabs = useMemo(() => [
        { id: 'dashboard', icon: ListTodo, name: 'Tasks', href: '/workspace/dashboard', active: true },
        { id: 'create', icon: Plus, name: 'Create', href: '/workspace/create' }
    ], []);

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Top Header - Same as Create */}
            <div className="flex items-center justify-between py-4 border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-sm">
                <div className="flex items-center" style={{paddingLeft: '16px'}}>
                    <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">🏠</span>
                    </div>
                    <div className="flex flex-col ml-4">
                        <span className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                            Video Task Manager
                        </span>
                        <p className="text-gray-400 text-base pl-0.5">
                            Your tasks&#39; progresses here.
                        </p>
                    </div>
                </div>
                <div className="pr-6">
                    <Link 
                        href="/workspace/create"
                        className="group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-purple-500/25"
                    >
                        <Plus size={20} />
                        <span>Start New Task</span>
                    </Link>
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
                                className={`size-[calc(4px*16)] rounded-lg flex flex-col items-center justify-center transition-all border ${
                                    tab.active 
                                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-purple-400/50 shadow-lg' 
                                        : 'text-gray-400 hover:text-pink-400 hover:bg-gray-800/50 border-transparent hover:border-purple-500/30'
                                }`}
                                title={tab.name}
                            >
                                <IconComponent size={24} />
                                <span className="text-sm mt-1.5 leading-tight">{tab.name}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Main Content Panel */}
                <div className="flex-1 bg-gray-900/30 backdrop-blur-sm overflow-y-auto">
                    <div className="p-6">
                        <div className="text-purple-300 text-2xl font-medium mb-6">Current Video Tasks</div>

                        {mockWorkItems.length === 0 ? (
                            <div className="max-w-4xl">
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Plus size={24} className="text-white" />
                                    </div>
                                    <p className="text-gray-400 text-lg mb-4">No tasks yet</p>
                                    <Link
                                        href="/workspace/create"
                                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl text-base font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25"
                                    >
                                        <Plus size={16} />
                                        <span>Start New Task</span>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 max-w-4xl">
                                {mockWorkItems.map((item) => (
                                    <div key={item.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 hover:bg-gray-800/70 transition-all duration-300">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-semibold text-white mb-3">
                                                    {item.title}
                                                </h3>
                                                <div className="flex items-center space-x-6 text-gray-300">
                                                    <span className="flex items-center space-x-2">
                                                        <Calendar size={16} className="text-purple-400" />
                                                        <span>Started: {item.startDate}</span>
                                                    </span>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStageColor(item.currentStage)} backdrop-blur-sm`}>
                                                        {getStageText(item.currentStage)}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center space-x-3">
                                                {item.currentStage === CurrentStage.Editing && (
                                                    <Link
                                                        href={`/workspace/editor?task_id=${item.id}`}
                                                        className="group bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/25"
                                                    >
                                                        Edit Video
                                                    </Link>
                                                )}
                                                
                                                {item.currentStage === CurrentStage.Completed && (
                                                    <button
                                                        onClick={() => handleDownload(item.id)}
                                                        className="group bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25 flex items-center space-x-2"
                                                    >
                                                        <Download size={14} />
                                                        <span>Download</span>
                                                    </button>
                                                )}

                                                {item.currentStage !== CurrentStage.Completed && (
                                                    <button
                                                        onClick={() => handleCancelWork(item.id)}
                                                        className="group bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-red-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25 flex items-center space-x-2"
                                                    >
                                                        <X size={14} />
                                                        <span>Cancel</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(WorkspaceDashboardPageClient);