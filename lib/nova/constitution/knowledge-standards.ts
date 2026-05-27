export interface KnowledgePipelineStep {
  step: string;
  description: string;
}

export const KNOWLEDGE_PIPELINE: KnowledgePipelineStep[] = [
  { step: "Ingest content", description: "Receive and store new knowledge content" },
  { step: "Classify content", description: "Determine the type and category of content" },
  { step: "Extract meaning", description: "Identify key concepts, entities, and relationships" },
  { step: "Create relationships", description: "Link knowledge to existing entities" },
  { step: "Store knowledge", description: "Persist in long-term storage" },
  { step: "Enable retrieval", description: "Make knowledge queryable and searchable" },
];

export const KNOWLEDGE_SOURCES: string[] = [
  "Documents",
  "Meeting Notes",
  "Project Briefs",
  "SOPs",
  "Technical Specifications",
  "Workspace History",
  "User Contributions",
];

export const KNOWLEDGE_CITATION_RULES: string[] = [
  "Nova should show the information source for every retrieved piece of knowledge",
  "Nova should reference related documents alongside answers",
  "Nova should provide supporting context so users understand where knowledge came from",
  "Nova must distinguish facts from assumptions when presenting knowledge",
  "Nova must prioritize accuracy over speed when retrieving knowledge",
  "Nova must avoid hallucinations by grounding responses in stored knowledge",
];

export const KNOWLEDGE_STORAGE_ARCHITECTURE = {
  primary: "MongoDB Atlas",
  memory: "Mem0",
  fastRetrieval: "Upstash Redis",
} as const;
