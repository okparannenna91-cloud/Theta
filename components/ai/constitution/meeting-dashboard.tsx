"use client";

import React, { useState, useEffect } from "react";
import {
  Users, CheckCircle2, ArrowRight, Info,
  MessageSquare, Calendar, FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MeetingPhaseDef {
  phase: string;
  description: string;
  capabilities: string[];
}

interface MeetingSectionData {
  phases: MeetingPhaseDef[];
  outputTypes: string[];
}

const PHASE_ICONS: Record<string, React.ElementType> = {
  PRE_MEETING: Calendar,
  LIVE_MEETING: MessageSquare,
  POST_MEETING: FileText,
};

const PHASE_COLORS: Record<string, string> = {
  PRE_MEETING: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  LIVE_MEETING: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  POST_MEETING: "text-blue-500 bg-blue-500/10 border-blue-500/20",
};

export function MeetingDashboard() {
  const [data, setData] = useState<MeetingSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [simulatedTopic, setSimulatedTopic] = useState("");
  const [preparation, setPreparation] = useState<{
    agendaItems: string[];
    participants: string[];
    contextQuestions: string[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/ai/constitution?section=15")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          phases: s?.phases || [],
          outputTypes: s?.outputTypes || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePrepare = () => {
    if (!simulatedTopic.trim()) return;
    const lower = simulatedTopic.toLowerCase();
    const participants = ["Owner", "Lead Engineer", "Product Manager"];
    if (lower.includes("tech") || lower.includes("api")) participants.push("QA Specialist");
    if (lower.includes("sprint")) participants.push("Scrum Master");

    setPreparation({
      agendaItems: [
        `Align on milestone objectives for: ${simulatedTopic}`,
        "Review outstanding task priority list",
        "Highlight blockers and resource constraints",
        "Assign follow-up action items",
      ],
      participants,
      contextQuestions: [
        "What progress has been made since the last sync?",
        "Are there any blockers preventing task completion?",
        "What are the priorities for the next period?",
      ],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Meeting Intelligence</h1>
          <p className="text-sm text-muted-foreground">Section 15 — Nova Meeting Capabilities</p>
        </div>
      </div>

      {/* Meeting Phases */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.phases.map((phase, i) => {
          const Icon = PHASE_ICONS[phase.phase] || Users;
          const colorClass = PHASE_COLORS[phase.phase] || "text-muted-foreground bg-muted border-border";
          return (
            <Card
              key={i}
              className={cn(
                "border shadow-sm hover:border-primary/30 transition-colors cursor-pointer",
                selectedPhase === phase.phase && "ring-2 ring-primary/40"
              )}
              onClick={() => setSelectedPhase(selectedPhase === phase.phase ? null : phase.phase)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border", colorClass)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{phase.phase.replace(/_/g, " ")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="text-sm">{phase.description}</CardDescription>
                {selectedPhase === phase.phase && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    {phase.capabilities.map((cap, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Output Types */}
      {data?.outputTypes && data.outputTypes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground">Output Types</h3>
          <div className="flex flex-wrap gap-2">
            {data.outputTypes.map((type, i) => (
              <Badge key={i} variant="outline" className="text-xs rounded-md px-3 py-1">
                {type}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Meeting Prep Simulator */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-muted-foreground">Meeting Preparation Simulator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              type="text"
              value={simulatedTopic}
              onChange={e => setSimulatedTopic(e.target.value)}
              placeholder="e.g., sprint review"
              className="h-9 text-xs"
              onKeyDown={e => e.key === "Enter" && handlePrepare()}
            />
            <button
              onClick={handlePrepare}
              disabled={!simulatedTopic.trim()}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prepare
            </button>
          </div>
          {preparation && (
            <div className="space-y-4 pt-3 border-t border-border">
              <div>
                <span className="text-xs font-medium text-primary">Agenda Items</span>
                <div className="mt-2 space-y-1.5">
                  {preparation.agendaItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-primary">Suggested Participants</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {preparation.participants.map((p, i) => (
                    <Badge key={i} variant="outline" className="text-xs rounded-md px-2 py-1">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-primary">Context Questions</span>
                <div className="mt-2 space-y-1.5">
                  {preparation.contextQuestions.map((q, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Info className="w-3 h-3 text-primary shrink-0" />
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
