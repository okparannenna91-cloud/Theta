import { logger } from "@/lib/logger";

export interface HallucinationCheckResult {
  isConsistent: boolean;
  issues: string[];
}

/**
 * Check if the LLM response is consistent with tool results.
 * Detects cases where the LLM invents data that wasn't returned by tools.
 */
export function checkForHallucination(
  response: string,
  toolResults: Array<{ toolName: string; result?: unknown; error?: string }>,
): HallucinationCheckResult {
  const issues: string[] = [];

  if (toolResults.length === 0) {
    return { isConsistent: true, issues: [] };
  }

  // Check 1: If response mentions specific data, it should come from tool results
  const responseLower = response.toLowerCase();
  const toolDataStrings = toolResults
    .filter(r => !r.error && r.result)
    .map(r => JSON.stringify(r.result).toLowerCase());

  // Check for specific IDs, numbers, or names that aren't in tool results
  const idPatterns = response.match(/\b(id|ID):\s*[a-zA-Z0-9_-]+/g) || [];
  for (const idMatch of idPatterns) {
    const idValue = idMatch.split(":")[1]?.trim();
    if (idValue && !toolDataStrings.some(s => s.includes(idValue.toLowerCase()))) {
      issues.push(`Response mentions ID "${idValue}" not found in tool results`);
    }
  }

  // Check 2: If response claims success but tool returned error
  const successClaims = ["created successfully", "updated successfully", "deleted successfully", "completed"];
  const hasSuccessClaim = successClaims.some(s => responseLower.includes(s));
  const hasToolError = toolResults.some(r => r.error);

  if (hasSuccessClaim && hasToolError) {
    issues.push("Response claims success but a tool returned an error");
  }

  // Check 3: If response claims specific counts, verify against tool data
  const countMatches = response.match(/(\d+)\s+(tasks?|projects?|items?|members?|subtasks?)/gi) || [];
  for (const countMatch of countMatches) {
    const num = parseInt(countMatch.split(/\s+/)[0]);
    if (num > 100) {
      // Suspiciously high count — might be hallucinated
      const toolCountData = toolDataStrings.join(" ");
      if (!toolCountData.includes(String(num))) {
        issues.push(`Response claims count of ${num} but tool results don't confirm this`);
      }
    }
  }

  // Check 4: If response is very long but tool results are empty or errors
  const wordCount = response.split(/\s+/).length;
  const hasAnyData = toolResults.some(r => !r.error && r.result);
  if (wordCount > 200 && !hasAnyData) {
    issues.push("Response is detailed but no tool data was available — may be fabricated");
  }

  return {
    isConsistent: issues.length === 0,
    issues,
  };
}
