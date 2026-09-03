import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, logActivity } from "@/lib/tenant";
import { customerCreateSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const q = req.nextUrl.searchParams.get("q")?.trim();
    const customers = await prisma.customer.findMany({
      where: {
        businessId: business.id,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ customers });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    const data = customerCreateSchema.parse(await req.json());
    const customer = await prisma.customer.create({ data: { ...data, businessId: business.id } });
    await logActivity({
      businessId: business.id,
      userId,
      type: "customer.created",
      entityType: "customer",
      entityId: customer.id
    });
    return NextResponse.json({ customer }, { status: 201 });
  });
}
