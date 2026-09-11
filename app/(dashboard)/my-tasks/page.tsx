import MyTasksPage from "@/components/tasks/my-tasks-page";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "My Tasks | Theta PM",
  description: "View and manage all your assigned tasks. Track deadlines and prioritize your work.",
  path: "/(dashboard)/my-tasks",
});

export default function Page() {

  return <MyTasksPage />;
}
