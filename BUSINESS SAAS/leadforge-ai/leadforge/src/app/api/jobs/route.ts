import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError, logActivity } from "@/lib/tenant";
import { jobCreateSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const jobs = await prisma.job.findMany({
      where: { businessId: business.id, ...(status ? { status: status as any } : {}) },
      include: { customer: true, quote: true, invoice: true },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ jobs });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    const data = jobCreateSchema.parse(await req.json());

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer || customer.businessId !== business.id) throw new ForbiddenError("Customer not found");

    const job = await prisma.job.create({
      data: {
        businessId: business.id,
        customerId: data.customerId,
        quoteId: data.quoteId ?? undefined,
        service: data.service,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        assignedWorker: data.assignedWorker ?? undefined,
        notes: data.notes ?? undefined
      }
    });

    await logActivity({
      businessId: business.id,
      userId,
      type: "job.created",
      entityType: "job",
      entityId: job.id
    });

    return NextResponse.json({ job }, { status: 201 });
  });
}
