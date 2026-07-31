import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getLangChainModel } from "@/lib/langraph/models";

export async function generateConversationTitle(prompt: string): Promise<string> {
  const trimmed = prompt.trim();
  if (!trimmed) return "";

  try {
    const model = getLangChainModel("gemini", "gemini-2.5-flash");
    const response = await model.invoke([
      new SystemMessage(
        "Task: Create a concise, descriptive title for a new chat conversation in a project management app called Theta.\n" +
          "Rules:\n" +
          "- Return ONLY the title — no quotes, no period, no explanation.\n" +
          "- 3 to 6 words.\n" +
          "- Summarize the topic or intent of the user's message.\n" +
          "- If the message is a greeting, pleasantry, or has no discernible topic, return exactly: New Chat"
      ),
      new HumanMessage(`The user's first message was: "${trimmed}"`),
    ]);
    const title = typeof response.content === "string" ? response.content.trim() : "";
    const cleaned = title.replace(/^["'\s]+|["'\s]+$/g, "").replace(/\.+$/, "");
    if (!cleaned || cleaned.toLowerCase() === "new chat") return "";
    return cleaned.slice(0, 60);
  } catch (error) {
    console.error("Failed to generate conversation title:", error);
    return "";
  }
}
