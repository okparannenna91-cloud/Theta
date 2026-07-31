import type { ObservationContext, DetectedPattern, InterventionScore, PriorityScore, UrgencyScore, InterventionLevel } from "./types";

const CRITICAL_SEVERITY_WEIGHT = 10;
const HIGH_SEVERITY_WEIGHT = 6;
const MEDIUM_SEVERITY_WEIGHT = 3;
const LOW_SEVERITY_WEIGHT = 1;

export class InterventionScorer {
  static score(context: ObservationContext, patterns: DetectedPattern[]): InterventionScore {
    if (patterns.length === 0) {
      return {
        level: 0,
        importance: 0,
        urgency: 0,
        relevance: 0,
        confidence: 1,
        wouldSpeak: false,
        reasoning: "No patterns detected — no intervention needed.",
        priorityScore: { score: 0, label: "low", reasoning: "No patterns", factors: [] },
        urgencyScore: { score: 0, label: "low", reasoning: "No patterns", factors: [], suggestedActionWindow: "none" },
      };
    }

    const priorityScore = this.calculatePriority(patterns);
    const urgencyScore = this.calculateUrgency(patterns);
    const relevance = this.calculateRelevance(patterns);
    const importance = this.calculateImportance(patterns);
    const confidence = this.calculateConfidence(patterns);

    const level = this.determineLevel(priorityScore.score, urgencyScore.score, importance, relevance, patterns);
    const wouldSpeak = level >= 1;

    const reasons: string[] = [];
    if (level >= 3) reasons.push("Critical situation requiring immediate attention");
    else if (level >= 2) reasons.push("Significant issue — recommendation warranted");
    else if (level >= 1) reasons.push("Minor insight — suggestion appropriate");
    else reasons.push("Insufficient signal — staying silent");

    if (priorityScore.label === "critical") reasons.push(`High priority: ${priorityScore.reasoning}`);
    if (urgencyScore.label === "immediate") reasons.push(`Urgent: ${urgencyScore.reasoning}`);

    return {
      level,
      importance: Math.round(importance * 10) / 10,
      urgency: Math.round(urgencyScore.score * 10) / 10,
      relevance: Math.round(relevance * 10) / 10,
      confidence: Math.round(confidence * 10) / 10,
      wouldSpeak,
      reasoning: reasons.join("; "),
      priorityScore,
      urgencyScore,
    };
  }

  private static calculatePriority(patterns: DetectedPattern[]): PriorityScore {
    const factors: PriorityScore["factors"] = [];
    let weightedScore = 0;
    let totalWeight = 0;

    for (const pattern of patterns) {
      const weight = pattern.confidence;
      const severityWeight = pattern.severity === "critical" ? 10
        : pattern.severity === "high" ? 7
        : pattern.severity === "medium" ? 4
        : 2;
      const score = severityWeight * weight;
      weightedScore += score;
      totalWeight += weight;

      factors.push({
        name: pattern.type,
        contribution: Math.round((score / (patterns.length * 10)) * 100) / 100,
        description: `${pattern.title} (${pattern.severity}, confidence: ${pattern.confidence})`,
      });
    }

    const finalScore = totalWeight > 0 ? Math.min(weightedScore / totalWeight, 10) : 0;

    const label = finalScore >= 8 ? "critical" : finalScore >= 6 ? "high" : finalScore >= 3 ? "medium" : "low";

    return {
      score: Math.round(finalScore * 10) / 10,
      label,
      reasoning: `Average weighted severity: ${finalScore.toFixed(1)}/10 (${label})`,
      factors: factors.slice(0, 5),
    };
  }

  private static calculateUrgency(patterns: DetectedPattern[]): UrgencyScore {
    const factors: UrgencyScore["factors"] = [];
    let maxUrgency = 0;
    let maxTimeFactor = 0;

    for (const pattern of patterns) {
      const baseUrgency = pattern.urgency || 0;
      maxUrgency = Math.max(maxUrgency, baseUrgency);

      const timeFactor = pattern.type === "DEADLINE_RISK" || pattern.type === "SPRINT_OVERLOAD" ? 1
        : pattern.type === "BLOCKED_TASKS" || pattern.type === "MISSING_DEPENDENCIES" ? 0.8
        : pattern.type === "WORKLOAD_COLLAPSE" || pattern.type === "SOLO_FOUNDER_RISK" ? 0.7
        : pattern.type === "STALLED_PROGRESS" || pattern.type === "FORGOTTEN_WORK" ? 0.5
        : 0.3;

      maxTimeFactor = Math.max(maxTimeFactor, timeFactor);

      const urgency = pattern.urgency * timeFactor;
      factors.push({
        name: pattern.type,
        contribution: urgency,
        description: `${pattern.title} — time sensitivity: ${(timeFactor * 100).toFixed(0)}%`,
      });
    }

    const finalScore = maxUrgency * maxTimeFactor;

    const label = finalScore >= 0.8 ? "immediate"
      : finalScore >= 0.6 ? "soon"
      : finalScore >= 0.4 ? "this_week"
      : finalScore >= 0.2 ? "this_month"
      : "low";

    const window = label === "immediate" ? "within 24 hours"
      : label === "soon" ? "within 3 days"
      : label === "this_week" ? "within 7 days"
      : label === "this_month" ? "within 30 days"
      : "no rush";

    return {
      score: Math.round(finalScore * 10) / 10,
      label,
      reasoning: `Max urgency: ${(maxUrgency * 100).toFixed(0)}%, time factor: ${(maxTimeFactor * 100).toFixed(0)}% — ${label}`,
      factors: factors.slice(0, 5),
      suggestedActionWindow: window,
    };
  }

  private static calculateRelevance(patterns: DetectedPattern[]): number {
    return Math.max(...patterns.map((p) => p.confidence), 0.5);
  }

  private static calculateImportance(patterns: DetectedPattern[]): number {
    let totalImportance = 0;
    for (const pattern of patterns) {
      const severityWeight = pattern.severity === "critical" ? CRITICAL_SEVERITY_WEIGHT
        : pattern.severity === "high" ? HIGH_SEVERITY_WEIGHT
        : pattern.severity === "medium" ? MEDIUM_SEVERITY_WEIGHT
        : LOW_SEVERITY_WEIGHT;
      totalImportance += severityWeight * pattern.confidence;
    }
    return Math.min(totalImportance / patterns.length, 10);
  }

  private static calculateConfidence(patterns: DetectedPattern[]): number {
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const lowSeverityDeduction = patterns.filter((p) => p.severity === "low").length * 0.05;
    return Math.max(0.1, Math.min(1, avgConfidence - lowSeverityDeduction));
  }

  private static determineLevel(
    priority: number,
    urgencyScore: number,
    importance: number,
    relevance: number,
    patterns: DetectedPattern[]
  ): InterventionLevel {
    const hasCritical = patterns.some((p) => p.severity === "critical");
    const hasHigh = patterns.some((p) => p.severity === "high");
    const highConfidence = patterns.every((p) => p.confidence > 0.8);

    if (hasCritical && (priority >= 8 || urgencyScore > 0.7) && highConfidence) {
      return 3;
    }

    if (hasCritical && priority >= 6) {
      return 2;
    }

    if (hasHigh && priority > 6 && importance > 5 && urgencyScore > 0.5) {
      return 2;
    }

    if (patterns.length > 0 && relevance > 0.6) {
      return 1;
    }

    return 0;
  }
}
