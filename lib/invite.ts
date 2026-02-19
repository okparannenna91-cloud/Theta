import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Generate a secure invite token
 */
export function generateInviteToken(): string {
    return crypto.randomBytes(32).toString("hex");
}

/**
 * Create an invite
 */
export async function createInvite(
    workspaceId: string,
    email: string,
    role: string = "member",
    expiresInDays: number = 7,
    teamId?: string
) {
    const token = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = await prisma.invite.create({
        data: {
            email,
            token,
            role,
            workspaceId,
            teamId,
            expiresAt,
        },
    });

    return invite;
}

/**
 * Validate and get invite by token
 */
export async function getInviteByToken(token: string) {
    const invite = await prisma.invite.findUnique({
        where: { token },
        include: { workspace: true, team: true },
    });

    if (!invite) {
        return { valid: false, error: "Invite not found" };
    }

    if (invite.acceptedAt) {
        return { valid: false, error: "Invite already accepted" };
    }

    if (invite.status === "revoked") {
        return { valid: false, error: "Invite has been revoked" };
    }

    if (new Date() > invite.expiresAt) {
        return { valid: false, error: "Invite has expired" };
    }

    return { valid: true, invite };
}

/**
 * Accept an invite
 */
export async function acceptInvite(token: string, userId: string) {
    const { valid, invite, error } = await getInviteByToken(token);

    if (!valid || !invite) {
        throw new Error(error || "Invalid invite");
    }

    // Add user to workspace (if not already there)
    const existingWorkspaceMember = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId: invite.workspaceId,
                userId,
            },
        },
    });

    if (!existingWorkspaceMember) {
        await prisma.workspaceMember.create({
            data: {
                workspaceId: invite.workspaceId,
                userId,
                role: invite.role,
            },
        });
    }

    // Add user to team (if invite has teamId)
    if (invite.teamId) {
        const existingTeamMember = await prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId: invite.teamId,
                    userId,
                },
            },
        });

        if (!existingTeamMember) {
            await prisma.teamMember.create({
                data: {
                    teamId: invite.teamId,
                    userId,
                    role: invite.role === "owner" ? "admin" : invite.role,
                },
            });
        }
    }

    // Mark invite as accepted
    await prisma.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
    });

    return { workspace: invite.workspace };
}
