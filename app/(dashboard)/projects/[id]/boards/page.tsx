"use client";

import BoardsPage from "@/components/boards/boards-page";

export default function Page({ params }: { params: { id: string } }) {
  return <BoardsPage projectId={params.id} />;
}
