import {memo, useCallback, useMemo} from "react";
import {ArrowRight, Play} from "lucide-react";

interface HeroSectionProps {
    className: string;
}

function HeroSection({
    className
}: HeroSectionProps) {
    const videoExamples = useMemo(() => [
        {
            id: 1,
            title: "Julius Caesar Story",
            theme: "Historical",
            color: "from-pink-500 to-purple-600"
        },
        {
            id: 2,
            title: "Space Adventure",
            theme: "Sci-Fi",
            color: "from-purple-500 to-indigo-600"
        },
        {
            id: 3,
            title: "Mystery Tale",
            theme: "Thriller",
            color: "from-indigo-500 to-cyan-500"
        }
    ], []);

    const onClickGetStarted = useCallback((e) => {
        e.preventDefault();
        document.getElementById('pricing')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, []);

    return (
        <section className={`relative ${className} overflow-hidden`}>
            {/* Vaporwave Background Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-3xl"></div>
            </div>

            <div className="relative max-w-7xl mx-auto">
                <div className="flex flex-row justify-between items-center gap-12">
                    {/* Left Content */}
                    <div className="flex-1 space-y-8">
                        {/* Main Heading */}
                        <div className="space-y-6">
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                                Tired of
                                <br />
                                <span className="bg-gradient-to-r from-gray-400 to-gray-500 bg-clip-text text-transparent line-through">AI slideshows</span>?
                                <br />
                                Create
                                <br />
                                <span className="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">Real shortform</span>.
                            </h1>

                            <p className="text-xl text-gray-300 max-w-2xl leading-relaxed">
                                Here&#39;s what you looking for.
                            </p>
                        </div>

                        {/* CTA Button */}
                        <div className="pt-4">
                            <button
                                className="group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-purple-500/25"
                                onClick={onClickGetStarted}
                            >
                                <span>Get Started</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Right Content - Video Examples */}
                    <div className="relative flex-shrink-0">
                        <div className="grid grid-cols-3 gap-6">
                            {videoExamples.map((video) => (
                                <div
                                    key={video.id}
                                    className="group relative w-48 aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 hover:scale-105 border border-purple-500/30 hover:border-purple-400/50 backdrop-blur-sm bg-gray-900/50"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${video.color}`}></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>

                                    {/* Play Icon Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="w-12 h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                                            <Play size={20} className="text-white ml-0.5" />
                                        </div>
                                    </div>

                                    <div className="relative h-full flex flex-col justify-end p-4">
                                        <div className="space-y-1">
                                            <h3 className="text-white font-bold text-base">{video.title}</h3>
                                            <p className="text-gray-200 text-sm">{video.theme}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default memo(HeroSection);