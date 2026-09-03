"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { formatCents } from "@/lib/money";

type Quote = {
  id: string;
  quoteNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  customer: { name: string };
};

const STATUSES = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "CHANGES_REQUESTED", "EXPIRED"];

export default function QuotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    api
      .get<{ quotes: Quote[] }>(`/api/quotes?${params.toString()}`)
      .then((d) => setQuotes(d.quotes))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  function setStatus(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status) params.set("status", status);
    else params.delete("status");
    router.push(`/dashboard/quotes?${params.toString()}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Quotes</h1>
          <p className="text-sm text-slate mt-1">Track every quote from draft to accepted.</p>
        </div>
        <Link href="/dashboard/quotes/new" className="btn-accent">
          Create Quote
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setStatus("")}
          className={`badge border ${!statusFilter ? "bg-ink text-paper border-ink" : "border-slate-light"}`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`badge border ${
              statusFilter === s ? "bg-ink text-paper border-ink" : "border-slate-light"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-slate py-8 text-center">Loading…</div>
      ) : quotes.length === 0 ? (
        <EmptyState
          title="No quotes yet"
          description="Create your first quote to send something professional back to a customer."
          action={
            <Link href="/dashboard/quotes/new" className="btn-accent">
              Create Quote
            </Link>
          }
        />
      ) : (
        <div className="card divide-y divide-slate-light">
          {quotes.map((q) => (
            <Link
              key={q.id}
              href={`/dashboard/quotes/${q.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-light/30 transition-colors"
            >
              <div>
                <p className="font-mono text-sm">{q.quoteNumber}</p>
                <p className="text-sm text-charcoal/70">{q.customer.name}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm">{formatCents(q.totalCents, q.currency)}</span>
                <StatusBadge status={q.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
