import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError, logActivity } from "@/lib/tenant";
import { invoiceUpdateSchema } from "@/lib/validation";

async function loadOwned(businessId: string, id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, customer: true }
  });
  if (!invoice || invoice.businessId !== businessId) throw new ForbiddenError("Invoice not found");
  return invoice;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const invoice = await loadOwned(business.id, params.id);
    return NextResponse.json({ invoice });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    await loadOwned(business.id, params.id);
    const data = invoiceUpdateSchema.parse(await req.json());

    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        ...data,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        paidAt: data.status === "PAID" ? new Date() : undefined
      }
    });

    await logActivity({
      businessId: business.id,
      userId,
      type: data.status === "PAID" ? "invoice.paid" : "invoice.updated",
      entityType: "invoice",
      entityId: invoice.id
    });

    return NextResponse.json({ invoice });
  });
}
