"use client";

import { AutomationList } from "@/components/automations/automation-list";

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Automations</h2>
        <p className="text-sm text-muted-foreground">Automate repetitive workflows with triggers and actions</p>
      </div>
      <AutomationList />
    </div>
  );
}
