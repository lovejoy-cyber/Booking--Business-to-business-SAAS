import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { QuotePdfDocument } from "@/lib/pdf/documents";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { publicId: string } }) {
  return withErrorHandling(async () => {
    const quote = await prisma.quote.findUnique({
      where: { publicId: params.publicId },
      include: { items: true, customer: true, business: true }
    });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    const buffer = await renderToBuffer(
      React.createElement(QuotePdfDocument, {
        business: {
          name: quote.business.name,
          address: quote.business.address,
          phone: quote.business.phone,
          email: quote.business.email,
          logoUrl: quote.business.logoUrl
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
        taxLabel: quote.business.taxLabel,
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
