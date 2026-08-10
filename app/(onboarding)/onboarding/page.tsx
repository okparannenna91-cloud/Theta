"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Loader2, ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/hooks/use-preferences";

export default function OnboardingPage() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const { updatePreferenceAsync } = usePreferences();
  const [checking, setChecking] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      router.replace("/sign-in");
      return;
    }
    fetch("/api/user/preferences")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load preferences");
        return res.json();
      })
      .then((data) => {
        if (data?.onboardingComplete) {
          router.replace("/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => router.replace("/dashboard"));
  }, [isLoaded, userId, router]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await updatePreferenceAsync({ onboardingComplete: true });
      router.replace("/dashboard");
    } catch {
      setStarting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="flex justify-center">
          <Logo className="h-10 w-10" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome to Theta PM
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Plan projects, track tasks, and keep your team in sync — all in one
            workspace.
          </p>
        </div>

        <div className="space-y-3">
          <Button className="w-full h-11 text-sm font-semibold" onClick={handleStart} disabled={starting}>
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Get started
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground/80">
            Smart AI teammates are coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
