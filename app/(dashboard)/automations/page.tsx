"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import { NLAutomationBuilder } from "@/components/automations/nl-automation-builder";

export default function AutomationsPage() {
  const { activeWorkspace } = useWorkspace();

  if (!activeWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-500">Select a workspace to manage automations</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">Automations</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Create intelligent automations using natural language
        </p>
      </div>

      <NLAutomationBuilder
        workspaceId={activeWorkspace.id}
        onCreated={() => {}}
      />
    </div>
  );
}
