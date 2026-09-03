import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError } from "@/lib/tenant";
import { QuotePdfDocument } from "@/lib/pdf/documents";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { items: true, customer: true }
    });
    if (!quote || quote.businessId !== business.id) throw new ForbiddenError("Quote not found");

    const buffer = await renderToBuffer(
      React.createElement(QuotePdfDocument, {
        business: {
          name: business.name,
          address: business.address,
          phone: business.phone,
          email: business.email,
          logoUrl: business.logoUrl
        },
        customer: {
          name: quote.customer.name,
          address: quote.customer.address,
          phone: quote.customer.phone,
          email: quote.customer.email
        },
        quoteNumber: quote.quoteNumber,
        createdAt: quote.createdAt.toDateString(),
        expiresAt: quote.expiresAt ? quote.expiresAt.toDateString() : null,
        currency: quote.currency,
        taxLabel: business.taxLabel,
        lines: quote.items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPriceCents: i.unitPriceCents,
          lineTotalCents: i.lineTotalCents
        })),
        subtotalCents: quote.subtotalCents,
        discountCents: quote.discountCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        depositCents: quote.depositCents,
        notes: quote.notes,
        terms: quote.terms
      })
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${quote.quoteNumber}.pdf"`
      }
    });
  });
}
