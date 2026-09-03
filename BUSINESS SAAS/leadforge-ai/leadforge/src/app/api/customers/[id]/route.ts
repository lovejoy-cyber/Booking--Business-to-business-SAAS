import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError, logActivity } from "@/lib/tenant";
import { customerCreateSchema } from "@/lib/validation";

async function loadOwned(businessId: string, id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      leads: { orderBy: { createdAt: "desc" } },
      quotes: { orderBy: { createdAt: "desc" } },
      jobs: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!customer || customer.businessId !== businessId) {
    throw new ForbiddenError("Customer not found");
  }
  return customer;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const customer = await loadOwned(business.id, params.id);
    return NextResponse.json({ customer });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    await loadOwned(business.id, params.id);
    const data = customerCreateSchema.partial().parse(await req.json());
    const customer = await prisma.customer.update({ where: { id: params.id }, data });
    await logActivity({
      businessId: business.id,
      userId,
      type: "customer.updated",
      entityType: "customer",
      entityId: customer.id
    });
    return NextResponse.json({ customer });
  });
}
