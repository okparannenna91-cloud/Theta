(process.env as any).NODE_ENV = "development";
import "./env-loader.mjs";

import { getLangChainModel } from "@/lib/langraph/models";
import { buildLangGraphToolWrapper } from "@/lib/langraph/tools";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const userId = "6a3fcbc46e54a1da9c76a8cd";
const workspaceId = "6a7efa987888fa9e08feb2e3";

async function main() {
  const [provider, model] = (process.env.FORCE_MODEL || "openrouter:openai/gpt-4o-mini").split(":");
  const llm = getLangChainModel(provider as any, model) as any;
  const tool = buildLangGraphToolWrapper({ userId, workspaceId }, "create_project");
  console.log("[mini] tool name:", tool.name, "| desc:", tool.description.slice(0, 120));
  const bound = llm.bindTools([tool]);

  const res = await bound.invoke([
    new SystemMessage("You are Flow3, Theta PM's AI copilot. Execute the user's request using the provided tool. If the action is MEDIUM risk, ask ONE confirmation question before executing."),
    new HumanMessage("Create a project called Website Redesign."),
  ]);
  console.log("[mini] content:", typeof res.content === "string" ? res.content.slice(0, 400) : JSON.stringify(res.content));
  console.log("[mini] tool_calls:", JSON.stringify(res.tool_calls));
  process.exit(0);
}

main().catch((e) => {
  console.error("[mini] FATAL", e?.message || e);
  process.exit(1);
});