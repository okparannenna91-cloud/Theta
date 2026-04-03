"use client";

import { WikiSidebar } from "@/components/wiki/wiki-sidebar";
import { useWorkspace } from "@/hooks/use-workspace";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export default function WikiLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { activeWorkspaceId } = useWorkspace();

    if (!activeWorkspaceId) return children;

    return (
        <div className="flex h-screen overflow-hidden bg-[#fafafa] dark:bg-[#020617]">
            <WikiSidebar workspaceId={activeWorkspaceId} />
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {children}
            </div>
        </div>
    );
}
