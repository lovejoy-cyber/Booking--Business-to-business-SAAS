import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError, logActivity } from "@/lib/tenant";
import { jobUpdateSchema } from "@/lib/validation";

async function loadOwned(businessId: string, id: string) {
  const job = await prisma.job.findUnique({
    where: { id },
    include: { customer: true, quote: true, invoice: true }
  });
  if (!job || job.businessId !== businessId) throw new ForbiddenError("Job not found");
  return job;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const job = await loadOwned(business.id, params.id);
    return NextResponse.json({ job });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    await loadOwned(business.id, params.id);
    const data = jobUpdateSchema.parse(await req.json());

    const job = await prisma.job.update({
      where: { id: params.id },
      data: {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined
      }
    });

    await logActivity({
      businessId: business.id,
      userId,
      type: "job.updated",
      entityType: "job",
      entityId: job.id,
      metadata: { fields: Object.keys(data) }
    });

    return NextResponse.json({ job });
  });
}
