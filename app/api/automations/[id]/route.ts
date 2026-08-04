import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { canAccessProject } from "@/lib/project-permissions";
import { logger } from "@/lib/logger";

const TRIGGER_VALUES = [
    "TASK_CREATED", "TASK_STATUS_UPDATED", "TASK_COMPLETED", "TASK_ASSIGNED",
    "TASK_PRIORITY_CHANGED", "DUE_DATE_PASSED", "PROJECT_CREATED",
    "SPRINT_STARTED", "SPRINT_COMPLETED", "FORM_SUBMITTED", "DOCUMENT_UPDATED",
    "USER_INVITED", "MEMBER_ADDED",
] as const;

const ACTION_VALUES = [
    "CREATE_TASK", "ASSIGN_USER", "SEND_EMAIL", "UPDATE_STATUS",
    "GENERATE_REPORT", "NOTIFY_TEAM", "CREATE_PROJECT", "SEND_NOTIFICATION",
    "NOTIFY_CHANNEL", "SET_ASSIGNEE", "SET_STATUS", "SET_PRIORITY",
] as const;

const updateSchema = z
    .object({
        name: z.string().min(1).optional(),
        trigger: z.enum(TRIGGER_VALUES).optional(),
        condition: z.string().nullable().optional(),
        action: z.enum(ACTION_VALUES).optional(),
        actionValue: z.string().nullable().optional(),
        active: z.boolean().optional(),
        projectId: z.string().nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required",
    });

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
        const data = updateSchema.parse(body);

        const automation = await prisma.automation.findUnique({
            where: { id },
            select: { workspaceId: true, projectId: true }
        });

        if (!automation) {
            return NextResponse.json({ error: "Automation not found" }, { status: 404 });
        }

        const hasAccess = await verifyWorkspaceAccess(user.id, automation.workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // If re-scoping to a project, verify access to that project too
        if (data.projectId) {
            const access = await canAccessProject(user.id, data.projectId, automation.workspaceId);
            if (!access.hasAccess) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
        }

        const updateData: Record<string, unknown> = { ...data };
        if ("projectId" in updateData && updateData.projectId === "") updateData.projectId = null;

        const updated = await prisma.automation.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
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
