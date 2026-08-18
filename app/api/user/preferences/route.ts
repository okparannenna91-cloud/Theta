import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Accounts created before onboarding was enforced (2026-08-18) are treated as
// already onboarded — forcing every legacy user through the new wizard would
// be disruptive. Only brand-new signups go through onboarding.
const LEGACY_CUTOFF = new Date("2026-08-18T00:00:00Z").getTime();

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const isLegacy = user.createdAt
            ? new Date(user.createdAt).getTime() < LEGACY_CUTOFF
            : false;

        const preferences = await prisma.userPreference.upsert({
            where: { userId: user.id as string },
            update: isLegacy ? { onboardingComplete: true } : {},
            create: { userId: user.id as string, onboardingComplete: isLegacy },
        });

        return NextResponse.json({
            ...preferences,
            userCreatedAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
        });
    } catch (error) {
        console.error("Preferences fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { dismissedPopups, onboardingComplete, theme, compactMode, emailNotifications, pushNotifications } = body;

        const preferences = await prisma.userPreference.update({
            where: { userId: user.id as string },
            data: {
                dismissedPopups: dismissedPopups !== undefined ? dismissedPopups : undefined,
                onboardingComplete: onboardingComplete !== undefined ? onboardingComplete : undefined,
                theme: theme !== undefined ? theme : undefined,
                compactMode: compactMode !== undefined ? compactMode : undefined,
                emailNotifications: emailNotifications !== undefined ? emailNotifications : undefined,
                pushNotifications: pushNotifications !== undefined ? pushNotifications : undefined,
            },
        });

        return NextResponse.json(preferences);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
    }
}
