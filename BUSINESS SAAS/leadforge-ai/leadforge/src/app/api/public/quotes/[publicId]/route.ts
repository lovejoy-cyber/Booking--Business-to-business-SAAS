import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";

// Public, unauthenticated — reachable only by knowing the unguessable publicId.
// First fetch after sending flips the quote to VIEWED and logs a QuoteEvent.
export async function GET(_req: Request, { params }: { params: { publicId: string } }) {
  return withErrorHandling(async () => {
    const quote = await prisma.quote.findUnique({
      where: { publicId: params.publicId },
      include: {
        items: true,
        customer: true,
        business: {
          select: { name: true, logoUrl: true, phone: true, email: true, address: true, taxLabel: true }
        }
      }
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const isExpired = quote.expiresAt ? quote.expiresAt.getTime() < Date.now() : false;
    if (isExpired && quote.status !== "EXPIRED" && quote.status !== "ACCEPTED") {
      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: "EXPIRED", events: { create: { type: "EXPIRED" } } }
      });
      quote.status = "EXPIRED";
    } else if (quote.status === "SENT") {
      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: "VIEWED", viewedAt: new Date(), events: { create: { type: "VIEWED" } } }
      });
      quote.status = "VIEWED";
      quote.viewedAt = new Date();
    }

    return NextResponse.json({ quote });
  });
}
