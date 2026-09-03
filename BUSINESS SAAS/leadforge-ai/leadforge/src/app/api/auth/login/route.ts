import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { withErrorHandling } from "@/lib/api-helpers";

const GENERIC_ERROR = "Incorrect email or password.";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = loginSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    await createSessionCookie({ userId: user.id });
    return NextResponse.json({ ok: true });
  });
}
