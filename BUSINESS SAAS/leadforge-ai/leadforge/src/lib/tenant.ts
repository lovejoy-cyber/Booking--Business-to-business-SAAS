import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export class UnauthorizedError extends Error {
  status = 401;
}
export class ForbiddenError extends Error {
  status = 403;
}

/**
 * Resolves the calling user's business from the session cookie — never from
 * a businessId in the request body/query. This is the single choke point
 * that guarantees tenant isolation: every API route calls this first, and
 * every subsequent Prisma query filters `where: { businessId }` using the
 * value returned here, not anything supplied by the client.
 */
export async function requireBusiness() {
  const session = await getSession();
  if (!session) throw new UnauthorizedError("Not signed in");

  const membership = await prisma.businessMember.findFirst({
    where: { userId: session.userId },
    include: { business: true },
    orderBy: { createdAt: "asc" }
  });

  if (!membership) throw new ForbiddenError("No business found for this user");

  return { userId: session.userId, business: membership.business, role: membership.role };
}

/** Writes an audit-log row. Never let a failure here break the calling request. */
export async function logActivity(params: {
  businessId: string;
  userId?: string | null;
  type: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.activityEvent.create({
      data: {
        businessId: params.businessId,
        userId: params.userId ?? null,
        type: params.type,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata as any
      }
    });
  } catch (err) {
    console.error("Failed to write activity log", err);
  }
}
