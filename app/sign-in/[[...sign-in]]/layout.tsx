import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Sign In | Theta PM",
  description: "Sign in to your Theta PM account. Access your projects, tasks, and team.",
  path: "/sign-in",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
