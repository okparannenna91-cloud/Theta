import ProjectsPage from "@/components/projects/projects-page";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Projects | Theta PM",
  description: "Manage all your projects. Create, organize, and track work across your team.",
  path: "/(dashboard)/projects",
});

export default function Page() {

  return <ProjectsPage />;
}

