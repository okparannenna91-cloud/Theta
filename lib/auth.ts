import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createWorkspace } from "@/lib/workspace";

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  let isNewUser = false;

  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          name: clerkUser.firstName
            ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
            : null,
          imageUrl: clerkUser.imageUrl,
        },
      });
      isNewUser = true;
    } catch (error: any) {
      if (error.code === "P2002") {
        // Handle race condition: User created by parallel request
        user = await prisma.user.findUnique({
          where: { clerkId: userId },
        });
      }
      if (!user) throw error;
    }
  } else {
    // Update user info if changed
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: clerkUser.emailAddresses[0]?.emailAddress || user.email,
        name: clerkUser.firstName
          ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
          : user.name,
        imageUrl: clerkUser.imageUrl || user.imageUrl,
      },
    });
  }

  // Create default workspace for new users
  if (isNewUser) {
    try {
      const workspaceName = user.name
        ? `${user.name}'s Workspace`
        : "My Workspace";
      await createWorkspace(user.id, workspaceName, "free");

      // Send welcome email
      const { sendWelcomeEmail } = await import("@/lib/email");
      await sendWelcomeEmail(user.email, user.name || "there");
    } catch (error) {
      console.error("Failed to create default workspace:", error);
    }
  }

  return user;
}

/**
 * Get current user with workspace context
 */
export async function getUserWithWorkspace(workspaceId?: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { getCurrentWorkspace } = await import("@/lib/workspace");
  const workspace = await getCurrentWorkspace(user.id, workspaceId);

  return { user, workspace };
}

