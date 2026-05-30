"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Zap, Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { usePopups } from "@/components/popups/popup-manager";

export function AutomationSettings({ workspaceId }: { workspaceId: string }) {
    const { showUpgradePrompt } = usePopups();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [trigger, setTrigger] = useState("TASK_STATUS_UPDATED");
    const [action, setAction] = useState("SET_PRIORITY");
    const [actionValue, setActionValue] = useState("high");

    const queryClient = useQueryClient();

    const { data: automationData, isLoading } = useQuery({
        queryKey: ["automations", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/automations?workspaceId=${workspaceId}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!workspaceId,
    });

    const automations = Array.isArray(automationData?.automations) ? automationData.automations : Array.isArray(automationData) ? automationData : [];
    const limits = automationData?.limits || { max: -1, current: 0 };
    const isLimitReached = limits.max !== -1 && limits.current >= limits.max;

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            if (isLimitReached) {
                showUpgradePrompt("automations");
                return;
            }

            const res = await fetch("/api/automations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, workspaceId }),
            });
            
            if (!res.ok) {
                const error = await res.json();
                if (res.status === 403 && error.error?.includes("limit")) {
                    showUpgradePrompt("automations");
                    return;
                }
                throw new Error(error.error || "Failed to create automation");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["automations", workspaceId] });
            setIsOpen(false);
            setName("");
            toast.success("Automation rule created");
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black tracking-tight">Automations</h2>
                    <p className="text-sm text-muted-foreground">Streamline your workflow with custom rules.</p>
                </div>
                <div className="flex items-center gap-4">
                    {limits.max !== -1 && (
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rules Usage</p>
                            <p className="text-xs font-bold">{limits.current} / {limits.max}</p>
                        </div>
                    )}
                    <Button 
                        onClick={() => {
                            if (isLimitReached) {
                                showUpgradePrompt("automations");
                            } else {
                                setIsOpen(true);
                            }
                        }} 
                        className="rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none bg-indigo-600 hover:bg-indigo-700"
                        variant={isLimitReached ? "outline" : "default"}
                    >
                        <Zap className="h-4 w-4 mr-2" />
                        Create Rule
                    </Button>
                </div>
            </div>

            <div className="grid gap-4">
                {automations?.map((rule: any) => (
                    <Card key={rule.id} className="border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{rule.name}</h4>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                                            <span>{rule.trigger.replace(/_/g, " ")}</span>
                                            <ArrowRight className="h-3 w-3" />
                                            <span className="text-indigo-600">{rule.action.replace(/_/g, " ")}: {rule.actionValue}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Switch checked={rule.active} />
                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {automations?.length === 0 && (
                    <div className="py-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/50">
                        <Zap className="h-12 w-12 text-slate-200 mb-4" />
                        <h3 className="font-black text-slate-400">No Automations Yet</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Create rules to automate repetitive tasks like updating priority or status.</p>
                    </div>
                )}
            </div>

            {isOpen && (
                <Card className="border-indigo-500 shadow-2xl">
                    <CardHeader>
                        <CardTitle>New Automation Rule</CardTitle>
                        <CardDescription>Rules run automatically when triggers occur.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Rule Name</Label>
                            <Input placeholder="e.g. Auto-Priority for Completed Tasks" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>When this happens (Trigger)</Label>
                                <Select value={trigger} onValueChange={setTrigger}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TASK_STATUS_UPDATED">Task Status Changed</SelectItem>
                                        <SelectItem value="TASK_CREATED">New Task Created</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Do this (Action)</Label>
                                <Select value={action} onValueChange={setAction}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SET_PRIORITY">Set Priority</SelectItem>
                                        <SelectItem value="SEND_NOTIFICATION">Notify Owner</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Value</Label>
                            <Input value={actionValue} onChange={e => setActionValue(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button onClick={() => createMutation.mutate({ name, trigger, action, actionValue })}>Save Rule</Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
