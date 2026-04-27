"use client";

import KanbanBoard from "@/components/boards/kanban-board";
import { useRouter } from "next/navigation";

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
