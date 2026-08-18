"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ArrowLeft, Check, Loader2, Building2, PartyPopper } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HEARD_FROM_OPTIONS = [
    "Google search",
    "Twitter / X",
    "LinkedIn",
    "Instagram / TikTok / YouTube",
    "Friend or colleague",
    "Ad",
    "Other",
];

const TEAM_SIZE_OPTIONS = ["Just me", "2-5", "6-10", "11-25", "25+"];

const ROLE_OPTIONS = [
    "Founder / Owner",
    "Project Manager",
    "Team Lead",
    "Developer / Engineer",
    "Designer",
    "Marketing",
    "Operations",
    "Other",
];

const USE_CASE_OPTIONS = [
    "Software development",
    "Marketing & campaigns",
    "Agency / client work",
    "Operations",
    "Personal projects",
    "Other",
];

export default function OnboardingPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { userId, isLoaded } = useAuth();
    const { user } = useUser();
    const [checking, setChecking] = useState(true);
    const [invited, setInvited] = useState(false);
    const [invitedWorkspaceName, setInvitedWorkspaceName] = useState<string | null>(null);

    const [step, setStep] = useState(0);
    const [workspaceName, setWorkspaceName] = useState("");
    const [heardFrom, setHeardFrom] = useState("");
    const [teamSize, setTeamSize] = useState("");
    const [role, setRole] = useState("");
    const [useCase, setUseCase] = useState("");
    const [submitting, setSubmitting] = useState(false);

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
                    return;
                }
                return fetch("/api/workspaces")
                    .then((res) => (res.ok ? res.json() : []))
                    .then((workspaces) => {
                        if (Array.isArray(workspaces) && workspaces.length > 0) {
                            setInvited(true);
                            setInvitedWorkspaceName(workspaces[0]?.name || null);
                        }
                    });
            })
            .catch(() => router.replace("/dashboard"))
            .finally(() => setChecking(false));
    }, [isLoaded, userId, router]);

    const name = user?.fullName || user?.firstName || "there";
    const steps = invited ? 3 : 4;
    const progress = ((step + 1) / steps) * 100;

    const canContinue =
        step === 1 && !invited
            ? workspaceName.trim().length > 0
            : step === 2
            ? heardFrom && teamSize && role && useCase
            : true;

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceName: invited ? undefined : workspaceName.trim(),
                    heardFrom,
                    teamSize,
                    role,
                    useCase,
                    invited,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to complete setup");
            }
            const data = await res.json();
            // Pin the created/invited workspace as active BEFORE navigating so
            // the dashboard and sidebar load it on first paint.
            if (data?.workspaceId) {
                localStorage.setItem("activeWorkspaceId", data.workspaceId);
            }
            // Invalidate cached prefs + workspaces so the dashboard layout
            // doesn't bounce us straight back to onboarding.
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["user-preferences"] }),
                queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
            ]);
            router.replace("/dashboard");
        } catch (error: any) {
            alert(error.message || "Something went wrong — please try again.");
            setSubmitting(false);
        }
    };

    if (checking) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-background">
            <div className="w-full max-w-lg">
                <div className="flex justify-center mb-8">
                    <Logo className="h-10 w-10" />
                </div>

                {/* Progress */}
                <div className="w-full h-1.5 rounded-full bg-muted mb-6 overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="bg-card border rounded-xl shadow-sm p-8">
                    {step === 0 && (
                        <div className="space-y-6 text-center">
                            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <PartyPopper className="h-7 w-7 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Welcome to Theta PM, {name}!
                                </h1>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Plan projects, track tasks, and keep your team in sync — all in
                                    one workspace. Let&apos;s get you set up in under a minute.
                                </p>
                            </div>
                            {invited && invitedWorkspaceName && (
                                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-left">
                                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                                        <Check className="h-3 w-3" />
                                        You&apos;ve been invited
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Your workspace <span className="font-semibold text-foreground">{invitedWorkspaceName}</span> is
                                        already set up — we just need a few quick details.
                                    </p>
                                </div>
                            )}
                            <Button className="w-full h-11 text-sm font-semibold" onClick={() => setStep(1)}>
                                Get started
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </div>
                    )}

                    {step === 1 && !invited && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Building2 className="h-7 w-7 text-primary" />
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Name your workspace
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    This is where you and your team will work together. You can
                                    change it anytime.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="workspace-name">Workspace name</Label>
                                <Input
                                    id="workspace-name"
                                    placeholder="e.g. Acme Inc, My Startup, Design Studio"
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && canContinue) setStep(2);
                                    }}
                                    autoFocus
                                />
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                                    <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                                </Button>
                                <Button size="sm" disabled={!canContinue} onClick={() => setStep(2)}>
                                    Continue
                                    <ArrowRight className="h-4 w-4 ml-1.5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 1 && invited && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Check className="h-7 w-7 text-primary" />
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    A few quick questions
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Just so we can make Theta PM work better for you.
                                </p>
                            </div>
                            <div className="flex justify-end">
                                <Button size="sm" disabled={!canContinue} onClick={() => setStep(2)}>
                                    Continue
                                    <ArrowRight className="h-4 w-4 ml-1.5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Tell us about yourself
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    This helps us tailor Theta PM to how you work.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>How did you hear about Theta PM?</Label>
                                    <Select value={heardFrom} onValueChange={setHeardFrom}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {HEARD_FROM_OPTIONS.map((o) => (
                                                <SelectItem key={o} value={o}>{o}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>How big is your team?</Label>
                                    <Select value={teamSize} onValueChange={setTeamSize}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TEAM_SIZE_OPTIONS.map((o) => (
                                                <SelectItem key={o} value={o}>{o}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>What&apos;s your role?</Label>
                                    <Select value={role} onValueChange={setRole}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLE_OPTIONS.map((o) => (
                                                <SelectItem key={o} value={o}>{o}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>What will you mainly use Theta PM for?</Label>
                                    <Select value={useCase} onValueChange={setUseCase}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {USE_CASE_OPTIONS.map((o) => (
                                                <SelectItem key={o} value={o}>{o}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                                    <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                                </Button>
                                <Button size="sm" disabled={!canContinue} onClick={() => setStep(3)}>
                                    Continue
                                    <ArrowRight className="h-4 w-4 ml-1.5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    You&apos;re all set!
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {invited
                                        ? `We'll take you straight into ${invitedWorkspaceName}.`
                                        : `Your workspace "${workspaceName.trim()}" is ready.`}{" "}
                                    Let&apos;s go!
                                </p>
                            </div>
                            <Button
                                className="w-full h-11 text-sm font-semibold"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Setting up your workspace...
                                    </>
                                ) : (
                                    <>
                                        {invited ? "Enter workspace" : "Create workspace"}
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </>
                                )}
                            </Button>
                            <p className="text-[11px] text-muted-foreground/80 text-center">
                                You can create more workspaces and invite your team anytime.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
