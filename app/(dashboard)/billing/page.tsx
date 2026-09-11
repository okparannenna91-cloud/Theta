

"use client";

import BillingPageContent from "@/components/billing/billing-page";

import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Billing & Subscription Management",
  description: "Manage your Theta PM subscription, billing details, payment methods, and invoice history.",
  path: "/(dashboard)/billing",
});

export default function BillingPage() {
  return <BillingPageContent />;
}
