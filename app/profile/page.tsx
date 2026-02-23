import ProfilePageServer from "@/components/page/profile/ProfilePageServer";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: 'My Profile', // "My Profile | ShortReal AI"
    description: 'Manage your ShortReal AI subscription, billing, and account settings.',
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export default async function ProfilePage() {
    return (
        <ProfilePageServer/>
    )
}