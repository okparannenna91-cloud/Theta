"use client";

import { useSearchParams } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/dashboard";

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <SignIn
        signUpUrl="/sign-up"
        forceRedirectUrl={redirectUrl}
      />
    </div>
  );
}

