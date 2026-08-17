import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/email";

async function handleUnsubscribe(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const token = searchParams.get("t") || "";

    if (!verifyUnsubscribeToken(userId, token)) {
        return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });
    }

    try {
        await prisma.userPreference.upsert({
            where: { userId },
            update: { emailNotifications: false },
            create: { userId, emailNotifications: false },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Unsubscribe error:", error);
        return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    return handleUnsubscribe(req);
}

export async function GET(req: Request) {
    return handleUnsubscribe(req);
}
