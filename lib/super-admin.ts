import { prisma } from "@/lib/prisma";
import { cacheGetOrSet, cacheKey } from "@/lib/cache";

export async function isSuperAdmin(userId: string): Promise<boolean> {
  if (process.env.SUPER_ADMIN_USER_IDS?.split(",").includes(userId)) {
    return true;
  }
  const user = await cacheGetOrSet(
    cacheKey("user", "role", userId),
    () => prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    60,
  );
  return user?.role === "super_admin";
}

export async function requireSuperAdmin(userId: string): Promise<void> {
  if (!(await isSuperAdmin(userId))) {
    throw new Error("Forbidden: Super admin access required");
  }
}
