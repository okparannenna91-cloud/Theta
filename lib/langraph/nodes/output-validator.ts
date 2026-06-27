export function validateAndSanitize(response: string): string {
  let sanitized = response.replace(/```\s*```/g, "");
  if (sanitized.length > 10000) sanitized = sanitized.substring(0, 10000) + "\n\n[Response truncated]";
  return sanitized;
}

export function optimizeResponse(response: string, intent: string): string {
  const { PhilosophyEngine } = require("@/lib/nova/philosophy-engine");
  return PhilosophyEngine.optimizeResponse(response, intent);
}
