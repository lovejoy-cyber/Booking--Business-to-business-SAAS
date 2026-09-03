import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, logActivity } from "@/lib/tenant";
import { serviceSchema } from "@/lib/validation";

export async function GET() {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const services = await prisma.service.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" }
    });
    return NextResponse.json({ services });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    const data = serviceSchema.parse(await req.json());
    const service = await prisma.service.create({
      data: { ...data, businessId: business.id }
    });
    await logActivity({
      businessId: business.id,
      userId,
      type: "service.created",
      entityType: "service",
      entityId: service.id
    });
    return NextResponse.json({ service }, { status: 201 });
  });
}
