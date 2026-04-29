import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Intelligence | Theta PM",
    description: "Advanced Strategic Intelligence and Knowledge Management.",
};

import { IntelligenceSidebar } from "@/components/intelligence/sidebar/intelligence-sidebar";

export default function IntelligenceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-full flex overflow-hidden bg-background">
            <IntelligenceSidebar />
            <main className="flex-1 h-full overflow-hidden flex flex-col">
                {children}
            </main>
        </div>
    );
}
