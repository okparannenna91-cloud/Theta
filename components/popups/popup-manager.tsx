"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Rocket, ShieldAlert, AlertTriangle, CreditCard, Info, Trash2, UserPlus, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type PopupType = 
    | "onboarding" 
    | "upgrade" 
    | "trial_expiration"
    | "billing_warning" 
    | "destructive" 
    | "info" 
    | "success"
    | "ai_suggestion";

interface PopupData {
    id: string;
    type: PopupType;
    title?: string;
    description?: string;
    feature?: string;
    actionLabel?: string;
    onAction?: () => void;
    onCancel?: () => void;
    destructive?: boolean;
    data?: any;
}

interface PopupContextType {
    showOnboarding: () => void;
    showUpgradePrompt: (feature: string) => void;
    showConfirm: (data: Omit<PopupData, "id" | "type"> & { id?: string }) => void;
    showInfo: (title: string, description: string) => void;
    showAISuggestion: (suggestion: string, data?: any) => void;
    showTrialExpiration: (daysLeft: number) => void;
    showBillingFailure: () => void;
    dismissPopup: (id: string) => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export function PopupProvider({ children }: { children: React.ReactNode }) {
    const [activePopup, setActivePopup] = useState<PopupData | null>(null);
    const [preferences, setPreferences] = useState<any>(null);

    useEffect(() => {
        fetch("/api/user/preferences")
            .then((res) => res.json())
            .then((data) => {
                setPreferences(data);
                if (!data.onboardingComplete) {
                    setActivePopup({ id: "onboarding", type: "onboarding" });
                }
            })
            .catch(() => console.log("Failed to fetch preferences"));
    }, []);

    const dismissPopup = useCallback(async (id: string) => {
        setActivePopup(null);
        if (id === "onboarding" || id.startsWith("permanent_")) {
            const updatedDismissed = preferences?.dismissedPopups ? { ...preferences.dismissedPopups, [id]: true } : { [id]: true };

            await fetch("/api/user/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dismissedPopups: updatedDismissed,
                    onboardingComplete: id === "onboarding" ? true : undefined
                }),
            }).catch(() => {});
        }
    }, [preferences]);

    const showUpgradePrompt = useCallback((feature: string) => {
        setActivePopup({
            id: `upgrade_${feature}`,
            type: "upgrade",
            feature,
            title: "Plan Limit Reached",
            description: `You've reached the limit for ${feature} on your current plan. Upgrade to unlock more capacity and keep your team moving fast.`
        });
    }, []);

    const showConfirm = useCallback((data: Omit<PopupData, "id" | "type"> & { id?: string }) => {
        setActivePopup({
            id: data.id || "confirm",
            type: data.destructive ? "destructive" : "info",
            ...data
        });
    }, []);

    const showInfo = useCallback((title: string, description: string) => {
        setActivePopup({ id: "info", type: "info", title, description });
    }, []);

    const showAISuggestion = useCallback((suggestion: string, data?: any) => {
        setActivePopup({ 
            id: "ai_suggestion", 
            type: "ai_suggestion", 
            title: "Boots Intelligence", 
            description: suggestion,
            data 
        });
    }, []);

    const showTrialExpiration = useCallback((daysLeft: number) => {
        setActivePopup({
            id: "trial_expiration",
            type: "trial_expiration",
            title: daysLeft <= 0 ? "Trial Expired" : "Trial Ending Soon",
            description: daysLeft <= 0 
                ? "Your free trial has ended. Select a plan to continue accessing your workspace and projects."
                : `Your trial ends in ${daysLeft} days. Upgrade now to ensure uninterrupted service for your team.`,
            actionLabel: "Choose a Plan",
            data: { daysLeft }
        });
    }, []);

    const showBillingFailure = useCallback(() => {
        setActivePopup({
            id: "billing_failure",
            type: "billing_warning",
            title: "Payment Failed",
            description: "We couldn't process your last payment. Please update your billing information to keep your account active.",
            actionLabel: "Update Billing",
            destructive: true
        });
    }, []);

    const getIcon = () => {
        switch (activePopup?.type) {
            case "onboarding": return <Rocket className="w-6 h-6 text-indigo-600" />;
            case "upgrade": return <Zap className="w-6 h-6 text-amber-600" />;
            case "trial_expiration": return <Clock className="w-6 h-6 text-orange-600" />;
            case "billing_warning": return <ShieldAlert className="w-6 h-6 text-rose-600" />;
            case "destructive": return <Trash2 className="w-6 h-6 text-rose-600" />;
            case "ai_suggestion": return <Sparkles className="w-6 h-6 text-indigo-600" />;
            default: return <Info className="w-6 h-6 text-blue-600" />;
        }
    };

    const getIconContainerClass = () => {
        switch (activePopup?.type) {
            case "onboarding": return "bg-indigo-100";
            case "upgrade": return "bg-amber-100";
            case "trial_expiration": return "bg-orange-100";
            case "billing_warning":
            case "destructive": return "bg-rose-100";
            case "ai_suggestion": return "bg-indigo-100";
            default: return "bg-blue-100";
        }
    };

    return (
        <PopupContext.Provider value={{
            showOnboarding: () => setActivePopup({ id: "onboarding", type: "onboarding" }),
            showUpgradePrompt,
            showConfirm,
            showInfo,
            showAISuggestion,
            showTrialExpiration,
            showBillingFailure,
            dismissPopup
        }}>
            {children}
            <AnimatePresence>
                {activePopup && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm px-6">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800"
                        >
                            <div className="p-10">
                                <div className="flex justify-between items-start mb-8">
                                    <div className={`p-4 rounded-3xl ${getIconContainerClass()} shadow-inner`}>
                                        {getIcon()}
                                    </div>
                                    <button onClick={() => dismissPopup(activePopup.id)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                                        {activePopup.title || (activePopup.type === "onboarding" ? "Welcome to Theta!" : "Action Required")}
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                                        {activePopup.description}
                                    </p>
                                </div>

                                {activePopup.type === "onboarding" && (
                                    <div className="mt-8 space-y-4">
                                        <div className="flex gap-4 text-sm font-black text-slate-700 dark:text-slate-300 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                            <Sparkles className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                            <span>Real-time chat and multi-tenant isolation is now live.</span>
                                        </div>
                                        <div className="flex gap-4 text-sm font-black text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <UserPlus className="w-5 h-5 text-slate-500 flex-shrink-0" />
                                            <span>Invite your team to get the most out of your workspace.</span>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-12 flex flex-col sm:flex-row gap-4">
                                    <Button 
                                        onClick={() => {
                                            activePopup.onCancel?.();
                                            dismissPopup(activePopup.id);
                                        }} 
                                        variant="outline" 
                                        className="h-14 rounded-2xl font-black uppercase tracking-widest text-[12px] border-2 order-2 sm:order-1 sm:flex-1"
                                    >
                                        {activePopup.type === "onboarding" ? "Skip Tour" : (activePopup.type === "destructive" ? "Cancel" : "Dismiss")}
                                    </Button>
                                    <Button 
                                        onClick={() => {
                                            if (activePopup.type === "upgrade" || activePopup.type === "trial_expiration") {
                                                window.location.href = "/pricing";
                                            } else if (activePopup.onAction) {
                                                activePopup.onAction();
                                                dismissPopup(activePopup.id);
                                            } else {
                                                dismissPopup(activePopup.id);
                                            }
                                        }} 
                                        className={`h-14 rounded-2xl font-black uppercase tracking-widest text-[12px] shadow-2xl order-1 sm:order-2 sm:flex-1 ${
                                            activePopup.type === "destructive" 
                                                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/30" 
                                                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30"
                                        }`}
                                    >
                                        {activePopup.actionLabel || (activePopup.type === "upgrade" || activePopup.type === "trial_expiration" ? "View Plans" : "Continue")}
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
