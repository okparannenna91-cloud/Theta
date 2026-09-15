import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Overview | Theta PM",
  description: "Get a comprehensive overview of your project.",
  path: "/(dashboard)/projects/[id]/overview",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
