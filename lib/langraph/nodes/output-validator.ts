const HARMFUL_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:\s*text\/html/gi,
];

export function validateAndSanitize(response: string): string {
  let sanitized = response.replace(/```\s*```/g, "");
  for (const pattern of HARMFUL_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }
  if (sanitized.length > 10000) sanitized = sanitized.substring(0, 10000) + "\n\n[Response truncated]";
  return sanitized;
}

export function optimizeResponse(response: string, intent: string): string {
  const { PhilosophyEngine } = require("@/lib/nova/philosophy-engine");
  return PhilosophyEngine.optimizeResponse(response, intent);
}
