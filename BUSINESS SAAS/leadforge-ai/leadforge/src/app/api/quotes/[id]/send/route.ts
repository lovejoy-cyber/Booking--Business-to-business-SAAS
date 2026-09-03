import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError, logActivity } from "@/lib/tenant";

// Marks a quote SENT. Actually delivering it (email/WhatsApp) is a manual,
// explicit action by the owner in this MVP — see section 12/23 of the spec:
// we never auto-send on the customer's behalf.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    const quote = await prisma.quote.findUnique({ where: { id: params.id } });
    if (!quote || quote.businessId !== business.id) throw new ForbiddenError("Quote not found");

    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: "SENT",
        events: { create: { type: "SENT" } }
      }
    });

    if (quote.leadId) {
      await prisma.lead.update({ where: { id: quote.leadId }, data: { status: "QUOTE_SENT" } });
    }

    await logActivity({
      businessId: business.id,
      userId,
      type: "quote.sent",
      entityType: "quote",
      entityId: quote.id
    });

    return NextResponse.json({
      quote: updated,
      publicUrl: `${process.env.APP_URL ?? ""}/quote/${quote.publicId}`
    });
  });
}
