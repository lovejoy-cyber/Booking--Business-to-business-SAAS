import Link from "next/link";
import { HeroDemo } from "@/components/HeroDemo";

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Capture the inquiry",
    body: "Log a customer message from WhatsApp, email, phone, or your website form in seconds."
  },
  {
    step: "2",
    title: "Let AI ask the right questions",
    body: "LeadForge flags what's missing — room count, size, timeline — before you quote blind."
  },
  {
    step: "3",
    title: "Review a draft quote",
    body: "AI drafts pricing from your own price list. You edit or approve — it never sends anything on its own."
  },
  {
    step: "4",
    title: "Send, get accepted, get paid",
    body: "Customers view and accept online. Accepted quotes become jobs, jobs become invoices."
  }
];

const FEATURES = [
  { title: "Lead inbox", body: "Every inquiry in one list, with status, source, and follow-up dates." },
  { title: "AI quote drafts", body: "Built from your services and prices — never invented numbers." },
  { title: "Branded quote pages", body: "A clean, shareable page your customer can view and accept from their phone." },
  { title: "Job tracking", body: "Accepted quotes convert into scheduled jobs with one click." },
  { title: "Invoicing", body: "Turn a completed job into an invoice without re-typing anything." },
  { title: "Follow-up nudges", body: "See exactly which quotes have gone quiet, with a drafted message ready to send." }
];

const FAQS = [
  {
    q: "Does the AI ever make up prices?",
    a: "No. AI-drafted quotes only use services and prices you've configured. If it doesn't have enough information, it tells you that instead of guessing."
  },
  {
    q: "Do quotes get sent automatically?",
    a: "No. You review every AI draft before it goes out. LeadForge never contacts your customers without you clicking send."
  },
  {
    q: "What if I work outside home services?",
    a: "The MVP is built for home-service trades first — painters, electricians, plumbers, cleaners, and similar — with more industry templates planned."
  },
  {
    q: "Can I export my data?",
    a: "Yes — your leads, quotes, jobs, and invoices are yours. Export tools are on the roadmap for the Pro plan."
  }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="font-display font-semibold text-lg tracking-tight">LeadForge</span>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Start Free
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            Turn customer inquiries into paying jobs.
          </h1>
          <p className="mt-5 text-lg text-charcoal/70 max-w-md">
            Respond faster. Quote professionally. Follow up automatically. Win more work.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-accent text-base px-6 py-3">
              Start Free
            </Link>
            <Link href="#how-it-works" className="btn-secondary text-base px-6 py-3">
              See How It Works
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate">No credit card required. Live in minutes.</p>
        </div>
        <HeroDemo />
      </section>

      {/* Problem / Solution */}
      <section className="bg-ink text-paper py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="font-display text-2xl font-semibold mb-3">The problem</h2>
            <p className="text-paper/70 leading-relaxed">
              A customer messages you about a job. You're on a ladder, in a van, or mid-shift. By the
              time you reply, they've already messaged three other businesses — and whoever quotes
              first, professionally, usually wins the work.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold mb-3">The fix</h2>
            <p className="text-paper/70 leading-relaxed">
              LeadForge captures the inquiry the moment it comes in, tells you exactly what to ask
              next, and drafts a quote from your own price list — so you can send something
              professional back in minutes, not days.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-display text-3xl font-semibold text-center mb-3">How it works</h2>
        <p className="text-center text-charcoal/60 max-w-xl mx-auto mb-14">
          From a customer's first message to money in your account — one connected flow.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="card p-6">
              <span className="font-mono text-xs text-signal">{s.step}</span>
              <h3 className="font-display font-semibold mt-2 mb-1.5">{s.title}</h3>
              <p className="text-sm text-charcoal/70 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-slate-light py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display text-3xl font-semibold text-center mb-14">Everything the job needs</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <h3 className="font-display font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-charcoal/70 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example quote */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="font-display text-3xl font-semibold text-center mb-3">
          A quote your customer actually wants to open
        </h2>
        <p className="text-center text-charcoal/60 mb-10">Not another boring PDF attachment.</p>
        <div className="card p-8">
          <div className="flex justify-between items-start pb-6 border-b border-slate-light">
            <div>
              <p className="font-display font-semibold text-lg">Coastal Painting Co.</p>
              <p className="text-sm text-slate mt-1">123 Harbor Rd, Cape Town</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-slate">Q-0042</p>
              <p className="text-xs text-slate mt-1">Valid until Sep 15</p>
            </div>
          </div>
          <div className="py-6 space-y-3">
            {[
              ["Interior painting — 3 rooms", "$540.00"],
              ["Wall prep & filler", "$95.00"],
              ["Premium paint & materials", "$180.00"]
            ].map(([label, price]) => (
              <div key={label} className="flex justify-between text-sm">
                <span>{label}</span>
                <span className="font-mono">{price}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-6 border-t border-slate-light font-display font-semibold text-lg">
            <span>Total</span>
            <span className="font-mono">$815.00</span>
          </div>
          <div className="mt-6 flex gap-3">
            <button className="btn-accent flex-1" disabled>
              Accept Quote
            </button>
            <button className="btn-secondary flex-1" disabled>
              Request Changes
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials placeholder */}
      <section className="bg-slate-light/40 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-sm text-slate uppercase tracking-wide font-mono mb-3">Coming soon</p>
          <p className="text-charcoal/70">
            We're onboarding our first small businesses now — real stories from real owners will go
            here once they're in.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="font-display text-3xl font-semibold text-center mb-14">Simple pricing</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: "Free", price: "$0", body: "Up to 10 leads and 5 quotes a month.", cta: "Start Free" },
            {
              name: "Starter",
              price: "$12",
              body: "Unlimited leads and quotes for one business.",
              cta: "Choose Starter",
              featured: true
            },
            {
              name: "Pro",
              price: "$32",
              body: "Multiple team members, jobs, and invoicing.",
              cta: "Choose Pro"
            }
          ].map((tier) => (
            <div
              key={tier.name}
              className={`card p-8 flex flex-col ${tier.featured ? "border-signal border-2" : ""}`}
            >
              <h3 className="font-display font-semibold text-lg">{tier.name}</h3>
              <p className="mt-2">
                <span className="font-display text-3xl font-semibold">{tier.price}</span>
                <span className="text-slate text-sm"> /month</span>
              </p>
              <p className="text-sm text-charcoal/70 mt-3 flex-1">{tier.body}</p>
              <Link href="/signup" className={tier.featured ? "btn-accent mt-6" : "btn-secondary mt-6"}>
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate text-center mt-6">Prices shown are launch pricing and may change.</p>
      </section>

      {/* FAQ */}
      <section className="bg-white border-y border-slate-light py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display text-3xl font-semibold text-center mb-12">Questions, answered</h2>
          <div className="space-y-8">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="font-medium mb-1.5">{f.q}</h3>
                <p className="text-sm text-charcoal/70 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold mb-4">
          Your next customer is messaging you right now.
        </h2>
        <p className="text-charcoal/70 mb-8">Set up your business and send your first quote today.</p>
        <Link href="/signup" className="btn-accent text-base px-8 py-3.5">
          Start Free
        </Link>
      </section>

      <footer className="border-t border-slate-light py-8">
        <div className="max-w-6xl mx-auto px-6 text-xs text-slate flex justify-between">
          <span>© {new Date().getFullYear()} LeadForge AI</span>
          <span>Built for home-service businesses</span>
        </div>
      </footer>
    </main>
  );
}
