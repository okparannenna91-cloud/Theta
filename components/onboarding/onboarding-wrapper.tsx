"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { OnboardingModal } from "./onboarding-modal";
import { Skeleton } from "@/components/ui/skeleton";

export function OnboardingWrapper({ children }: { children: React.ReactNode }) {
    const [showOnboarding, setShowOnboarding] = useState(false);

    const { data: preferences, isLoading, refetch } = useQuery({
        queryKey: ["user-preferences"],
        queryFn: async () => {
            const res = await fetch("/api/user/preferences");
            if (!res.ok) return null;
            return res.json();
        }
    });

    useEffect(() => {
        if (!isLoading && preferences && preferences.onboardingComplete === false) {
            setShowOnboarding(true);
        }
    }, [preferences, isLoading]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-background flex items-center justify-center">
                <div className="space-y-6 w-full max-w-sm px-8">
                    <div className="flex flex-col items-center gap-4">
                        <Skeleton className="h-14 w-14 rounded-2xl" />
                        <Skeleton className="h-5 w-48" />
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5 mx-auto" />
                        <Skeleton className="h-3 w-3/5 mx-auto" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {showOnboarding && (
                <OnboardingModal onComplete={() => {
                    setShowOnboarding(false);
                    refetch();
                }} />
            )}
            {children}
        </>
    );
}
