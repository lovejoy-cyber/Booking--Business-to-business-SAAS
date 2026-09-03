"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatCents } from "@/lib/money";

type PublicQuote = {
  id: string;
  quoteNumber: string;
  status: string;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  depositCents: number;
  notes: string | null;
  terms: string | null;
  createdAt: string;
  expiresAt: string | null;
  items: { id: string; description: string; quantity: string; unitPriceCents: number; lineTotalCents: number }[];
  customer: { name: string };
  business: {
    name: string;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    taxLabel: string;
  };
};

export default function PublicQuotePage() {
  const { publicId } = useParams<{ publicId: string }>();
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"accept" | "changes" | null>(null);
  const [changesMessage, setChangesMessage] = useState("");
  const [showChangesForm, setShowChangesForm] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/public/quotes/${publicId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setQuote(d.quote);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [publicId]);

  async function handleAccept() {
    setSubmitting("accept");
    try {
      const res = await fetch(`/api/public/quotes/${publicId}/accept`, { method: "POST" });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setQuote(data.quote);
    } finally {
      setSubmitting(null);
    }
  }

  async function handleRequestChanges() {
    setSubmitting("changes");
    try {
      const res = await fetch(`/api/public/quotes/${publicId}/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: changesMessage })
      });
      const data = await res.json();
      if (!data.error) setQuote(data.quote);
    } finally {
      setSubmitting(null);
      setShowChangesForm(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-slate">Loading…</div>;
  if (error || !quote)
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <p className="text-sm text-rust">{error ?? "Quote not found."}</p>
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-light/30 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="card overflow-hidden">
          <div className="bg-ink text-paper px-8 py-8 flex items-start justify-between">
            <div>
              {quote.business.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={quote.business.logoUrl} alt={quote.business.name} className="h-10 mb-3 object-contain" />
              )}
              <p className="font-display font-semibold text-lg">{quote.business.name}</p>
              <p className="text-xs text-paper/60 mt-1">
                {[quote.business.address, quote.business.phone, quote.business.email].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-paper/80">{quote.quoteNumber}</p>
              <p className="text-xs text-paper/60 mt-1">{new Date(quote.createdAt).toLocaleDateString()}</p>
              {quote.expiresAt && (
                <p className="text-xs text-paper/60">Valid until {new Date(quote.expiresAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          <div className="px-8 py-6">
            <p className="text-xs uppercase tracking-wide text-slate font-mono mb-1">Prepared for</p>
            <p className="font-medium">{quote.customer.name}</p>
          </div>

          <div className="px-8 divide-y divide-slate-light border-t border-slate-light">
            {quote.items.map((item) => (
              <div key={item.id} className="flex justify-between py-3 text-sm">
                <span>
                  {item.description} <span className="text-slate">× {item.quantity}</span>
                </span>
                <span className="font-mono">{formatCents(item.lineTotalCents, quote.currency)}</span>
              </div>
            ))}
          </div>

          <div className="px-8 py-6 border-t border-slate-light">
            <div className="space-y-1.5 text-sm max-w-xs ml-auto">
              <div className="flex justify-between">
                <span className="text-slate">Subtotal</span>
                <span className="font-mono">{formatCents(quote.subtotalCents, quote.currency)}</span>
              </div>
              {quote.discountCents > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate">Discount</span>
                  <span className="font-mono">-{formatCents(quote.discountCents, quote.currency)}</span>
                </div>
              )}
              {quote.taxCents > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate">{quote.business.taxLabel}</span>
                  <span className="font-mono">{formatCents(quote.taxCents, quote.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-display font-semibold text-lg pt-2 border-t border-slate-light">
                <span>Total</span>
                <span className="font-mono">{formatCents(quote.totalCents, quote.currency)}</span>
              </div>
              {quote.depositCents > 0 && (
                <div className="flex justify-between text-xs text-slate">
                  <span>Deposit required</span>
                  <span className="font-mono">{formatCents(quote.depositCents, quote.currency)}</span>
                </div>
              )}
            </div>
          </div>

          {(quote.notes || quote.terms) && (
            <div className="px-8 py-6 border-t border-slate-light space-y-3 text-sm text-charcoal/80">
              {quote.notes && <p>{quote.notes}</p>}
              {quote.terms && <p className="text-xs text-slate">{quote.terms}</p>}
            </div>
          )}

          <div className="px-8 py-6 border-t border-slate-light bg-slate-light/20">
            {quote.status === "ACCEPTED" && (
              <p className="text-center text-moss font-medium">✓ You've accepted this quote. We'll be in touch shortly.</p>
            )}
            {quote.status === "EXPIRED" && (
              <p className="text-center text-slate">This quote has expired. Please contact us for an updated quote.</p>
            )}
            {quote.status === "CHANGES_REQUESTED" && (
              <p className="text-center text-charcoal/80">
                We've received your request for changes and will follow up shortly.
              </p>
            )}
            {(quote.status === "SENT" || quote.status === "VIEWED") && (
              <>
                {showChangesForm ? (
                  <div className="space-y-3">
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="What would you like changed?"
                      value={changesMessage}
                      onChange={(e) => setChangesMessage(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleRequestChanges}
                        disabled={submitting === "changes"}
                        className="btn-secondary flex-1"
                      >
                        {submitting === "changes" ? "Sending…" : "Send request"}
                      </button>
                      <button onClick={() => setShowChangesForm(false)} className="btn-ghost">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={handleAccept} disabled={!!submitting} className="btn-accent flex-1">
                      {submitting === "accept" ? "Accepting…" : "Accept Quote"}
                    </button>
                    <button onClick={() => setShowChangesForm(true)} disabled={!!submitting} className="btn-secondary flex-1">
                      Request Changes
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate mt-6">
          <a href={`/api/public/quotes/${publicId}/pdf`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            Download as PDF
          </a>
        </p>
      </div>
    </main>
  );
}
