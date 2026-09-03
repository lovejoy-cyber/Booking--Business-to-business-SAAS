import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError, logActivity } from "@/lib/tenant";
import { quoteUpdateSchema } from "@/lib/validation";
import { computeTotals, lineTotalCents } from "@/lib/money";

async function loadOwned(businessId: string, id: string) {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { items: true, customer: true, events: { orderBy: { createdAt: "desc" } }, lead: true }
  });
  if (!quote || quote.businessId !== businessId) throw new ForbiddenError("Quote not found");
  return quote;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const quote = await loadOwned(business.id, params.id);
    return NextResponse.json({ quote });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    const existing = await loadOwned(business.id, params.id);
    const data = quoteUpdateSchema.parse(await req.json());

    const updateData: any = {
      notes: data.notes ?? undefined,
      terms: data.terms ?? undefined,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      status: data.status ?? undefined
    };

    // If line items were resubmitted, recompute totals server-side and replace them.
    if (data.items) {
      const totals = computeTotals(data.items, data.discountCents ?? existing.discountCents, business.taxRateBps);
      updateData.subtotalCents = totals.subtotalCents;
      updateData.discountCents = totals.discountCents;
      updateData.taxCents = totals.taxCents;
      updateData.totalCents = totals.totalCents;

      await prisma.quoteItem.deleteMany({ where: { quoteId: existing.id } });
      updateData.items = {
        create: data.items.map((item, i) => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: item.discountCents ?? 0,
          lineTotalCents: lineTotalCents(item),
          sortOrder: i
        }))
      };
    }

    const quote = await prisma.quote.update({
      where: { id: existing.id },
      data: updateData,
      include: { items: true, customer: true }
    });

    await logActivity({
      businessId: business.id,
      userId,
      type: "quote.updated",
      entityType: "quote",
      entityId: quote.id
    });

    return NextResponse.json({ quote });
  });
}
