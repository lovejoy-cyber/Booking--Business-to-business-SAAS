"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCents } from "@/lib/money";
import { useToast } from "@/components/Toast";

type QuoteItem = { id: string; description: string; quantity: string; unitPriceCents: number; lineTotalCents: number };
type QuoteEvent = { id: string; type: string; createdAt: string };
type Quote = {
  id: string;
  quoteNumber: string;
  publicId: string;
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
  items: QuoteItem[];
  events: QuoteEvent[];
  customer: { id: string; name: string };
  lead: { id: string } | null;
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { push } = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [convertingToJob, setConvertingToJob] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api
      .get<{ quote: Quote }>(`/api/quotes/${id}`)
      .then((d) => setQuote(d.quote))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSend() {
    setSending(true);
    try {
      await api.post(`/api/quotes/${id}/send`);
      await api.post("/api/analytics/events", { event: "quote_sent" });
      push("Quote marked as sent.", "success");
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Couldn't send quote.", "error");
    } finally {
      setSending(false);
    }
  }

  async function handleConvertToJob() {
    setConvertingToJob(true);
    try {
      const { job } = await api.post<{ job: { id: string } }>(`/api/quotes/${id}/convert-to-job`);
      await api.post("/api/analytics/events", { event: "job_created" });
      setJobId(job.id);
      push("Job created.", "success");
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Couldn't convert to job.", "error");
    } finally {
      setConvertingToJob(false);
    }
  }

  function copyPublicLink() {
    const url = `${window.location.origin}/quote/${quote?.publicId}`;
    navigator.clipboard.writeText(url);
    push("Public link copied.", "success");
  }

  if (loading) return <div className="text-sm text-slate py-8 text-center">Loading…</div>;
  if (!quote) return <div className="text-sm text-rust py-8 text-center">Quote not found.</div>;

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/quotes" className="text-sm text-slate hover:text-ink">
        ← All quotes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold font-mono">{quote.quoteNumber}</h1>
          <p className="text-sm text-slate mt-1">{quote.customer.name}</p>
        </div>
        <StatusBadge status={quote.status} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {quote.status === "DRAFT" && (
          <button onClick={handleSend} disabled={sending} className="btn-accent text-sm">
            {sending ? "Sending…" : "Send to customer"}
          </button>
        )}
        <a href={`/api/quotes/${id}/pdf`} target="_blank" rel="noreferrer" className="btn-secondary text-sm">
          Download PDF
        </a>
        <button onClick={copyPublicLink} className="btn-secondary text-sm">
          Copy customer link
        </button>
        {quote.status === "ACCEPTED" && !jobId && (
          <button onClick={handleConvertToJob} disabled={convertingToJob} className="btn-accent text-sm">
            {convertingToJob ? "Converting…" : "Convert to Job"}
          </button>
        )}
        {jobId && (
          <Link href={`/dashboard/jobs`} className="btn-secondary text-sm">
            View job →
          </Link>
        )}
      </div>

      <div className="card p-5 mb-6">
        <div className="divide-y divide-slate-light">
          {quote.items.map((item) => (
            <div key={item.id} className="flex justify-between py-2.5 text-sm">
              <span>
                {item.description} <span className="text-slate">× {item.quantity}</span>
              </span>
              <span className="font-mono">{formatCents(item.lineTotalCents, quote.currency)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-light space-y-1.5 text-sm max-w-xs ml-auto">
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
              <span className="text-slate">Tax</span>
              <span className="font-mono">{formatCents(quote.taxCents, quote.currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-display font-semibold pt-1.5 border-t border-slate-light">
            <span>Total</span>
            <span className="font-mono">{formatCents(quote.totalCents, quote.currency)}</span>
          </div>
        </div>
      </div>

      {(quote.notes || quote.terms) && (
        <div className="card p-5 mb-6 space-y-3 text-sm">
          {quote.notes && (
            <div>
              <p className="text-xs text-slate mb-1">Notes</p>
              <p>{quote.notes}</p>
            </div>
          )}
          {quote.terms && (
            <div>
              <p className="text-xs text-slate mb-1">Terms</p>
              <p>{quote.terms}</p>
            </div>
          )}
        </div>
      )}

      <div className="card p-5">
        <p className="text-xs uppercase tracking-wide text-slate font-mono mb-3">Activity</p>
        <div className="space-y-2 text-sm">
          {quote.events.map((e) => (
            <div key={e.id} className="flex justify-between">
              <span>{e.type.replace(/_/g, " ")}</span>
              <span className="text-slate text-xs">{new Date(e.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
