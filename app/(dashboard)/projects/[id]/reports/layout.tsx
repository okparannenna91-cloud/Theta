import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Reports | Theta PM",
  description: "Generate detailed project reports.",
  path: "/(dashboard)/projects/[id]/reports",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
