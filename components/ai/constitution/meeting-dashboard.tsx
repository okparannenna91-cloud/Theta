"use client";

import React, { useState, useEffect } from "react";
import {
  Users, Clock, CheckCircle2, ArrowRight, Info, ListTodo,
  MessageSquare, BookOpen, Target, Sparkles, Calendar, FileText
} from "lucide-react";
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
  PRE_MEETING: "from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400",
  LIVE_MEETING: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
  POST_MEETING: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400",
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
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Meeting Intelligence</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-wider">Meeting Intelligence</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 15 — Nova Meeting Capabilities</p>
        </div>
      </div>

      {/* Meeting Phases */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.phases.map((phase, i) => {
          const Icon = PHASE_ICONS[phase.phase] || Users;
          const colorClass = PHASE_COLORS[phase.phase] || "from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400";
          return (
            <div
              key={i}
              className={cn(
                "rounded-2xl border p-5 bg-gradient-to-br space-y-3 transition-all hover:scale-[1.02] cursor-pointer group",
                colorClass,
                selectedPhase === phase.phase && "ring-2 ring-amber-500/40"
              )}
              onClick={() => setSelectedPhase(selectedPhase === phase.phase ? null : phase.phase)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">{phase.phase.replace(/_/g, " ")}</h3>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">{phase.description}</p>
              {selectedPhase === phase.phase && (
                <div className="space-y-2 pt-2 border-t border-slate-800/50">
                  {phase.capabilities.map((cap, j) => (
                    <div key={j} className="flex items-center gap-2 text-[11px] text-slate-400">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span className="font-medium">{cap}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Output Types */}
      {data?.outputTypes && data.outputTypes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Output Types</h3>
          <div className="flex flex-wrap gap-2">
            {data.outputTypes.map((type, i) => (
              <span key={i} className="text-[9px] font-bold text-slate-400 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800">
                {type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Meeting Prep Simulator */}
      <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Meeting Preparation Simulator</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={simulatedTopic}
            onChange={e => setSimulatedTopic(e.target.value)}
            placeholder="e.g., sprint review"
            className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
            onKeyDown={e => e.key === "Enter" && handlePrepare()}
          />
          <button
            onClick={handlePrepare}
            disabled={!simulatedTopic.trim()}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Prepare
          </button>
        </div>
        {preparation && (
          <div className="space-y-4 pt-2 border-t border-slate-800/50">
            <div>
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Agenda Items</span>
              <div className="mt-2 space-y-1.5">
                {preparation.agendaItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-slate-400">
                    <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Suggested Participants</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {preparation.participants.map((p, i) => (
                  <span key={i} className="text-[9px] font-bold text-slate-400 px-2 py-1 rounded-md bg-slate-800 border border-slate-700">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Context Questions</span>
              <div className="mt-2 space-y-1.5">
                {preparation.contextQuestions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Info className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
