"use client";

import { useSearchParams } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/ui/logo";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/dashboard";

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <Logo size="xl" />
        <SignIn
          signUpUrl="/sign-up"
          forceRedirectUrl={redirectUrl}
        />
      </div>
    </div>
  );
}

