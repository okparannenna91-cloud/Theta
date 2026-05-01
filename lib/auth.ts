import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createWorkspace } from "@/lib/workspace";

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  // Try to find user in local database first to avoid slow Clerk currentUser() call
  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  let isNewUser = false;

  if (!user) {
    // User not found in local DB, fetch full profile from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

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
        user = await prisma.user.findUnique({
          where: { clerkId: userId },
        });
      }
      if (!user) throw error;
    }
  } else {
    // Optional: Only update profile if last update was more than 24h ago or similar
    // For now, let's keep it simple and skip the update on every request to boost performance
  }

  // Create default workspace for new users
  if (isNewUser && user) {
    const userIdForWorkspace = user.id;
    const userEmail = user.email;
    const userName = user.name;

    // Run this in the background to avoid blocking the initial response
    (async () => {
      try {
        const workspaceName = userName
          ? `${userName}'s Workspace`
          : "My Workspace";
        
        const { createWorkspace } = await import("@/lib/workspace");
        await createWorkspace(userIdForWorkspace, workspaceName, "free");

        // Send welcome email
        if (userEmail) {
          const { sendWelcomeEmail } = await import("@/lib/email");
          await sendWelcomeEmail(userEmail, userName || "there");
        }
      } catch (error) {
        console.error("Background initial setup failed:", error);
      }
    })();
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

