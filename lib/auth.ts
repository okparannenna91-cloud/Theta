import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { cacheGetOrSet, cacheInvalidate, cacheKey } from "@/lib/cache";

// Throttled profile refresh from Clerk (name / email / profile picture).
// Runs in the background on getCurrentUser so the app stays in sync even if
// the Clerk webhook misses an event (e.g. user updates their avatar).
const profileRefreshMap = new Map<string, number>();
const PROFILE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

async function refreshProfileFromClerk(userId: string, clerkUserId: string): Promise<void> {
  const now = Date.now();
  const last = profileRefreshMap.get(userId) || 0;
  if (now - last < PROFILE_REFRESH_INTERVAL_MS) return;
  profileRefreshMap.set(userId, now);
  if (profileRefreshMap.size > 10_000) profileRefreshMap.clear();

  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return;
    const name = clerkUser.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
      : null;
    const email = clerkUser.emailAddresses[0]?.emailAddress || "";
    const imageUrl = clerkUser.imageUrl || null;

    await prisma.user.update({
      where: { id: userId },
      data: { email, name, imageUrl },
      select: { id: true },
    });
    // The user row is cached — drop it so the next read is fresh
    await cacheInvalidate(cacheKey("user", "clerk", clerkUserId));
  } catch (error) {
    console.error("Profile refresh from Clerk failed:", error);
  }
}

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

  // Keep the local profile (name/email/picture) in sync with Clerk in the
  // background — throttled to at most once per 5 minutes per user.
  void refreshProfileFromClerk(user.id, userId);

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

