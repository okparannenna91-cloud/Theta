export interface LoadedContext {
  workspaceContext: string;
  contextDepth: "minimal" | "standard" | "full";
}

export async function loadWorkspaceContext(
  workspaceId: string,
  userId: string,
  projectId?: string,
  depth: "minimal" | "standard" | "full" = "standard",
): Promise<LoadedContext> {
  if (depth === "minimal") return { workspaceContext: "", contextDepth: depth };

  const { ContextSystem } = await import("@/lib/nova/context-system");
  const activeContext = await ContextSystem.getActiveContext({ workspaceId, userId, projectId });
  return { workspaceContext: activeContext.promptString || "", contextDepth: depth };
}
