"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { formatCents } from "@/lib/money";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  dueAt: string | null;
  customer: { name: string };
};

const STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE"];

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    api
      .get<{ invoices: Invoice[] }>(`/api/invoices?${params.toString()}`)
      .then((d) => setInvoices(d.invoices))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  function setStatus(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status) params.set("status", status);
    else params.delete("status");
    router.push(`/dashboard/invoices?${params.toString()}`);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Invoices</h1>
        <p className="text-sm text-slate mt-1">Created from completed jobs — track who's paid.</p>
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
            className={`badge border ${statusFilter === s ? "bg-ink text-paper border-ink" : "border-slate-light"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-slate py-8 text-center">Loading…</div>
      ) : invoices.length === 0 ? (
        <EmptyState title="No invoices yet" description="Invoices are created from completed jobs." />
      ) : (
        <div className="card divide-y divide-slate-light">
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/dashboard/invoices/${inv.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-light/30 transition-colors"
            >
              <div>
                <p className="font-mono text-sm">{inv.invoiceNumber}</p>
                <p className="text-sm text-charcoal/70">{inv.customer.name}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm">{formatCents(inv.totalCents, inv.currency)}</span>
                <StatusBadge status={inv.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
