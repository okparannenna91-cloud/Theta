import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteWorkspace } from "@/lib/workspace";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = params.id;
    await deleteWorkspace(workspaceId, user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete workspace route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete workspace" },
      { status: 500 }
    );
  }
}
