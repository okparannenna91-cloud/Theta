"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
    Clock, 
    Globe, 
    ChevronLeft,
    BookOpen,
    ArrowUpRight,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AdvancedEditor } from "@/components/wiki/editor/advanced-editor";

export default function PublicDocumentPage() {
    const params = useParams();
    const id = params.id as string;
    const [document, setDocument] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                const res = await fetch(`/api/docs/public/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setDocument(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchDoc();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );

    if (!document) return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="h-20 w-20 rounded-[2.5rem] bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                <Globe className="h-10 w-10 text-slate-300" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Secure Signal Not Found</h1>
            <p className="text-muted-foreground text-sm max-w-xs">This intelligence node is either private or does not exist in the public cloud.</p>
            <Button asChild variant="outline" className="rounded-2xl px-8">
                <Link href="/">Back to Theta PM</Link>
            </Button>
        </div>
    );

    const blocks = JSON.parse(document.content || "[]");

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#020617] selection:bg-indigo-500/30 selection:text-white">
            {/* Minimal Header */}
            <header className="h-20 border-b border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 px-6 md:px-12">
                <div className="max-w-5xl mx-auto h-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                                <BookOpen className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-tighter">Theta Intel</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button asChild variant="ghost" className="rounded-xl text-[10px] font-black uppercase tracking-widest hidden sm:flex">
                            <Link href="/sign-up">Get Your Own Wiki</Link>
                        </Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-10 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20">
                            Launch Theta
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-8 md:p-20">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-12"
                >
                    {/* Hero Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-600/10 w-fit px-4 py-1.5 rounded-full">
                            <Globe className="h-3 w-3" />
                            <span>Public Intelligence Node</span>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <span className="text-6xl md:text-8xl filter drop-shadow-2xl">{document.emoji || "📄"}</span>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none text-slate-900 dark:text-slate-50 uppercase">
                                {document.title}
                            </h1>
                        </div>

                        <div className="flex items-center gap-6 pt-4 border-t border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                {document.user.imageUrl ? (
                                    <img src={document.user.imageUrl} className="h-8 w-8 rounded-full border-2 border-indigo-500/20 shadow-xl" />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black">{document.user.name?.[0]}</div>
                                )}
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Verified {document.user.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground opacity-60">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Modified {formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                         <AdvancedEditor 
                            blocks={blocks}
                            workspaceId={document.workspaceId}
                            onChange={() => {}} // Read-only
                            onSave={() => {}}
                            readOnly={true}
                         />
                    </div>

                    {/* Footer / Children Section */}
                    {document.children && document.children.length > 0 && (
                        <div className="pt-20 border-t border-slate-200 dark:border-white/5 space-y-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Related Intelligence Signals</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {document.children.map((child: any) => (
                                    <Link key={child.id} href={`/public/wiki/${child.id}`}>
                                        <div className="group p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-2xl">{child.emoji || "📄"}</span>
                                                    <span className="text-xs font-black uppercase tracking-widest">{child.title}</span>
                                                </div>
                                                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
                
                <div className="mt-40 text-center space-y-6">
                    <div className="h-px w-20 bg-slate-200 dark:bg-white/10 mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-30">Powering Global Intelligence with Theta PM</p>
                </div>
            </main>
        </div>
    );
}
