"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { OnboardingModal } from "./onboarding-modal";
import { LiquidLoader } from "@/components/ui/liquid-loader";

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
            <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
                <LiquidLoader text="Initializing Workspace..." />
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
