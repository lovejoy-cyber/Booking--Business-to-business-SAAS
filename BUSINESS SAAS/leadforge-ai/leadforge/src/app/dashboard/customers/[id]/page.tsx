"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCents } from "@/lib/money";
import { useToast } from "@/components/Toast";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  leads: { id: string; inquiryText: string; status: string; createdAt: string }[];
  quotes: { id: string; quoteNumber: string; status: string; totalCents: number; currency: string }[];
  jobs: { id: string; service: string; status: string }[];
  invoices: { id: string; invoiceNumber: string; status: string; totalCents: number; currency: string }[];
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { push } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    api
      .get<{ customer: Customer }>(`/api/customers/${id}`)
      .then((d) => setCustomer(d.customer))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSummarize() {
    setSummarizing(true);
    try {
      const { summary } = await api.post<{ summary: string }>(`/api/customers/${id}/summarize`);
      setSummary(summary);
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Couldn't generate a summary.", "error");
    } finally {
      setSummarizing(false);
    }
  }

  if (loading) return <div className="text-sm text-slate py-8 text-center">Loading…</div>;
  if (!customer) return <div className="text-sm text-rust py-8 text-center">Customer not found.</div>;

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/customers" className="text-sm text-slate hover:text-ink">
        ← All customers
      </Link>

      <div className="mt-3 mb-6">
        <h1 className="font-display text-2xl font-semibold">{customer.name}</h1>
        <p className="text-sm text-slate mt-1">
          {[customer.phone, customer.email, customer.address].filter(Boolean).join(" · ") || "No contact details"}
        </p>
      </div>

      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wide text-signal font-mono">AI relationship summary</p>
          <button onClick={handleSummarize} disabled={summarizing} className="btn-secondary text-xs px-3 py-1.5">
            {summarizing ? "Summarizing…" : "Summarize"}
          </button>
        </div>
        <p className="text-sm">{summary ?? "Generate a plain-language summary of this customer's history."}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Section title="Leads">
          {customer.leads.map((l) => (
            <Link key={l.id} href={`/dashboard/leads/${l.id}`} className="flex justify-between py-2 text-sm hover:text-ink">
              <span className="truncate max-w-[70%]">{l.inquiryText}</span>
              <StatusBadge status={l.status} />
            </Link>
          ))}
          {customer.leads.length === 0 && <p className="text-sm text-slate">None yet.</p>}
        </Section>

        <Section title="Quotes">
          {customer.quotes.map((q) => (
            <Link key={q.id} href={`/dashboard/quotes/${q.id}`} className="flex justify-between py-2 text-sm hover:text-ink">
              <span className="font-mono">{q.quoteNumber}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs">{formatCents(q.totalCents, q.currency)}</span>
                <StatusBadge status={q.status} />
              </span>
            </Link>
          ))}
          {customer.quotes.length === 0 && <p className="text-sm text-slate">None yet.</p>}
        </Section>

        <Section title="Jobs">
          {customer.jobs.map((j) => (
            <div key={j.id} className="flex justify-between py-2 text-sm">
              <span>{j.service}</span>
              <StatusBadge status={j.status} />
            </div>
          ))}
          {customer.jobs.length === 0 && <p className="text-sm text-slate">None yet.</p>}
        </Section>

        <Section title="Invoices">
          {customer.invoices.map((i) => (
            <div key={i.id} className="flex justify-between py-2 text-sm">
              <span className="font-mono">{i.invoiceNumber}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs">{formatCents(i.totalCents, i.currency)}</span>
                <StatusBadge status={i.status} />
              </span>
            </div>
          ))}
          {customer.invoices.length === 0 && <p className="text-sm text-slate">None yet.</p>}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-slate font-mono mb-2">{title}</p>
      <div className="divide-y divide-slate-light">{children}</div>
    </div>
  );
}
