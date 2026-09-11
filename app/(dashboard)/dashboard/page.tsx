import DashboardPage from "@/components/dashboard/dashboard-page";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Dashboard | Theta PM",
  description: "Your central hub for project management. View all projects, tasks, team activity, and key metrics at a glance.",
  path: "/(dashboard)/dashboard",
});

export default function Page() {

  return <DashboardPage />;
}

