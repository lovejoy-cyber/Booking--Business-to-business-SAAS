"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/Toast";

type Business = {
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
  taxLabel: string;
  taxRateBps: number;
  logoUrl: string | null;
  quotePrefix: string;
  invoicePrefix: string;
  quoteTerms: string | null;
  depositPercent: number;
};

type Service = { id: string; name: string; description: string | null; unit: string; defaultUnitPriceCents: number };

export default function SettingsPage() {
  const { push } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [saving, setSaving] = useState(false);
  const [newService, setNewService] = useState({ name: "", unit: "job", price: "" });

  function load() {
    api.get<{ business: Business }>("/api/business").then((d) => setBusiness(d.business));
    api.get<{ services: Service[] }>("/api/services").then((d) => setServices(d.services));
  }

  useEffect(load, []);

  function updateField<K extends keyof Business>(field: K, value: Business[K]) {
    setBusiness((b) => (b ? { ...b, [field]: value } : b));
  }

  async function handleSave() {
    if (!business) return;
    setSaving(true);
    try {
      await api.patch("/api/business", business);
      push("Settings saved.", "success");
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Couldn't save settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddService() {
    if (!newService.name.trim()) return;
    try {
      await api.post("/api/services", {
        name: newService.name,
        unit: newService.unit || "job",
        defaultUnitPriceCents: Math.round((parseFloat(newService.price) || 0) * 100)
      });
      setNewService({ name: "", unit: "job", price: "" });
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Couldn't add service.", "error");
    }
  }

  async function handleRemoveService(id: string) {
    try {
      await api.del(`/api/services/${id}`);
      setServices((s) => s.filter((svc) => svc.id !== id));
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Couldn't remove service.", "error");
    }
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      push("Please choose an image under 300KB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateField("logoUrl", reader.result as string);
    reader.readAsDataURL(file);
  }

  if (!business) return <div className="text-sm text-slate py-8 text-center">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate mt-1">Your business profile, pricing, and quote preferences.</p>
      </div>

      <section className="card p-5 space-y-4">
        <p className="text-xs uppercase tracking-wide text-slate font-mono">Business profile</p>

        <div className="flex items-center gap-4">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoUrl} alt="Logo" className="h-14 w-14 rounded-md object-contain border border-slate-light" />
          ) : (
            <div className="h-14 w-14 rounded-md border border-dashed border-slate-light flex items-center justify-center text-xs text-slate">
              Logo
            </div>
          )}
          <label className="btn-secondary text-xs cursor-pointer">
            Upload logo
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Business name</label>
            <input className="input" value={business.name} onChange={(e) => updateField("name", e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <input
              className="input"
              value={business.category ?? ""}
              onChange={(e) => updateField("category", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={business.phone ?? ""} onChange={(e) => updateField("phone", e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={business.email ?? ""} onChange={(e) => updateField("email", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Address</label>
            <input
              className="input"
              value={business.address ?? ""}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <p className="text-xs uppercase tracking-wide text-slate font-mono">Quote & invoice preferences</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Currency</label>
            <select
              className="input"
              value={business.currency}
              onChange={(e) => updateField("currency", e.target.value)}
            >
              {["USD", "EUR", "GBP", "ZAR", "DZD", "NGN", "KES"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Deposit required (%)</label>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              value={business.depositPercent}
              onChange={(e) => updateField("depositPercent", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Tax label</label>
            <input className="input" value={business.taxLabel} onChange={(e) => updateField("taxLabel", e.target.value)} />
          </div>
          <div>
            <label className="label">Tax rate (%)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={business.taxRateBps / 100}
              onChange={(e) => updateField("taxRateBps", Math.round(parseFloat(e.target.value || "0") * 100))}
            />
          </div>
          <div>
            <label className="label">Quote number prefix</label>
            <input className="input" value={business.quotePrefix} onChange={(e) => updateField("quotePrefix", e.target.value)} />
          </div>
          <div>
            <label className="label">Invoice number prefix</label>
            <input
              className="input"
              value={business.invoicePrefix}
              onChange={(e) => updateField("invoicePrefix", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Default quote terms</label>
            <textarea
              className="input"
              rows={3}
              value={business.quoteTerms ?? ""}
              onChange={(e) => updateField("quoteTerms", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <p className="text-xs uppercase tracking-wide text-slate font-mono">Services & pricing</p>
        <div className="divide-y divide-slate-light">
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {s.name} <span className="text-slate">/ {s.unit}</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono">${(s.defaultUnitPriceCents / 100).toFixed(2)}</span>
                <button onClick={() => handleRemoveService(s.id)} className="text-xs text-slate hover:text-rust">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-2">
          <input
            className="input col-span-3"
            placeholder="Service name"
            value={newService.name}
            onChange={(e) => setNewService((s) => ({ ...s, name: e.target.value }))}
          />
          <input
            className="input col-span-1"
            placeholder="unit"
            value={newService.unit}
            onChange={(e) => setNewService((s) => ({ ...s, unit: e.target.value }))}
          />
          <input
            className="input col-span-1"
            placeholder="Price"
            type="number"
            step="0.01"
            value={newService.price}
            onChange={(e) => setNewService((s) => ({ ...s, price: e.target.value }))}
          />
          <button onClick={handleAddService} className="btn-secondary col-span-1 text-xs">
            Add
          </button>
        </div>
      </section>

      <button onClick={handleSave} disabled={saving} className="btn-accent">
        {saving ? "Saving…" : "Save all changes"}
      </button>
    </div>
  );
}
