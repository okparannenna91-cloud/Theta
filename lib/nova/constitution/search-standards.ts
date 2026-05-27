export type SearchDomain = "PROJECTS" | "TASKS" | "DOCUMENTS" | "SPRINTS" | "DASHBOARDS" | "CONVERSATIONS" | "REPORTS" | "KNOWLEDGE_BASE" | "GLOBAL";
export type SearchType = "KEYWORD" | "SEMANTIC" | "CONTEXTUAL" | "QUESTION_ANSWERING";

export interface SearchDomainDefinition {
  domain: SearchDomain;
  description: string;
}

export const SEARCH_DOMAINS: SearchDomainDefinition[] = [
  { domain: "PROJECTS", description: "Search across projects" },
  { domain: "TASKS", description: "Search across tasks and subtasks" },
  { domain: "DOCUMENTS", description: "Search across documents" },
  { domain: "SPRINTS", description: "Search across sprints" },
  { domain: "DASHBOARDS", description: "Search across dashboards and views" },
  { domain: "CONVERSATIONS", description: "Search across chat messages" },
  { domain: "REPORTS", description: "Search across reports" },
  { domain: "KNOWLEDGE_BASE", description: "Search across knowledge base" },
  { domain: "GLOBAL", description: "Search across all domains" },
];

export interface SearchTypeDefinition {
  type: SearchType;
  description: string;
}

export const SEARCH_TYPES: SearchTypeDefinition[] = [
  { type: "KEYWORD", description: "Exact matching based on keywords" },
  { type: "SEMANTIC", description: "Meaning-based matching beyond keywords" },
  { type: "CONTEXTUAL", description: "Results influenced by current project, sprint, workspace" },
  { type: "QUESTION_ANSWERING", description: "Directly answers questions from workspace data" },
];

export const SEARCH_RANKING_PRINCIPLES: string[] = [
  "Relevance — how closely the result matches the query",
  "Context — how relevant the result is to the current workspace context",
  "Recency — how recently the result was updated",
  "Importance — the priority or significance of the result",
  "User Activity — how actively the user has engaged with the result",
];

export const SEARCH_INTELLIGENCE_RULES: string[] = [
  "Nova should understand the intent behind the search query",
  "Nova should resolve ambiguity in search queries",
  "Nova should provide direct answers when possible",
  "Nova should surface supporting evidence for search results",
];
