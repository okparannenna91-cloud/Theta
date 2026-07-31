import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getLangChainModel } from "@/lib/langraph/models";

const TITLE_SYSTEM_PROMPT =
  "Task: Create a concise, descriptive title for a new chat conversation in a project management app called Theta.\n" +
  "Rules:\n" +
  "- Return ONLY the title — no quotes, no period, no explanation.\n" +
  "- 3 to 6 words.\n" +
  "- Summarize the topic or intent of the user's message.\n" +
  "- If the message is a greeting, pleasantry, or has no discernible topic, return exactly: New Chat";

const TITLE_ATTEMPTS: Array<{ provider: any; model: string }> = [
  { provider: "gemini", model: "gemini-2.5-flash" },
  { provider: "openrouter", model: "openai/gpt-4o-mini" },
  { provider: "openai", model: "gpt-4o-mini" },
];

function heuristicTitle(prompt: string): string {
  const cleaned = prompt
    .trim()
    .replace(/^(?:hi|hello|hey|yo|sup|howdy|good\s*(?:morning|afternoon|evening))[!.?\s,]*/i, "")
    .trim();
  if (!cleaned) return "";
  const words = cleaned.split(/\s+/).slice(0, 6);
  const title = words.join(" ");
  return (title[0].toUpperCase() + title.slice(1)).slice(0, 60);
}

export async function generateConversationTitle(prompt: string): Promise<string> {
  const trimmed = prompt.trim();
  if (!trimmed) return "";

  for (const attempt of TITLE_ATTEMPTS) {
    try {
      const model = getLangChainModel(attempt.provider, attempt.model);
      const response = await model.invoke([
        new SystemMessage(TITLE_SYSTEM_PROMPT),
        new HumanMessage(`The user's first message was: "${trimmed}"`),
      ]);
      const title = typeof response.content === "string" ? response.content.trim() : "";
      const cleaned = title.replace(/^["'\s]+|["'\s]+$/g, "").replace(/\.+$/, "");
      if (!cleaned || cleaned.toLowerCase() === "new chat") return "";
      return cleaned.slice(0, 60);
    } catch (error) {
      console.warn(`Title generation failed with ${attempt.provider}/${attempt.model}:`, (error as Error).message?.slice(0, 120));
    }
  }
  return heuristicTitle(trimmed);
}
