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
        <div className="w-20 bg-zinc-950/80 backdrop-blur-md border-r border-white/5 flex flex-col items-center py-4 space-y-3 relative z-20">
            {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeItem === item.id;

                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all border ${
                            isActive 
                                ? 'bg-white/10 text-zinc-100 border-white/10 shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border-transparent'
                        }`}
                        title={item.name}
                    >
                        <IconComponent size={20} className="mb-1" />
                        <span className="text-[10px] font-medium tracking-wide">{item.name}</span>
                    </Link>
                );
            })}
        </div>
    );
}

export default memo(WorkspaceSidebar);
