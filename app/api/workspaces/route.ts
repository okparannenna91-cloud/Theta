import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserWorkspaces, createWorkspace } from "@/lib/workspace";
import { canCreateWorkspace, getPlanLimitMessage } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspaces = await getUserWorkspaces(user.id);

        return NextResponse.json(workspaces);
    } catch (error) {
        console.error("Get workspaces error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, plan } = await req.json();
        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        // Count user's owned free-plan workspaces (not all memberships)
        // Split into two queries to avoid Prisma MongoDB relation filter issues in count()
        const ownedMemberships = await prisma.workspaceMember.findMany({
            where: { userId: user.id, role: "owner" },
            select: { workspaceId: true },
        });
        const ownedWorkspaceIds = ownedMemberships.map(m => m.workspaceId);
        const freeWorkspaceCount = ownedWorkspaceIds.length > 0
            ? await prisma.workspace.count({
                where: { id: { in: ownedWorkspaceIds }, plan: "free" },
              })
            : 0;

        const targetPlan = plan || "free";
        if (targetPlan === "free" && !canCreateWorkspace("free", freeWorkspaceCount)) {
            return NextResponse.json(
                { error: getPlanLimitMessage("free", "workspaces") },
                { status: 403 }
            );
        }

        const workspace = await createWorkspace(user.id, name, targetPlan);

        return NextResponse.json(workspace);
    } catch (error: any) {
        const errorPayload: Record<string, any> = {
            error: "Internal server error",
        };

        const isPrismaError = error?.code && typeof error.code === "string" && error.code.startsWith("P");
        const message = error?.message || String(error);

        if (isPrismaError) {
            errorPayload.code = error.code;
            errorPayload.detail = message.substring(0, 200);
            console.error("[Workspace POST] Prisma error:", {
                code: error.code,
                message: error.message,
                meta: error.meta,
                stack: error.stack,
            });
        } else {
            console.error("[Workspace POST] Non-Prisma error:", {
                name: error?.name,
                message: error?.message,
                stack: error?.stack,
                error,
            });
            if (message && message !== "Internal server error") {
                errorPayload.detail = message.substring(0, 200);
            }
        }

        return NextResponse.json(errorPayload, { status: 500 });
    }
}
