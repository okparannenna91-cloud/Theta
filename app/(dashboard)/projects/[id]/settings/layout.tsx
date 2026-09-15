import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Settings | Theta PM",
  description: "Configure project settings and integrations.",
  path: "/(dashboard)/projects/[id]/settings",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
