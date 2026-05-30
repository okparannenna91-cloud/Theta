import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserWorkspaces } from "@/lib/workspace";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspaces = await getUserWorkspaces(user.id);

        return NextResponse.json(workspaces);
    } catch (error) {
        console.error("Get workspaces error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name } = await req.json();
        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const { createWorkspace } = await import("@/lib/workspace");
        const workspace = await createWorkspace(user.id, name);

        return NextResponse.json(workspace);
    } catch (error) {
        console.error("Create workspace error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
