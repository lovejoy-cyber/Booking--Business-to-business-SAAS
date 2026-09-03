# LeadForge AI

Turn customer inquiries into paying jobs. An AI sales assistant for small home-service
businesses (painters, electricians, plumbers, cleaners, handymen, and similar trades) that
takes a customer inquiry from first message through quote, job, and paid invoice.

This README is the full deliverable: architecture, setup, deployment, security checklist,
known limitations, and a concrete plan for your first 10 paying customers.

---

## 1. Architecture

**Stack:** Next.js 14 (App Router, TypeScript) · PostgreSQL · Prisma · Tailwind CSS ·
`@react-pdf/renderer` · Anthropic API (Claude) for AI features.

One deployable app — no separate backend service. Next.js API routes (`src/app/api/**`) are
the server; React Server/Client Components (`src/app/**`) are the UI.

```
src/
  app/
    page.tsx                landing page
    login/, signup/         auth pages (outside the dashboard, unprotected)
    dashboard/              the whole product, behind middleware.ts auth
      leads/  quotes/  customers/  jobs/  invoices/  settings/  onboarding/
    quote/[publicId]/       public, unauthenticated customer-facing quote page
    api/                    every server route — see section 3
  lib/
    prisma.ts               Prisma client singleton
    auth.ts                 password hashing + signed session cookie
    tenant.ts               requireBusiness() — the ONE place tenant scope is resolved
    money.ts                integer-cents math (see section 5)
    validation.ts           every zod input schema
    numbering.ts            sequential quote/invoice numbers per business
    ai/
      provider.ts           AIProvider interface + Anthropic implementation
      functions.ts          analyzeLead, generateQuoteDraft, generateFollowUpMessage,
                             summarizeCustomer, generateServiceDescription
    pdf/documents.tsx        React-PDF templates shared by quote & invoice PDFs
  components/                shared UI (status badges, empty states, toasts, shell)
  middleware.ts               edge auth check protecting /dashboard/*
prisma/
  schema.prisma              full relational schema
  seed.ts                    demo data (see section 6)
tests/                        vitest — money math, validation, AI-output validation
```

**Data flow for the core story:** a `Lead` is created from an inquiry → AI `analyzeLead()`
labels what's known/missing → AI `generateQuoteDraft()` proposes line items strictly from the
business's own `Service` price list (never invented) → the owner reviews/edits in the quote
builder → a `Quote` is created with server-computed totals → sent → the customer views/accepts
it on the public `/quote/[publicId]` page → `Job` is created from the accepted quote →
`Invoice` is created from the completed job.

---

## 2. Database schema

17 models in `prisma/schema.prisma`: `User`, `Business`, `BusinessMember` (many-to-many with a
role, so multi-user businesses work later without a schema change), `Customer`, `Lead`,
`LeadMessage`, `Service`, `Quote`, `QuoteItem`, `QuoteEvent`, `Job`, `Invoice`, `InvoiceItem`,
`FollowUp`, `ActivityEvent` (audit log).

Every tenant-owned table carries `businessId` directly (not just through a relation), so every
query is a flat `where: { businessId }` — see section 4 for how that's enforced.

---

## 3. API surface

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/signup`, `login`, `logout`, `GET /api/auth/me` |
| Business | `GET/PATCH /api/business` |
| Services | `GET/POST /api/services`, `PATCH/DELETE /api/services/:id` |
| Customers | `GET/POST /api/customers`, `GET/PATCH /api/customers/:id`, `POST /api/customers/:id/summarize` (AI) |
| Leads | `GET/POST /api/leads`, `GET/PATCH /api/leads/:id`, `POST /api/leads/:id/analyze` (AI) |
| Quotes | `GET/POST /api/quotes`, `GET/PATCH /api/quotes/:id`, `POST /api/quotes/generate` (AI), `POST /api/quotes/:id/send`, `GET /api/quotes/:id/pdf`, `POST /api/quotes/:id/convert-to-job` |
| Public quote | `GET /api/public/quotes/:publicId`, `POST .../accept`, `POST .../request-changes`, `GET .../pdf` |
| Jobs | `GET/POST /api/jobs`, `GET/PATCH /api/jobs/:id`, `POST /api/jobs/:id/convert-to-invoice` |
| Invoices | `GET/POST /api/invoices`, `GET/PATCH /api/invoices/:id`, `GET /api/invoices/:id/pdf` |
| Follow-ups | `GET /api/followups` |
| AI | `POST /api/ai/follow-up-message`, `POST /api/ai/service-description` |
| Analytics | `POST /api/analytics/events` |

---

## 4. Security model

- **Auth:** bcrypt-hashed passwords, signed HttpOnly JWT session cookie (`jose`), never
  readable or forgeable from the client.
- **Tenant isolation:** `requireBusiness()` in `src/lib/tenant.ts` resolves the caller's
  business **from the session**, never from a client-supplied `businessId`. Every API route
  calls it first and filters every Prisma query by the returned `business.id`. Every
  single-record route (`/api/leads/:id`, `/api/quotes/:id`, etc.) additionally checks
  `record.businessId === business.id` before returning or mutating it — see the `loadOwned` /
  `assertOwnership` helpers in each route file.
- **Public routes are the one deliberate exception:** `/api/public/quotes/[publicId]/*` are
  unauthenticated by design (the customer never has an account) and are reachable only by
  knowing the unguessable `publicId` (a `cuid()`, not the sequential quote number).
- **Server-side authorization only** — the client never decides what it's allowed to see;
  it just renders what the API returns.
- **Input validation:** every mutating route parses its body through a zod schema
  (`src/lib/validation.ts`) before touching the database.
- **Money:** stored and calculated exclusively in integer cents (`src/lib/money.ts`) — see
  section 5.
- **Audit log:** `ActivityEvent` records every meaningful state change (lead created/analyzed,
  quote sent/accepted, invoice paid, etc.) with the acting user, for later review.
- **Secrets:** only ever read from `process.env` on the server; nothing sensitive is sent to
  the client bundle.

### Security checklist before you take real payments
- [ ] Rotate `AUTH_SECRET` to a fresh 32+ byte random value in production (never reuse the
      example).
- [ ] Put the app behind HTTPS (Vercel/most hosts do this automatically).
- [ ] Add rate limiting in front of `/api/auth/login` and `/api/auth/signup` (e.g. Vercel Edge
      Config + a simple IP counter, or a service like Upstash Ratelimit) — not yet included.
- [ ] Add a password reset flow (see Limitations — not built yet).
- [ ] Review the logo-upload size limit (`300KB`, client-enforced) if you expect larger files.
- [ ] Connect a real payment provider before enabling paid plans (see Limitations).

---

## 5. Money handling

All prices, discounts, tax, and totals are integers in minor units (cents), never floats.
`src/lib/money.ts` is the single source of truth for line totals, subtotal, discount, and tax
math, and it's used **identically** on the server (source of truth) and the client (live
preview in the quote builder) — see `tests/money.test.ts` for the specific rounding and
floating-point-drift cases this protects against.

---

## 6. Local development

```bash
cp .env.example .env        # fill in DATABASE_URL and ANTHROPIC_API_KEY at minimum
npm install
npm run db:migrate          # creates tables from prisma/schema.prisma
npm run db:seed             # optional — creates a demo business, see below
npm run dev                 # http://localhost:3000
```

**Demo login** (after `npm run db:seed`): `demo@leadforge.ai` / `demo1234` — a populated
account (Coastal Painting Co.) with services, a fresh unanalyzed lead, a lead with an
AI-analyzed accepted quote → completed job → paid invoice, and a lead with a quote awaiting
response, so every stage of the journey is visible immediately.

Any managed Postgres works for `DATABASE_URL`: [Neon](https://neon.tech),
[Supabase](https://supabase.com), Railway, or RDS all have a working free/low tier.

---

## 7. Running tests

```bash
npm test
```

Covers: money/tax/discount calculation and rounding (`tests/money.test.ts`), API input
validation (`tests/validation.test.ts`), and AI-output validation — confirming malformed or
incomplete model responses are rejected rather than silently accepted
(`tests/ai-validation.test.ts`). These are unit tests with no external dependencies, so they
run without a database or API key.

---

## 8. Production deployment

**Recommended path (fastest to a real URL):**

1. Push this code to a GitHub repo.
2. Create a Postgres database on [Neon](https://neon.tech) or [Supabase](https://supabase.com)
   (both have generous free tiers) and copy the connection string.
3. Import the repo into [Vercel](https://vercel.com/new).
4. In Vercel's project settings, add environment variables from `.env.example`:
   `DATABASE_URL`, `AUTH_SECRET` (generate with `openssl rand -base64 32`), `APP_URL` (your
   Vercel URL), `ANTHROPIC_API_KEY`, `AI_MODEL`.
5. Add a build step to run migrations: in `package.json`, Vercel will run `npm run build`;
   add `"postinstall": "prisma generate"` (already implied by the `prisma` dependency) and run
   `npm run db:deploy` once manually (via `vercel env pull` + local `npx prisma migrate
   deploy`, or a one-off Vercel deploy hook) before the first real deploy.
6. Deploy. Visit `/signup` and create your first real business account.

This architecture isn't Vercel-specific — it runs anywhere that supports Node.js and outbound
HTTPS (Railway, Render, Fly.io, a plain VPS with `npm run build && npm start` behind a
reverse proxy all work identically).

---

## 9. Environment variables

See `.env.example` for the full list with comments. At minimum you need `DATABASE_URL`,
`AUTH_SECRET`, and `ANTHROPIC_API_KEY` to run every feature. `STRIPE_*` variables are present
but unused until you wire up billing (see Limitations).

---

## 10. AI provider configuration

`src/lib/ai/provider.ts` defines an `AIProvider` interface with one method, `complete()`. The
app is built against `AnthropicProvider`, using `ANTHROPIC_API_KEY` and `AI_MODEL` (defaults to
`claude-sonnet-4-6`). To swap providers (e.g. OpenAI), write a new class implementing the same
interface and change the one factory function `getAIProvider()` — nothing else in the app
needs to change, since every feature calls the functions in `src/lib/ai/functions.ts`, never
the provider directly.

Every AI function is instructed to refuse to fabricate facts, prices, or measurements the
customer didn't provide, and returns a structured, zod-validated shape — `generateQuoteDraft`
explicitly returns `{ sufficient: false, reason, stillNeeded }` instead of guessing when the
inquiry doesn't have enough information.

---

## 11. Known limitations (be upfront about these with a customer)

- **No password reset flow yet** — only signup/login/logout. Add a token-based reset endpoint
  before onboarding customers who might forget passwords (likely all of them, eventually).
- **Payments are stubbed, not integrated.** The pricing page and tiers are UI-only; there's no
  Stripe Checkout/webhook wiring yet. This was deliberately cut from the MVP per the
  "don't overbuild" directive — wire up Stripe (or a regional equivalent) once you have a
  customer ready to pay, so you build against their actual card, not a guess.
  Environment variables are pre-declared and the schema has no billing tables yet, since
  a subscription/plan model wasn't specified.
- **WhatsApp integration is manual, not automated.** The app drafts follow-up messages and
  gives you a copy button; it does not send via the WhatsApp Business API. This matches the
  spec's explicit instruction not to build unofficial WhatsApp automation.
- **Logos are stored as data URLs** (small base64-encoded images in the database), not in
  object storage (S3/R2/Vercel Blob). This is fine for a single small logo per business, but
  swap to real object storage before allowing multiple/larger uploaded documents.
- **Existing quotes can't be re-edited after creation** — only their status changes (send,
  and the customer's accept/request-changes). To change line items after creation today, the
  fastest path is creating a new quote. A dedicated "edit quote" screen sharing the builder's
  logic is the natural next feature.
- **No multi-business-member UI yet.** The schema supports multiple `BusinessMember`s per
  business (for a future "invite a teammate" feature), but there's no invite flow built.
- **No automated e-mail/SMS delivery.** "Send" marks a quote `SENT` and gives you a copyable
  public link + PDF; actually emailing/texting that link is a manual step today (or something
  you wire up with Resend/Twilio/etc. next).
- **Analytics is a minimal internal event log**, not a real product-analytics tool. Swap
  `src/app/api/analytics/events/route.ts` for PostHog/Amplitude/Segment when you want funnels
  and dashboards.
- **No automated rate limiting** on auth endpoints yet (see security checklist).

None of these block a first real customer from receiving inquiries, getting AI-assisted
quotes, and getting paid — they're the deliberate scope cuts that kept this buildable as an
MVP rather than a platform.

---

## 12. Your first 10 customers

1. **Start with people you can talk to, not cold ads.** Home-service business owners are busy
   and skeptical of software; a warm introduction (a tradesperson you already know, a local
   Facebook trade group, a hardware store noticeboard) converts far better than paid traffic
   at this stage.
2. **Pick one trade to focus on first** — painters are a strong first vertical because pricing
   is relatively formulaic (per room / per sqft), which makes the AI quote drafts genuinely
   accurate out of the box.
3. **Do the onboarding call yourself.** For your first 10, personally set up their business
   profile and services with them on a 15-minute call — you'll learn exactly which
   onboarding fields are confusing before a self-serve user ever hits them.
4. **Lead with the demo, not the pitch.** Open your own phone, paste in a real inquiry they've
   actually received, and generate a quote live in front of them. The 3-minute demo described
   in the spec is your entire sales pitch — you don't need slides.
5. **Ask for the referral immediately after their first accepted quote**, not weeks later —
   that's the moment they're most impressed, and most tradespeople know several peers in the
   same trade.
6. **Offer the first month free in exchange for one specific thing**: a short testimonial or a
   screen-recording of them using it, once they've sent at least 3 real quotes. This is what
   replaces the "testimonials placeholder" on the landing page.
7. **Watch quote acceptance rate, not signups.** A business that signs up but never sends a
   quote isn't a customer yet — the `activity_events` log lets you see exactly where someone
   drops off (created a lead but never generated a quote? sent a quote but never followed up?)
   and follow up personally.
8. **Charge from day one for customer #6 onward.** Free customers 1-5 buy you case studies and
   bug reports; a business that won't pay $12-15/month once they've seen it work isn't
   validating the product.
9. **Build the WhatsApp send-integration next**, not more dashboard features — it's the
   single most-requested "automate this for me" moment your early users will hit, since
   most inquiries in this vertical already arrive over WhatsApp.
10. **Track "time from inquiry to quote sent"** per customer if you can (a simple report over
    `ActivityEvent` timestamps) — this is your core value metric, and a shrinking number over
    time is the clearest proof this product is working for them.
