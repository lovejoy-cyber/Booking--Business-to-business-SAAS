import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError, logActivity } from "@/lib/tenant";
import { generateQuoteRequestSchema } from "@/lib/validation";
import { generateQuoteDraft } from "@/lib/ai/functions";

// Produces a DRAFT only — nothing is persisted here. The owner must review
// it in the quote builder and explicitly save/send it. If the AI decides it
// doesn't have enough information, we surface that directly instead of
// forcing a guessed price onto the page.
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const { leadId } = generateQuoteRequestSchema.parse(await req.json());

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.businessId !== business.id) throw new ForbiddenError("Lead not found");

    const services = await prisma.service.findMany({
      where: { businessId: business.id, active: true }
    });

    const draft = await generateQuoteDraft({
      inquiryText: lead.inquiryText,
      leadNotes: lead.notes,
      currency: business.currency,
      services: services.map((s) => ({
        name: s.name,
        unit: s.unit,
        defaultUnitPriceCents: s.defaultUnitPriceCents,
        description: s.description
      }))
    });

    await logActivity({
      businessId: business.id,
      type: "quote.ai_draft_generated",
      entityType: "lead",
      entityId: lead.id,
      metadata: { sufficient: draft.sufficient }
    });

    return NextResponse.json({ draft });
  });
}
