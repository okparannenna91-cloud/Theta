import SettingsPage from "@/components/settings/settings-page";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Settings | Theta PM",
  description: "Configure workspace settings, integrations, and team preferences.",
  path: "/(dashboard)/settings",
});

export default function Page() {

  return <SettingsPage />;
}

