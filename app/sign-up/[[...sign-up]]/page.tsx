"use client";

import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/ui/logo";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <Logo size="xl" />
        <SignUp
          signInUrl="/sign-in"
          forceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}

