"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCents } from "@/lib/money";
import { useToast } from "@/components/Toast";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  dueAt: string | null;
  notes: string | null;
  items: { id: string; description: string; quantity: string; lineTotalCents: number }[];
  customer: { name: string };
};

const STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE"];

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { push } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .get<{ invoice: Invoice }>(`/api/invoices/${id}`)
      .then((d) => setInvoice(d.invoice))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function updateStatus(status: string) {
    if (!invoice) return;
    setInvoice({ ...invoice, status });
    try {
      await api.patch(`/api/invoices/${id}`, { status });
      push(status === "PAID" ? "Marked as paid." : "Status updated.", "success");
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Couldn't update invoice.", "error");
      load();
    }
  }

  if (loading) return <div className="text-sm text-slate py-8 text-center">Loading…</div>;
  if (!invoice) return <div className="text-sm text-rust py-8 text-center">Invoice not found.</div>;

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/invoices" className="text-sm text-slate hover:text-ink">
        ← All invoices
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold font-mono">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-slate mt-1">{invoice.customer.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input max-w-[140px]" value={invoice.status} onChange={(e) => updateStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <StatusBadge status={invoice.status} />
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noreferrer" className="btn-secondary text-sm">
          Download PDF
        </a>
      </div>

      <div className="card p-5">
        <div className="divide-y divide-slate-light">
          {invoice.items.map((item) => (
            <div key={item.id} className="flex justify-between py-2.5 text-sm">
              <span>
                {item.description} <span className="text-slate">× {item.quantity}</span>
              </span>
              <span className="font-mono">{formatCents(item.lineTotalCents, invoice.currency)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-light space-y-1.5 text-sm max-w-xs ml-auto">
          <div className="flex justify-between">
            <span className="text-slate">Subtotal</span>
            <span className="font-mono">{formatCents(invoice.subtotalCents, invoice.currency)}</span>
          </div>
          {invoice.discountCents > 0 && (
            <div className="flex justify-between">
              <span className="text-slate">Discount</span>
              <span className="font-mono">-{formatCents(invoice.discountCents, invoice.currency)}</span>
            </div>
          )}
          {invoice.taxCents > 0 && (
            <div className="flex justify-between">
              <span className="text-slate">Tax</span>
              <span className="font-mono">{formatCents(invoice.taxCents, invoice.currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-display font-semibold pt-1.5 border-t border-slate-light">
            <span>Total</span>
            <span className="font-mono">{formatCents(invoice.totalCents, invoice.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
