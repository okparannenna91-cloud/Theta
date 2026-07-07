import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { logger } from "@/lib/logger";

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        const body = await req.json();
        const { active } = body;

        if (typeof active !== "boolean") {
            return NextResponse.json({ error: "active must be a boolean" }, { status: 400 });
        }

        const automation = await prisma.automation.findUnique({
            where: { id },
            select: { workspaceId: true }
        });

        if (!automation) {
            return NextResponse.json({ error: "Automation not found" }, { status: 404 });
        }

        const hasAccess = await verifyWorkspaceAccess(user.id, automation.workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const updated = await prisma.automation.update({
            where: { id },
            data: { active },
        });

        return NextResponse.json(updated);
    } catch (error) {
        logger.error("Update automation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        const automation = await prisma.automation.findUnique({
            where: { id },
            select: { workspaceId: true }
        });

        if (!automation) {
            return NextResponse.json({ error: "Automation not found" }, { status: 404 });
        }

        const hasAccess = await verifyWorkspaceAccess(user.id, automation.workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        await prisma.automation.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error("Delete automation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
