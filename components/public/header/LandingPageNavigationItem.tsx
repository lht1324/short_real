import {memo} from "react";

interface LandingPageNavigationItemProps {
    navigateId: string;
    itemName: string;
    isTallerSection: boolean;
}

function LandingPageNavigationItem({
    navigateId,
    itemName,
    isTallerSection,
}: LandingPageNavigationItemProps) {
    return (
        <a
            className="text-gray-300 hover:text-pink-400 transition-colors cursor-pointer"
            onClick={(e) => {
                e.preventDefault();

                if (isTallerSection) {
                    document.getElementById(navigateId)?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                } else {
                    const element = document.getElementById(navigateId);
                    const headerOffset = 64; // Header 높이
                    const elementPosition = element?.getBoundingClientRect().top || 0;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth',
                    });
                }
            }}
        >
            {itemName}
        </a>
    )
}

export default memo(LandingPageNavigationItem);