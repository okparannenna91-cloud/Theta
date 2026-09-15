import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Risk Management | Theta PM",
  description: "Identify, track, and mitigate project risks. Monitor risk indicators.",
  path: "/(dashboard)/risk",
});

export default function RiskLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
