import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, logActivity } from "@/lib/tenant";
import { businessUpdateSchema } from "@/lib/validation";

export async function GET() {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    return NextResponse.json({ business });
  });
}

export async function PATCH(req: NextRequest) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    const data = businessUpdateSchema.parse(await req.json());

    const updated = await prisma.business.update({
      where: { id: business.id },
      data
    });

    await logActivity({
      businessId: business.id,
      userId,
      type: "business.updated",
      entityType: "business",
      entityId: business.id,
      metadata: { fields: Object.keys(data) }
    });

    return NextResponse.json({ business: updated });
  });
}
