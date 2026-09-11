import GanttPage from "@/components/gantt/gantt-page";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Gantt Chart | Theta PM",
  description: "View the project timeline with Gantt charts.",
  path: "/(dashboard)/projects/[id]/gantt",
});

export default function Page({ params }: { params: { id: string } }) {
  return <GanttPage projectId={params.id} />;
}