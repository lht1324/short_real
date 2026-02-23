'use client'

import {memo, useCallback, useMemo, useState} from 'react';
import { Menu, LogOut, User as UserIcon, LayoutDashboard } from 'lucide-react';
import Image from "next/image";
import {usePathname, useRouter} from "next/navigation";
import {useAuth} from "@/context/AuthContext";
import LandingPageNavigation from "@/components/public/header/LandingPageNavigation";
import {AnimPresence} from "@/components/public/framerMotion/AnimPresence";
import {MotionDiv} from "@/components/public/framerMotion/Motion";

function Header() {
    const router = useRouter();
    const pathname = usePathname();

    const { user, signOut } = useAuth();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const isLogin = useMemo(() => {
        return !!user;
    }, [user]);

    const onClickProfile = useCallback(async () => {
        setIsDropdownOpen(false);
        router.push('/profile');
    }, [router]);

    const onClickSignOut = useCallback(async () => {
        await signOut();
        setIsDropdownOpen(false);
        router.push('/');
    }, [signOut, router]);

    const CenterComponent = useMemo(() => {
        switch (pathname) {
            case '/': return <LandingPageNavigation/>
            default: return <div/>
        }
    }, [pathname])

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0b15]/70 backdrop-blur-xl border-b border-white/5 transition-all duration-300 supports-[backdrop-filter]:bg-[#0b0b15]/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div
                        className="flex items-center space-x-3 cursor-pointer group"
                        onClick={() => {
                            if (pathname === '/') {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            } else {
                                router.push("/");
                            }
                        }}
                    >
                        <div className="relative w-10 h-10 transition-transform duration-300 group-hover:scale-110">
                            <Image
                                src="/logo/logo-64.png"
                                alt="Short Real"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <span className="font-black text-3xl bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent tracking-tight">
                            ShortReal AI
                        </span>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:block">
                        {CenterComponent}
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center space-x-4">
                        {isLogin ? (
                            /* User Profile Dropdown */
                            <div className="relative">
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`
                                        flex items-center space-x-3 px-2 py-1.5 rounded-full border transition-all duration-200
                                        ${isDropdownOpen 
                                            ? 'bg-white/10 border-purple-500/50' 
                                            : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'}
                                    `}
                                >
                                    <Image
                                        src={user?.avatar_url || '/default-avatar.png'}
                                        alt={user?.name || 'User'}
                                        width={32}
                                        height={32}
                                        className="w-8 h-8 rounded-full ring-2 ring-transparent group-hover:ring-purple-500/50"
                                    />
                                    <span className="text-gray-300 text-sm font-medium hidden md:block pr-2">
                                        {user?.name}
                                    </span>
                                </button>

                                {/* Dropdown Menu */}
                                <AnimPresence>
                                    {isDropdownOpen && (
                                        <MotionDiv
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute right-0 mt-2 w-56 bg-[#181825] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/5"
                                        >
                                            <div className="p-1">
                                                <button
                                                    onClick={() => {
                                                        router.push("/workspace/dashboard");
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className="w-full flex items-center space-x-3 px-4 py-2.5 text-gray-400 hover:bg-white/5 hover:text-purple-400 rounded-lg transition-colors"
                                                >
                                                    <LayoutDashboard size={16} />
                                                    <span className="text-sm font-medium">Dashboard</span>
                                                </button>
                                                <button
                                                    onClick={onClickProfile}
                                                    className="w-full flex items-center space-x-3 px-4 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                                                >
                                                    <UserIcon size={16} />
                                                    <span className="text-sm font-medium">Profile</span>
                                                </button>
                                                <div className="h-[1px] bg-white/5 my-1 mx-2" />
                                                <button
                                                    onClick={onClickSignOut}
                                                    className="w-full flex items-center space-x-3 px-4 py-2.5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                                                >
                                                    <LogOut size={16} />
                                                    <span className="text-sm font-medium">Sign out</span>
                                                </button>
                                            </div>
                                        </MotionDiv>
                                    )}
                                </AnimPresence>
                            </div>
                        ) : (
                            /* Get Started Button */
                            <button
                                className="group relative px-5 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 hover:shadow-[0_0_20px_-5px_rgba(236,72,153,0.4)]"
                                onClick={() => {
                                    router.push('/sign-in?redirectTo=profile');
                                }}
                            >
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 group-hover:from-purple-500 group-hover:to-pink-500 transition-colors" />
                                <span className="relative">Get Started</span>
                            </button>
                        )}

                        {/* Mobile Menu (Placeholder style) */}
                        <button className="md:hidden p-2 text-gray-400 hover:text-white transition-colors">
                            <Menu size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default memo(Header);
