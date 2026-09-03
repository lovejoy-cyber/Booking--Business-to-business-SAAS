import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/api-helpers";
import { requireBusiness } from "@/lib/tenant";
import { generateServiceDescription } from "@/lib/ai/functions";

const bodySchema = z.object({ serviceName: z.string().min(1).max(160) });

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const { business } = await requireBusiness();
    const { serviceName } = bodySchema.parse(await req.json());
    const description = await generateServiceDescription({
      serviceName,
      businessCategory: business.category
    });
    return NextResponse.json({ description });
  });
}
