import BoardsPage from "@/components/boards/boards-page";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Kanban Boards | Theta PM",
  description: "Visualize and manage your work with powerful kanban boards. Drag, drop, and organize tasks effortlessly.",
  path: "/(dashboard)/boards",
});

export default function Page() {

  return <BoardsPage />;
}

