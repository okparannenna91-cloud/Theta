import { redirect } from "next/navigation";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Notifications | Theta PM",
  description: "Manage team notifications, mentions, and updates. Stay informed about all activity.",
  path: "/(dashboard)/notifications",
});

export default function NotificationsPage() {

  redirect("/inbox");
}
