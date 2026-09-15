import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Tasks | Theta PM",
  description: "Manage all your tasks. Track progress, deadlines, and assignments.",
  path: "/(dashboard)/tasks",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
