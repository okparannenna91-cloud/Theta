import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Prisma cascade deletes will handle most things if configured, 
        // but we'll delete the user record specifically.
        await prisma.user.delete({
            where: { id: user.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Account deletion error:", error);
        return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }
}
