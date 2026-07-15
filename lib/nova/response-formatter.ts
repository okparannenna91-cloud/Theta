import { logger } from "@/lib/logger";

export type ResponseFormat = "action" | "plan" | "analysis" | "conversation" | "error" | "confirmation";

export interface FormattedResponse {
  content: string;
  format: ResponseFormat;
  metadata: {
    hasActionSummary: boolean;
    hasConfidenceIndicator: boolean;
    hasProactiveInsights: boolean;
    hasFollowUpSuggestions: boolean;
    wordCount: number;
    estimatedReadTime: string;
  };
}

export interface PlanFormatting {
  objective: string;
  milestones: string[];
  tasks: string[];
  risks: string[];
  timeline: string;
  successMetrics: string[];
}

export class ResponseFormatter {
  /**
   * Format a response based on type and context
   */
  public static format(
    content: string,
    format: ResponseFormat,
    options?: {
      includeConfidence?: boolean;
      confidence?: string;
      includeProactive?: boolean;
      proactiveInsights?: string;
      includeFollowUp?: boolean;
      followUpSuggestions?: string[];
      workspaceName?: string;
      projectName?: string;
    }
  ): FormattedResponse {
    let formattedContent = content;

    // Apply format-specific formatting
    switch (format) {
      case "action":
        formattedContent = this.formatActionResponse(content, options);
        break;
      case "plan":
        formattedContent = this.formatPlanResponse(content, options);
        break;
      case "analysis":
        formattedContent = this.formatAnalysisResponse(content, options);
        break;
      case "conversation":
        formattedContent = this.formatConversationResponse(content);
        break;
      case "error":
        formattedContent = this.formatErrorResponse(content);
        break;
      case "confirmation":
        formattedContent = this.formatConfirmationResponse(content);
        break;
    }

    // Add confidence indicator
    if (options?.includeConfidence && options.confidence) {
      formattedContent = this.addConfidenceIndicator(formattedContent, options.confidence);
    }

    // Add proactive insights
    if (options?.includeProactive && options.proactiveInsights) {
      formattedContent = this.addProactiveInsights(formattedContent, options.proactiveInsights);
    }

    // Add follow-up suggestions
    if (options?.includeFollowUp && options.followUpSuggestions) {
      formattedContent = this.addFollowUpSuggestions(formattedContent, options.followUpSuggestions);
    }

    // Calculate metadata
    const wordCount = formattedContent.split(/\s+/).length;
    const estimatedReadTime = this.calculateReadTime(wordCount);

    return {
      content: formattedContent,
      format,
      metadata: {
        hasActionSummary: formattedContent.includes("**DONE:**") || formattedContent.includes("**STATUS:**"),
        hasConfidenceIndicator: formattedContent.includes("*Confidence:"),
        hasProactiveInsights: formattedContent.includes("**Proactive Insights:**"),
        hasFollowUpSuggestions: formattedContent.includes("**Next Steps:**"),
        wordCount,
        estimatedReadTime,
      },
    };
  }

  /**
   * Format action response (create, update, delete)
   */
  private static formatActionResponse(content: string, options?: Record<string, unknown>): string {
    let formatted = content;

    // Ensure action summary exists
    if (!formatted.includes("**DONE:**") && !formatted.includes("**STATUS:**")) {
      // Check if this is a success response
      const successIndicators = ["created", "updated", "deleted", "completed", "saved"];
      const isSuccess = successIndicators.some(indicator =>
        formatted.toLowerCase().includes(indicator)
      );

      if (isSuccess) {
        formatted = `**DONE:** ${formatted}`;
      }
    }

    // Add context references if available
    if (options?.projectName) {
      formatted = formatted.replace(
        /^(I've|The|This)/,
        `In **${options.projectName}**, $1`
      );
    }

    return formatted;
  }

  /**
   * Format plan response
   */
  private static formatPlanResponse(content: string, options?: Record<string, unknown>): string {
    // Plans should be well-structured with clear sections
    let formatted = content;

    // Ensure plan has clear structure
    if (!formatted.includes("**Objective:**") && !formatted.includes("**Goal:**")) {
      formatted = `**Objective:** ${formatted}`;
    }

    return formatted;
  }

  /**
   * Format analysis response
   */
  private static formatAnalysisResponse(content: string, options?: Record<string, unknown>): string {
    // Analysis should lead with key insight
    let formatted = content;

    // Ensure analysis has evidence
    if (!formatted.includes("**Key Finding:**") && !formatted.includes("**Insight:**")) {
      // Try to extract first line as key finding
      const lines = formatted.split("\n");
      if (lines.length > 1) {
        const firstLine = lines[0];
        if (!firstLine.startsWith("**")) {
          formatted = `**Key Finding:** ${firstLine}\n\n${lines.slice(1).join("\n")}`;
        }
      }
    }

    return formatted;
  }

  /**
   * Format conversation response
   */
  private static formatConversationResponse(content: string): string {
    // Conversation responses should be natural and concise
    return content.trim();
  }

  /**
   * Format error response
   */
  private static formatErrorResponse(content: string): string {
    // Error responses should be clear and actionable
    let formatted = content;

    if (!formatted.includes("**Error:**") && !formatted.includes("**Issue:**")) {
      formatted = `**Error:** ${formatted}`;
    }

    // Add suggestion if not present
    if (!formatted.includes("**Suggestion:**") && !formatted.includes("**Next Steps:**")) {
      formatted += "\n\n**Suggestion:** Please try again or contact support if the issue persists.";
    }

    return formatted;
  }

  /**
   * Format confirmation response
   */
  private static formatConfirmationResponse(content: string): string {
    // Confirmation responses should be clear about what will happen
    let formatted = content;

    if (!formatted.includes("**Confirm:**") && !formatted.includes("**Ready to:**")) {
      formatted = `**Confirm:** ${formatted}`;
    }

    return formatted;
  }

  /**
   * Add confidence indicator
   */
  private static addConfidenceIndicator(content: string, confidence: string): string {
    const confidenceEmoji = {
      HIGH: "🟢",
      MEDIUM: "🟡",
      LOW: "🔴",
    }[confidence] || "⚪";

    return `${content}\n\n*${confidenceEmoji} Confidence: ${confidence}*`;
  }

  /**
   * Add proactive insights
   */
  private static addProactiveInsights(content: string, insights: string): string {
    return `${content}\n\n---\n\n${insights}`;
  }

  /**
   * Add follow-up suggestions
   */
  private static addFollowUpSuggestions(content: string, suggestions: string[]): string {
    if (suggestions.length === 0) return content;

    const suggestionsText = suggestions.map(s => `- ${s}`).join("\n");
    return `${content}\n\n**Next Steps:**\n${suggestionsText}`;
  }

  /**
   * Calculate estimated read time
   */
  private static calculateReadTime(wordCount: number): string {
    const wordsPerMinute = 200;
    const minutes = Math.ceil(wordCount / wordsPerMinute);

    if (minutes < 1) return "Less than 1 minute";
    if (minutes === 1) return "1 minute";
    return `${minutes} minutes`;
  }

  /**
   * Format plan for display
   */
  public static formatPlan(plan: PlanFormatting): string {
    const lines: string[] = [];

    lines.push(`**Objective:** ${plan.objective}`);
    lines.push("");

    if (plan.milestones.length > 0) {
      lines.push("**Milestones:**");
      plan.milestones.forEach((milestone, i) => {
        lines.push(`${i + 1}. ${milestone}`);
      });
      lines.push("");
    }

    if (plan.tasks.length > 0) {
      lines.push("**Key Tasks:**");
      plan.tasks.forEach(task => {
        lines.push(`- ${task}`);
      });
      lines.push("");
    }

    if (plan.risks.length > 0) {
      lines.push("**Risks:**");
      plan.risks.forEach(risk => {
        lines.push(`- ${risk}`);
      });
      lines.push("");
    }

    if (plan.timeline) {
      lines.push(`**Timeline:** ${plan.timeline}`);
      lines.push("");
    }

    if (plan.successMetrics.length > 0) {
      lines.push("**Success Metrics:**");
      plan.successMetrics.forEach(metric => {
        lines.push(`- ${metric}`);
      });
    }

    return lines.join("\n");
  }

  /**
   * Format workspace overview for display
   */
  public static formatWorkspaceOverview(overview: string): string {
    // Ensure overview is well-formatted
    return overview
      .replace(/\[WORKSPACE OVERVIEW\]/, "**Workspace Overview**")
      .replace(/Projects \(\d+\):/, "**Projects:**")
      .replace(/Tasks:/, "**Tasks:**")
      .replace(/Team members:/, "**Team:**")
      .replace(/Recent activity:/, "**Recent Activity:**");
  }

  /**
   * Format proactive insights for display
   */
  public static formatProactiveInsights(insights: Array<{
    type: string;
    severity: string;
    message: string;
    affectedItems: string[];
  }>): string {
    if (insights.length === 0) {
      return "Everything looks good! No proactive insights to report.";
    }

    const lines: string[] = [];
    lines.push("**Proactive Insights:**");
    lines.push("");

    insights.forEach(insight => {
      const severityEmoji = {
        critical: "🔴",
        high: "🟠",
        medium: "🟡",
        low: "🟢",
      }[insight.severity] || "⚪";

      lines.push(`${severityEmoji} **${insight.type.replace(/_/g, " ")}:** ${insight.message}`);
      if (insight.affectedItems.length > 0) {
        lines.push(`   Affects: ${insight.affectedItems.slice(0, 3).join(", ")}${insight.affectedItems.length > 3 ? "..." : ""}`);
      }
      lines.push("");
    });

    return lines.join("\n");
  }
}
