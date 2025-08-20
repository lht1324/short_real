import {memo, useMemo} from "react";
import {ArrowRight} from "lucide-react";

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

    return (
        <section className={`relative ${className} overflow-hidden`}>
            {/* Vaporwave Background Effects */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
            </div>

            <div className="relative max-w-7xl mx-auto">
                <div className="flex flex-row justify-between items-center">
                    {/* Left Content */}
                    <div className="space-y-8">
                        {/* Powered by Badge */}
                        {/*<div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-purple-500/30 rounded-full text-sm backdrop-blur-sm">*/}
                        {/*    <Zap className="w-4 h-4 text-yellow-400 mr-2" />*/}
                        {/*    <span className="text-gray-300">Powered by GPT-4.5</span>*/}
                        {/*</div>*/}

                        {/* Main Heading */}
                        <div className="space-y-4">
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                                Create <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">viral</span>
                                <br />
                                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">short-form videos</span>
                                <br />
                                with a few clicks.
                            </h1>

                            <p className="text-xl text-gray-300 max-w-2xl">
                                Wanna make short-form but don&#39;t know how to start?<br/>
                                Try this AI magic once.
                            </p>
                        </div>

                        {/* CTA Button */}
                        <div className="pt-4">
                            <button className="group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-purple-500/25">
                                <span>Get Started</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Right Content - Video Examples */}
                    <div className="relative">
                        <div className="grid grid-cols-3 gap-6">
                            {videoExamples.map((video, index) => (
                                <div
                                    key={video.id}
                                    className="relative w-20 md:w-48 aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-300 hover:scale-105 mx-auto"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${video.color} opacity-80`}></div>
                                    <div className="relative h-full flex flex-col justify-end p-4">
                                        <div className="space-y-2">
                                            <h3 className="text-white font-bold text-base">{video.title}</h3>
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