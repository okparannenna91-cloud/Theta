import { DOCUMENT_TYPES, DOCUMENT_UNDERSTANDING_PIPELINE, DOCUMENT_ACTIONS, DOCUMENT_WORKSPACE_LINK_TYPES, type DocumentType } from "./constitution/document-standards";

export { DOCUMENT_TYPES, DOCUMENT_UNDERSTANDING_PIPELINE, DOCUMENT_ACTIONS, DOCUMENT_WORKSPACE_LINK_TYPES, type DocumentType } from "./constitution/document-standards";

export interface ActionableDocumentDetails {
  documentType: DocumentType;
  summary: string;
  decisions: string[];
  extractedTasks: string[];
  requirements: string[];
  risks: string[];
  suggestedLinks: string[];
  suggestedProjects: string[];
}

export class DocumentIntelligence {
  public static analyze(title: string, content: string): ActionableDocumentDetails {
    const combinedText = `${title}\n${content}`.toLowerCase();

    let documentType: DocumentType = "GENERAL";
    if (combinedText.includes("prd") || combinedText.includes("requirements") || combinedText.includes("product requirement")) {
      documentType = "PRD";
    } else if (combinedText.includes("technical spec") || combinedText.includes("architecture") || combinedText.includes("design specification")) {
      documentType = "TECHNICAL_SPEC";
    } else if (combinedText.includes("meeting notes") || combinedText.includes("sync notes") || combinedText.includes("minutes")) {
      documentType = "MEETING_NOTES";
    } else if (combinedText.includes("sop") || combinedText.includes("standard operating") || combinedText.includes("procedure")) {
      documentType = "SOP";
    } else if (combinedText.includes("retro") || combinedText.includes("post-mortem") || combinedText.includes("lessons learned")) {
      documentType = "RETROSPECTIVE";
    }

    const decisions: string[] = [];
    const extractedTasks: string[] = [];
    const requirements: string[] = [];
    const risks: string[] = [];
    const suggestedLinks: string[] = [];
    const suggestedProjects: string[] = [];

    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      const lower = trimmed.toLowerCase();

      if (lower.includes("decision:") || lower.includes("agreed:") || lower.includes("we decided")) {
        decisions.push(trimmed.replace(/^(decision:|agreed:|we decided)/i, "").trim());
      }

      if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]")) {
        extractedTasks.push(trimmed.replace(/^-\s*\[[ x]\]/i, "").trim());
      } else if (lower.includes("todo:") || lower.includes("action item:") || lower.includes("action:")) {
        extractedTasks.push(trimmed.replace(/^(todo:|action item:|action:)/i, "").trim());
      }

      if (lower.includes("requirement:") || lower.includes("must have") || lower.includes("need:")) {
        requirements.push(trimmed.replace(/^(requirement:|need:)/i, "").trim());
      }

      if (lower.includes("risk:") || lower.includes("concern:") || lower.includes("blocker:")) {
        risks.push(trimmed.replace(/^(risk:|concern:|blocker:)/i, "").trim());
      }

      if (trimmed.includes("#") || trimmed.includes("@")) {
        const matches = trimmed.match(/[#@]\w+/g);
        if (matches) matches.forEach(m => suggestedLinks.push(m));
      }

      if (lower.includes("project:") || trimmed.match(/^#\s*project/i)) {
        suggestedProjects.push(trimmed.replace(/^(project:|#\s*project)/i, "").trim());
      }
    }

    const wordCount = content.split(/\s+/).length;
    const summary = wordCount > 50
      ? `${content.split(/\s+/).slice(0, 50).join(" ")}...`
      : content;

    return {
      documentType,
      summary,
      decisions: [...new Set(decisions)],
      extractedTasks: [...new Set(extractedTasks)],
      requirements: [...new Set(requirements)],
      risks: [...new Set(risks)],
      suggestedLinks: [...new Set(suggestedLinks)],
      suggestedProjects: [...new Set(suggestedProjects)],
    };
  }

  public static classifyDocumentType(title: string, content: string): DocumentType {
    return this.analyze(title, content).documentType;
  }
}
