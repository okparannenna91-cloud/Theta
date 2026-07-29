"use client";

import { useTeam } from "@/components/teams/team-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Settings } from "lucide-react";

export default function TeamSettingsPage() {
  const team = useTeam();
  const [name, setName] = useState(team.name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Team updated");
    } catch {
      toast.error("Failed to update team");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Team Settings
          </CardTitle>
          <CardDescription className="text-xs">Manage your team details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">Team Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 text-sm rounded-xl" />
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="rounded-xl text-xs">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
