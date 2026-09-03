import { describe, it, expect } from "vitest";
import {
  leadCreateSchema,
  quoteCreateSchema,
  signupSchema,
  quoteItemSchema
} from "@/lib/validation";

describe("signupSchema", () => {
  it("accepts a valid signup payload", () => {
    const result = signupSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "supersecret1",
      businessName: "Jane's Painting"
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signupSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "short",
      businessName: "Jane's Painting"
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({
      name: "Jane Doe",
      email: "not-an-email",
      password: "supersecret1",
      businessName: "Jane's Painting"
    });
    expect(result.success).toBe(false);
  });
});

describe("leadCreateSchema", () => {
  it("accepts a minimal valid lead", () => {
    const result = leadCreateSchema.safeParse({
      customerName: "Sarah K.",
      inquiryText: "How much to paint a 3 bedroom house?"
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty inquiry", () => {
    const result = leadCreateSchema.safeParse({ customerName: "Sarah K.", inquiryText: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid lead source", () => {
    const result = leadCreateSchema.safeParse({
      customerName: "Sarah K.",
      inquiryText: "Hello",
      source: "CARRIER_PIGEON"
    });
    expect(result.success).toBe(false);
  });
});

describe("quoteItemSchema", () => {
  it("rejects a negative unit price", () => {
    const result = quoteItemSchema.safeParse({ description: "Paint", quantity: 1, unitPriceCents: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects a zero or negative quantity", () => {
    const result = quoteItemSchema.safeParse({ description: "Paint", quantity: 0, unitPriceCents: 100 });
    expect(result.success).toBe(false);
  });
});

describe("quoteCreateSchema", () => {
  it("requires at least one line item", () => {
    const result = quoteCreateSchema.safeParse({ customerId: "abc", items: [] });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed quote", () => {
    const result = quoteCreateSchema.safeParse({
      customerId: "abc",
      items: [{ description: "Interior painting", quantity: 3, unitPriceCents: 18000 }]
    });
    expect(result.success).toBe(true);
  });
});
