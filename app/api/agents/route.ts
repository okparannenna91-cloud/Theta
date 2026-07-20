import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

    const agents = await prisma.novaAgent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(agents);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspaceId, name, type, config } = await req.json();
    if (!workspaceId || !name) {
      return NextResponse.json({ error: "workspaceId and name required" }, { status: 400 });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: user.id, role: { in: ["owner", "admin"] } },
    });
    if (!membership) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const agent = await prisma.novaAgent.create({
      data: { workspaceId, name, type: type || "background", config },
    });

    return NextResponse.json(agent);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, status, config } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const agent = await prisma.novaAgent.update({
      where: { id },
      data: { ...(status && { status }), ...(config && { config }) },
    });

    return NextResponse.json(agent);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
