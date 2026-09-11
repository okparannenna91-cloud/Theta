import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import LandingPage from "@/components/landing/landing-page";

export const metadata: Metadata = buildMetadata({
  title: "Theta PM | Project Management for High-Velocity Teams",
  description: "The next evolution of project synchronization. Real-time collaboration, Gantt charts, and strategic portfolio tracking for high-velocity teams.",
  path: "/",
});

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
