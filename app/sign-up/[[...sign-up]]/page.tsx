"use client";

import { useSearchParams } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/ui/logo";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  // Preserve the intended destination (e.g. an invite link). Clerk carries
  // `redirect_url` between auth pages, so a user invited to a workspace who
  // signs up mid-flow lands back on the invite page instead of the dashboard.
  const redirectUrl = searchParams.get("redirect_url") || "/dashboard";

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <Logo size="xl" />
        <SignUp
          signInUrl="/sign-in"
          forceRedirectUrl={redirectUrl}
        />
      </div>
    </div>
  );
}
