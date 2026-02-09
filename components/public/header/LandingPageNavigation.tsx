import {memo} from "react";
import LandingPageNavigationItem from "@/components/public/header/LandingPageNavigationItem";

function LandingPageNavigation() {
    return (
        <nav className="hidden md:flex items-center space-x-8">
            <LandingPageNavigationItem
                navigateId={"features"}
                itemName={"Features"}
                isTallerSection={false}
            />
            <LandingPageNavigationItem
                navigateId={"comparison"}
                itemName={"The Gap"}
                isTallerSection={false}
            />
            <LandingPageNavigationItem
                navigateId={"howitworks"}
                itemName={"How It Works"}
                isTallerSection={false}
            />
            <LandingPageNavigationItem
                navigateId={"pricing"}
                itemName={"Pricing"}
                isTallerSection={true}
            />
            <LandingPageNavigationItem
                navigateId={"faq"}
                itemName={"FAQ"}
                isTallerSection={true}
            />
        </nav>
    )
}

export default memo(LandingPageNavigation);