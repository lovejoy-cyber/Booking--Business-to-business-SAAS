import { z } from "zod";
import { getAIProvider } from "./provider";

/** Strips markdown code fences if the model wraps its JSON in them despite instructions. */
function stripFences(text: string): string {
  return text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
}

function parseJson<T>(text: string, schema: z.ZodSchema<T>): T {
  const cleaned = stripFences(text);
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    throw new Error("AI response was not valid JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`AI response failed validation: ${result.error.message}`);
  }
  return result.data;
}

// ---------- analyzeLead ----------

export const leadAnalysisSchema = z.object({
  requestedService: z.string(),
  missingInformation: z.array(z.string()),
  followUpQuestions: z.array(z.string()).max(6),
  jobSizeEstimate: z.enum(["unknown", "small", "medium", "large"]),
  urgency: z.enum(["unknown", "low", "medium", "high"]),
  customerIntent: z.string()
});
export type LeadAnalysis = z.infer<typeof leadAnalysisSchema>;

export async function analyzeLead(params: {
  inquiryText: string;
  serviceRequested?: string | null;
  businessCategory?: string | null;
}): Promise<LeadAnalysis> {
  const provider = getAIProvider();
  const system = `You analyze incoming customer inquiries for a small home-service business (category: ${
    params.businessCategory ?? "general home services"
  }). You NEVER invent measurements, prices, appointment times, or any fact the customer did not state. You only identify what is known, what is missing, and what should be asked next. Respond with ONLY a single JSON object, no markdown, no commentary, matching exactly this shape: {"requestedService": string, "missingInformation": string[], "followUpQuestions": string[] (max 6, concrete and specific to this inquiry), "jobSizeEstimate": "unknown"|"small"|"medium"|"large", "urgency": "unknown"|"low"|"medium"|"high", "customerIntent": string (one sentence)}. If the inquiry does not give enough detail to judge size or urgency, use "unknown" rather than guessing.`;

  const prompt = `Customer inquiry:\n"""${params.inquiryText}"""\n${
    params.serviceRequested ? `Service already tagged by the business: ${params.serviceRequested}` : ""
  }`;

  const text = await provider.complete({ system, prompt, maxTokens: 600 });
  return parseJson(text, leadAnalysisSchema);
}

// ---------- generateQuoteDraft ----------

export const quoteDraftLineSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().min(0),
  basis: z.string() // plain-language justification, e.g. "matched to your 'Interior painting per room' service"
});

export const quoteDraftSchema = z.discriminatedUnion("sufficient", [
  z.object({
    sufficient: z.literal(true),
    lines: z.array(quoteDraftLineSchema).min(1),
    rationale: z.string()
  }),
  z.object({
    sufficient: z.literal(false),
    reason: z.string(),
    stillNeeded: z.array(z.string())
  })
]);
export type QuoteDraft = z.infer<typeof quoteDraftSchema>;

export async function generateQuoteDraft(params: {
  inquiryText: string;
  leadNotes?: string | null;
  services: { name: string; unit: string; defaultUnitPriceCents: number; description?: string | null }[];
  currency: string;
}): Promise<QuoteDraft> {
  const provider = getAIProvider();

  const system = `You draft price quotes for a small home-service business using ONLY the business's own configured services and prices below — you must never invent a price that isn't derived from this list, and you must never invent job details the customer didn't provide. Quantities you infer (e.g. number of rooms mentioned by the customer) must be traceable to something stated in the inquiry. Currency is ${params.currency}; all unit prices are in integer cents. If the inquiry does not contain enough information to responsibly select quantities and services — for example no size, room count, or scope is given — you must return the insufficient-information shape rather than guessing. Respond with ONLY one JSON object, no markdown, matching exactly one of these two shapes:\n1) {"sufficient": true, "lines": [{"description": string, "quantity": number, "unitPriceCents": integer, "basis": string}], "rationale": string}\n2) {"sufficient": false, "reason": string, "stillNeeded": string[]}`;

  const servicesList = params.services
    .map(
      (s) =>
        `- ${s.name} (unit: ${s.unit}, price per unit: ${s.defaultUnitPriceCents} cents)${
          s.description ? ` — ${s.description}` : ""
        }`
    )
    .join("\n");

  const prompt = `Business services and pricing:\n${servicesList || "(no services configured yet)"}\n\nCustomer inquiry:\n"""${params.inquiryText}"""\n${
    params.leadNotes ? `Additional notes from the business owner:\n${params.leadNotes}` : ""
  }`;

  const text = await provider.complete({ system, prompt, maxTokens: 900 });
  return parseJson(text, quoteDraftSchema);
}

// ---------- generateFollowUpMessage ----------

const toneInstructions: Record<string, string> = {
  friendly: "Warm, personable, still professional. 2-4 sentences.",
  professional: "Polished and businesslike, no slang. 2-4 sentences.",
  short_whatsapp: "Very short, casual, WhatsApp style, 1-2 sentences, fine to use an emoji sparingly."
};

export async function generateFollowUpMessage(params: {
  tone: "friendly" | "professional" | "short_whatsapp";
  customerName: string;
  businessName: string;
  context: string; // e.g. "Quote #Q-0004 sent 3 days ago, not yet viewed"
}): Promise<string> {
  const provider = getAIProvider();
  const system = `You write short follow-up messages on behalf of a small business owner, to send to their own customer. Style: ${toneInstructions[params.tone]} Never invent commitments, discounts, or promises the business hasn't stated. Respond with plain message text only — no JSON, no quotation marks, no preamble.`;
  const prompt = `Business: ${params.businessName}\nCustomer: ${params.customerName}\nSituation: ${params.context}\n\nWrite the follow-up message.`;
  const text = await provider.complete({ system, prompt, maxTokens: 300 });
  return text.trim();
}

// ---------- summarizeCustomer ----------

export async function summarizeCustomer(params: {
  customerName: string;
  factsText: string; // pre-formatted plain text of leads/quotes/jobs/invoices — Claude never invents beyond this
}): Promise<string> {
  const provider = getAIProvider();
  const system = `You summarize a business's relationship with one customer for the owner, using ONLY the facts provided. Do not add outcomes, amounts, or events that aren't in the facts. 3-5 sentences, plain text, no headers, no JSON.`;
  const prompt = `Customer: ${params.customerName}\n\nFacts:\n${params.factsText}\n\nWrite the summary.`;
  const text = await provider.complete({ system, prompt, maxTokens: 300 });
  return text.trim();
}

// ---------- generateServiceDescription ----------

export async function generateServiceDescription(params: {
  serviceName: string;
  businessCategory?: string | null;
}): Promise<string> {
  const provider = getAIProvider();
  const system = `You write a single, concise, professional one-sentence description of a service line item for a small ${
    params.businessCategory ?? "home-service"
  } business's price list. No pricing claims, no guarantees, plain text only.`;
  const prompt = `Service name: ${params.serviceName}\n\nWrite the description.`;
  const text = await provider.complete({ system, prompt, maxTokens: 120 });
  return text.trim();
}
