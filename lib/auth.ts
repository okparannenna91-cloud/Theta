import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createWorkspace } from "@/lib/workspace";
import { logger } from "@/lib/logger";
import { cacheGetOrSet, cacheKey } from "@/lib/cache";

export async function getCurrentUser() {
  const timings: Record<string, number> = {};
  const start = Date.now();

  timings['clerk_auth'] = Date.now();
  const { userId } = await auth();
  timings['clerk_auth'] = Date.now() - timings['clerk_auth'];

  if (!userId) return null;

  timings['db_user_lookup'] = Date.now();
  let user = await cacheGetOrSet(
    cacheKey("user", "clerk", userId),
    () => prisma.user.findUnique({ where: { clerkId: userId } }),
    60,
  );
  timings['db_user_lookup'] = Date.now() - timings['db_user_lookup'];

  let isNewUser = false;

  if (!user) {
    timings['clerk_currentUser'] = Date.now();
    const clerkUser = await currentUser();
    timings['clerk_currentUser'] = Date.now() - timings['clerk_currentUser'];

    if (!clerkUser) return null;

    timings['db_user_create'] = Date.now();
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
    timings['db_user_create'] = Date.now() - timings['db_user_create'];
  }

  if (isNewUser && user) {
    try {
      const userName = user.name;
      const workspaceName = userName
        ? `${userName}'s Workspace`
        : "My Workspace";

      const { createWorkspace } = await import("@/lib/workspace");
      await createWorkspace(user.id, workspaceName, "free");

      if (user.email) {
        (async () => {
          try {
            const { sendWelcomeEmail } = await import("@/lib/email");
            await sendWelcomeEmail(user!.email!, userName || "there");
          } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
          }
        })();
      }
    } catch (error) {
      console.error("Initial workspace creation failed:", error);
    }
  }

  const total = Date.now() - start;
  if (total > 200) {
    logger.warn("[Auth] Slow getCurrentUser", { total: `${total}ms`, ...Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, `${v}ms`])), userId });
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

