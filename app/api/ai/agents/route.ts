import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { AgentFramework } from "@/lib/nova/agent-framework";
import { AGENT_REGISTRY } from "@/lib/nova/config";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    if (agentId) {
      const agent = AgentFramework.getAgent(agentId);
      if (!agent) {
        return NextResponse.json({ error: `Agent "${agentId}" not found` }, { status: 404 });
      }
      return NextResponse.json({ data: agent });
    }

    return NextResponse.json({
      total: AGENT_REGISTRY.length,
      agents: AGENT_REGISTRY,
      collaborationRules: AgentFramework.getCollaborationRules(),
    });
  } catch (error: any) {
    logger.error("[Agent API] GET error:", error);
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
    const { workspaceId, request } = body;

    if (!workspaceId || !request) {
      return NextResponse.json({ error: "workspaceId and request are required" }, { status: 400 });
    }

    const plans = await AgentFramework.planExecution(request);

    return NextResponse.json({
      success: true,
      plans,
      totalAgents: plans.length,
      message: `Dispatched to ${plans.length} agent(s)`,
    });
  } catch (error: any) {
    logger.error("[Agent API] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
