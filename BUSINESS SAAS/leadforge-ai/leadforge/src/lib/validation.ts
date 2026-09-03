import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  businessName: z.string().min(1).max(160)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const businessUpdateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  category: z.string().max(80).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  currency: z.string().length(3).optional(),
  taxLabel: z.string().max(40).optional(),
  taxRateBps: z.number().int().min(0).max(3000).optional(),
  logoUrl: z.string().url().optional().nullable(),
  quotePrefix: z.string().max(10).optional(),
  invoicePrefix: z.string().max(10).optional(),
  quoteTerms: z.string().max(2000).optional().nullable(),
  depositPercent: z.number().int().min(0).max(100).optional(),
  onboardingStep: z.number().int().min(0).max(5).optional()
});

export const serviceSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional().nullable(),
  unit: z.string().min(1).max(20).default("job"),
  defaultUnitPriceCents: z.number().int().min(0).default(0)
});

export const leadCreateSchema = z.object({
  customerName: z.string().min(1).max(160),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().nullable(),
  source: z
    .enum(["MANUAL", "WEBSITE_FORM", "WHATSAPP", "PHONE", "EMAIL", "REFERRAL", "OTHER"])
    .default("MANUAL"),
  inquiryText: z.string().min(1).max(4000),
  serviceRequested: z.string().max(160).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  budgetCents: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(4000).optional().nullable()
});

export const leadUpdateSchema = leadCreateSchema.partial().extend({
  status: z
    .enum(["NEW", "CONTACTED", "QUALIFIED", "QUOTE_SENT", "ACCEPTED", "LOST", "CONVERTED"])
    .optional(),
  followUpAt: z.string().datetime().optional().nullable(),
  customerId: z.string().optional().nullable()
});

export const quoteItemSchema = z.object({
  description: z.string().min(1).max(300),
  quantity: z.number().positive().max(100000),
  unitPriceCents: z.number().int().min(0),
  discountCents: z.number().int().min(0).default(0)
});

export const quoteCreateSchema = z.object({
  leadId: z.string().optional().nullable(),
  customerId: z.string().min(1),
  items: z.array(quoteItemSchema).min(1),
  discountCents: z.number().int().min(0).default(0),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(2000).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  depositCents: z.number().int().min(0).default(0)
});

export const quoteUpdateSchema = quoteCreateSchema.partial().extend({
  status: z.enum(["DRAFT", "SENT", "VIEWED", "ACCEPTED", "CHANGES_REQUESTED", "EXPIRED"]).optional()
});

export const customerCreateSchema = z.object({
  name: z.string().min(1).max(160),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  notes: z.string().max(4000).optional().nullable()
});

export const jobCreateSchema = z.object({
  customerId: z.string().min(1),
  quoteId: z.string().optional().nullable(),
  service: z.string().min(1).max(160),
  scheduledAt: z.string().datetime().optional().nullable(),
  assignedWorker: z.string().max(160).optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});

export const jobUpdateSchema = jobCreateSchema.partial().extend({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional()
});

export const invoiceCreateSchema = z.object({
  customerId: z.string().min(1),
  jobId: z.string().optional().nullable(),
  items: z.array(quoteItemSchema.omit({ discountCents: true })).min(1),
  discountCents: z.number().int().min(0).default(0),
  dueAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});

export const invoiceUpdateSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE"]).optional(),
  dueAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});

export const analyzeLeadRequestSchema = z.object({
  leadId: z.string().min(1)
});

export const generateQuoteRequestSchema = z.object({
  leadId: z.string().min(1)
});

export const followUpMessageRequestSchema = z.object({
  leadId: z.string().min(1),
  tone: z.enum(["friendly", "professional", "short_whatsapp"])
});
