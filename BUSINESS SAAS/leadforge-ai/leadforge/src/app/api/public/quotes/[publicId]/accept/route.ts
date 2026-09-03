import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { logActivity } from "@/lib/tenant";

export async function POST(_req: Request, { params }: { params: { publicId: string } }) {
  return withErrorHandling(async () => {
    const quote = await prisma.quote.findUnique({ where: { publicId: params.publicId } });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    if (quote.status === "ACCEPTED") {
      return NextResponse.json({ quote });
    }
    if (quote.status === "EXPIRED") {
      return NextResponse.json({ error: "This quote has expired." }, { status: 410 });
    }

    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        events: { create: { type: "ACCEPTED" } }
      }
    });

    if (quote.leadId) {
      await prisma.lead.update({ where: { id: quote.leadId }, data: { status: "ACCEPTED" } });
    }

    await logActivity({
      businessId: quote.businessId,
      type: "quote.accepted",
      entityType: "quote",
      entityId: quote.id
    });

    return NextResponse.json({ quote: updated });
  });
}
