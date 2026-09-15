import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Milestones | Theta PM",
  description: "Track project milestones and deadlines.",
  path: "/(dashboard)/projects/[id]/milestones",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
