import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Team Chat | Theta PM",
  description: "Real-time team messaging and communication. Stay connected with your team.",
  path: "/(dashboard)/chat",
});

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
