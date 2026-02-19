"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/hooks/use-workspace";

interface AiGeneratorProps {
    onGenerate: (text: string) => void;
    title?: string;
    placeholder?: string;
    initialPrompt?: string;
}

export function AiGenerator({
    onGenerate,
    title = "Boots - Your AI Work Assistant",
    placeholder = "Ask Boots anything...",
    initialPrompt = "",
}: AiGeneratorProps) {
    const [open, setOpen] = useState(false);
    const { activeWorkspaceId } = useWorkspace();
    const [prompt, setPrompt] = useState(initialPrompt);
    const [result, setResult] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        try {
            setIsLoading(true);
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, workspaceId: activeWorkspaceId }),
            });

            if (!res.ok) {
                throw new Error("Generation failed");
            }

            const data = await res.json();
            setResult(data.text);
        } catch (error) {
            toast.error("Boots couldn't generate content. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUseContent = () => {
        onGenerate(result);
        setOpen(false);
        setResult("");
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast.success("Copied to clipboard");
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800"
                onClick={() => setOpen(true)}
            >
                <Sparkles className="h-4 w-4 mr-2" />
                👢 Ask Boots
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-indigo-500" />
                            {title}
                        </DialogTitle>
                        <DialogDescription>
                            Boots helps you get work done faster. Ask Boots to write descriptions, brainstorm ideas, or generate content.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>What can Boots help you with?</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={placeholder}
                                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                                />
                                <Button onClick={handleGenerate} disabled={isLoading || !prompt}>
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        "Generate"
                                    )}
                                </Button>
                            </div>
                        </div>

                        {!result && !isLoading && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Suggested for you:</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        "Brainstorm 5 new features",
                                        "Summarize my recent tasks",
                                        "Write a project description",
                                        "Help me prioritize my work"
                                    ].map((suggestion) => (
                                        <Button
                                            key={suggestion}
                                            variant="outline"
                                            size="sm"
                                            className="text-xs justify-start hover:bg-indigo-50 hover:text-indigo-600 border-dashed"
                                            onClick={() => setPrompt(suggestion)}
                                        >
                                            {suggestion}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-2">
                                <Label>Boots says:</Label>
                                <div className="relative">
                                    <Textarea
                                        value={result}
                                        readOnly
                                        className="min-h-[150px] resize-none pr-10"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground"
                                        onClick={copyToClipboard}
                                    >
                                        {isCopied ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        {result && (
                            <Button onClick={handleUseContent} className="bg-indigo-600 hover:bg-indigo-700">
                                Use Content
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
