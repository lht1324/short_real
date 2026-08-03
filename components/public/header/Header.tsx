'use client'

import { memo } from 'react';
import HeaderDesktop from "@/components/public/header/HeaderDesktop";
import HeaderMobile from "@/components/public/header/HeaderMobile";

function Header() {
    return (
        <>
            <div className="hidden md:block">
                <HeaderDesktop />
            </div>
            <div className="md:hidden">
                <HeaderMobile />
            </div>
        </>
    );
}

export default memo(Header);

