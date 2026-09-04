import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Book, Shield, Zap } from "lucide-react";

export default function Documentation() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-4xl mx-auto px-6 py-20">
                <Link href="/">
                    <Button variant="ghost" className="mb-8 group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
                    </Button>
                </Link>

                <h1 className="text-5xl font-bold tracking-tight mb-4">Documentation</h1>
                <p className="text-lg text-muted-foreground mb-12 border-b border-border/40 pb-8">Everything you need to master Theta PM and boost your team&apos;s productivity.</p>

                <div className="space-y-16 mt-12">
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary font-bold text-xs tracking-wider">01</div>
                            <h2 className="text-2xl font-semibold tracking-tight">Getting Started</h2>
                        </div>
                        <p className="text-muted-foreground mb-8 leading-relaxed">
                            Theta PM is organized around <span className="text-foreground font-medium">Workspaces</span>. A workspace is a secure, isolated environment for your team.
                            Upon signing up, we&apos;ll guide you through creating your first workspace and inviting team members.
                        </p>
                        <div className="aspect-video bg-card border border-border/50 rounded-2xl flex items-center justify-center text-muted-foreground font-medium flex-col gap-4">
                            <Book className="w-12 h-12 opacity-40" />
                            [SCREENSHOT: Workspace Creation Screen]
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary font-bold text-xs tracking-wider">02</div>
                            <h2 className="text-2xl font-semibold tracking-tight">Project Management</h2>
                        </div>
                        <p className="text-muted-foreground mb-8 leading-relaxed">
                            Inside a workspace, you can create multiple <span className="text-foreground font-medium">Projects</span>. Each project can have its own <span className="text-foreground font-medium">Kanban Boards</span>, <span className="text-foreground font-medium">Lists</span>, and <span className="text-foreground font-medium">Calendar</span>.
                            Projects can also be assigned to specific <span className="text-foreground font-medium">Teams</span> for better organization.
                        </p>
                        <div className="aspect-video bg-card border border-border/50 rounded-2xl flex items-center justify-center text-muted-foreground font-medium flex-col gap-4">
                            <Zap className="w-12 h-12 opacity-40" />
                            [SCREENSHOT: Project Dashboard & Kanban Board]
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary font-bold text-xs tracking-wider">03</div>
                            <h2 className="text-2xl font-semibold tracking-tight">Automations</h2>
                        </div>
                        <p className="text-muted-foreground mb-8 leading-relaxed">
                            Automation rules move routine work forward automatically. When a task is moved to Done, you can automatically notify the team,
                            update statuses, and keep every board in sync without lifting a finger.
                        </p>
                        <div className="aspect-video bg-card border border-border/50 rounded-2xl flex items-center justify-center text-muted-foreground font-medium flex-col gap-4">
                            <Zap className="w-12 h-12 opacity-40" />
                            [SCREENSHOT: Automation Rules Editor]
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary font-bold text-xs tracking-wider">04</div>
                            <h2 className="text-2xl font-semibold tracking-tight">Billing & Security</h2>
                        </div>
                        <p className="text-muted-foreground mb-8 leading-relaxed">
                            We support both <span className="text-foreground font-medium">USD</span> and <span className="text-foreground font-medium">NGN</span> payments. You can switch your currency at any time on the billing page.
                            Our multi-tenant architecture ensures that your data is strictly isolated and encrypted at rest.
                        </p>
                        <div className="aspect-video bg-card border border-border/50 rounded-2xl flex items-center justify-center text-muted-foreground font-medium flex-col gap-4">
                            <Shield className="w-12 h-12 opacity-40" />
                            [SCREENSHOT: Billing Page with Currency Toggle]
                        </div>
                    </section>
                </div>

                <div className="mt-20 pt-10 border-t border-border/40 flex items-center justify-between">
                    <p className="text-muted-foreground font-medium text-sm">Still need help?</p>
                    <Button className="bg-primary hover:bg-primary/90 font-medium px-8 rounded-lg shadow-sm">Contact Support</Button>
                </div>
            </div>
        </div>
    );
}
