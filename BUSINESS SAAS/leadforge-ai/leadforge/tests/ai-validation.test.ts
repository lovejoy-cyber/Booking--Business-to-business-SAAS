import { describe, it, expect } from "vitest";
import { leadAnalysisSchema, quoteDraftSchema } from "@/lib/ai/functions";

describe("leadAnalysisSchema", () => {
  it("accepts a well-formed analysis", () => {
    const result = leadAnalysisSchema.safeParse({
      requestedService: "Interior painting",
      missingInformation: ["Number of rooms", "Preferred timeline"],
      followUpQuestions: ["How many rooms need painting?"],
      jobSizeEstimate: "unknown",
      urgency: "unknown",
      customerIntent: "Wants a price estimate for painting their house."
    });
    expect(result.success).toBe(true);
  });

  it("rejects a response with an invalid urgency enum value", () => {
    const result = leadAnalysisSchema.safeParse({
      requestedService: "Interior painting",
      missingInformation: [],
      followUpQuestions: [],
      jobSizeEstimate: "unknown",
      urgency: "extremely-urgent", // not one of the allowed enum values
      customerIntent: "Wants pricing."
    });
    expect(result.success).toBe(false);
  });

  it("rejects a response missing required fields", () => {
    const result = leadAnalysisSchema.safeParse({ requestedService: "Painting" });
    expect(result.success).toBe(false);
  });
});

describe("quoteDraftSchema", () => {
  it("accepts a sufficient draft with valid line items", () => {
    const result = quoteDraftSchema.safeParse({
      sufficient: true,
      lines: [
        {
          description: "Interior painting — 3 rooms",
          quantity: 3,
          unitPriceCents: 18000,
          basis: "Matched to your 'Interior painting per room' service"
        }
      ],
      rationale: "Customer specified 3 rooms; priced using your configured per-room rate."
    });
    expect(result.success).toBe(true);
  });

  it("accepts an insufficient-information response instead of forcing fabricated numbers", () => {
    const result = quoteDraftSchema.safeParse({
      sufficient: false,
      reason: "The inquiry doesn't specify square footage or room count.",
      stillNeeded: ["Number of rooms", "Approximate square footage"]
    });
    expect(result.success).toBe(true);
  });

  it("rejects a 'sufficient: true' draft with no line items", () => {
    const result = quoteDraftSchema.safeParse({
      sufficient: true,
      lines: [],
      rationale: "No basis for this."
    });
    expect(result.success).toBe(false);
  });

  it("rejects a line item with a negative price", () => {
    const result = quoteDraftSchema.safeParse({
      sufficient: true,
      lines: [{ description: "Paint", quantity: 1, unitPriceCents: -500, basis: "test" }],
      rationale: "test"
    });
    expect(result.success).toBe(false);
  });
});
