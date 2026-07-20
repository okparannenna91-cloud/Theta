import { logger } from "@/lib/logger";

export type ValidationStatus = "valid" | "warning" | "invalid";

export interface ValidationResult {
  status: ValidationStatus;
  field: string;
  message: string;
  severity: "low" | "medium" | "high";
}

export interface ActionValidation {
  isValid: boolean;
  results: ValidationResult[];
  confidence: number;
  requiresConfirmation: boolean;
  warnings: string[];
  errors: string[];
}

export interface ValidationContext {
  workspaceId: string;
  userId: string;
  userRole: string;
  existingTaskTitles: string[];
  existingProjectNames: string[];
  teamMembers: string[];
}

export class ValidationEngine {
  /**
   * Validate a complete action before execution
   */
  public static validateAction(
    actionType: string,
    params: Record<string, unknown>,
    context: ValidationContext
  ): ActionValidation {
    const results: ValidationResult[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate permissions
    const permissionResult = this.validatePermissions(actionType, context);
    results.push(permissionResult);
    if (permissionResult.status === "invalid") errors.push(permissionResult.message);

    // Validate parameters
    const paramResults = this.validateParameters(actionType, params);
    results.push(...paramResults);
    paramResults.forEach(r => {
      if (r.status === "invalid") errors.push(r.message);
      if (r.status === "warning") warnings.push(r.message);
    });

    // Check for duplicates — only flag exact matches, not similar ones
    const duplicateResult = this.checkDuplicates(actionType, params, context);
    if (duplicateResult) {
      results.push(duplicateResult);
      if (duplicateResult.status === "warning") warnings.push(duplicateResult.message);
    }

    // Validate dates
    const dateResult = this.validateDates(params);
    if (dateResult) {
      results.push(dateResult);
      if (dateResult.status === "warning") warnings.push(dateResult.message);
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(results, params, context);

    // Determine if confirmation is required
    const requiresConfirmation = this.requiresConfirmation(actionType, confidence, warnings);

    const isValid = errors.length === 0;

    logger.info("[NovaPrime-Validation] Validated action", {
      actionType,
      isValid,
      confidence,
      requiresConfirmation,
      warningCount: warnings.length,
      errorCount: errors.length,
    });

    return {
      isValid,
      results,
      confidence,
      requiresConfirmation,
      warnings,
      errors,
    };
  }

  /**
   * Validate user permissions for action
   */
  private static validatePermissions(actionType: string, context: ValidationContext): ValidationResult {
    const writeActions = ["create", "update", "delete", "automate", "import", "export"];

    if (writeActions.includes(actionType)) {
      if (context.userRole === "viewer") {
        return {
          status: "invalid",
          field: "permissions",
          message: "You don't have permission to perform this action. Your role is Viewer.",
          severity: "high",
        };
      }
    }

    if (actionType === "delete") {
      if (context.userRole !== "admin" && context.userRole !== "owner") {
        return {
          status: "warning",
          field: "permissions",
          message: "Delete actions typically require admin privileges. Proceeding with current permissions.",
          severity: "medium",
        };
      }
    }

    return {
      status: "valid",
      field: "permissions",
      message: "Permission validated",
      severity: "low",
    };
  }

  /**
   * Validate action parameters
   */
  private static validateParameters(actionType: string, params: Record<string, unknown>): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (actionType === "create") {
      // Validate title/name — required for task, project, document creation
      const title = (params.title || params.name) as string;
      if (!title || title.trim().length === 0) {
        results.push({
          status: "warning",
          field: "title",
          message: "No title or name was detected. Please provide one if needed.",
          severity: "medium",
        });
      } else if (title.length > 200) {
        results.push({
          status: "invalid",
          field: "title",
          message: "Title must be 200 characters or less",
          severity: "medium",
        });
      }

      // Validate priority
      const priority = params.priority as string;
      if (priority && !["high", "medium", "low"].includes(priority)) {
        results.push({
          status: "invalid",
          field: "priority",
          message: "Priority must be high, medium, or low",
          severity: "medium",
        });
      }
    }

    return results;
  }

  /**
   * Check for duplicate items
   */
  private static checkDuplicates(
    actionType: string,
    params: Record<string, unknown>,
    context: ValidationContext
  ): ValidationResult | null {
    if (actionType !== "create") return null;

    const title = params.title as string;
    if (!title) return null;

    // Check for duplicate tasks
    if (context.existingTaskTitles.some(t => t.toLowerCase() === title.toLowerCase())) {
      return {
        status: "warning",
        field: "duplicate",
        message: `A task named "${title}" already exists. Would you like to create another one or update the existing task?`,
        severity: "medium",
      };
    }

    // Check for duplicate projects
    if (context.existingProjectNames.some(p => p.toLowerCase() === title.toLowerCase())) {
      return {
        status: "warning",
        field: "duplicate",
        message: `A project named "${title}" already exists. Would you like to create another one or update the existing project?`,
        severity: "medium",
      };
    }

    return null;
  }

  /**
   * Validate dates — only check for parseable format, not past/future
   */
  private static validateDates(params: Record<string, unknown>): ValidationResult | null {
    const dueDate = params.dueDate as string;
    if (!dueDate) return null;

    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      return {
        status: "warning",
        field: "dueDate",
        message: "The date format couldn't be parsed. Please use a format like '2024-12-31' or 'next Friday'.",
        severity: "low",
      };
    }

    return null;
  }

  /**
   * Calculate confidence score based on context quality and missing info.
   * Start high and only drop for real problems.
   */
  private static calculateConfidence(
    results: ValidationResult[],
    params: Record<string, unknown>,
    context: ValidationContext
  ): number {
    let confidence = 0.9; // Start optimistic

    // Errors are real problems
    const errorCount = results.filter(r => r.status === "invalid").length;
    confidence -= errorCount * 0.3;

    // Warnings are minor concerns, not blockers
    const warningCount = results.filter(r => r.status === "warning").length;
    confidence -= warningCount * 0.05;

    // Missing title is a real problem for creation
    const hasTitle = params.title || params.name;
    if (!hasTitle) confidence -= 0.4;

    // Floor at 0.1
    return Math.max(0.1, Math.min(1, confidence));
  }

  /**
   * Determine if confirmation is required.
   * Only confirm for genuinely ambiguous or destructive operations.
   * Default to execution, not confirmation.
   */
  private static requiresConfirmation(
    actionType: string,
    confidence: number,
    warnings: string[]
  ): boolean {
    // Only confirm for bulk/project delete (high risk)
    // Single item delete: execute immediately
    if (actionType === "delete") {
      // Check if this is a bulk delete by looking for keywords
      // For now, only confirm if confidence is very low (indicating ambiguity)
      return confidence < 0.3;
    }

    // Only confirm when confidence is VERY low — something is genuinely wrong
    if (confidence < 0.3) return true;

    // Everything else: execute immediately
    return false;
  }

  /**
   * Generate user-friendly validation message
   * Focus on consequences, not formatting
   */
  public static generateValidationMessage(validation: ActionValidation): string {
    if (validation.isValid && validation.warnings.length === 0) {
      return "All validations passed. Ready to execute.";
    }

    const parts: string[] = [];

    if (validation.errors.length > 0) {
      parts.push(`**Errors:**\n${validation.errors.map(e => `- ${e}`).join("\n")}`);
    }

    if (validation.warnings.length > 0 && validation.requiresConfirmation) {
      // Only show warnings when we actually need confirmation
      parts.push(`**Please confirm:**\n${validation.warnings.map(w => `- ${w}`).join("\n")}`);
    }

    return parts.join("\n\n");
  }
}
