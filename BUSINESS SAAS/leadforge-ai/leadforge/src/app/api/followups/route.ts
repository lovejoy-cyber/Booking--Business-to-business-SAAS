import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness } from "@/lib/tenant";

// Leads/quotes that need follow-up: quotes sent 2+ days ago with no response,
// plus any explicit followUpAt set on a lead.
export async function GET(_req: NextRequest) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const staleQuotes = await prisma.quote.findMany({
      where: {
        businessId: business.id,
        status: { in: ["SENT", "VIEWED"] },
        createdAt: { lte: twoDaysAgo }
      },
      include: { customer: true },
      orderBy: { createdAt: "asc" }
    });

    const dueLeads = await prisma.lead.findMany({
      where: {
        businessId: business.id,
        followUpAt: { lte: new Date() },
        status: { notIn: ["LOST", "CONVERTED"] }
      },
      orderBy: { followUpAt: "asc" }
    });

    return NextResponse.json({ staleQuotes, dueLeads });
  });
}
