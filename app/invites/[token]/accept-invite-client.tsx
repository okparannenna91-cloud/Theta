"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, MailOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInviteClient({ token, workspaceName }: { token: string, workspaceName: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleAccept = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/invites/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to accept invite");
            
            toast.success("Welcome to " + workspaceName + "!");
            // Hard refresh to ensure layout and new context pick up the new workspace
            window.location.href = "/"; 
        } catch (error: any) {
            toast.error(error.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <Card className="max-w-md w-full p-8 text-center rounded-3xl border-slate-200/50 dark:border-slate-800/50 shadow-2xl space-y-6">
                <div className="mx-auto h-20 w-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center shadow-inner">
                    <MailOpen className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight mb-2">You&apos;ve Been Invited!</h1>
                    <p className="text-muted-foreground">
                        You have been invited to collaborate in <br/>
                        <span className="font-black text-xl text-slate-900 dark:text-white inline-block mt-2 px-4 py-1 bg-indigo-50 dark:bg-slate-900 rounded-lg border">{workspaceName}</span>
                    </p>
                </div>
                <Button 
                    onClick={handleAccept} 
                    disabled={isLoading}
                    className="w-full rounded-full py-6 text-base font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20"
                >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <>
                            <Check className="h-5 w-5 mr-2" />
                            Accept Invitation
                        </>
                    )}
                </Button>
            </Card>
        </div>
    );
}
