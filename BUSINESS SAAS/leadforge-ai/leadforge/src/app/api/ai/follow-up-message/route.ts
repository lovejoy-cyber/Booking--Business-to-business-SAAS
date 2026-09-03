import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError } from "@/lib/tenant";
import { followUpMessageRequestSchema } from "@/lib/validation";
import { generateFollowUpMessage } from "@/lib/ai/functions";

// Drafts a follow-up message only — sending it (WhatsApp/email/SMS) is a
// separate, explicit, owner-triggered action outside this MVP's scope.
export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const { leadId, tone } = followUpMessageRequestSchema.parse(await req.json());

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.businessId !== business.id) throw new ForbiddenError("Lead not found");

    const message = await generateFollowUpMessage({
      tone,
      customerName: lead.customerName,
      businessName: business.name,
      context: `Lead status: ${lead.status}. Original inquiry: "${lead.inquiryText.slice(0, 200)}"`
    });

    return NextResponse.json({ message });
  });
}
