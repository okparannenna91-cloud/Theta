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

    // Check for duplicates
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
      // Validate title
      const title = params.title as string;
      if (!title || title.trim().length === 0) {
        results.push({
          status: "invalid",
          field: "title",
          message: "Title is required for creation actions",
          severity: "high",
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
   * Validate dates
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

    const now = new Date();
    if (date < now) {
      return {
        status: "warning",
        field: "dueDate",
        message: "The due date is in the past. Would you like to set a future date?",
        severity: "medium",
      };
    }

    return null;
  }

  /**
   * Calculate confidence score
   */
  private static calculateConfidence(
    results: ValidationResult[],
    params: Record<string, unknown>,
    context: ValidationContext
  ): number {
    let confidence = 0.5;

    // Increase confidence for explicit parameters
    if (params.title) confidence += 0.1;
    if (params.priority) confidence += 0.05;
    if (params.dueDate) confidence += 0.05;
    if (params.assignee) confidence += 0.05;

    // Decrease confidence for warnings
    const warningCount = results.filter(r => r.status === "warning").length;
    confidence -= warningCount * 0.1;

    // Decrease confidence for errors
    const errorCount = results.filter(r => r.status === "invalid").length;
    confidence -= errorCount * 0.2;

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Determine if confirmation is required
   */
  private static requiresConfirmation(
    actionType: string,
    confidence: number,
    warnings: string[]
  ): boolean {
    // Always require confirmation for delete actions
    if (actionType === "delete") return true;

    // Require confirmation for low confidence
    if (confidence < 0.5) return true;

    // Require confirmation if there are warnings
    if (warnings.length > 0) return true;

    return false;
  }

  /**
   * Generate user-friendly validation message
   */
  public static generateValidationMessage(validation: ActionValidation): string {
    if (validation.isValid && validation.warnings.length === 0) {
      return "All validations passed. Ready to execute.";
    }

    const parts: string[] = [];

    if (validation.errors.length > 0) {
      parts.push(`**Errors:**\n${validation.errors.map(e => `- ${e}`).join("\n")}`);
    }

    if (validation.warnings.length > 0) {
      parts.push(`**Warnings:**\n${validation.warnings.map(w => `- ${w}`).join("\n")}`);
    }

    if (validation.requiresConfirmation) {
      parts.push("Would you like me to proceed?");
    }

    return parts.join("\n\n");
  }
}
