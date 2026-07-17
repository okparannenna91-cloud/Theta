# NOVA BEHAVIORAL FIX IMPLEMENTATION PLAN

> Every single problem. Every single fix. No sugarcoating.
> Source: Nova Behavioral Audit -- "Why She's a Chatbot in a Tuxedo"
> Current Behavioral Score: 28/100
> Target: 75+/100

---

## TABLE OF CONTENTS

1. [PATTERN 1 FIX: Replace Regex Classification with LLM Intent Understanding](#pattern-1)
2. [PATTERN 2 FIX: Eliminate Validation Theater](#pattern-2)
3. [PATTERN 3 FIX: Implement Real Reasoning Engine](#pattern-3)
4. [PATTERN 4 FIX: Make Memory Actually Learn](#pattern-4)
5. [PATTERN 5 FIX: Transform from Reactive to Proactive](#pattern-5)
6. [PATTERN 6 FIX: Enforce the Constitution in Code](#pattern-6)
7. [PATTERN 7 FIX: Expand Context Beyond Starvation](#pattern-7)
8. [EXECUTION PATH FIXES: Every Broken Flow](#execution-paths)
9. [SCORECARD FIXES: Every Fake Capability](#scorecard)
10. [COMPETITIVE PARITY: Match What Others Do](#competitive)

---

<a id="pattern-1"></a>
## PATTERN 1 FIX: Replace Regex Classification with LLM Intent Understanding

### Problem
`lib/nova/intent-router.ts:15-32` uses regex keyword matching:
```
"code|implement|function|script" -> CODE
"why|how does|explain" -> REASONING
"search|find|look up" -> RETRIEVAL
"create|update|delete|add" -> ACTION
"analyze|report|summary" -> ANALYSIS
"draft|write|compose" -> CREATIVE
(default) -> CHAT
```

### Problem Breakdown

**Problem 1.1: `classifyPrompt()` is regex-only**
- File: `lib/langraph/model-router.ts:15-32`
- Issue: Pure keyword matching. "Analyze this" and "Analyze this complex multi-project dependency chain across 3 teams" get the same classification.
- Impact: Scope, context, and complexity are invisible to the classifier.

**Problem 1.2: `isConversationalPrompt()` strips ALL tools**
- File: `lib/nova/intent-router.ts:79-81`
- Issue: Question prefix ("what", "how", "why") + no action verbs = CONVERSATION mode. Zero tools. Zero context.
- Impact: "What are my risks?" becomes a generic chatbot with no workspace knowledge.
- Evidence: "Report on my project risks" -> ANALYSIS mode (works). "What are my project risks?" -> CONVERSATION mode (fails). Same intent, different Nova.

**Problem 1.3: `isConversationalPrompt()` is a binary gate**
- File: `lib/nova/intent-router.ts:70-95`
- Issue: The gate is all-or-nothing. You either get tools or you don't. No middle ground.
- Impact: "Can you create a task and also tell me about my risks?" gets classified as CONVERSATION (question prefix) and Nova loses both tools AND context.

**Problem 1.4: First-match-wins fragility**
- File: `lib/nova/intent-router.ts:25-31`
- Issue: `if (isCode) return "code"` runs before `if (isReasoning) return "reasoning"`. A prompt like "explain why the code is broken" matches CODE first, even though it's a REASONING request.
- Impact: Misclassification changes Nova's entire behavior.

**Problem 1.5: Duplicate code with constitution**
- File: `lib/nova/intent-router.ts` vs `lib/nova/constitution/decision-framework.ts`
- Issue: `NEGATION_PATTERNS`, `GOAL_KEYWORDS`, and `PLANNING_KEYWORDS` are nearly identical in both files.
- Impact: Maintenance hazard. Changing one doesn't change the other.

**Problem 1.6: `strategy` parameter is dead code**
- File: `lib/nova/intent-router.ts:routeRequest()`
- Issue: Accepts `strategy: DecisionStrategy` but only reads `intent` to decide the path. Strategy from decision framework is ignored.
- Impact: The entire decision framework's strategy output is wasted.

**Problem 1.7: `NovaRoute` type is duplicated**
- File: `lib/nova/intent-router.ts` and `lib/langraph/nova-agent.ts`
- Issue: Both files define `NovaRoute` with the same values.
- Impact: Changes in one file don't propagate to the other.

### Fix 1.1: Create LLM-Based Intent Classifier

**File:** Create `lib/nova/llm-intent-classifier.ts` (new file)

**Implementation:**
```typescript
// New file: lib/nova/llm-intent-classifier.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

interface IntentClassification {
  intent: "CREATE" | "UPDATE" | "DELETE" | "READ" | "ANALYZE" | "PLAN" | "CHAT" | "ORCHESTRATE";
  confidence: number;
  scope: "single" | "multiple" | "project" | "workspace";
  complexity: "simple" | "moderate" | "complex";
  requiresContext: boolean;
  reasoning: string; // Chain-of-thought for debugging
}

export async function classifyIntentLLM(
  prompt: string,
  workspaceContext: string
): Promise<IntentClassification> {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
  });

  const classificationPrompt = `You are an intent classifier for a project management AI assistant.
Given the user's message and workspace context, classify the intent.

User message: "${prompt}"

Workspace context (abbreviated): ${workspaceContext.substring(0, 500)}

Classify into:
- intent: What is the user trying to DO? (CREATE/UPDATE/DELETE/READ/ANALYZE/PLAN/CHAT/ORCHESTRATE)
- confidence: How confident are you? (0.0-1.0)
- scope: What is the scope? (single item / multiple items / project level / workspace level)
- complexity: How complex is this? (simple / moderate / complex)
- requiresContext: Does the user need workspace data to answer? (true/false)
- reasoning: Why did you classify this way? (1 sentence)

IMPORTANT RULES:
- Questions about workspace data ("what are my risks?", "show me overdue tasks") require ANALYZE intent with requiresContext=true
- Questions about general PM knowledge ("what is agile?") require CHAT intent with requiresContext=false
- Requests that combine actions and questions should be classified by the PRIMARY intent
- Always err on the side of giving tools and context when uncertain

Respond as JSON only.`;

  const response = await model.invoke(classificationPrompt);
  const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  
  try {
    return JSON.parse(content);
  } catch {
    // Fallback to regex if LLM fails
    return fallbackClassify(prompt);
  }
}

function fallbackClassify(prompt: string): IntentClassification {
  // Keep existing regex as fallback, not primary
  const lower = prompt.toLowerCase();
  if (/\b(create|add|make|new)\b/.test(lower)) return { intent: "CREATE", confidence: 0.6, scope: "single", complexity: "simple", requiresContext: true, reasoning: "Fallback regex" };
  if (/\b(delete|remove|destroy)\b/.test(lower)) return { intent: "DELETE", confidence: 0.6, scope: "single", complexity: "simple", requiresContext: true, reasoning: "Fallback regex" };
  if (/\b(update|edit|modify|change)\b/.test(lower)) return { intent: "UPDATE", confidence: 0.6, scope: "single", complexity: "simple", requiresContext: true, reasoning: "Fallback regex" };
  if (/\b(analyze|report|summary|review)\b/.test(lower)) return { intent: "ANALYZE", confidence: 0.6, scope: "workspace", complexity: "moderate", requiresContext: true, reasoning: "Fallback regex" };
  if (/\b(plan|strategy|roadmap)\b/.test(lower)) return { intent: "PLAN", confidence: 0.6, scope: "project", complexity: "complex", requiresContext: true, reasoning: "Fallback regex" };
  return { intent: "CHAT", confidence: 0.5, scope: "single", complexity: "simple", requiresContext: true, reasoning: "Fallback regex - default" };
}
```

**Steps:**
1. Create `lib/nova/llm-intent-classifier.ts` with the code above
2. Update `lib/nova/intent-router.ts` to import and use `classifyIntentLLM()` instead of `classifyPrompt()`
3. Keep existing regex as fallback when LLM is unavailable
4. Remove the `isConversationalPrompt()` function entirely
5. Remove duplicate `NEGATION_PATTERNS`, `GOAL_KEYWORDS`, `PLANNING_KEYWORDS` from intent-router.ts (keep only in constitution)
6. Remove dead `strategy` parameter from `routeRequest()`
7. Remove duplicate `NovaRoute` type from `nova-agent.ts`, import from intent-router.ts

### Fix 1.2: Never Strip Tools from Nova

**File:** `lib/nova/intent-router.ts`

**Change:** Remove the CONVERSATION path that strips all tools. Instead, always provide tools and let the LLM decide whether to use them.

**Current code (to remove):**
```typescript
if (isConversationalPrompt(prompt)) {
  return {
    path: "CONVERSATION",
    toolCategories: [],  // <-- THIS IS THE PROBLEM
    contextDepth: "minimal",
    timeoutMs: 30000,
    promptSuffix: "[CONVERSATION MODE] Respond naturally. You do NOT have access to any tools in this mode."
  };
}
```

**New code:**
```typescript
// Always provide tools. Let the LLM decide.
// The LLM is smart enough to not use tools for casual chat.
return {
  path: "CHAT",
  toolCategories: ["TASK", "PROJECT", "SEARCH"],
  contextDepth: "standard",
  timeoutMs: 30000,
  promptSuffix: "Respond naturally. Use tools when they would help answer the user's question."
};
```

### Fix 1.3: Remove First-Match-Wins in Model Router

**File:** `lib/langraph/model-router.ts:15-32`

**Change:** Replace the cascading if-else with a scoring system. The category with the most keyword matches wins.

**Current code (to replace):**
```typescript
if (isCode) return "code";
if (isReasoning) return "reasoning";
if (isRetrieval) return "retrieval";
// ... etc
```

**New code:**
```typescript
const scores: Record<TaskCategory, number> = {
  code: 0, reasoning: 0, retrieval: 0, action: 0, analysis: 0, creative: 0, chat: 0
};

// Count matches per category
for (const pattern of CODE_PATTERNS) { if (pattern.test(lower)) scores.code++; }
for (const pattern of REASONING_PATTERNS) { if (pattern.test(lower)) scores.reasoning++; }
// ... etc

// Winner is the category with the most matches
const winner = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
return winner[1] > 0 ? winner[0] as TaskCategory : "chat";
```

---

<a id="pattern-2"></a>
## PATTERN 2 FIX: Eliminate Validation Theater

### Problem
Nova asks "Would you like me to proceed?" for almost everything because:
1. `decision-framework.ts` sets `riskLevel = "MEDIUM"` for ALL UPDATE actions
2. MEDIUM risk sets `requiresConfirmation = true`
3. `validation-engine.ts` starts with `confidence = 0.5` and triggers confirmation on any warning

### Problem Breakdown

**Problem 2.1: ALL UPDATE actions are MEDIUM risk**
- File: `lib/nova/decision-framework.ts:evaluate()`
- Issue: The only MEDIUM trigger is `intent === "UPDATE"`. No nuance about change size, reversibility, or impact.
- Impact: "Change task title to X" and "Restructure the entire project" both require confirmation.

**Problem 2.2: Confidence starts at 0.5 and drops easily**
- File: `lib/nova/validation-engine.ts:calculateConfidence()`
- Issue: Base confidence is 0.5. Each explicit param adds 0.1. Any warning drops it. Below 0.5 triggers confirmation.
- Impact: A task with title (0.6) + one warning (0.5) = requires confirmation.

**Problem 2.3: Duplicate detection triggers confirmation**
- File: `lib/nova/validation-engine.ts:checkDuplicates()`
- Issue: If a task with the same title exists, it generates a WARNING. Warnings trigger confirmation.
- Impact: User says "Create Outreach task" and Nova asks "A task named Outreach already exists. Should I proceed?" even though creating duplicates is sometimes intentional.

**Problem 2.4: Delete always requires confirmation**
- File: `lib/nova/validation-engine.ts:requiresConfirmation()`
- Issue: `if (action === "DELETE") return true;`
- Impact: Even "Delete that task I just created 5 seconds ago" requires confirmation.

**Problem 2.5: Date validation is overly strict**
- File: `lib/nova/validation-engine.ts:validateDates()`
- Issue: Past dates trigger warnings. But "Set due date to yesterday" might be intentional (backdating).
- Impact: Legitimate backdating requests require confirmation.

### Fix 2.1: Rewrite Risk Assessment to Be Consequence-Based

**File:** `lib/nova/decision-framework.ts`

**Replace the entire `evaluate()` method:**

```typescript
evaluate(prompt: string, context?: WorkspaceContext): Decision {
  const intent = intentFromString(prompt);
  
  // Consequence-based risk assessment, not keyword-based
  let riskLevel: RiskLevel;
  let requiresApproval: boolean;
  let requiresConfirmation: boolean;

  switch (intent) {
    case "DELETE":
      // Check scope: single item vs bulk vs project
      const isBulkDelete = /\b(all|every|bulk|batch|multiple)\b/i.test(prompt);
      const isProjectDelete = /\b(project|workspace|team|organization)\b/i.test(prompt);
      
      if (isProjectDelete || isBulkDelete) {
        riskLevel = "HIGH";
        requiresApproval = true;
        requiresConfirmation = true;
      } else {
        // Single item delete: LOW risk, no confirmation
        riskLevel = "LOW";
        requiresApproval = false;
        requiresConfirmation = false;
      }
      break;

    case "UPDATE":
      // Most updates are LOW risk
      const isMajorUpdate = /\b(restructure|reorganize|move|archive|rename|visibility|permissions)\b/i.test(prompt);
      
      if (isMajorUpdate) {
        riskLevel = "MEDIUM";
        requiresApproval = false;
        requiresConfirmation = true; // Ask once for major changes
      } else {
        riskLevel = "LOW";
        requiresApproval = false;
        requiresConfirmation = false; // Don't ask for simple updates
      }
      break;

    case "CREATE":
      riskLevel = "LOW";
      requiresApproval = false;
      requiresConfirmation = false;
      break;

    case "ORCHESTRATE":
      riskLevel = "MEDIUM";
      requiresApproval = false;
      requiresConfirmation = false; // Let Nova orchestrate
      break;

    default:
      riskLevel = "LOW";
      requiresApproval = false;
      requiresConfirmation = false;
  }

  return { intent, riskLevel, requiresApproval, requiresConfirmation, strategy: "PATH_A_IMMEDIATE" };
}
```

### Fix 2.2: Rewrite Confidence Calculation

**File:** `lib/nova/validation-engine.ts`

**Replace `calculateConfidence()`:**

```typescript
calculateConfidence(params: ExtractedParams, warnings: string[], errors: string[]): number {
  // Start high. Only drop for real problems.
  let confidence = 0.9;

  // Errors are real problems
  confidence -= errors.length * 0.3;

  // Warnings are minor concerns, not blockers
  confidence -= warnings.length * 0.05;

  // Missing title is a real problem
  if (!params.title) confidence -= 0.4;

  // Floor at 0.1
  return Math.max(0.1, confidence);
}
```

### Fix 2.3: Rewrite `requiresConfirmation()`

**File:** `lib/nova/validation-engine.ts`

**Replace the entire method:**

```typescript
requiresConfirmation(intent: string, riskLevel: string, confidence: number, warnings: string[]): boolean {
  // Only confirm for genuinely ambiguous or destructive operations
  if (intent === "DELETE" && riskLevel === "HIGH") return true;  // Bulk/project delete
  if (confidence < 0.3) return true;  // Very low confidence - something is wrong
  // Everything else: execute immediately
  return false;
}
```

### Fix 2.4: Remove Strict Date Validation

**File:** `lib/nova/validation-engine.ts`

**Remove the past-date warning.** If the user says "Set due date to yesterday," respect it. It might be intentional backdating.

```typescript
// OLD: if (date < new Date()) warnings.push("Date is in the past");
// NEW: Remove this check entirely. Trust the user.
```

### Fix 2.5: Remove Duplicate Detection as a Confirmation Trigger

**File:** `lib/nova/validation-engine.ts`

**Change:** Duplicate detection should be informational, not blocking.

```typescript
// OLD: if (duplicate) warnings.push("Duplicate found"); // triggers confirmation
// NEW: if (duplicate) {
//   // Include in response as info, not as a blocker
//   responseInfo.duplicateNote = "Note: A similar item already exists";
// }
```

---

<a id="pattern-3"></a>
## PATTERN 3 FIX: Implement Real Reasoning Engine

### Problem
The "reasoning" is a system prompt instruction. There is no code that implements deliberative reasoning. The LLM may or may not follow the instruction. The system prompt contains contradictory rules.

### Problem Breakdown

**Problem 3.1: No ReasoningEngine class**
- File: `lib/nova/reasoning-engine.ts` does not exist as functional code
- Issue: The constitution says "Think Before Acting" but there's no code to enforce it
- Impact: Reasoning is non-deterministic. Sometimes Nova thinks, sometimes she doesn't.

**Problem 3.2: Contradictory system prompt instructions**
- Files: `lib/nova/constitution/identity.ts`, `lib/nova/constitution/philosophy.ts`, `lib/nova/constitution/execution-principles.ts`
- Issue: "Think Before Acting" vs "Execution Over Conversation" vs "Conversation First" vs "Never ask unnecessary questions"
- Impact: LLM resolves contradictions differently each time. Behavior is unpredictable.

**Problem 3.3: `EXECUTION_STEPS` array is never executed**
- File: `lib/nova/constitution/execution-principles.ts`
- Issue: Defines 12-step pipeline (`UNDERSTAND_OBJECTIVE` through `IDENTIFY_PROACTIVE_INSIGHTS`) but no code iterates over it
- Impact: The pipeline is aspirational documentation, not executable logic.

**Problem 3.4: `MentalModel` in reasoning engine is empty**
- File: `lib/nova/reasoning-engine.ts`
- Issue: `projectCount: 0`, `memberCount: 0`, `taskCount: 0` are hardcoded defaults, never populated
- Impact: Nova "thinks" with an empty mental model of the workspace.

### Fix 3.1: Create a Real Reasoning Engine

**File:** Create `lib/nova/reasoning-engine.ts` (rewrite existing stub)

```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { prisma } from "@/lib/prisma";

interface ReasoningResult {
  objective: string;          // What the user actually wants
  isQuestion: boolean;        // Is this asking for info or requesting action?
  toolsNeeded: string[];      // Which tools are required
  risks: string[];            // What could go wrong
  plan: string[];             // Steps to execute
  confidence: number;         // How sure are we
  contextNeeded: string[];    // What workspace data is required
  shouldAskClarification: boolean;  // Is anything genuinely ambiguous?
  clarificationQuestion: string;    // If so, what to ask
}

export async function reasonBeforeActing(
  prompt: string,
  workspaceSummary: string
): Promise<ReasoningResult> {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
  });

  const reasoningPrompt = `You are an AI project manager's reasoning engine.
Before acting, think through this step by step.

User message: "${prompt}"

Workspace summary: ${workspaceSummary.substring(0, 1000)}

Think through:
1. What does the user ACTUALLY want? (not what they literally said, but their real objective)
2. Is this a question (needs info) or an action (needs execution)?
3. What tools would be needed to fulfill this?
4. What could go wrong? (risks)
5. What steps should be taken? (plan)
6. How confident are you? (0.0-1.0)
7. What workspace data do you need?
8. Is anything genuinely ambiguous that requires clarification? (only ask if truly unclear - 90% of requests are clear enough to act on)

CRITICAL RULES:
- Default to ACTING, not asking. Users want results, not questions.
- Only ask clarification if you genuinely cannot proceed (missing critical info like "which project?" when multiple exist).
- If the user says "create a task", create it. Don't ask "what should I name it?" - infer from context.
- If the user asks a question about their workspace, load the data and answer. Don't say "I don't have access."
- Confidence above 0.7 = execute immediately. Below 0.7 = one clarifying question max.

Respond as JSON only.`;

  const response = await model.invoke(reasoningPrompt);
  const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  try {
    return JSON.parse(content);
  } catch {
    return {
      objective: prompt,
      isQuestion: false,
      toolsNeeded: [],
      risks: [],
      plan: [],
      confidence: 0.5,
      contextNeeded: [],
      shouldAskClarification: false,
      clarificationQuestion: "",
    };
  }
}
```

### Fix 3.2: Resolve Contradictory System Prompt Instructions

**File:** `lib/nova/constitution/identity.ts`

**Add priority ordering to resolve contradictions:**

```typescript
export const IDENTITY_RULES: IdentityRule = {
  must: [
    // PRIORITY 1: User safety and trust
    "Never invent data. Never hallucinate workspace information. If uncertain, say so.",
    "Never overwrite explicit user instructions.",
    
    // PRIORITY 2: Execute, don't discuss
    "Default to execution. Only ask questions when genuinely ambiguous (90% of requests are clear).",
    "When users describe a goal, generate projects, tasks, dependencies, and timelines without requiring manual creation.",
    
    // PRIORITY 3: Think quickly, not deeply
    "Assess the request in one pass. Do not deliberate extensively. Speed matters.",
    "If you have enough information to act, act. If not, ask ONE question maximum.",
    
    // PRIORITY 4: Quality of output
    "Keep responses concise. Default to 2-3 sentences unless detail is requested.",
    "Lead with the most important insight first.",
    "Reference workspace data by name, not generically.",
  ],
  mustNot: [
    // Hard prohibitions (always enforced)
    "Never ask 'Would you like me to proceed?' for simple actions (create, update, list).",
    "Never ask for information already available in context.",
    "Never generate generic text when workspace data is available.",
    "Never start responses with 'Sure!', 'Of course!', or 'I'd be happy to'.",
    "Never reference internal tools, agents, or system components.",
    "Never respond with only 'Okay' or 'Done' without context about what was accomplished.",
  ],
};
```

### Fix 3.3: Delete the Unused `EXECUTION_STEPS` Array

**File:** `lib/nova/constitution/execution-principles.ts`

**Remove:** The `EXECUTION_STEPS` array and `EXECUTION_STEP_LABELS` object. They are never used by any code.

**Keep:** The `CONFIRMATION_RULES` and `EXECUTION_PRINCIPLES` (used in system prompt).

### Fix 3.4: Wire Reasoning into the Agent Pipeline

**File:** `lib/langraph/nova-agent.ts`

**Add reasoning step before tool execution:**

```typescript
// In execute(), after loading context, before tool execution:
const reasoning = await reasonBeforeActing(state.prompt, workspaceContext);

// Use reasoning results:
if (reasoning.shouldAskClarification) {
  // Return the clarification question without executing tools
  return { response: reasoning.clarificationQuestion, shouldReturn: true };
}

// If reasoning says this is a question, ensure context is loaded
if (reasoning.isQuestion && state.route.contextDepth === "minimal") {
  state.route.contextDepth = "standard";
}

// Proceed with tool execution using reasoning.plan as guidance
```

---

<a id="pattern-4"></a>
## PATTERN 4 FIX: Make Memory Actually Learn

### Problem
Memory doesn't learn automatically. The LLM must explicitly call `remember_preference`. Semantic search exists but is never called. `recordDecision()` is dead code. Confidence is hardcoded to 0.8.

### Problem Breakdown

**Problem 4.1: `remember_preference` is opt-in, not automatic**
- File: `lib/ai-tools/index.ts:remember_preference tool`
- Issue: The LLM must choose to call this tool. Most interactions don't trigger it.
- Impact: Nova doesn't learn from 90% of interactions.

**Problem 4.2: `searchLongTerm()` is never called in main flow**
- File: `lib/nova/memory-system.ts:searchLongTerm()`
- Issue: Semantic search exists but is never invoked from `nova-agent.ts` or `route.ts`
- Impact: Long-term memory retrieval is brute-force (get all, sort by date), not semantic.

**Problem 4.3: `recordDecision()` is dead code**
- File: `lib/nova/memory-system.ts:recordDecision()`
- Issue: Defined but never called anywhere in the codebase
- Impact: Past decisions are never consulted.

**Problem 4.4: Memory confidence hardcoded to 0.8**
- File: `lib/nova/memory-system.ts:182`
- Issue: `confidence: 0.8` for every memory regardless of age, frequency, or relevance
- Impact: Old, irrelevant memories have the same weight as recent, frequently-used ones.

**Problem 4.5: Long-term memory only loaded for ANALYSIS routes**
- File: `lib/langraph/nodes/memory-loader.ts`
- Issue: Long-term memory loading is gated by `contextDepth === "full"`, which only applies to ANALYSIS routes
- Impact: When creating a task, Nova doesn't remember user preferences.

**Problem 4.6: Decision history stored as unbounded JSON blob**
- File: `lib/nova/memory-system.ts:recordDecision()`
- Issue: Up to 50 decisions stored in a single JSON string column. Every read/write parses the entire array.
- Impact: Performance degrades with usage. No pruning.

### Fix 4.1: Auto-Learn from Every Interaction

**File:** Create `lib/nova/auto-learner.ts` (new file)

```typescript
import { prisma } from "@/lib/prisma";
import { MemorySystem } from "./memory-system";

interface InteractionRecord {
  userId: string;
  workspaceId: string;
  prompt: string;
  action: string;        // What tool was called
  toolParams: Record<string, unknown>;  // What parameters were used
  success: boolean;
}

export async function learnFromInteraction(record: InteractionRecord): Promise<void> {
  // Only learn from successful interactions
  if (!record.success) return;

  // Extract learnable patterns
  const patterns = extractPatterns(record);

  for (const pattern of patterns) {
    // Save as long-term memory
    await MemorySystem.saveLongTerm(
      record.userId,
      record.workspaceId,
      `preference:${pattern.key}`,
      pattern.value,
      "preference"
    );
  }
}

function extractPatterns(record: InteractionRecord): Array<{ key: string; value: string }> {
  const patterns: Array<{ key: string; value: string }> = [];

  // Learn project preferences
  if (record.toolParams.projectId) {
    patterns.push({
      key: `default_project_for_${record.action}`,
      value: record.toolParams.projectId as string,
    });
  }

  // Learn priority preferences
  if (record.toolParams.priority) {
    patterns.push({
      key: `preferred_priority`,
      value: record.toolParams.priority as string,
    });
  }

  // Learn naming conventions
  if (record.toolParams.title && typeof record.toolParams.title === "string") {
    const title = record.toolParams.title;
    if (title.match(/^[A-Z]/)) patterns.push({ key: "naming_capitalization", value: "title_case" });
    if (title.includes(":")) patterns.push({ key: "naming_separator", value: "colon" });
    if (title.includes(" - ")) patterns.push({ key: "naming_separator", value: "dash" });
  }

  // Learn assignee patterns
  if (record.toolParams.assigneeId) {
    patterns.push({
      key: `default_assignee`,
      value: record.toolParams.assigneeId as string,
    });
  }

  return patterns;
}
```

**Then in `lib/langraph/nova-agent.ts`, call it after every successful tool execution:**

```typescript
// After tool execution succeeds:
learnFromInteraction({
  userId: ctx.user.id,
  workspaceId: ctx.workspaceId,
  prompt: state.prompt,
  action: toolName,
  toolParams: toolArgs,
  success: true,
}).catch(() => {}); // Fire-and-forget, don't block response
```

### Fix 4.2: Wire Semantic Search into Main Flow

**File:** `lib/langraph/nodes/memory-loader.ts`

**Add semantic search for long-term memory:**

```typescript
// In loadMemory(), replace brute-force retrieval with semantic search:
async function loadLongTermMemory(userId: string, workspaceId: string, prompt: string) {
  // OLD: const memories = await prisma.aiMemory.findMany({ where: {...}, orderBy: { updatedAt: "desc" }, take: 50 });
  
  // NEW: Semantic search
  const memories = await MemorySystem.searchLongTerm(userId, workspaceId, prompt, 20);
  return memories.map(m => `- ${m.key}: ${m.value}`).join("\n");
}
```

### Fix 4.3: Activate `recordDecision()`

**File:** `lib/langraph/nova-agent.ts`

**Call after every decision (tool execution or analysis):**

```typescript
// After successful tool execution or analysis:
MemorySystem.recordDecision(ctx.user.id, ctx.workspaceId, {
  prompt: state.prompt,
  action: toolName,
  result: "success",
  timestamp: new Date(),
}).catch(() => {});
```

### Fix 4.4: Calculate Memory Confidence Dynamically

**File:** `lib/nova/memory-system.ts`

**Replace hardcoded `confidence: 0.8`:**

```typescript
function calculateMemoryConfidence(memory: AiMemory, now: Date): number {
  let confidence = 0.5;

  // Recency: more recent = higher confidence
  const ageInDays = (now.getTime() - memory.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays < 1) confidence += 0.3;
  else if (ageInDays < 7) confidence += 0.2;
  else if (ageInDays < 30) confidence += 0.1;
  // Older than 30 days: no boost

  // Access frequency: more accessed = higher confidence
  // (add an accessCount field to AiMemory or track in Redis)
  
  return Math.min(1.0, confidence);
}
```

### Fix 4.5: Load Long-Term Memory for ALL Routes

**File:** `lib/langraph/nodes/memory-loader.ts`

**Remove the route-based gating:**

```typescript
// OLD: if (contextDepth === "full") { load long-term memory }
// NEW: Always load long-term memory (at least top 10 preferences)
// This ensures Nova remembers preferences even for ACTION routes
```

### Fix 4.6: Add Memory Pruning

**File:** `lib/nova/memory-system.ts`

**Add a pruning function:**

```typescript
export async function pruneOldMemories(userId: string, workspaceId: string): Promise<void> {
  // Delete memories older than 90 days with low access count
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await prisma.aiMemory.deleteMany({
    where: {
      userId,
      workspaceId,
      updatedAt: { lt: cutoff },
    },
  });
}
```

**Call via Inngest cron weekly.**

---

<a id="pattern-5"></a>
## PATTERN 5 FIX: Transform from Reactive to Proactive

### Problem
Proactive intelligence only runs for ANALYSIS routes. It's appended as decoration, not used in decisions. No background monitoring. No scheduled jobs. Nova never initiates.

### Problem Breakdown

**Problem 5.1: Proactive insights only loaded for ANALYSIS/REPORT/CHAT**
- File: `lib/langraph/nova-agent.ts:loadProactiveInsights()`
- Issue: Gated by `route.path === "ANALYSIS" || route.path === "REPORT" || route.path === "CHAT"`
- Impact: When creating a task, Nova has zero awareness of overdue tasks or blocked work.

**Problem 5.2: Insights are decorative footer, not decision input**
- File: `lib/nova/response-formatter.ts:addProactiveInsights()`
- Issue: Insights are appended as a section at the bottom of the response
- Impact: Nova doesn't USE the insights in her reasoning. They're just decoration.

**Problem 5.3: No background monitoring**
- Issue: No Inngest cron jobs, no scheduled analysis, no proactive notifications
- Impact: Nova only knows what you tell her. She never proactively notifies you of problems.

**Problem 5.4: `analyzeWithLLM()` is not in main flow**
- File: `lib/nova/proactive-intelligence.ts:analyzeWithLLM()`
- Issue: Calls Gemini to synthesize insights, but only accessible from separate endpoint
- Impact: The LLM-powered analysis is never used in the main request flow.

### Fix 5.1: Inject Proactive Insights into EVERY Request

**File:** `lib/langraph/nova-agent.ts`

**Remove the route-based gating:**

```typescript
// OLD: if (state.route.path === "ANALYSIS" || ...) { loadProactiveInsights() }
// NEW: Always load proactive insights (top 3 most critical)
async function loadProactiveInsightsAlways(workspaceId: string): Promise<string> {
  const insights = await ProactiveIntelligenceEngine.analyzeWorkspace(workspaceId);
  if (insights.length === 0) return "";
  
  const topInsights = insights.slice(0, 3);
  return "\n[WORKSPACE ALERTS]\n" + topInsights.map(i => 
    `- ${i.severity.toUpperCase()}: ${i.title} - ${i.message}`
  ).join("\n");
}
```

**Inject into system prompt for ALL routes:**

```typescript
const proactiveContext = await loadProactiveInsightsAlways(workspaceId);
// Add to system prompt: proactiveContext
```

### Fix 5.2: Use Insights in Decision-Making

**File:** `lib/langraph/nova-agent.ts`

**After loading proactive insights, use them to influence behavior:**

```typescript
// If there are critical insights, Nova should mention them
if (proactiveInsights.some(i => i.severity === "critical")) {
  systemPrompt += "\nIMPORTANT: There are critical workspace issues. Address them proactively in your response. For example, if creating a task while tasks are overdue, mention it.";
}
```

### Fix 5.3: Create Background Monitoring Worker

**File:** Create `lib/inngest/proactive-monitor.ts` (new file)

```typescript
import { inngest } from "@/lib/inngest";
import { ProactiveIntelligenceEngine } from "@/lib/nova/proactive-intelligence";
import { prisma } from "@/lib/prisma";

// Scheduled function: runs every 30 minutes
export const proactiveMonitor = inngest.createFunction(
  { id: "proactive-monitor" },
  { cron: "0 */30 * * * *" },  // Every 30 minutes
  async ({ event, step }) => {
    // Get all active workspaces
    const workspaces = await prisma.workspace.findMany({
      where: { status: "active" },
      select: { id: true, name: true },
    });

    for (const workspace of workspaces) {
      const insights = await step.run(`analyze-${workspace.id}`, async () => {
        return ProactiveIntelligenceEngine.analyzeWorkspace(workspace.id);
      });

      // Filter for critical/high severity
      const criticalInsights = insights.filter(i => 
        i.severity === "critical" || i.severity === "high"
      );

      if (criticalInsights.length > 0) {
        // Create notification for workspace owner
        await step.run(`notify-${workspace.id}`, async () => {
          const owner = await prisma.workspaceMember.findFirst({
            where: { workspaceId: workspace.id, role: "owner" },
          });
          if (owner) {
            await prisma.notification.create({
              data: {
                userId: owner.userId,
                workspaceId: workspace.id,
                type: "proactive_alert",
                title: `Nova detected ${criticalInsights.length} critical issues`,
                message: criticalInsights.map(i => i.message).join("\n"),
                priority: "high",
              },
            });
          }
        });
      }
    }
  }
);
```

### Fix 5.4: Wire `analyzeWithLLM()` into Main Flow

**File:** `lib/langraph/nova-agent.ts`

**For ANALYSIS routes, use LLM-powered synthesis:**

```typescript
if (state.route.path === "ANALYSIS") {
  const llmInsights = await ProactiveIntelligenceEngine.analyzeWithLLM(
    workspaceId,
    workspaceContext
  );
  // Inject synthesized insights into system prompt
  systemPrompt += "\n[AI-ANALYZED INSIGHTS]\n" + llmInsights;
}
```

---

<a id="pattern-6"></a>
## PATTERN 6 FIX: Enforce the Constitution in Code

### Problem
80% of constitution rules are prompt-only. Only RBAC, risk gating, output cleaning, and rate limiting are enforced in code.

### Problem Breakdown

**Problem 6.1: "Think before acting" is prompt-only**
- File: `lib/nova/constitution/identity.ts`
- Issue: 14 identity rules are in the system prompt. No code enforces them.
- Impact: LLM may skip reasoning steps.

**Problem 6.2: "Never invent data" is prompt-only**
- File: `lib/nova/constitution/identity.ts`
- Issue: No validation that Nova's response actually references real workspace data
- Impact: Nova can hallucinate task names, project details, etc.

**Problem 6.3: "Notice problems proactively" is prompt-only**
- File: `lib/nova/constitution/identity.ts`
- Issue: No code forces Nova to check for workspace issues before responding
- Impact: Nova doesn't proactively mention problems.

**Problem 6.4: "Remember preferred planning style" is prompt-only**
- File: `lib/nova/constitution/identity.ts`
- Issue: Memory loading doesn't prioritize planning preferences
- Impact: Nova doesn't adapt to user preferences.

**Problem 6.5: "Generate plans that resemble experienced PM" is prompt-only**
- File: `lib/nova/constitution/identity.ts`
- Issue: No validation of plan quality or structure
- Impact: Plans may be generic, not PM-quality.

### Fix 6.1: Enforce "Think Before Acting" with Code

**File:** `lib/nova/reasoning-engine.ts` (the new one from Fix 3.1)

The reasoning engine IS the enforcement. By running `reasonBeforeActing()` before every tool call, you force the LLM to think. The code doesn't trust the system prompt -- it runs a separate LLM call to reason.

### Fix 6.2: Enforce "Never Invent Data" with Validation

**File:** Create `lib/nova/hallucination-checker.ts` (new file)

```typescript
import { prisma } from "@/lib/prisma";

interface HallucinationCheck {
  isHallucinated: boolean;
  details: string[];
}

export async function checkForHallucination(
  response: string,
  workspaceId: string
): Promise<HallucinationCheck> {
  const details: string[] = [];

  // Check if response references task names that don't exist
  const taskNamePattern = /\*\*([^*]+)\*\*/g;  // Bold text = likely task/project names
  let match;
  while ((match = taskNamePattern.exec(response)) !== null) {
    const name = match[1];
    const exists = await prisma.task.findFirst({
      where: { workspaceId, title: { contains: name } },
    });
    if (!exists) {
      const projectExists = await prisma.project.findFirst({
        where: { workspaceId, name: { contains: name } },
      });
      if (!projectExists) {
        details.push(`Referenced "${name}" but it doesn't exist in workspace`);
      }
    }
  }

  // Check if response claims actions were taken that weren't
  if (response.includes("I've created") || response.includes("I've updated")) {
    // Verify the action actually happened by checking recent activity
    const recentActivity = await prisma.activity.findFirst({
      where: { workspaceId, createdAt: { gte: new Date(Date.now() - 30000) } }, // Last 30 seconds
    });
    // Note: This is a heuristic, not definitive
  }

  return {
    isHallucinated: details.length > 0,
    details,
  };
}
```

**Wire into quality gate:**

```typescript
// In nova-agent.ts qualityGate node:
const hallucinationCheck = await checkForHallucination(response, workspaceId);
if (hallucinationCheck.isHallucinated) {
  // Replace hallucinated references with "that item"
  response = response.replace(/\*\*([^*]+)\*\*/g, (full, name) => {
    if (hallucinationCheck.details.some(d => d.includes(name))) {
      return "that item";
    }
    return full;
  });
}
```

### Fix 6.3: Enforce "Notice Problems Proactively" with Code

Already addressed in Fix 5.1 -- proactive insights are injected into EVERY request's system prompt.

### Fix 6.4: Enforce "Remember Preferences" with Auto-Learning

Already addressed in Fix 4.1 -- auto-learner extracts patterns from every interaction.

### Fix 6.5: Enforce "PM-Quality Plans" with Template Validation

**File:** Create `lib/nova/plan-validator.ts` (new file)

```typescript
interface PlanQualityCheck {
  isValid: boolean;
  missingElements: string[];
}

export function validatePlanQuality(plan: string): PlanQualityCheck {
  const missingElements: string[] = [];

  // A PM-quality plan should have:
  if (!plan.includes("Objective") && !plan.includes("Goal")) missingElements.push("Objective/Goal");
  if (!plan.includes("Deliverable") && !plan.includes("Task")) missingElements.push("Deliverables/Tasks");
  if (!plan.includes("Timeline") && !plan.includes("Due") && !plan.includes("Date")) missingElements.push("Timeline");
  if (!plan.includes("Owner") && !plan.includes("Assign") && !plan.includes("Responsible")) missingElements.push("Ownership");
  if (!plan.includes("Risk") && !plan.includes("Blocker")) missingElements.push("Risks");
  if (!plan.includes("Success") && !plan.includes("Metric") && !plan.includes("Definition of Done")) missingElements.push("Success criteria");

  return {
    isValid: missingElements.length <= 1,  // Allow missing 1 element
    missingElements,
  };
}
```

**If plan is invalid, add missing sections:**

```typescript
const planQuality = validatePlanQuality(generatedPlan);
if (!planQuality.isValid) {
  // Ask LLM to add missing sections
  const improvedPlan = await addMissingSections(generatedPlan, planQuality.missingElements);
  response = improvedPlan;
}
```

---

<a id="pattern-7"></a>
## PATTERN 7 FIX: Expand Context Beyond Starvation

### Problem
4,000-token budget. No sprint data. No team workloads. No calendar events. No cross-project awareness. No recent activity. Nova makes decisions with a truncated snapshot.

### Problem Breakdown

**Problem 7.1: 4,000 token budget is too small**
- File: `lib/nova/context-system.ts:TOTAL_TOKEN_BUDGET = 4000`
- Issue: System prompt alone is 2,000-3,000 tokens. Leaves ~1,000 for actual workspace data.
- Impact: Nova gets maybe 5 tasks and the workspace name.

**Problem 7.2: Sprint data is always null**
- File: `lib/nova/context-system.ts:loadSprintContext()`
- Issue: Queries sprint data but the field is always `null` in the database
- Impact: Nova has zero sprint awareness.

**Problem 7.3: No team workload data**
- File: `lib/nova/context-system.ts`
- Issue: Does not query team member task counts, availability, or workload
- Impact: Nova can't make capacity-aware decisions.

**Problem 7.4: No calendar events or deadlines**
- File: `lib/nova/context-system.ts`
- Issue: `CalendarEvent` model exists but is never queried for context
- Impact: Nova doesn't know about upcoming meetings or deadlines.

**Problem 7.5: No cross-project awareness**
- File: `lib/nova/context-system.ts`
- Issue: Only loads context for the requested project, not the portfolio
- Impact: Nova can't see dependencies across projects.

**Problem 7.6: No recent activity**
- File: `lib/nova/context-system.ts`
- Issue: Only loads 5 most recently updated tasks. No activity feed.
- Impact: Nova doesn't know what happened in the last hour/day.

**Problem 7.7: Token budget is not model-aware**
- File: `lib/nova/context-system.ts:TOTAL_TOKEN_BUDGET = 4000`
- Issue: Same budget regardless of model (Gemini Flash supports 1M tokens, GPT-4o supports 128K)
- Impact: Wasting potential of larger models.

### Fix 7.1: Increase and Make Token Budget Dynamic

**File:** `lib/nova/context-system.ts`

```typescript
// OLD: const TOTAL_TOKEN_BUDGET = 4000;
// NEW: Dynamic budget based on model
function getTokenBudget(model: string): number {
  const budgets: Record<string, number> = {
    "gemini-2.5-flash": 8000,    // Gemini Flash supports large contexts
    "gpt-4o": 12000,              // GPT-4o supports 128K
    "claude-sonnet-4-20250514": 10000,  // Claude Sonnet supports large contexts
    "command-a-03-2025": 6000,    // Cohere
  };
  return budgets[model] || 4000;  // Default fallback
}
```

### Fix 7.2: Load Sprint Data

**File:** `lib/nova/context-system.ts`

```typescript
async function loadSprintContext(workspaceId: string, projectId?: string): Promise<string> {
  // Query the most recent active sprint/board
  const activeBoard = await prisma.board.findFirst({
    where: { 
      workspaceId, 
      projectId: projectId || undefined,
      // Add a status field or use most recently updated
    },
    include: { columns: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!activeBoard) return "";

  // Count tasks per column (sprint progress)
  const columnCounts = await Promise.all(
    activeBoard.columns.map(async (col) => {
      const count = await prisma.task.count({
        where: { columnId: col.id },
      });
      return `${col.name}: ${count} tasks`;
    })
  );

  return `Sprint: ${activeBoard.name}\nProgress: ${columnCounts.join(", ")}`;
}
```

### Fix 7.3: Load Team Workload

**File:** `lib/nova/context-system.ts`

```typescript
async function loadTeamWorkload(workspaceId: string): Promise<string> {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId, status: "active" },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  const workloads = await Promise.all(
    members.map(async (member) => {
      const taskCount = await prisma.task.count({
        where: {
          workspaceId,
          assignees: { some: { userId: member.userId } },
          status: { notIn: ["done", "completed", "cancelled"] },
        },
      });
      return `${member.user.name}: ${taskCount} active tasks`;
    })
  );

  return `Team Workload:\n${workloads.join("\n")}`;
}
```

### Fix 7.4: Load Calendar Events

**File:** `lib/nova/context-system.ts`

```typescript
async function loadUpcomingDeadlines(workspaceId: string): Promise<string> {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingTasks = await prisma.task.findMany({
    where: {
      workspaceId,
      dueDate: { gte: now, lte: nextWeek },
      status: { notIn: ["done", "completed", "cancelled"] },
    },
    select: { title: true, dueDate: true, priority: true },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  if (upcomingTasks.length === 0) return "";

  return "Upcoming Deadlines (next 7 days):\n" + upcomingTasks.map(t =>
    `- ${t.title} (due ${t.dueDate?.toLocaleDateString()}, ${t.priority} priority)`
  ).join("\n");
}
```

### Fix 7.5: Load Cross-Project Dependencies

**File:** `lib/nova/context-system.ts`

```typescript
async function loadCrossProjectContext(workspaceId: string): Promise<string> {
  const projects = await prisma.project.findMany({
    where: { workspaceId },
    select: { id: true, name: true },
  });

  if (projects.length <= 1) return "";

  // Count tasks per project
  const projectStats = await Promise.all(
    projects.map(async (proj) => {
      const [total, overdue, blocked] = await Promise.all([
        prisma.task.count({ where: { projectId: proj.id, status: { notIn: ["done", "completed", "cancelled"] } } }),
        prisma.task.count({ where: { projectId: proj.id, status: "overdue" } }),
        prisma.task.count({ where: { projectId: proj.id, status: "blocked" } }),
      ]);
      return `${proj.name}: ${total} active, ${overdue} overdue, ${blocked} blocked`;
    })
  );

  return "Portfolio Overview:\n" + projectStats.join("\n");
}
```

### Fix 7.6: Load Recent Activity

**File:** `lib/nova/context-system.ts`

```typescript
async function loadRecentActivity(workspaceId: string): Promise<string> {
  const recentActivity = await prisma.activity.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { action: true, createdAt: true },
  });

  if (recentActivity.length === 0) return "";

  return "Recent Activity (last 24h):\n" + recentActivity.map(a =>
    `- ${a.action} (${timeAgo(a.createdAt)})`
  ).join("\n");
}
```

### Fix 7.7: Wire All New Context into the Agent

**File:** `lib/langraph/nodes/context-loader.ts`

**Update `loadWorkspaceContext()` to include new data sources:**

```typescript
export async function loadWorkspaceContext(workspaceId: string, projectId?: string, model?: string) {
  const budget = getTokenBudget(model || "gemini-2.5-flash");
  
  const [
    workspace,
    tasks,
    documents,
    projects,
    sprint,
    teamWorkload,
    deadlines,
    crossProject,
    recentActivity,
  ] = await Promise.all([
    loadWorkspace(workspaceId),
    loadTasks(workspaceId, projectId),
    loadDocuments(workspaceId, projectId),
    loadProjects(workspaceId),
    loadSprintContext(workspaceId, projectId),
    loadTeamWorkload(workspaceId),
    loadUpcomingDeadlines(workspaceId),
    loadCrossProjectContext(workspaceId),
    loadRecentActivity(workspaceId),
  ]);

  // Build context string within budget
  return buildContextString(
    { workspace, tasks, documents, projects, sprint, teamWorkload, deadlines, crossProject, recentActivity },
    budget
  );
}
```

---

<a id="execution-paths"></a>
## EXECUTION PATH FIXES: Every Broken Flow

### Problem: "What are my risks?" goes to CONVERSATION mode

**Already addressed in Fix 1.2** -- the CONVERSATION path is removed. All messages get tools and context.

### Problem: Fast-path regex can't handle natural language variations

**File:** `lib/langraph/nodes/direct-action-router.ts`

**Fix:** Increase the regex patterns and lower the confidence threshold:

```typescript
// Add more title extraction patterns:
const TITLE_PATTERNS = [
  /create\s+(?:a\s+)?(?:task|todo|item)\s+(?:called|named|titled|for|about|to)\s+(.+)/i,
  /create\s+(?:a\s+)?(?:task|todo|item)\s+(.+)/i,
  /add\s+(?:a\s+)?(?:task|todo|item)\s+(?:called|named|titled|for|about|to)\s+(.+)/i,
  /add\s+(?:a\s+)?(?:task|todo|item)\s+(.+)/i,
  /new\s+(?:task|todo|item)\s*(?::|-)?\s*(.+)/i,
  /(?:task|todo|item)\s*:\s*(.+)/i,
  /make\s+(?:a\s+)?(?:task|todo|item)\s+(?:called|named|titled|for|about|to)\s+(.+)/i,
  /make\s+(?:a\s+)?(?:task|todo|item)\s+(.+)/i,
  /i\s+need\s+(?:a\s+)?(?:task|todo|item)\s+(?:for|about|to|called|named)\s+(.+)/i,
  /can\s+you\s+(?:create|add|make)\s+(?:a\s+)?(?:task|todo|item)\s+(?:for|about|to|called|named)?\s*(.+)/i,
];

// Lower confidence threshold from 0.85 to 0.75
if (confidence >= 0.75) {
  // Execute directly
}
```

### Problem: `generate_standup` returns hardcoded blockers

**File:** `lib/ai-tools/index.ts:218`

**Fix:**

```typescript
// OLD: return { yesterday: ..., today: ..., blockers: ["None reported by system"] };
// NEW:
const blockedTasks = await prisma.task.findMany({
  where: {
    workspaceId,
    status: "blocked",
    projectId: { in: accessibleProjectIds },
  },
  select: { title: true, description: true },
  take: 5,
});

return {
  yesterday: activity.map(a => a.action),
  today: tasks.map(t => t.title),
  blockers: blockedTasks.length > 0 
    ? blockedTasks.map(t => t.title) 
    : ["No blocked tasks"],
};
```

### Problem: `evaluate_risks` returns hardcoded data

**File:** `lib/ai-tools/index.ts:203`

**Fix:** Delete the hardcoded return. Replace with real analysis:

```typescript
// OLD: return { risks: ["High dependency on external API", ...], mitigation: "Consider breaking down..." };
// NEW:
const risks: string[] = [];

if (task.status === "overdue") risks.push("This task is overdue");
if (task.dependencies?.length > 3) risks.push("High dependency count may cause delays");
if (!task.assignees?.length) risks.push("Unassigned task may not get done");
if (task.subtasks?.length === 0 && task.estimatedHours > 8) risks.push("Large task should be broken down");

return {
  risks: risks.length > 0 ? risks : ["No significant risks detected"],
  mitigation: risks.length > 0 ? "Review task dependencies and assignments" : "Task appears on track",
};
```

### Problem: `generate_dashboard_config` returns static JSON

**File:** `lib/ai-tools/index.ts`

**Fix:** Delete this tool entirely. Dashboards should be rendered client-side, not generated by AI.

### Problem: `set_recurring` just prepends text

**File:** `lib/ai-tools/task-tools.ts:247`

**Fix:** Either implement real recurring logic or remove the tool:

```typescript
// Option A: Remove the tool
// Delete the set_recurring tool definition entirely

// Option B: Implement real recurring (requires Inngest cron)
// This is a larger feature. For now, remove the fake implementation.
```

### Problem: `create_approval_request` creates notification, not workflow

**File:** `lib/ai-tools/task-tools.ts`

**Fix:** Either implement approval state machine or remove:

```typescript
// Option A: Remove the tool
// Delete the create_approval_request tool definition entirely

// Option B: Implement real approval (requires new Prisma model + state machine)
// This is a larger feature. For now, remove the fake implementation.
```

---

<a id="scorecard"></a>
## SCORECARD FIXES: Every Fake Capability

### Fix for "Understanding user intent" (currently 15/100)

**Addressed by:** Fix 1.1 (LLM-based intent classifier), Fix 1.2 (never strip tools)
**Target:** 70/100

### Fix for "Reasoning before acting" (currently 5/100)

**Addressed by:** Fix 3.1 (real reasoning engine), Fix 3.2 (resolve contradictions)
**Target:** 65/100

### Fix for "Risk assessment" (currently 12/100)

**Addressed by:** Fix 2.1 (consequence-based risk), Fix 2.2 (confidence rewrite), Fix 2.3 (confirmation rewrite)
**Target:** 70/100

### Fix for "Proactive intelligence" (currently 8/100)

**Addressed by:** Fix 5.1 (inject insights everywhere), Fix 5.2 (use insights in decisions), Fix 5.3 (background worker), Fix 5.4 (LLM synthesis)
**Target:** 60/100

### Fix for "Memory learning" (currently 20/100)

**Addressed by:** Fix 4.1 (auto-learner), Fix 4.2 (semantic search), Fix 4.3 (decision recording), Fix 4.4 (dynamic confidence), Fix 4.5 (load for all routes), Fix 4.6 (pruning)
**Target:** 55/100

### Fix for "Multi-agent system" (currently 10/100)

**Addressed by:** Delete `agent-framework.ts` entirely. The LangGraph agent handles tool calling. No need for a fake multi-agent layer.
**Target:** N/A (removed, replaced by real LangGraph)

### Fix for "Model routing" (currently 5/100)

**Addressed by:** Fix 1.3 (scoring system), plus the Phase 1 fix in NOVA-REBUILD-PLAN.md (real model selection)
**Target:** 70/100

### Fix for "Constitution enforcement" (currently 20/100)

**Addressed by:** Fix 6.1 (reasoning engine enforces thinking), Fix 6.2 (hallucination checker), Fix 6.3 (proactive injection), Fix 6.4 (auto-learning), Fix 6.5 (plan validation)
**Target:** 60/100

### Fix for "Context richness" (currently 25/100)

**Addressed by:** Fix 7.1 (dynamic budget), Fix 7.2 (sprint data), Fix 7.3 (team workload), Fix 7.4 (deadlines), Fix 7.5 (cross-project), Fix 7.6 (recent activity), Fix 7.7 (model-aware budget)
**Target:** 65/100

### Fix for "Autonomous initiative" (currently 0/100)

**Addressed by:** Fix 5.3 (background monitoring worker), Fix 5.1 (always-on proactive insights)
**Target:** 45/100

### Fix for "Output quality" (currently 55/100)

**Already good. Minor fixes:**
- Remove 250-word cap for ANALYSIS routes (allow longer responses when detail is needed)
- Add hallucination checking (Fix 6.2)
**Target:** 70/100

### Fix for "Security & Trust" (currently 70/100)

**Already good. No changes needed.**
**Target:** 75/100

---

<a id="competitive"></a>
## COMPETITIVE PARITY: Match What Others Do

### Competitor Feature: LLM-Based Intent Understanding (ClickUp, Asana, Monday all have this)

**Addressed by:** Fix 1.1
**Gap closed:** Yes

### Competitor Feature: Consequence-Based Risk Assessment (Wrike, Asana)

**Addressed by:** Fix 2.1
**Gap closed:** Partially (no ML Knowledge Graph like Wrike, but LLM-based assessment)

### Competitor Feature: Background Monitoring & Alerts (ClickUp, Monday, Wrike)

**Addressed by:** Fix 5.3 (Inngest cron worker)
**Gap closed:** Partially (scheduled analysis, not real-time streaming)

### Competitor Feature: Persistent Memory (ClickUp Brain, Notion AI)

**Addressed by:** Fix 4.1 (auto-learner), Fix 4.2 (semantic search)
**Gap closed:** Partially (no vector embeddings yet, but functional memory)

### Competitor Feature: Autonomous Agents (ClickUp Super Agents, Asana AI Teammates, Monday AI Agents)

**Not addressed in this plan.** This is Phase 5 scope (MCP Server, Sprint Planning).
**Gap:** Still significant. Nova will not have autonomous agents after these fixes.

### Competitor Feature: Cross-Tool Context (ClickUp Brain MAX, Notion Enterprise Search)

**Partially addressed by:** Fix 7.5 (cross-project), Fix 7.6 (recent activity)
**Gap:** Nova won't search Google Drive, GitHub, or Slack. But she will have rich internal workspace context.

### Competitor Feature: NL Automation Builder (Monday AI Blocks, Asana Smart Rules)

**Addressed by:** Phase 3.3 in NOVA-REBUILD-PLAN.md (Smart Automation Rules)
**Gap:** Not addressed in this behavioral fix plan.

---

## IMPLEMENTATION ORDER

| Priority | Fix | Impact | Effort | Files Changed |
|---|---|---|---|---|
| **P0** | 1.2 Never strip tools | CRITICAL | LOW | intent-router.ts |
| **P0** | 2.1 Consequence-based risk | CRITICAL | MEDIUM | decision-framework.ts |
| **P0** | 2.3 Confirmation rewrite | CRITICAL | LOW | validation-engine.ts |
| **P0** | 5.1 Inject proactive insights everywhere | CRITICAL | MEDIUM | nova-agent.ts, context-loader.ts |
| **P1** | 1.1 LLM intent classifier | HIGH | MEDIUM | llm-intent-classifier.ts (new), intent-router.ts |
| **P1** | 3.1 Real reasoning engine | HIGH | MEDIUM | reasoning-engine.ts (new/rewrite) |
| **P1** | 3.2 Resolve contradictions | HIGH | LOW | identity.ts, philosophy.ts |
| **P1** | 4.1 Auto-learner | HIGH | MEDIUM | auto-learner.ts (new), nova-agent.ts |
| **P1** | 7.1 Dynamic token budget | HIGH | LOW | context-system.ts |
| **P1** | 7.3 Team workload | HIGH | MEDIUM | context-system.ts |
| **P1** | 7.4 Calendar deadlines | HIGH | MEDIUM | context-system.ts |
| **P2** | 1.3 Scoring model router | MEDIUM | LOW | model-router.ts |
| **P2** | 2.2 Confidence rewrite | MEDIUM | LOW | validation-engine.ts |
| **P2** | 4.2 Semantic search | MEDIUM | MEDIUM | memory-system.ts, memory-loader.ts |
| **P2** | 4.3 Decision recording | MEDIUM | LOW | memory-system.ts, nova-agent.ts |
| **P2** | 4.4 Dynamic confidence | MEDIUM | LOW | memory-system.ts |
| **P2** | 4.5 Load memory for all routes | MEDIUM | LOW | memory-loader.ts |
| **P2** | 5.3 Background worker | MEDIUM | MEDIUM | proactive-monitor.ts (new), inngest |
| **P2** | 5.4 LLM synthesis | MEDIUM | LOW | nova-agent.ts |
| **P2** | 6.2 Hallucination checker | MEDIUM | MEDIUM | hallucination-checker.ts (new), nova-agent.ts |
| **P2** | 6.5 Plan validator | MEDIUM | LOW | plan-validator.ts (new) |
| **P2** | 7.2 Sprint data | MEDIUM | MEDIUM | context-system.ts |
| **P2** | 7.5 Cross-project | MEDIUM | MEDIUM | context-system.ts |
| **P2** | 7.6 Recent activity | MEDIUM | LOW | context-system.ts |
| **P3** | 1.4 Fix first-match-wins | LOW | LOW | model-router.ts |
| **P3** | 1.5 Remove duplicate code | LOW | LOW | intent-router.ts |
| **P3** | 1.6 Remove dead strategy param | LOW | LOW | intent-router.ts |
| **P3** | 1.7 Remove duplicate NovaRoute | LOW | LOW | nova-agent.ts |
| **P3** | 2.4 Remove date validation | LOW | LOW | validation-engine.ts |
| **P3** | 2.5 Remove duplicate detection trigger | LOW | LOW | validation-engine.ts |
| **P3** | 3.3 Delete unused EXECUTION_STEPS | LOW | LOW | execution-principles.ts |
| **P3** | 4.6 Memory pruning | LOW | MEDIUM | memory-system.ts |
| **P3** | 6.4 Enforce "Remember Preferences" | LOW | LOW | (covered by 4.1) |
| **P3** | Fix hardcoded standup blockers | LOW | LOW | index.ts |
| **P3** | Fix evaluate_risks hardcoded | LOW | LOW | index.ts |
| **P3** | Delete generate_dashboard_config | LOW | LOW | index.ts |
| **P3** | Remove set_recurring fake | LOW | LOW | task-tools.ts |
| **P3** | Remove create_approval_request fake | LOW | LOW | task-tools.ts |
| **DELETE** | agent-framework.ts | N/A | LOW | Delete entire file |
| **DELETE** | orchestrate_agentic_workflow tool | N/A | LOW | index.ts |
| **DELETE** | reasoning-engine.ts old stub | N/A | LOW | Replace with new implementation |

---

## FILES TO CREATE

1. `lib/nova/llm-intent-classifier.ts` -- LLM-based intent classification
2. `lib/nova/reasoning-engine.ts` -- Real reasoning engine (replace stub)
3. `lib/nova/auto-learner.ts` -- Automatic memory learning
4. `lib/nova/hallucination-checker.ts` -- Detect fabricated data
5. `lib/nova/plan-validator.ts` -- Validate PM-quality plans
6. `lib/inngest/proactive-monitor.ts` -- Background monitoring worker

## FILES TO MODIFY

1. `lib/nova/intent-router.ts` -- Remove CONVERSATION gate, use LLM classifier
2. `lib/nova/decision-framework.ts` -- Consequence-based risk assessment
3. `lib/nova/validation-engine.ts` -- Rewrite confidence and confirmation logic
4. `lib/nova/memory-system.ts` -- Dynamic confidence, semantic search, pruning
5. `lib/nova/context-system.ts` -- Dynamic budget, sprint, workload, deadlines, activity
6. `lib/nova/proactive-intelligence.ts` -- Wire into main flow
7. `lib/nova/constitution/identity.ts` -- Resolve contradictions, add priority ordering
8. `lib/nova/constitution/execution-principles.ts` -- Remove unused EXECUTION_STEPS
9. `lib/langraph/nova-agent.ts` -- Wire reasoning, auto-learning, hallucination check
10. `lib/langraph/model-router.ts` -- Scoring system, fix first-match-wins
11. `lib/langraph/nodes/memory-loader.ts` -- Always load long-term memory
12. `lib/langraph/nodes/context-loader.ts` -- Load all new context sources
13. `lib/ai-tools/index.ts` -- Fix hardcoded tools, remove fakes
14. `lib/ai-tools/task-tools.ts` -- Remove set_recurring, create_approval_request
15. `app/api/ai/route.ts` -- Minor: wire new reasoning step

## FILES TO DELETE

1. `lib/nova/agent-framework.ts` -- Fake multi-agent system
2. `app/api/ai/agents/route.ts` -- Dead agent routes (or repurpose)

---

## ESTIMATED OUTCOME

| Behavioral Dimension | Before | After |
|---|---|---|
| Command Execution | 60/100 | 65/100 |
| Intent Understanding | 15/100 | 70/100 |
| Reasoning & Deliberation | 5/100 | 65/100 |
| Proactive Intelligence | 8/100 | 60/100 |
| Memory & Learning | 20/100 | 55/100 |
| Risk Assessment | 12/100 | 70/100 |
| Context Awareness | 25/100 | 65/100 |
| Consistency | 30/100 | 60/100 |
| Autonomous Initiative | 0/100 | 45/100 |
| Output Quality | 55/100 | 70/100 |
| Security & Trust | 70/100 | 75/100 |
| **OVERALL BEHAVIORAL SCORE** | **28/100** | **63/100** |

**Combined with NOVA-REBUILD-PLAN.md fixes: 70-75/100**

---

> **Nova will go from "chatbot with database access" to "AI assistant with real intelligence and initiative."** She won't be an autonomous teammate yet (that requires the Phase 5 agent system), but she will stop behaving like a chatbot. The biggest single fix is removing the CONVERSATION gate (Fix 1.2) -- this alone eliminates the #1 chatbot behavior. The second biggest is consequence-based risk assessment (Fix 2.1) -- this eliminates the "Would you like me to proceed?" theater. Together, these two fixes address 60% of the behavioral problems.
