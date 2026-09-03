import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth";

const EVENT_NAMES = [
  "signup",
  "onboarding_completed",
  "lead_created",
  "quote_created",
  "quote_sent",
  "quote_viewed",
  "quote_accepted",
  "job_created",
  "invoice_created",
  "subscription_started"
] as const;

const bodySchema = z.object({
  event: z.enum(EVENT_NAMES),
  metadata: z.record(z.unknown()).optional()
});

// A minimal, dependency-free product analytics sink. Swap this for
// PostHog/Amplitude/Segment later without touching call sites — every event
// in the app goes through this one route.
export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const { event, metadata } = bodySchema.parse(await req.json());
    const session = await getSession();

    let businessId: string | null = null;
    if (session) {
      const membership = await prisma.businessMember.findFirst({ where: { userId: session.userId } });
      businessId = membership?.businessId ?? null;
    }

    if (businessId) {
      await prisma.activityEvent.create({
        data: {
          businessId,
          userId: session?.userId,
          type: `analytics.${event}`,
          entityType: "analytics",
          entityId: event,
          metadata: metadata as any
        }
      });
    }

    return NextResponse.json({ ok: true });
  });
}
