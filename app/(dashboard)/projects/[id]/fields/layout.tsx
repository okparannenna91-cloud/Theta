import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Fields | Theta PM",
  description: "Manage custom fields and data for your project.",
  path: "/(dashboard)/projects/[id]/fields",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
