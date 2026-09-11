import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Kanban Board | Theta PM",
  description: "View and manage your kanban board. Drag, drop, and organize tasks.",
  path: "/(dashboard)/boards/[id]",
});

"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const KanbanBoard = dynamic(() => import("@/components/boards/kanban-board"), {
  ssr: false,
});

export default function BoardPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  return (
    <div className="h-full">
      <KanbanBoard 
        boardId={params.id} 
        onBack={() => router.back()} 
      />
    </div>
  );
}
