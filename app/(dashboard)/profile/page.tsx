import ProfilePage from "@/components/profile/profile-page";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Profile | Theta PM",
  description: "Manage your profile, account settings, and preferences.",
  path: "/(dashboard)/profile",
});

export default function Page() {

  return <ProfilePage />;
}

