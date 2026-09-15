import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Activity | Theta PM",
  description: "Track all project activity and changes.",
  path: "/(dashboard)/projects/[id]/activity",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
