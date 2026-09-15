import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Analytics | Theta PM",
  description: "View detailed project analytics and performance metrics.",
  path: "/(dashboard)/projects/[id]/analytics",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
