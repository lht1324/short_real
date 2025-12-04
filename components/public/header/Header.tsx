'use client'

import {memo, useCallback, useEffect, useMemo, useState} from 'react';
import { Menu, LogOut, User as UserIcon, LayoutDashboard } from 'lucide-react';
import Image from "next/image";
import {usePathname, useRouter} from "next/navigation";
import {useAuth} from "@/context/AuthContext";
import LandingPageNavigation from "@/components/public/header/LandingPageNavigation";

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

    useEffect(() => {
        console.log("isLogin: ", isLogin);
        console.log("user: ", user);
    }, [isLogin, user]);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 mb-16 bg-black backdrop-blur-sm border-b border-purple-500/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div
                        className="flex items-center space-x-2 cursor-pointer"
                        onClick={() => {
                            if (pathname === '/') {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            } else {
                                router.push("/");
                            }
                        }}
                    >
                        <Image
                            src="/logo/logo-64.png"
                            alt="Short Real"
                            width={48}
                            height={48}
                            className="w-12 h-12"
                        />
                        <span className="text-white font-bold text-3xl">ShortReal</span>
                    </div>

                    {/* Desktop Navigation */}
                    {CenterComponent}

                    {/* Right Side Actions */}
                    <div className="flex items-center space-x-4">
                        {isLogin ? (
                            /* User Profile Dropdown */
                            <div className="relative">
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                                >
                                    <Image
                                        src={user?.avatar_url || '/default-avatar.png'}
                                        alt={user?.name || 'User'}
                                        width={32}
                                        height={32}
                                        className="w-8 h-8 rounded-full border border-purple-500/30"
                                    />
                                    <span className="text-gray-300 text-sm font-medium hidden md:block">
                                        {user?.name}
                                    </span>
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-sm border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden">
                                        <button
                                            onClick={() => {
                                                router.push("/workspace/dashboard");
                                            }}
                                            className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-800/50 hover:text-purple-400 transition-colors"
                                        >
                                            <LayoutDashboard size={16} />
                                            <span className="text-sm">Dashboard</span>
                                        </button>
                                        <button
                                            onClick={onClickProfile}
                                            className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors"
                                        >
                                            <UserIcon size={16} />
                                            <span className="text-sm">Profile</span>
                                        </button>
                                        <button
                                            onClick={onClickSignOut}
                                            className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-800/50 hover:text-red-400 transition-colors border-t border-purple-500/20"
                                        >
                                            <LogOut size={16} />
                                            <span className="text-sm">Sign out</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Get Started Button */
                            <button
                                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                                onClick={() => {
                                    router.push('/sign-in?redirectTo=profile');
                                }}
                            >
                                Get Started
                            </button>
                        )}

                        {/* Mobile Menu */}
                        <button className="md:hidden p-2 text-gray-400 hover:text-pink-400 transition-colors">
                            <Menu size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default memo(Header);