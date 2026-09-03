"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

type Lead = {
  id: string;
  customerName: string;
  inquiryText: string;
  serviceRequested: string | null;
  status: string;
  createdAt: string;
  followUpAt: string | null;
};

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "QUOTE_SENT", "ACCEPTED", "LOST", "CONVERTED"];

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (query) params.set("q", query);
    api
      .get<{ leads: Lead[] }>(`/api/leads?${params.toString()}`)
      .then((d) => setLeads(d.leads))
      .finally(() => setLoading(false));
  }, [statusFilter, query]);

  const sorted = useMemo(() => {
    const copy = [...leads];
    copy.sort((a, b) =>
      sort === "newest"
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return copy;
  }, [leads, sort]);

  function setStatus(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status) params.set("status", status);
    else params.delete("status");
    router.push(`/dashboard/leads?${params.toString()}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-slate mt-1">Every inquiry, in one place.</p>
        </div>
        <Link href="/dashboard/leads/new" className="btn-accent">
          New Lead
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
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

      <div className="flex gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search leads…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input max-w-[160px]"
          value={sort}
          onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-slate py-8 text-center">Loading…</div>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No leads found"
          description="Try a different filter, or log a new inquiry to get started."
          action={
            <Link href="/dashboard/leads/new" className="btn-accent">
              New Lead
            </Link>
          }
        />
      ) : (
        <div className="card divide-y divide-slate-light">
          {sorted.map((lead) => (
            <Link
              key={lead.id}
              href={`/dashboard/leads/${lead.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-light/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{lead.customerName}</p>
                  {lead.serviceRequested && (
                    <span className="text-xs text-slate">· {lead.serviceRequested}</span>
                  )}
                </div>
                <p className="text-xs text-slate truncate max-w-lg mt-0.5">{lead.inquiryText}</p>
              </div>
              <StatusBadge status={lead.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
