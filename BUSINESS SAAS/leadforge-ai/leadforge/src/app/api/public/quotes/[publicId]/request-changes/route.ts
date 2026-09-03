import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { logActivity } from "@/lib/tenant";

const bodySchema = z.object({ message: z.string().max(2000).optional() });

export async function POST(req: Request, { params }: { params: { publicId: string } }) {
  return withErrorHandling(async () => {
    const { message } = bodySchema.parse(await req.json().catch(() => ({})));
    const quote = await prisma.quote.findUnique({ where: { publicId: params.publicId } });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: "CHANGES_REQUESTED",
        changesRequestedAt: new Date(),
        events: { create: { type: "CHANGES_REQUESTED", metadata: message ? { message } : undefined } }
      }
    });

    if (quote.leadId && message) {
      await prisma.leadMessage.create({
        data: { leadId: quote.leadId, sender: "CUSTOMER", body: message }
      });
    }

    await logActivity({
      businessId: quote.businessId,
      type: "quote.changes_requested",
      entityType: "quote",
      entityId: quote.id
    });

    return NextResponse.json({ quote: updated });
  });
}
