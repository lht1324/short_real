'use client'

import { memo, useCallback, useMemo, useState } from 'react';
import { Menu, X, LogOut, User as UserIcon, LayoutDashboard, Zap, ChevronRight } from 'lucide-react';
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AnimPresence } from "@/components/public/framerMotion/AnimPresence";
import { MotionDiv } from "@/components/public/framerMotion/Motion";

function HeaderMobile() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, signOut } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isLogin = useMemo(() => {
        return !!user;
    }, [user]);

    const onClickNavigate = useCallback((id: string) => {
        setIsMenuOpen(false);
        const navigate = () => {
            const el = document.getElementById(id);
            if (el) {
                const y = el.getBoundingClientRect().top + window.pageYOffset - 60;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        };
        if (pathname === '/') {
            navigate();
        } else {
            router.push(`/#${id}`);
            setTimeout(navigate, 300);
        }
    }, [pathname, router]);

    const onClickProfile = useCallback(async () => {
        setIsMenuOpen(false);
        router.push('/profile');
    }, [router]);

    const onClickSignOut = useCallback(async () => {
        await signOut();
        setIsMenuOpen(false);
        router.push('/');
    }, [signOut, router]);

    return (
        <>
            <header id="main-header" className="fixed top-0 left-0 right-0 z-50 bg-[#0b0b15]/80 backdrop-blur-xl border-b border-white/10 transition-all duration-500">
                <div className="px-4 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="flex items-center space-x-2.5 cursor-pointer h-10"
                        onClick={(e) => {
                            if (pathname === '/') {
                                e.preventDefault();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        }}
                    >
                        <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                            <Image
                                src="/logo/logo-64.png"
                                alt="ShortReal AI"
                                fill
                                sizes="36px"
                                className="object-contain"
                                priority
                            />
                        </div>
                        <div className="flex items-center pt-1">
                            <span className="font-black text-xl tracking-tight leading-none">
                                <span className="text-white">Short</span>
                                <span className="text-[#FF3B30]">Real</span>
                                <span className="text-zinc-300 font-bold text-base ml-1">AI</span>
                            </span>
                        </div>
                    </Link>

                    {/* 44px Touch Target Hamburger Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-200 active:scale-95 transition-all"
                        aria-label="Toggle mobile menu"
                    >
                        {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </header>

            {/* Mobile Fullscreen Navigation Drawer */}
            <AnimPresence>
                {isMenuOpen && (
                    <MotionDiv
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="fixed inset-0 top-16 z-40 bg-[#0b0b15]/95 backdrop-blur-2xl flex flex-col justify-between p-6 overflow-y-auto"
                    >
                        {/* Navigation Links */}
                        <div className="space-y-3 pt-4">
                            {[
                                { id: "features", label: "Features" },
                                { id: "comparison", label: "The Gap" },
                                { id: "how-it-works", label: "How It Works" },
                                { id: "coststructure", label: "Cost Calculator" },
                                { id: "pricing", label: "Pricing" },
                                { id: "faq", label: "FAQ" },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onClickNavigate(item.id)}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 text-left text-lg font-bold text-white active:bg-white/10 active:scale-[0.98] transition-all"
                                >
                                    <span>{item.label}</span>
                                    <ChevronRight size={18} className="text-zinc-500" />
                                </button>
                            ))}
                        </div>

                        {/* Bottom Actions */}
                        <div className="pt-8 pb-6 border-t border-white/10 space-y-3">
                            {isLogin ? (
                                <>
                                    <button
                                        onClick={() => {
                                            router.push("/workspace/dashboard");
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-base active:scale-[0.98] transition-all"
                                    >
                                        <LayoutDashboard size={18} />
                                        <span>Dashboard</span>
                                    </button>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={onClickProfile}
                                            className="h-12 flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-semibold text-sm active:scale-[0.98] transition-all"
                                        >
                                            <UserIcon size={16} />
                                            <span>Profile</span>
                                        </button>
                                        <button
                                            onClick={onClickSignOut}
                                            className="h-12 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm active:scale-[0.98] transition-all"
                                        >
                                            <LogOut size={16} />
                                            <span>Sign out</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        router.push('/sign-in?redirectTo=profile');
                                    }}
                                    className="w-full h-13 flex items-center justify-center gap-2 rounded-2xl bg-white text-black font-extrabold text-base shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] active:scale-[0.98] transition-all"
                                >
                                    <Zap size={18} className="fill-black" />
                                    <span>Get Started</span>
                                </button>
                            )}
                        </div>
                    </MotionDiv>
                )}
            </AnimPresence>
        </>
    );
}

export default memo(HeaderMobile);
