import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { KnowledgeIntelligence, KNOWLEDGE_PIPELINE, KNOWLEDGE_CITATION_RULES, KNOWLEDGE_STORAGE_ARCHITECTURE } from "@/lib/nova/knowledge-intelligence";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const query = searchParams.get("q");

    if (query && workspaceId) {
      const results = await KnowledgeIntelligence.search(query, {
        workspaceId,
        limit: Number(searchParams.get("limit")) || 20,
      });
      return NextResponse.json({ results, total: results.length });
    }

    return NextResponse.json({
      pipeline: KnowledgeIntelligence.getPipeline(),
      citationRules: KnowledgeIntelligence.getCitationRules(),
      architecture: KnowledgeIntelligence.getArchitecture(),
    });
  } catch (error: any) {
    console.error("[Knowledge API] GET error:", error);
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
    const { workspaceId, content, title, tags, source } = body;

    if (!workspaceId || !content || !title) {
      return NextResponse.json({ error: "workspaceId, content, and title are required" }, { status: 400 });
    }

    await KnowledgeIntelligence.ingest(content, {
      workspaceId,
      userId: user.id,
      title,
      tags: tags || [],
      source: source || "api",
    });

    return NextResponse.json({ success: true, message: "Knowledge ingested successfully" });
  } catch (error: any) {
    console.error("[Knowledge API] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId, sourceId, targetIds, relation } = body;

    if (!workspaceId || !sourceId || !targetIds || !relation) {
      return NextResponse.json({ error: "workspaceId, sourceId, targetIds, and relation are required" }, { status: 400 });
    }

    await KnowledgeIntelligence.linkEntities(workspaceId, sourceId, targetIds, relation);

    return NextResponse.json({ success: true, message: `Linked ${targetIds.length} entities with relation "${relation}"` });
  } catch (error: any) {
    console.error("[Knowledge API] PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
