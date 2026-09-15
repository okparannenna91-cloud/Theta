import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Forgot Password | Theta PM",
  description: "Reset your Theta PM password. Recover your account quickly.",
  path: "/forgot-password",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
