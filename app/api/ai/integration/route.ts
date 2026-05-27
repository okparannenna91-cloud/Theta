import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  IntegrationRulesEngine,
  INTEGRATION_EVALUATION_QUESTIONS,
  INFRASTRUCTURE_DISCIPLINE_RULES,
} from "@/lib/nova/integration-rules";
import { SERVICE_REGISTRY, type ServiceCategory } from "@/lib/nova/config";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      approvedInfrastructure: IntegrationRulesEngine.getApprovedInfrastructure(),
      evaluationQuestions: INTEGRATION_EVALUATION_QUESTIONS,
      disciplineRules: INFRASTRUCTURE_DISCIPLINE_RULES,
      totalServices: SERVICE_REGISTRY.length,
    });
  } catch (error: any) {
    console.error("[Integration API] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { serviceName, category, purpose } = body;

    if (!serviceName || !category || !purpose) {
      return NextResponse.json({
        error: "serviceName, category, and purpose are required",
      }, { status: 400 });
    }

    const validCategories: ServiceCategory[] = [
      "database", "auth", "realtime", "memory", "cache",
      "ai", "storage", "email", "payments", "queue",
    ];

    if (!validCategories.includes(category as ServiceCategory)) {
      return NextResponse.json({
        error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
      }, { status: 400 });
    }

    const result = IntegrationRulesEngine.evaluateIntegration(
      serviceName,
      category as ServiceCategory,
      purpose
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Integration API] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
