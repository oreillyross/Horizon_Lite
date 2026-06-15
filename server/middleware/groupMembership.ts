import { TRPCError } from "@trpc/server";

/**
 * Resolves the authenticated user's analystGroupId from the tRPC context.
 * Throws FORBIDDEN if the user is not assigned to a group.
 * Call at the top of any protectedProcedure that requires group membership.
 */
export function resolveGroupId(
  user: { analystGroupId?: string | null } | null | undefined,
): string {
  const groupId = user?.analystGroupId ?? null;
  if (!groupId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User is not assigned to an analyst group",
    });
  }
  return groupId;
}
