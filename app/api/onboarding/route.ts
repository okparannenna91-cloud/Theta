import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

const VALID_HEARD_FROM = [
    "Google search",
    "Twitter / X",
    "LinkedIn",
    "Instagram / TikTok / YouTube",
    "Friend or colleague",
    "Ad",
    "Other",
];

const VALID_TEAM_SIZES = ["Just me", "2-5", "6-10", "11-25", "25+"];
const VALID_ROLES = [
    "Founder / Owner",
    "Project Manager",
    "Team Lead",
    "Developer / Engineer",
    "Designer",
    "Marketing",
    "Operations",
    "Other",
];
const VALID_USE_CASES = [
    "Software development",
    "Marketing & campaigns",
    "Agency / client work",
    "Operations",
    "Personal projects",
    "Other",
];

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { workspaceName: requestedWorkspaceName, heardFrom, teamSize, role, useCase, invited } = body;

        if (typeof heardFrom !== "string" || !VALID_HEARD_FROM.includes(heardFrom)) {
            return NextResponse.json({ error: "How you heard about us is required" }, { status: 400 });
        }
        if (typeof teamSize !== "string" || !VALID_TEAM_SIZES.includes(teamSize)) {
            return NextResponse.json({ error: "Team size is required" }, { status: 400 });
        }
        if (typeof role !== "string" || !VALID_ROLES.includes(role)) {
            return NextResponse.json({ error: "Role is required" }, { status: 400 });
        }
        if (typeof useCase !== "string" || !VALID_USE_CASES.includes(useCase)) {
            return NextResponse.json({ error: "Primary use case is required" }, { status: 400 });
        }

        // If the user was invited, the workspace already exists (membership was
        // added when they accepted). Otherwise, onboarding creates the first
        // workspace using the name they chose — the "X's Workspace" auto-creation
        // was removed so the first workspace always comes from onboarding.
        let workspaceId: string;
        let workspaceName: string;

        const existingMembership = await prisma.workspaceMember.findFirst({
            where: { userId: user.id },
            include: { workspace: true },
            orderBy: { createdAt: "asc" },
        });

        if (existingMembership) {
            workspaceId = existingMembership.workspace.id;
            workspaceName = existingMembership.workspace.name;
        } else {
            const name = (requestedWorkspaceName || "").trim() || "My Workspace";
            const created = await createWorkspace(user.id, name, "free");
            workspaceId = created.id;
            workspaceName = created.name;
        }

        const onboardingData = {
            workspaceName,
            heardFrom,
            teamSize,
            role,
            useCase,
            invited: !!invited,
            completedAt: new Date().toISOString(),
        };

        await prisma.userPreference.upsert({
            where: { userId: user.id },
            update: { onboardingComplete: true, onboarding: onboardingData as any },
            create: { userId: user.id, onboardingComplete: true, onboarding: onboardingData as any },
        });

        // Fire-and-forget: notify the founder with the new signup details
        void (async () => {
            try {
                const { sendOnboardingReportEmail, sendWelcomeEmail } = await import("@/lib/email");
                await sendOnboardingReportEmail({
                    name: user.name,
                    email: user.email || "",
                    workspaceName,
                    heardFrom,
                    teamSize,
                    role,
                    useCase,
                    invited: !!invited,
                });
                if (!invited && user.email) {
                    await sendWelcomeEmail(user.email, user.name || "there");
                }
            } catch (error) {
                console.error("Onboarding email send failed:", error);
            }
        })();

        return NextResponse.json({ workspaceId });
    } catch (error) {
        console.error("Onboarding error:", error);
        return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
    }
}
