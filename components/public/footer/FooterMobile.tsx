import { memo } from "react";
import Image from "next/image";
import Link from "next/link";

function FooterMobile() {
    const year = new Date().getFullYear();

    return (
        <footer className="py-10 px-5 border-t border-white/10 bg-[#0b0b15] pb-24">
            <div className="flex flex-col space-y-8">
                {/* Brand */}
                <div className="flex flex-col items-start space-y-4">
                    <Link href="/" className="flex items-center space-x-2.5">
                        <div className="relative w-8 h-8 shrink-0">
                            <Image
                                src="/logo/logo-64.png"
                                alt="ShortReal AI"
                                width={32}
                                height={32}
                                className="object-contain"
                            />
                        </div>
                        <span className="font-black text-xl tracking-tight">
                            <span className="text-white">Short</span>
                            <span className="text-[#FF3B30]">Real</span>
                            <span className="text-zinc-300 font-bold text-base ml-1">AI</span>
                        </span>
                    </Link>
                    <p className="text-2xl font-black text-white tracking-tight leading-tight">
                        No more slideshows.<br />
                        <span className="text-zinc-500">Feel what&apos;s real.</span>
                    </p>
                </div>

                {/* Legal & Contact */}
                <div className="flex flex-col space-y-3 pt-4 border-t border-white/5">
                    <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Legal & Support</span>
                    <div className="flex flex-col space-y-2">
                        <Link href="/legal/terms" className="text-zinc-400 active:text-white py-1 text-sm font-medium">
                            Terms of Service
                        </Link>
                        <Link href="/legal/privacy" className="text-zinc-400 active:text-white py-1 text-sm font-medium">
                            Privacy Policy
                        </Link>
                        <a href="mailto:support@shortreal.ai" className="text-zinc-400 active:text-white py-1 text-sm font-medium">
                            Contact Support
                        </a>
                    </div>
                </div>

                {/* Social Links */}
                <div className="flex flex-col space-y-3 pt-4 border-t border-white/5">
                    <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Social</span>
                    <div className="flex items-center space-x-6">
                        <a
                            href="https://www.youtube.com/@ShortRealAI"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-zinc-400 active:text-white text-sm font-medium"
                        >
                            <Image
                                src="/icons/youtube-logo.png"
                                alt="YouTube"
                                width={24}
                                height={24}
                                className="object-contain opacity-80"
                            />
                            <span>YouTube</span>
                        </a>
                        <a
                            href="https://x.com/shortrealAI"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-zinc-400 active:text-white text-sm font-medium"
                        >
                            <Image
                                src="/icons/x-logo.svg"
                                alt="X"
                                width={20}
                                height={20}
                                className="object-contain opacity-80"
                            />
                            <span>X (Twitter)</span>
                        </a>
                    </div>
                </div>

                {/* Copyright */}
                <div className="pt-4 border-t border-white/5">
                    <p className="text-zinc-600 text-xs font-medium">
                        &copy; {year} ShortReal AI. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default memo(FooterMobile);
