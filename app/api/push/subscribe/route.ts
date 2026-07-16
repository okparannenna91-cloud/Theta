import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subscription } = body;

    if (!subscription) {
      return NextResponse.json({ error: "subscription required" }, { status: 400 });
    }

    await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: {
        pushSubscription: subscription,
        pushNotifications: true,
      },
      create: {
        userId: user.id,
        pushSubscription: subscription,
        pushNotifications: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.userPreference.update({
      where: { userId: user.id },
      data: {
        pushSubscription: null,
        pushNotifications: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove push subscription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
