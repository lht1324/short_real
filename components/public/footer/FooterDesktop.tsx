import { memo } from "react";
import Image from "next/image";
import Link from "next/link";

function FooterDesktop() {
    const year = new Date().getFullYear();

    return (
        <footer className="py-10 md:py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-[#0b0b15]">
            <div className="max-w-[87.5rem] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
                    {/* Brand Col */}
                    <div className="md:col-span-6 lg:col-span-8 flex flex-col items-start">
                        <Link href="/" className="flex items-center space-x-3 group mb-6">
                            <div className="relative w-8 h-8 transition-transform duration-300 group-hover:scale-110">
                                <Image
                                    src="/logo/logo-64.png"
                                    alt="Short Real"
                                    width={64}
                                    height={64}
                                    className="object-contain"
                                />
                            </div>
                            <span className="font-black text-2xl tracking-tight">
                                <span className="text-white">Short</span>
                                <span className="text-[#FF3B30]">Real</span>
                                <span className="text-zinc-300 font-bold text-xl ml-1.5">AI</span>
                            </span>
                        </Link>
                        <p className="text-2xl md:text-3xl lg:text-4xl font-black text-white max-w-lg tracking-tight leading-[1.1]">
                            No more slideshows.<br />
                            <span className="text-zinc-500">Feel what&apos;s real.</span>
                        </p>
                    </div>

                    {/* Links Col */}
                    <div className="md:col-span-3 lg:col-span-2 flex flex-col space-y-3">
                        <span className="text-xs font-bold tracking-widest text-zinc-600 uppercase mb-2">Legal</span>
                        <Link href="/legal/terms" className="text-zinc-400 hover:text-white transition-colors font-medium text-sm w-fit">
                            Terms of Service
                        </Link>
                        <Link href="/legal/privacy" className="text-zinc-400 hover:text-white transition-colors font-medium text-sm w-fit">
                            Privacy Policy
                        </Link>
                        <a href="mailto:support@shortreal.ai" className="text-zinc-400 hover:text-white transition-colors font-medium text-sm w-fit">
                            Contact Support
                        </a>
                    </div>

                    {/* Social Col */}
                    <div className="md:col-span-3 lg:col-span-2 flex flex-col space-y-3">
                        <span className="text-xs font-bold tracking-widest text-zinc-600 uppercase mb-2">Social</span>
                        <a 
                            href="https://www.youtube.com/@ShortRealAI" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center space-x-3 text-zinc-400 hover:text-white transition-colors font-medium text-sm w-fit group"
                        >
                            <div className="w-[2.8125rem] flex items-center justify-center relative grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                <Image
                                    src="/icons/youtube-logo.png"
                                    alt="ShortReal AI YouTube"
                                    width={45}
                                    height={40}
                                    className="object-contain"
                                />
                            </div>
                            <span>YouTube</span>
                        </a>
                        <a 
                            href="https://x.com/shortrealAI" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center space-x-3 text-zinc-400 hover:text-white transition-colors font-medium text-sm w-fit group"
                        >
                            <div className="w-[2.8125rem] flex items-center justify-center relative grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                <Image
                                    src="/icons/x-logo.svg"
                                    alt="ShortReal AI X"
                                    width={30}
                                    height={30}
                                    className="object-contain"
                                />
                            </div>
                            <span>X (Twitter)</span>
                        </a>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-zinc-600 text-sm font-medium">
                        &copy; {year} ShortReal AI. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default memo(FooterDesktop);
