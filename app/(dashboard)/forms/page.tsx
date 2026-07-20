"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import FormBuilder from "@/components/forms/form-builder";

export default function FormsPage() {
  const { activeWorkspaceId } = useWorkspace();
  return (
    <div className="h-full overflow-y-auto">
      <FormBuilder workspaceId={activeWorkspaceId || ""} />
    </div>
  );
}
