"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/Toast";

type Job = {
  id: string;
  service: string;
  status: string;
  scheduledAt: string | null;
  assignedWorker: string | null;
  customer: { id: string; name: string };
  invoice: { id: string } | null;
};

const STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function JobsPage() {
  const router = useRouter();
  const { push } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api
      .get<{ jobs: Job[] }>("/api/jobs")
      .then((d) => setJobs(d.jobs))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function updateJob(id: string, data: Record<string, unknown>) {
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...data } : j)));
    try {
      await api.patch(`/api/jobs/${id}`, data);
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Couldn't update job.", "error");
      load();
    }
  }

  async function convertToInvoice(id: string) {
    setConvertingId(id);
    try {
      const { invoice } = await api.post<{ invoice: { id: string } }>(`/api/jobs/${id}/convert-to-invoice`);
      await api.post("/api/analytics/events", { event: "invoice_created" });
      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Couldn't create invoice.", "error");
    } finally {
      setConvertingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Jobs</h1>
        <p className="text-sm text-slate mt-1">Everything scheduled after a quote is accepted.</p>
      </div>

      {loading ? (
        <div className="text-sm text-slate py-8 text-center">Loading…</div>
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          description="Jobs appear here once you convert an accepted quote."
          action={
            <Link href="/dashboard/quotes?status=ACCEPTED" className="btn-accent">
              View accepted quotes
            </Link>
          }
        />
      ) : (
        <div className="card divide-y divide-slate-light">
          {jobs.map((job) => (
            <div key={job.id} className="px-5 py-4 flex flex-wrap items-center gap-3">
              <div className="min-w-[160px] flex-1">
                <p className="text-sm font-medium">{job.service}</p>
                <Link href={`/dashboard/customers/${job.customer.id}`} className="text-xs text-slate hover:text-ink">
                  {job.customer.name}
                </Link>
              </div>
              <input
                type="date"
                className="input max-w-[150px] text-xs"
                value={job.scheduledAt ? job.scheduledAt.slice(0, 10) : ""}
                onChange={(e) =>
                  updateJob(job.id, {
                    scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null
                  })
                }
              />
              <input
                className="input max-w-[150px] text-xs"
                placeholder="Assigned to"
                defaultValue={job.assignedWorker ?? ""}
                onBlur={(e) => updateJob(job.id, { assignedWorker: e.target.value || null })}
              />
              <select
                className="input max-w-[140px] text-xs"
                value={job.status}
                onChange={(e) => updateJob(job.id, { status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              {job.invoice ? (
                <Link href={`/dashboard/invoices/${job.invoice.id}`} className="btn-secondary text-xs">
                  View invoice
                </Link>
              ) : (
                <button
                  onClick={() => convertToInvoice(job.id)}
                  disabled={convertingId === job.id}
                  className="btn-accent text-xs"
                >
                  {convertingId === job.id ? "Creating…" : "Convert to Invoice"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
