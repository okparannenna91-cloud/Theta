import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Tasks | Theta PM",
  description: "Manage all tasks for this project.",
  path: "/(dashboard)/projects/[id]/tasks",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
