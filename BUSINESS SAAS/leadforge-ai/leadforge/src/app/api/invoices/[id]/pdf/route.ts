import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError } from "@/lib/tenant";
import { InvoicePdfDocument } from "@/lib/pdf/documents";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { items: true, customer: true }
    });
    if (!invoice || invoice.businessId !== business.id) throw new ForbiddenError("Invoice not found");

    const buffer = await renderToBuffer(
      React.createElement(InvoicePdfDocument, {
        business: {
          name: business.name,
          address: business.address,
          phone: business.phone,
          email: business.email,
          logoUrl: business.logoUrl
        },
        customer: {
          name: invoice.customer.name,
          address: invoice.customer.address,
          phone: invoice.customer.phone,
          email: invoice.customer.email
        },
        invoiceNumber: invoice.invoiceNumber,
        createdAt: invoice.createdAt.toDateString(),
        dueAt: invoice.dueAt ? invoice.dueAt.toDateString() : null,
        currency: invoice.currency,
        taxLabel: business.taxLabel,
        lines: invoice.items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPriceCents: i.unitPriceCents,
          lineTotalCents: i.lineTotalCents
        })),
        subtotalCents: invoice.subtotalCents,
        discountCents: invoice.discountCents,
        taxCents: invoice.taxCents,
        totalCents: invoice.totalCents,
        notes: invoice.notes,
        status: invoice.status
      })
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`
      }
    });
  });
}
