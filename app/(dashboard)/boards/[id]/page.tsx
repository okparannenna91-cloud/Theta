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
