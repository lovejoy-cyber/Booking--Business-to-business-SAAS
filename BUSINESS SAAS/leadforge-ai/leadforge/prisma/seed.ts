import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@leadforge.ai";
const DEMO_PASSWORD = "demo1234";

async function main() {
  console.log("Seeding demo data…");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log(`Demo user already exists (${DEMO_EMAIL}). Skipping.`);
    return;
  }

  const user = await prisma.user.create({
    data: { name: "Alex Rivera", email: DEMO_EMAIL, passwordHash }
  });

  const business = await prisma.business.create({
    data: {
      name: "Coastal Painting Co.",
      category: "Painting",
      phone: "+1 555 010 2200",
      email: "hello@coastalpainting.example",
      address: "123 Harbor Rd, Cape Town",
      currency: "USD",
      taxLabel: "Sales Tax",
      taxRateBps: 750,
      quotePrefix: "Q",
      invoicePrefix: "INV",
      quoteTerms: "50% deposit due to schedule the job. Balance due on completion. Quote valid for 14 days.",
      depositPercent: 50,
      onboardingStep: 2
    }
  });

  await prisma.businessMember.create({ data: { userId: user.id, businessId: business.id, role: "OWNER" } });

  const services = await Promise.all([
    prisma.service.create({
      data: {
        businessId: business.id,
        name: "Interior painting — per room",
        unit: "room",
        defaultUnitPriceCents: 18000,
        description: "Two coats, standard paint, walls and trim included."
      }
    }),
    prisma.service.create({
      data: {
        businessId: business.id,
        name: "Wall prep & filler",
        unit: "job",
        defaultUnitPriceCents: 9500,
        description: "Patch holes, sand, and prep walls before painting."
      }
    }),
    prisma.service.create({
      data: {
        businessId: business.id,
        name: "Premium paint upgrade",
        unit: "room",
        defaultUnitPriceCents: 6000,
        description: "Upgrade to premium low-VOC paint."
      }
    }),
    prisma.service.create({
      data: {
        businessId: business.id,
        name: "Exterior painting — per 100 sqft",
        unit: "100 sqft",
        defaultUnitPriceCents: 22000,
        description: "Pressure wash, prime, and two coats exterior paint."
      }
    })
  ]);

  const customer1 = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: "Sarah Kim",
      phone: "+1 555 019 3321",
      email: "sarah.kim@example.com",
      address: "48 Ocean View Dr"
    }
  });

  const customer2 = await prisma.customer.create({
    data: { businessId: business.id, name: "Marcus Bell", phone: "+1 555 087 6612", email: "marcus.b@example.com" }
  });

  // Lead 1 — new, unanalyzed
  await prisma.lead.create({
    data: {
      businessId: business.id,
      customerName: "Priya Patel",
      phone: "+1 555 044 8890",
      source: "WHATSAPP",
      inquiryText: "Hi! How much would it cost to paint a 3-bedroom house, interior only?",
      status: "NEW",
      messages: { create: { sender: "CUSTOMER", body: "Hi! How much would it cost to paint a 3-bedroom house, interior only?" } }
    }
  });

  // Lead 2 — analyzed, linked to customer1, has an accepted quote -> job -> invoice
  const lead2 = await prisma.lead.create({
    data: {
      businessId: business.id,
      customerId: customer1.id,
      customerName: customer1.name,
      phone: customer1.phone,
      email: customer1.email,
      source: "WEBSITE_FORM",
      inquiryText: "Looking to repaint 3 bedrooms and touch up some wall damage before we sell the house.",
      serviceRequested: "Interior painting",
      location: "48 Ocean View Dr",
      status: "CONVERTED",
      aiAnalysis: {
        requestedService: "Interior painting",
        missingInformation: [],
        followUpQuestions: [],
        jobSizeEstimate: "medium",
        urgency: "medium",
        customerIntent: "Wants the house repainted and repaired ahead of a sale."
      },
      messages: {
        create: {
          sender: "CUSTOMER",
          body: "Looking to repaint 3 bedrooms and touch up some wall damage before we sell the house."
        }
      }
    }
  });

  const quote1 = await prisma.quote.create({
    data: {
      businessId: business.id,
      leadId: lead2.id,
      customerId: customer1.id,
      quoteNumber: "Q-0001",
      status: "ACCEPTED",
      currency: "USD",
      subtotalCents: 81500,
      discountCents: 0,
      taxCents: 6113,
      totalCents: 87613,
      depositCents: 43807,
      notes: "Includes wall prep for the damage near the hallway.",
      terms: business.quoteTerms,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      viewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      aiGenerated: true,
      aiRationale: "Matched to 3 rooms mentioned by the customer, using configured per-room pricing.",
      items: {
        create: [
          { description: services[0].name, quantity: 3, unitPriceCents: 18000, lineTotalCents: 54000, sortOrder: 0 },
          { description: services[1].name, quantity: 1, unitPriceCents: 9500, lineTotalCents: 9500, sortOrder: 1 },
          { description: services[2].name, quantity: 3, unitPriceCents: 6000, lineTotalCents: 18000, sortOrder: 2 }
        ]
      },
      events: {
        create: [
          { type: "CREATED", createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
          { type: "SENT", createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
          { type: "VIEWED", createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          { type: "ACCEPTED", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
        ]
      }
    }
  });

  const job1 = await prisma.job.create({
    data: {
      businessId: business.id,
      customerId: customer1.id,
      quoteId: quote1.id,
      service: services[0].name,
      status: "COMPLETED",
      scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      assignedWorker: "Diego"
    }
  });

  await prisma.invoice.create({
    data: {
      businessId: business.id,
      customerId: customer1.id,
      jobId: job1.id,
      invoiceNumber: "INV-0001",
      status: "PAID",
      currency: "USD",
      subtotalCents: 81500,
      discountCents: 0,
      taxCents: 6113,
      totalCents: 87613,
      paidAt: new Date(),
      items: {
        create: [
          { description: services[0].name, quantity: 3, unitPriceCents: 18000, lineTotalCents: 54000, sortOrder: 0 },
          { description: services[1].name, quantity: 1, unitPriceCents: 9500, lineTotalCents: 9500, sortOrder: 1 },
          { description: services[2].name, quantity: 3, unitPriceCents: 6000, lineTotalCents: 18000, sortOrder: 2 }
        ]
      }
    }
  });

  // Lead 3 — quote sent, awaiting response (shows up in follow-ups)
  const lead3 = await prisma.lead.create({
    data: {
      businessId: business.id,
      customerId: customer2.id,
      customerName: customer2.name,
      phone: customer2.phone,
      email: customer2.email,
      source: "PHONE",
      inquiryText: "Need the exterior of my house painted, about 1200 sqft total.",
      serviceRequested: "Exterior painting",
      status: "QUOTE_SENT"
    }
  });

  await prisma.quote.create({
    data: {
      businessId: business.id,
      leadId: lead3.id,
      customerId: customer2.id,
      quoteNumber: "Q-0002",
      status: "SENT",
      currency: "USD",
      subtotalCents: 264000,
      discountCents: 0,
      taxCents: 19800,
      totalCents: 283800,
      depositCents: 141900,
      terms: business.quoteTerms,
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            description: services[3].name,
            quantity: 12,
            unitPriceCents: 22000,
            lineTotalCents: 264000,
            sortOrder: 0
          }
        ]
      },
      events: { create: [{ type: "CREATED" }, { type: "SENT" }] }
    }
  });

  console.log("Demo data ready.");
  console.log(`Log in with: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
