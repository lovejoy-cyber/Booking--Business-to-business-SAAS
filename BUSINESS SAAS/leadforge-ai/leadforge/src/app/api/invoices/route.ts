import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError, logActivity } from "@/lib/tenant";
import { invoiceCreateSchema } from "@/lib/validation";
import { computeTotals, lineTotalCents } from "@/lib/money";
import { nextInvoiceNumber } from "@/lib/numbering";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const invoices = await prisma.invoice.findMany({
      where: { businessId: business.id, ...(status ? { status: status as any } : {}) },
      include: { customer: true, items: true },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ invoices });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    const data = invoiceCreateSchema.parse(await req.json());

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer || customer.businessId !== business.id) throw new ForbiddenError("Customer not found");

    const totals = computeTotals(
      data.items.map((i) => ({ ...i, discountCents: 0 })),
      data.discountCents,
      business.taxRateBps
    );
    const invoiceNumber = await nextInvoiceNumber(business.id, business.invoicePrefix);

    const invoice = await prisma.invoice.create({
      data: {
        businessId: business.id,
        customerId: data.customerId,
        jobId: data.jobId ?? undefined,
        invoiceNumber,
        currency: business.currency,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        notes: data.notes ?? undefined,
        items: {
          create: data.items.map((item, i) => ({
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            lineTotalCents: lineTotalCents({ ...item, discountCents: 0 }),
            sortOrder: i
          }))
        }
      },
      include: { items: true, customer: true }
    });

    await logActivity({
      businessId: business.id,
      userId,
      type: "invoice.created",
      entityType: "invoice",
      entityId: invoice.id
    });

    return NextResponse.json({ invoice }, { status: 201 });
  });
}
