import {Metadata} from "next";
import AdminPageClient from "@/components/page/admin/AdminPageClient";

export const metadata: Metadata = {
    title: 'Admin', // "Admin | ShortReal AI"
    description: 'Admin Page',
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export default async function AdminPage() {
    return (
        <AdminPageClient/>
    )
}