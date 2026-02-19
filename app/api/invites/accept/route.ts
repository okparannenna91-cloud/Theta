import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { acceptInvite } from "@/lib/invite";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { token } = await req.json();

        if (!token) {
            return NextResponse.json(
                { error: "Token is required" },
                { status: 400 }
            );
        }

        const result = await acceptInvite(token, user.id);

        return NextResponse.json({
            message: "Invite accepted successfully",
            workspace: result.workspace,
        });
    } catch (error: any) {
        console.error("Accept invite error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to accept invite" },
            { status: 400 }
        );
    }
}
