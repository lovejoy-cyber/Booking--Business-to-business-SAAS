import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, logActivity, ForbiddenError } from "@/lib/tenant";
import { quoteCreateSchema } from "@/lib/validation";
import { computeTotals, lineTotalCents } from "@/lib/money";
import { nextQuoteNumber } from "@/lib/numbering";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const quotes = await prisma.quote.findMany({
      where: { businessId: business.id, ...(status ? { status: status as any } : {}) },
      include: { customer: true, items: true },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ quotes });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    const data = quoteCreateSchema.parse(await req.json());

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer || customer.businessId !== business.id) {
      throw new ForbiddenError("Customer not found");
    }
    if (data.leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: data.leadId } });
      if (!lead || lead.businessId !== business.id) throw new ForbiddenError("Lead not found");
    }

    // Totals are ALWAYS computed server-side from the line items — the client
    // may display its own running total for UX, but it is never trusted.
    const totals = computeTotals(data.items, data.discountCents, business.taxRateBps);
    const quoteNumber = await nextQuoteNumber(business.id, business.quotePrefix);

    const quote = await prisma.quote.create({
      data: {
        businessId: business.id,
        leadId: data.leadId ?? undefined,
        customerId: data.customerId,
        quoteNumber,
        currency: business.currency,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        depositCents: Math.min(data.depositCents, totals.totalCents),
        notes: data.notes ?? undefined,
        terms: data.terms ?? business.quoteTerms ?? undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        items: {
          create: data.items.map((item, i) => ({
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            discountCents: item.discountCents ?? 0,
            lineTotalCents: lineTotalCents(item),
            sortOrder: i
          }))
        },
        events: { create: { type: "CREATED" } }
      },
      include: { items: true, customer: true }
    });

    if (data.leadId) {
      await prisma.lead.update({ where: { id: data.leadId }, data: { status: "QUALIFIED" } });
    }

    await logActivity({
      businessId: business.id,
      userId,
      type: "quote.created",
      entityType: "quote",
      entityId: quote.id
    });

    return NextResponse.json({ quote }, { status: 201 });
  });
}
