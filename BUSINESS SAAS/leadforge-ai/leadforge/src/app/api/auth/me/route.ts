import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness } from "@/lib/tenant";

// Returns the signed-in user + their business — used by the dashboard shell on load.
export async function GET() {
  return withErrorHandling(async () => {
    const { userId, business, role } = await requireBusiness();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });
    return NextResponse.json({ user, business, role });
  });
}
