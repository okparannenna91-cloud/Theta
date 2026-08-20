import "./dev-env.mjs";
import "./env-loader.mjs";

import { DecisionFramework } from "@/lib/nova/decision-framework";
import { routeRequest } from "@/lib/nova/intent-router";
import { runNovaAgent } from "@/lib/langraph";
import { buildLangGraphTools } from "@/lib/langraph";

const prompt = process.argv[2] || "Create a project called Website Redesign.";
const userId = process.argv[3] || "6a3fcbc46e54a1da9c76a8cd";
const workspaceId = process.argv[4] || "6a7efa987888fa9e08feb2e3";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Diag timed out after ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

async function main() {
  const decision = await DecisionFramework.evaluateAsync(prompt, { hasWorkspace: true, hasProject: false });
  const routeDecision = routeRequest(prompt, decision.intent);
  console.log("[diag] intent:", decision.intent, "| route:", routeDecision.path, "| risk:", decision.riskLevel);
  console.log("[diag] suffix:", routeDecision.promptSuffix);

  const tools = buildLangGraphTools({ userId, workspaceId });
  console.log("[diag] tools bound:", tools.length, "| create_project:", tools.some((t: any) => t.name === "create_project"), "| names:", tools.map((t: any) => t.name).join(","));

  const { prisma } = await import("@/lib/prisma");
  const projects = await prisma.project.findMany({ where: { workspaceId }, select: { name: true } });
  console.log("[diag] projects in DB:", projects.map((p: any) => p.name).join(" | "));
  const tasks = await prisma.task.findMany({ where: { workspaceId }, select: { title: true }, take: 40 });
  console.log("[diag] tasks in DB:", tasks.map((t: any) => t.title).join(" | "));

  const started = Date.now();
  const result = await withTimeout(
    runNovaAgent(prompt, { userId, workspaceId, intent: decision.intent, routeDecision }),
    120000
  );
  console.log("[diag] DONE in", Date.now() - started, "ms");
  console.log("[diag] route:", result.route, "| provider:", result.provider, "| model:", result.model);
  console.log("[diag] toolResults:", JSON.stringify(result.toolResults));
  console.log("[diag] response:\n" + result.response);
  process.exit(0);
}

main().catch((e) => {
  console.error("[diag] FATAL", e);
  process.exit(1);
});