import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Milestones | Theta PM",
  description: "Track key project milestones and deadlines. Monitor progress toward critical goals.",
  path: "/(dashboard)/milestones",
});

export default function MilestonesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
