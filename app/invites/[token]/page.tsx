import { getInviteByToken } from "@/lib/invite";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AcceptInviteClient from "./accept-invite-client";
import { AlertTriangle, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function InvitePage({ params }: { params: { token: string } }) {
    const user = await getCurrentUser();
    
    // Safety check: Middleware handles this, but just in case
    if (!user) {
        redirect(`/sign-in?redirect_url=/invites/${params.token}`);
    }

    const { valid, invite, error } = await getInviteByToken(params.token);

    if (!valid || !invite) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <div className="text-center bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-3xl p-8 max-w-md w-full">
                    <div className="h-16 w-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Invalid Invitation</h1>
                    <p className="text-muted-foreground font-medium mb-8">
                        {error || "This invitation link is invalid or has expired."}
                    </p>
                    <Link href="/">
                        <Button className="w-full rounded-full py-6 text-sm font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800">
                            <Home className="h-4 w-4 mr-2" />
                            Return Home
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <AcceptInviteClient 
            token={params.token} 
            workspaceName={invite.workspace.name} 
        />
    );
}
