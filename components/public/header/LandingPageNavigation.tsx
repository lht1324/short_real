import {memo} from "react";

function LandingPageNavigation() {
    return (
        <nav className="hidden md:flex items-center space-x-8">
            <a
                className="text-gray-300 hover:text-pink-400 transition-colors cursor-pointer"
                onClick={(e) => {
                    e.preventDefault();

                    const element = document.getElementById('features');
                    const headerOffset = 64; // Header 높이
                    const elementPosition = element?.getBoundingClientRect().top || 0;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth',
                    });
                }}
            >
                Features
            </a>
            <a
                className="text-gray-300 hover:text-pink-400 transition-colors cursor-pointer"
                onClick={(e) => {
                    e.preventDefault();

                    const element = document.getElementById('howitworks');
                    const headerOffset = 64; // Header 높이
                    const elementPosition = element?.getBoundingClientRect().top || 0;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth',
                    });
                }}
            >
                How It Works
            </a>
            <a
                className="text-gray-300 hover:text-pink-400 transition-colors cursor-pointer"
                onClick={(e) => {
                    // (화면 높이 - 헤더 높이)보다 섹션 높이가 길어 이게 자연스러움
                    e.preventDefault();
                    document.getElementById('pricing')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }}
            >
                Pricing
            </a>
        </nav>
    )
}

export default memo(LandingPageNavigation);