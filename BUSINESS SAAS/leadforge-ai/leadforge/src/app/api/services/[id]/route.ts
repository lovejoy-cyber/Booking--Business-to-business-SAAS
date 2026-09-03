import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError, logActivity } from "@/lib/tenant";
import { serviceSchema } from "@/lib/validation";

async function assertOwnership(businessId: string, id: string) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service || service.businessId !== businessId) {
    throw new ForbiddenError("Service not found");
  }
  return service;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    await assertOwnership(business.id, params.id);
    const data = serviceSchema.partial().parse(await req.json());
    const service = await prisma.service.update({ where: { id: params.id }, data });
    await logActivity({
      businessId: business.id,
      userId,
      type: "service.updated",
      entityType: "service",
      entityId: service.id
    });
    return NextResponse.json({ service });
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    await assertOwnership(business.id, params.id);
    await prisma.service.update({ where: { id: params.id }, data: { active: false } });
    await logActivity({
      businessId: business.id,
      userId,
      type: "service.archived",
      entityType: "service",
      entityId: params.id
    });
    return NextResponse.json({ ok: true });
  });
}
