"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Rocket, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PopupContextType {
    showOnboarding: () => void;
    showUpgradePrompt: (feature: string) => void;
    dismissPopup: (id: string) => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export function PopupProvider({ children }: { children: React.ReactNode }) {
    const [activePopup, setActivePopup] = useState<{ id: string; type: "onboarding" | "upgrade"; data?: any } | null>(null);
    const [preferences, setPreferences] = useState<any>(null);

    useEffect(() => {
        fetch("/api/user/preferences")
            .then((res) => res.json())
            .then((data) => {
                setPreferences(data);
                if (!data.onboardingComplete) {
                    setActivePopup({ id: "onboarding", type: "onboarding" });
                }
            });
    }, []);

    const dismissPopup = async (id: string) => {
        setActivePopup(null);
        const updatedDismissed = preferences?.dismissedPopups ? { ...preferences.dismissedPopups, [id]: true } : { [id]: true };

        await fetch("/api/user/preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dismissedPopups: updatedDismissed,
                onboardingComplete: id === "onboarding" ? true : undefined
            }),
        });
    };

    return (
        <PopupContext.Provider value={{
            showOnboarding: () => setActivePopup({ id: "onboarding", type: "onboarding" }),
            showUpgradePrompt: (feature) => setActivePopup({ id: "upgrade", type: "upgrade", data: { feature } }),
            dismissPopup
        }}>
            {children}
            <AnimatePresence>
                {activePopup && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-xl ${activePopup.type === "onboarding" ? "bg-indigo-100" : "bg-amber-100"}`}>
                                        {activePopup.type === "onboarding" ? (
                                            <Rocket className="w-6 h-6 text-indigo-600" />
                                        ) : (
                                            <ShieldAlert className="w-6 h-6 text-amber-600" />
                                        )}
                                    </div>
                                    <button onClick={() => dismissPopup(activePopup.id)} className="text-slate-400 hover:text-slate-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {activePopup.type === "onboarding" ? (
                                    <>
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Theta!</h3>
                                        <p className="text-slate-600 mb-6 leading-relaxed">
                                            We&apos;re excited to have you. Explore your workspace, create your first project, and invite your team to collaborate in real-time.
                                        </p>
                                        <div className="space-y-3">
                                            <div className="flex gap-3 text-sm text-slate-700">
                                                <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                                <span>Real-time chat and task updates are now live.</span>
                                            </div>
                                            <div className="flex gap-3 text-sm text-slate-700">
                                                <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                                <span>Check out the dynamic Pricing page for new plans.</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Upgrade Required</h3>
                                        <p className="text-slate-600 mb-6 leading-relaxed">
                                            You&apos;ve reached the limit for {activePopup.data?.feature} on your current plan. Upgrade to Growth or Pro to keep scaling.
                                        </p>
                                    </>
                                )}

                                <div className="mt-8 flex gap-3">
                                    <Button onClick={() => dismissPopup(activePopup.id)} variant="outline" className="flex-1">
                                        {activePopup.type === "onboarding" ? "Got it" : "Maybe Later"}
                                    </Button>
                                    <Button onClick={() => window.location.href = "/pricing"} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                                        {activePopup.type === "onboarding" ? "View Plans" : "Upgrade Now"}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </PopupContext.Provider>
    );
}

export const usePopups = () => {
    const context = useContext(PopupContext);
    if (!context) throw new Error("usePopups must be used within a PopupProvider");
    return context;
};
