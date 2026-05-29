'use client'

import {memo, useMemo} from "react";
import Link from "next/link";
import {ListTodo, Plus, Zap} from 'lucide-react';
import {WorkspaceSidebarItem} from "@/components/public/WorkspaceSidebarItem";

interface WorkspaceSidebarProps {
    activeItem: WorkspaceSidebarItem;
}

function WorkspaceSidebar({ activeItem }: WorkspaceSidebarProps) {
    const menuItems = useMemo(() => [
        { 
            id: WorkspaceSidebarItem.DASHBOARD, 
            icon: ListTodo, 
            name: 'Dashboard', 
            href: '/workspace/dashboard' 
        },
        {
            id: WorkspaceSidebarItem.AUTOPILOT,
            icon: Zap,
            name: 'Autopilot',
            href: '/workspace/autopilot'
        },
        { 
            id: WorkspaceSidebarItem.CREATE, 
            icon: Plus, 
            name: 'Create', 
            href: '/workspace/create' 
        },
    ], []);

    return (
        <div className="w-20 bg-gray-900/50 backdrop-blur-sm border-r border-purple-500/20 flex flex-col items-center py-4 space-y-4 relative z-20">
            {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeItem === item.id;

                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-all border ${
                            isActive 
                                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-purple-400/50 shadow-lg' 
                                : 'text-gray-400 hover:text-pink-400 hover:bg-gray-800/50 border-transparent hover:border-purple-500/30'
                        }`}
                        title={item.name}
                    >
                        <IconComponent size={24} />
                        <span className="text-xs mt-1 leading-tight">{item.name}</span>
                    </Link>
                );
            })}
        </div>
    );
}

export default memo(WorkspaceSidebar);
