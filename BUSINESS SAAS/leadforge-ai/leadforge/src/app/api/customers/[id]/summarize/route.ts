import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness, ForbiddenError } from "@/lib/tenant";
import { summarizeCustomer } from "@/lib/ai/functions";
import { formatCents } from "@/lib/money";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: { leads: true, quotes: true, jobs: true, invoices: true }
    });
    if (!customer || customer.businessId !== business.id) {
      throw new ForbiddenError("Customer not found");
    }

    // Build a plain-facts block — the AI is only allowed to summarize this, never add to it.
    const facts = [
      `${customer.leads.length} lead(s): ${customer.leads.map((l) => `"${l.inquiryText.slice(0, 80)}" (${l.status})`).join("; ") || "none"}`,
      `${customer.quotes.length} quote(s): ${customer.quotes.map((q) => `${q.quoteNumber} ${formatCents(q.totalCents, q.currency)} (${q.status})`).join("; ") || "none"}`,
      `${customer.jobs.length} job(s): ${customer.jobs.map((j) => `${j.service} (${j.status})`).join("; ") || "none"}`,
      `${customer.invoices.length} invoice(s): ${customer.invoices.map((i) => `${i.invoiceNumber} ${formatCents(i.totalCents, i.currency)} (${i.status})`).join("; ") || "none"}`
    ].join("\n");

    const summary = await summarizeCustomer({ customerName: customer.name, factsText: facts });
    return NextResponse.json({ summary });
  });
}
