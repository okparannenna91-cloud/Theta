import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Team | Theta PM",
  description: "Manage project team members and permissions.",
  path: "/(dashboard)/projects/[id]/team",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
