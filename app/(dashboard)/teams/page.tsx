import TeamsPage from "@/components/teams/teams-page";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Teams | Theta PM",
  description: "Manage your teams. Invite members and set collaboration permissions.",
  path: "/(dashboard)/teams",
});

export default function Page() {

  return <TeamsPage />;
}

