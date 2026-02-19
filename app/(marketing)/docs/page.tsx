import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Book, Shield, Zap, Cpu } from "lucide-react";

export default function Documentation() {
    return (
        <div className="min-h-screen bg-white py-20 px-4">
            <div className="max-w-4xl mx-auto">
                <Link href="/">
                    <Button variant="ghost" className="mb-8 group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
                    </Button>
                </Link>

                <h1 className="text-5xl font-black mb-4">Documentation</h1>
                <p className="text-xl text-slate-500 mb-12 border-b pb-8">Everything you need to master Theta and boost your team&apos;s productivity.</p>

                <div className="space-y-16 mt-12">
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600 font-bold">01</div>
                            <h2 className="text-3xl font-bold">Getting Started</h2>
                        </div>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            Theta is organized around **Workspaces**. A workspace is a secure, isolated environment for your team.
                            Upon signing up, we&apos;ll guide you through creating your first workspace and inviting team members.
                        </p>
                        <div className="aspect-video bg-slate-100 rounded-[2rem] border-4 border-slate-50 flex items-center justify-center text-slate-400 font-bold flex-col gap-4">
                            <Book className="w-12 h-12 opacity-20" />
                            [SCREENSHOT: Workspace Creation Screen]
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600 font-bold">02</div>
                            <h2 className="text-3xl font-bold">Project Management</h2>
                        </div>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            Inside a workspace, you can create multiple **Projects**. Each project can have its own **Kanban Boards**, **Lists**, and **Calendar**.
                            Projects can also be assigned to specific **Teams** for better organization.
                        </p>
                        <div className="aspect-video bg-slate-100 rounded-[2rem] border-4 border-slate-50 flex items-center justify-center text-slate-400 font-bold flex-col gap-4">
                            <Zap className="w-12 h-12 opacity-20" />
                            [SCREENSHOT: Project Dashboard & Kanban Board]
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600 font-bold">03</div>
                            <h2 className="text-3xl font-bold">Meet Boots AI</h2>
                        </div>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            Boots is your integrated AI assistant. She can help you generate task descriptions, summarize project progress, and even brainstorm ideas.
                            Access Boots by clicking the chat bubble in the bottom right corner of your dashboard.
                        </p>
                        <div className="aspect-video bg-slate-100 rounded-[2rem] border-4 border-slate-50 flex items-center justify-center text-slate-400 font-bold flex-col gap-4">
                            <Cpu className="w-12 h-12 opacity-20" />
                            [SCREENSHOT: Boots AI Assistant in action]
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600 font-bold">04</div>
                            <h2 className="text-3xl font-bold">Billing & Security</h2>
                        </div>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            We support both **USD** and **NGN** payments. You can switch your currency at any time on the billing page.
                            Our multi-tenant architecture ensures that your data is strictly isolated and encrypted at rest.
                        </p>
                        <div className="aspect-video bg-slate-100 rounded-[2rem] border-4 border-slate-50 flex items-center justify-center text-slate-400 font-bold flex-col gap-4">
                            <Shield className="w-12 h-12 opacity-20" />
                            [SCREENSHOT: Billing Page with Currency Toggle]
                        </div>
                    </section>
                </div>

                <div className="mt-20 pt-10 border-t flex items-center justify-between">
                    <p className="text-slate-500 font-medium">Still need help?</p>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8 rounded-xl">Contact Support</Button>
                </div>
            </div>
        </div>
    );
}
