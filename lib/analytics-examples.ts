// ─── Integration Examples ─────────────────────────────────
// These examples show how to use the PostHog analytics system
// throughout the Theta codebase.

// ─── 1. Client-Side Event Tracking (React Component) ─────
//
// import { usePostHog } from "@/hooks/use-posthog";
// import { AnalyticsEvents, createWorkspaceEventProperties } from "@/lib/analytics";
//
// function ProjectCreateButton({ workspaceId }: { workspaceId: string }) {
//   const { capture } = usePostHog();
//
//   const handleCreate = async () => {
//     // ... create project logic ...
//
//     capture(AnalyticsEvents.PROJECT_CREATED, createWorkspaceEventProperties(workspaceId, {
//       project_name: project.name,
//       project_id: project.id,
//     }));
//   };
//
//   return <button onClick={handleCreate}>Create Project</button>;
// }

// ─── 2. AI Usage Tracking ─────────────────────────────────
//
// import { usePostHog } from "@/hooks/use-posthog";
// import { AnalyticsEvents, createAIEventProperties } from "@/lib/analytics";
//
// function AIAssistant({ workspaceId }: { workspaceId: string }) {
//   const { capture } = usePostHog();
//
//   const handleAIQuery = async (prompt: string) => {
//     capture(AnalyticsEvents.AI_USED, createAIEventProperties(workspaceId, "nova_assistant", "gpt-4o", {
//       prompt_length: prompt.length,
//       feature: "task_generation",
//     }));
//
//     // ... call AI API ...
//   };
// }

// ─── 3. Task Lifecycle Tracking ────────────────────────────
//
// import { usePostHog } from "@/hooks/use-posthog";
// import { AnalyticsEvents, createTaskEventProperties } from "@/lib/analytics";
//
// function useTaskTracking(workspaceId: string) {
//   const { capture } = usePostHog();
//
//   const trackTaskCreated = (task: { id: string; projectId?: string; title: string; priority?: string }) => {
//     capture(AnalyticsEvents.TASK_CREATED, createTaskEventProperties(workspaceId, task.projectId, task.id, {
//       task_title: task.title,
//       priority: task.priority || "none",
//     }));
//   };
//
//   const trackTaskCompleted = (task: { id: string; projectId?: string }) => {
//     capture(AnalyticsEvents.TASK_COMPLETED, createTaskEventProperties(workspaceId, task.projectId, task.id));
//   };
//
//   return { trackTaskCreated, trackTaskCompleted };
// }

// ─── 4. Dashboard Analytics ────────────────────────────────
//
// import { usePostHog } from "@/hooks/use-posthog";
// import { AnalyticsEvents } from "@/lib/analytics";
//
// function DashboardPage() {
//   const { capture } = usePostHog();
//
//   useEffect(() => {
//     capture(AnalyticsEvents.DASHBOARD_OPENED, {
//       workspace_id: workspaceId,
//       page: window.location.pathname,
//     });
//   }, []);
// }

// ─── 5. Server-Side Event Capture (API Route) ─────────────
//
// import { captureServerEvent, identifyServerUser } from "@/lib/posthog";
//
// export async function POST(req: Request) {
//   const { userId, email, name } = await req.json();
//
//   // Identify user on the server
//   await identifyServerUser(userId, {
//     email,
//     name,
//     source: "api",
//   });
//
//   // Track event on the server
//   await captureServerEvent(userId, "project_created", {
//     workspace_id: "ws_123",
//     project_name: "New Project",
//   });
//
//   return Response.json({ success: true });
// }

// ─── 6. Automation Triggered Tracking ──────────────────────
//
// import { usePostHog } from "@/hooks/use-posthog";
// import { AnalyticsEvents } from "@/lib/analytics";
//
// function AutomationRunner({ workspaceId, automationId }: { workspaceId: string; automationId: string }) {
//   const { capture } = usePostHog();
//
//   const runAutomation = async () => {
//     // ... execute automation ...
//
//     capture(AnalyticsEvents.AUTOMATION_TRIGGERED, {
//       workspace_id: workspaceId,
//       automation_id: automationId,
//       triggered_at: new Date().toISOString(),
//     });
//   };
// }

// ─── 7. Workspace Onboarding ───────────────────────────────
//
// import { usePostHog } from "@/hooks/use-posthog";
// import { AnalyticsEvents } from "@/lib/analytics";
//
// function OnboardingFlow({ workspaceId, userId }: { workspaceId: string; userId: string }) {
//   const { capture } = usePostHog();
//
//   useEffect(() => {
//     capture(AnalyticsEvents.ONBOARDING_STARTED, {
//       workspace_id: workspaceId,
//       user_id: userId,
//     });
//   }, []);
//
//   const completeOnboarding = () => {
//     capture(AnalyticsEvents.ONBOARDING_COMPLETED, {
//       workspace_id: workspaceId,
//       time_to_complete: Date.now() - startTime,
//     });
//   };
// }

// ─── 8. Error Tracking ─────────────────────────────────────
//
// import { usePostHog } from "@/hooks/use-posthog";
// import { AnalyticsEvents } from "@/lib/analytics";
//
// function ErrorBoundaryFallback({ error }: { error: Error }) {
//   const { capture } = usePostHog();
//
//   useEffect(() => {
//     capture(AnalyticsEvents.ERROR_OCCURRED, {
//       error_message: error.message,
//       error_stack: error.stack,
//       url: window.location.href,
//     });
//   }, [error]);
//
//   return <div>Something went wrong</div>;
// }

// ─── 9. PostHog Feature Flags ──────────────────────────────
//
// import { useEffect, useState } from "react";
// import { getPostHogClient } from "@/lib/posthog-client";
//
// function useFeatureFlag(flagKey: string): boolean {
//   const [enabled, setEnabled] = useState(false);
//
//   useEffect(() => {
//     const ph = getPostHogClient();
//     if (!ph) return;
//
//     const isEnabled = ph.isFeatureEnabled(flagKey);
//     setEnabled(isEnabled ?? false);
//
//     // Listen for flag changes
//     ph.onFeatureFlag((flags) => {
//       setEnabled(!!flags[flagKey]);
//     });
//   }, [flagKey]);
//
//   return enabled;
// }

// ─── 10. Workspace Analytics Dashboard Data ────────────────
//
// import { useQuery } from "@tanstack/react-query";
//
// function PostHogDashboardMetrics({ workspaceId }: { workspaceId: string }) {
//   const { data } = useQuery({
//     queryKey: ["posthog-metrics", workspaceId],
//     queryFn: async () => {
//       const res = await fetch(`/api/analytics/posthog?workspaceId=${workspaceId}&since=-30d`);
//       return res.json();
//     },
//     enabled: !!workspaceId,
//   });
//
//   if (!data?.configured) return <div>PostHog API not configured</div>;
//
//   return (
//     <div>
//       <p>Tasks Created: {data.metrics.tasks.created}</p>
//       <p>AI Usage: {data.metrics.aiUsage}</p>
//       <p>Active Users: {data.activeUsers?.length} days</p>
//     </div>
//   );
// }

export {};
