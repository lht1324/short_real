import { memo } from "react";
import FooterDesktop from "@/components/public/footer/FooterDesktop";
import FooterMobile from "@/components/public/footer/FooterMobile";

function Footer() {
    return (
        <>
            <div className="hidden md:block">
                <FooterDesktop />
            </div>
            <div className="md:hidden">
                <FooterMobile />
            </div>
        </>
    );
}

export default memo(Footer);