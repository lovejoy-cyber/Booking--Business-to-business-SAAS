import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError, logActivity } from "@/lib/tenant";
import { analyzeLead } from "@/lib/ai/functions";

// Runs the AI lead-analysis function and stores the result on the lead.
// This never changes lead status or sends anything — it only produces
// clearly-labeled AI suggestions for the owner to act on.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    const lead = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!lead || lead.businessId !== business.id) throw new ForbiddenError("Lead not found");

    const analysis = await analyzeLead({
      inquiryText: lead.inquiryText,
      serviceRequested: lead.serviceRequested,
      businessCategory: business.category
    });

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: { aiAnalysis: analysis as any }
    });

    await logActivity({
      businessId: business.id,
      userId,
      type: "lead.analyzed",
      entityType: "lead",
      entityId: lead.id
    });

    return NextResponse.json({ lead: updated, analysis });
  });
}
