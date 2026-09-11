import TimelinePage from "@/components/timeline/timeline-page";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Timeline | Theta PM",
  description: "View the project timeline and milestones.",
  path: "/(dashboard)/projects/[id]/timeline",
});

export default function Page({ params }: { params: { id: string } }) {
  return <TimelinePage projectId={params.id} />;
}