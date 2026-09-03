import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionCookie } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";
import { withErrorHandling } from "@/lib/api-helpers";
import { logActivity } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = signupSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(body.password);

    const { user, business } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: body.name, email: body.email.toLowerCase(), passwordHash }
      });
      const business = await tx.business.create({
        data: { name: body.businessName, onboardingStep: 0 }
      });
      await tx.businessMember.create({
        data: { userId: user.id, businessId: business.id, role: "OWNER" }
      });
      return { user, business };
    });

    await logActivity({
      businessId: business.id,
      userId: user.id,
      type: "business.created",
      entityType: "business",
      entityId: business.id
    });

    await createSessionCookie({ userId: user.id });

    return NextResponse.json({ ok: true, businessId: business.id });
  });
}
