import CallbackSessionClient from "@/components/page/callback/CallbackSessionClient";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: 'Signing In',
    robots: { index: false },
}

export default function CallbackSessionPage() {
    return <CallbackSessionClient />
}
