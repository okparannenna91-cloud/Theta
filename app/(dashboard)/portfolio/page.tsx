import { PortfolioPage } from "@/components/portfolio/portfolio-page";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Portfolio | Theta PM",
  description: "Strategic portfolio tracking. View all projects, resources, and performance at a glance.",
  path: "/(dashboard)/portfolio",
});

export default function Page() {

    return <PortfolioPage />;
}
