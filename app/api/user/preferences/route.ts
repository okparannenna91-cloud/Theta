import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const preferences = await prisma.userPreference.upsert({
            where: { userId: user.id as string },
            update: {},
            create: { userId: user.id as string },
        });

        return NextResponse.json(preferences);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { dismissedPopups, onboardingComplete } = body;

        const preferences = await prisma.userPreference.update({
            where: { userId: user.id as string },
            data: {
                dismissedPopups: dismissedPopups !== undefined ? dismissedPopups : undefined,
                onboardingComplete: onboardingComplete !== undefined ? onboardingComplete : undefined,
            },
        });

        return NextResponse.json(preferences);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
    }
}
