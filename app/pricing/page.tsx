import PricingPage from "@/components/pricing/pricing-page";
import { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Pricing | Theta PM",
  description: "Choose the right plan for your team. Free tier available. Compare plans and features.",
  path: "/pricing",
});

export default function Page() {
  return <PricingPage />;
}
