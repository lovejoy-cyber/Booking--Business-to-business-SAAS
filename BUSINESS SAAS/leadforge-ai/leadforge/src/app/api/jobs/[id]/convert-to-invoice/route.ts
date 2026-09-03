import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError, logActivity } from "@/lib/tenant";
import { nextInvoiceNumber } from "@/lib/numbering";

// "Job -> Invoice" button. Pulls line items from the job's originating quote
// when there is one, otherwise creates a single line item from the job's
// service name that the owner edits from the invoice screen.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: { quote: { include: { items: true } }, invoice: true }
    });
    if (!job || job.businessId !== business.id) throw new ForbiddenError("Job not found");
    if (job.invoice) return NextResponse.json({ invoice: job.invoice });

    const invoiceNumber = await nextInvoiceNumber(business.id, business.invoicePrefix);

    const sourceItems = job.quote?.items.length
      ? job.quote.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
          lineTotalCents: i.lineTotalCents
        }))
      : [{ description: job.service, quantity: 1, unitPriceCents: 0, lineTotalCents: 0 }];

    const subtotalCents = sourceItems.reduce((s, i) => s + i.lineTotalCents, 0);
    const taxCents = Math.round((subtotalCents * business.taxRateBps) / 10000);

    const invoice = await prisma.invoice.create({
      data: {
        businessId: business.id,
        customerId: job.customerId,
        jobId: job.id,
        invoiceNumber,
        currency: business.currency,
        subtotalCents,
        discountCents: 0,
        taxCents,
        totalCents: subtotalCents + taxCents,
        items: {
          create: sourceItems.map((item, i) => ({ ...item, sortOrder: i }))
        }
      },
      include: { items: true }
    });

    await logActivity({
      businessId: business.id,
      userId,
      type: "job.converted_to_invoice",
      entityType: "invoice",
      entityId: invoice.id,
      metadata: { jobId: job.id }
    });

    return NextResponse.json({ invoice }, { status: 201 });
  });
}
