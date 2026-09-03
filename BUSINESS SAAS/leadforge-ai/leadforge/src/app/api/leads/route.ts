import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, logActivity } from "@/lib/tenant";
import { leadCreateSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const q = req.nextUrl.searchParams.get("q")?.trim();

    const leads = await prisma.lead.findMany({
      where: {
        businessId: business.id,
        ...(status ? { status: status as any } : {}),
        ...(q
          ? {
              OR: [
                { customerName: { contains: q, mode: "insensitive" } },
                { inquiryText: { contains: q, mode: "insensitive" } },
                { serviceRequested: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ leads });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    const data = leadCreateSchema.parse(await req.json());

    const lead = await prisma.lead.create({
      data: { ...data, businessId: business.id }
    });
    await prisma.leadMessage.create({
      data: { leadId: lead.id, sender: "CUSTOMER", body: data.inquiryText }
    });
    await logActivity({
      businessId: business.id,
      userId,
      type: "lead.created",
      entityType: "lead",
      entityId: lead.id
    });

    return NextResponse.json({ lead }, { status: 201 });
  });
}
