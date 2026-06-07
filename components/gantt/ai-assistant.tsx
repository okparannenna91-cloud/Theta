"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Sparkles, 
    ChevronRight, 
    ChevronLeft, 
    Bot, 
    Lightbulb, 
    AlertCircle, 
    CheckCircle2,
    Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AIScheduleAssistantProps {
    tasks: any[];
    onApplySuggestion?: (suggestion: any) => void;
}

export default function AIScheduleAssistant({ tasks, onApplySuggestion }: AIScheduleAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [suggestions, setSuggestions] = useState<{ id: number; type: string; title: string; description: string; impact: string; icon: any }[]>([]);

    const generateSuggestions = async () => {
        setIsAnalyzing(true);
        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: `Analyze this project schedule with ${tasks.length} tasks and suggest 3 optimizations for timeline, resource allocation, and parallel execution. Format as JSON array with objects containing: type (optimization/risk/efficiency), title, description, impact (High/Medium/Low).`,
                    workspaceId: "",
                }),
            });
            if (!res.ok) throw new Error("AI analysis failed");
            const data = await res.json();
            const parsed = JSON.parse(data.text);
            setSuggestions(parsed.map((s: any, i: number) => ({
                id: i + 1,
                type: s.type,
                title: s.title,
                description: s.description,
                impact: s.impact,
                icon: s.type === "risk" ? AlertCircle : s.type === "efficiency" ? Lightbulb : Zap,
            })));
        } catch {
            setSuggestions([]);
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        if (isOpen && suggestions.length === 0) {
            generateSuggestions();
        }
    }, [isOpen, generateSuggestions, suggestions.length]);

    return (
        <div className="fixed bottom-20 right-8 z-50 flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="w-96 bg-background/80 backdrop-blur-3xl border border-primary/20 rounded-xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* AI Header */}
                        <div className="p-6 bg-gradient-to-r from-primary/20 to-purple-500/10 border-b border-primary/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary rounded-xl">
                                    <Bot className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold">Theta AI Agent</h3>
                                    <p className="text-[9px] font-semibold text-primary/60">Schedule Intelligence</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[8px] font-semibold">PRO</Badge>
                        </div>

                        {/* Analysis Content */}
                        <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-muted-foreground">Smart Suggestions</span>
                                <Button variant="ghost" size="sm" className="h-6 text-[9px] font-semibold hover:text-primary" onClick={generateSuggestions} disabled={isAnalyzing}>
                                    {isAnalyzing ? "Analyzing..." : "Refresh"}
                                </Button>
                            </div>

                            {suggestions.map((s) => (
                                <div
                                    key={s.id}
                                    className="p-4 rounded-2xl bg-secondary/30 border border-white/5 hover:border-primary/20 transition-all cursor-pointer group"
                                >
                                    <div className="flex gap-4">
                                        <div className="p-2 bg-background/50 rounded-xl h-fit border border-white/5 group-hover:scale-110 transition-transform">
                                            <s.icon className={cn(
                                                "h-4 w-4",
                                                s.type === "risk" ? "text-rose-500" : "text-primary"
                                            )} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-[11px] font-semibold">{s.title}</h4>
                                                <Badge variant="outline" className="text-[7px] py-0 h-4 border-white/10">{s.impact} Impact</Badge>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                {s.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* AI Footer */}
                        <div className="p-4 bg-secondary/20 border-t border-white/5">
                            <Button className="w-full rounded-2xl h-11 text-[10px] font-semibold shadow-lg shadow-primary/20" onClick={generateSuggestions} disabled={isAnalyzing}>
                                <Sparkles className="h-3.5 w-3.5 mr-2" /> {isAnalyzing ? "Analyzing..." : "Optimize Timeline"}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-16 w-16 rounded-full shadow-2xl transition-all duration-500 border-2",
                    isOpen 
                        ? "bg-background text-primary border-primary rotate-90" 
                        : "bg-primary text-white border-transparent hover:scale-110 hover:shadow-primary/40"
                )}
            >
                {isOpen ? <ChevronRight className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
            </Button>
        </div>
    );
}
