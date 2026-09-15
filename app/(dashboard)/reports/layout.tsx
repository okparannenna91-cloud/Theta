import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Reports | Theta PM",
  description: "Generate and view detailed reports across all projects and teams.",
  path: "/(dashboard)/reports",
});

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
