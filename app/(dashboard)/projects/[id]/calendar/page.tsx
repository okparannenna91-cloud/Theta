import CalendarPage from "@/components/calendar/calendar-page";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Calendar | Theta PM",
  description: "View project tasks and milestones on a calendar.",
  path: "/(dashboard)/projects/[id]/calendar",
});

export default function Page({ params }: { params: { id: string } }) {
  return <CalendarPage projectId={params.id} />;
}