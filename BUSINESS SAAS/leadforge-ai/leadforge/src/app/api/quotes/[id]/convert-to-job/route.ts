import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError, logActivity } from "@/lib/tenant";

// "Convert to Job" button — only valid from an ACCEPTED quote.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business, userId } = await requireBusiness();
    const quote = await prisma.quote.findUnique({ where: { id: params.id } });
    if (!quote || quote.businessId !== business.id) throw new ForbiddenError("Quote not found");
    if (quote.status !== "ACCEPTED") {
      return NextResponse.json({ error: "Only accepted quotes can become jobs." }, { status: 400 });
    }

    const existingJob = await prisma.job.findUnique({ where: { quoteId: quote.id } });
    if (existingJob) {
      return NextResponse.json({ job: existingJob });
    }

    const firstItem = await prisma.quoteItem.findFirst({
      where: { quoteId: quote.id },
      orderBy: { sortOrder: "asc" }
    });

    const job = await prisma.job.create({
      data: {
        businessId: business.id,
        customerId: quote.customerId,
        quoteId: quote.id,
        service: firstItem?.description ?? "Job from " + quote.quoteNumber
      }
    });

    if (quote.leadId) {
      await prisma.lead.update({ where: { id: quote.leadId }, data: { status: "CONVERTED" } });
    }

    await logActivity({
      businessId: business.id,
      userId,
      type: "quote.converted_to_job",
      entityType: "job",
      entityId: job.id,
      metadata: { quoteId: quote.id }
    });

    return NextResponse.json({ job }, { status: 201 });
  });
}
