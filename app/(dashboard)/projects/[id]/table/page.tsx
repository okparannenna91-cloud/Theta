import ProjectTableView from "@/components/projects/project-table-view";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Table View | Theta PM",
  description: "View project tasks in a table format.",
  path: "/(dashboard)/projects/[id]/table",
});

export default function Page({ params }: { params: { id: string } }) {
  return <ProjectTableView projectId={params.id} />;
}