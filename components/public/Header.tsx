'use client'

import { memo } from 'react';
import { Sun, Menu } from 'lucide-react';

function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-purple-500/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">⚡</span>
                        </div>
                        <span className="text-white font-bold text-xl">ShortReal</span>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <a href="#pricing" className="text-gray-300 hover:text-pink-400 transition-colors">
                            Pricing
                        </a>
                        <a href="#blog" className="text-gray-300 hover:text-pink-400 transition-colors">
                            Blog
                        </a>
                        <div className="relative">
                            <a href="#affiliate" className="text-gray-300 hover:text-pink-400 transition-colors flex items-center">
                                Affiliate Program
                                <span className="ml-1 px-2 py-0.5 text-xs bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full">
                                    New
                                </span>
                            </a>
                        </div>
                    </nav>

                    {/* Right Side Actions */}
                    <div className="flex items-center space-x-4">
                        {/* Theme Toggle */}
                        {/*<button className="p-2 text-gray-400 hover:text-pink-400 transition-colors">*/}
                        {/*    <Sun size={20} />*/}
                        {/*</button>*/}

                        {/* Sign In */}
                        {/*<button className="text-gray-300 hover:text-white transition-colors">*/}
                        {/*    Sign in*/}
                        {/*</button>*/}

                        {/* Get Started */}
                        <button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105">
                            Get Started
                        </button>

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