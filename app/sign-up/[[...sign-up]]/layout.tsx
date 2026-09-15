import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Sign Up | Theta PM",
  description: "Create a free Theta PM account. Start managing projects and collaborating with your team.",
  path: "/sign-up",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
