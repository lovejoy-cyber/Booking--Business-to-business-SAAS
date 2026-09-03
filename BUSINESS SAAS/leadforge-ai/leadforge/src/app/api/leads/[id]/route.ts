import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError, logActivity } from "@/lib/tenant";
import { leadUpdateSchema } from "@/lib/validation";

async function loadOwned(businessId: string, id: string) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      quotes: { orderBy: { createdAt: "desc" } },
      customer: true
    }
  });
  if (!lead || lead.businessId !== businessId) throw new ForbiddenError("Lead not found");
  return lead;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const lead = await loadOwned(business.id, params.id);
    return NextResponse.json({ lead });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    await loadOwned(business.id, params.id);
    const body = await req.json();
    const data = leadUpdateSchema.parse(body);

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: {
        ...data,
        followUpAt: data.followUpAt ? new Date(data.followUpAt) : undefined
      }
    });

    await logActivity({
      businessId: business.id,
      userId,
      type: "lead.updated",
      entityType: "lead",
      entityId: lead.id,
      metadata: { fields: Object.keys(data) }
    });

    return NextResponse.json({ lead });
  });
}
