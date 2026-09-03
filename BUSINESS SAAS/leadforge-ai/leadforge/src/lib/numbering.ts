import { prisma } from "@/lib/prisma";

export async function nextQuoteNumber(businessId: string, prefix: string): Promise<string> {
  const count = await prisma.quote.count({ where: { businessId } });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export async function nextInvoiceNumber(businessId: string, prefix: string): Promise<string> {
  const count = await prisma.invoice.count({ where: { businessId } });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}
