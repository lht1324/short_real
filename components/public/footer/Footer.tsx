import { memo, useMemo } from "react";
import Image from "next/image";

function Footer() {
    const year = useMemo(() => {
        return new Date().getFullYear();
    }, []);

    return (
        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-[#0b0b15]/50 backdrop-blur-md">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
                    {/* Logo & Copyright */}
                    <div className="text-center md:text-left">
                        <div className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent mb-2">
                            ShortReal AI
                        </div>
                        <p className="text-gray-500 text-sm">
                            &copy; {year} ShortReal AI. All rights reserved.
                        </p>
                    </div>

                    {/* Links */}
                    <div className="flex space-x-8 text-sm">
                        <a href={`https://shortreal.ai/legal/terms`} className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
                        <a href={`https://shortreal.ai/legal/privacy`} className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
                    </div>

                    {/* Social Links */}
                    <div className="flex space-x-4">
                        <a
                            href="https://www.youtube.com/@ShortRealAI"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all"
                        >
                            <Image
                                src="/icons/youtube-logo.png"
                                alt="ShortReal AI YouTube"
                                width={45}
                                height={40}
                                className="object-contain"
                            />
                        </a>
                        <a
                            href="https://x.com/shortrealAI"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all"
                        >
                            <Image
                                src="/icons/x-logo.svg"
                                alt="ShortReal AI X"
                                width={30}
                                height={30}
                                className="object-contain"
                            />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default memo(Footer);