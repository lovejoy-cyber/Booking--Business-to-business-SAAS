"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";

const SOURCES = ["MANUAL", "WEBSITE_FORM", "WHATSAPP", "PHONE", "EMAIL", "REFERRAL", "OTHER"];

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    source: "MANUAL",
    inquiryText: "",
    serviceRequested: "",
    location: "",
    budget: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { lead } = await api.post<{ lead: { id: string } }>("/api/leads", {
        customerName: form.customerName,
        phone: form.phone || null,
        email: form.email || null,
        source: form.source,
        inquiryText: form.inquiryText,
        serviceRequested: form.serviceRequested || null,
        location: form.location || null,
        budgetCents: form.budget ? Math.round(parseFloat(form.budget) * 100) : null
      });
      await api.post("/api/analytics/events", { event: "lead_created" });
      router.push(`/dashboard/leads/${lead.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-semibold mb-1">New lead</h1>
      <p className="text-sm text-slate mb-6">Log the inquiry exactly as the customer sent it.</p>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Customer name</label>
            <input required className="input" value={form.customerName} onChange={update("customerName")} />
          </div>
          <div>
            <label className="label">Source</label>
            <select className="input" value={form.source} onChange={update("source")}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={update("phone")} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={update("email")} />
          </div>
        </div>

        <div>
          <label className="label">Customer inquiry</label>
          <textarea
            required
            rows={4}
            className="input"
            placeholder='e.g. "Hi, how much would it cost to paint a 3-bedroom house?"'
            value={form.inquiryText}
            onChange={update("inquiryText")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Service requested</label>
            <input
              className="input"
              placeholder="e.g. Interior painting"
              value={form.serviceRequested}
              onChange={update("serviceRequested")}
            />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={form.location} onChange={update("location")} />
          </div>
        </div>

        <div>
          <label className="label">Customer's stated budget (optional)</label>
          <input
            className="input max-w-[200px]"
            type="number"
            step="0.01"
            min="0"
            value={form.budget}
            onChange={update("budget")}
          />
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}

        <button type="submit" disabled={saving} className="btn-accent w-full">
          {saving ? "Saving…" : "Save lead"}
        </button>
      </form>
    </div>
  );
}
