import { NextResponse } from "next/server";
import * as Ably from "ably";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const ably = new Ably.Rest(process.env.ABLY_API_KEY || "");

        // Generate token for client
        const tokenRequest = await ably.auth.createTokenRequest({
            clientId: user.id,
        });

        return NextResponse.json(tokenRequest);
    } catch (error) {
        console.error("Ably token error:", error);
        return NextResponse.json(
            { error: "Failed to generate token" },
            { status: 500 }
        );
    }
}
