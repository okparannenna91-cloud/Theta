import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Reset Password | Theta PM",
  description: "Reset your password and secure your account.",
  path: "/reset-password",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
