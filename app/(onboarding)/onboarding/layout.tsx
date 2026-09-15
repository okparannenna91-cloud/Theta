import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Get Started | Theta PM",
  description: "Set up your Theta PM workspace. Invite your team and plan your first project.",
  path: "/(onboarding)/onboarding",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
