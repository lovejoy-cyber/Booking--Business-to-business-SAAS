"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { EmptyState } from "@/components/EmptyState";

type Customer = { id: string; name: string; phone: string | null; email: string | null; createdAt: string };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    api
      .get<{ customers: Customer[] }>(`/api/customers?${params.toString()}`)
      .then((d) => setCustomers(d.customers))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-slate mt-1">Every customer relationship, from first inquiry onward.</p>
      </div>

      <input
        className="input max-w-xs mb-4"
        placeholder="Search customers…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? (
        <div className="text-sm text-slate py-8 text-center">Loading…</div>
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Customers are created automatically the first time you quote a lead."
        />
      ) : (
        <div className="card divide-y divide-slate-light">
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/customers/${c.id}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-light/30 transition-colors"
            >
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-xs text-slate">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
