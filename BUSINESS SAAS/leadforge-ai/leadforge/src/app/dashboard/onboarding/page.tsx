"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";

const CATEGORIES = [
  "Painting",
  "Electrical",
  "Plumbing",
  "Cleaning",
  "Handyman",
  "Landscaping",
  "AC / HVAC",
  "Construction",
  "Other"
];

type ServiceDraft = { name: string; unit: string; price: string };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [business, setBusiness] = useState({
    category: "",
    phone: "",
    address: "",
    currency: "USD",
    taxLabel: "Tax",
    taxRatePercent: "0"
  });

  const [services, setServices] = useState<ServiceDraft[]>([{ name: "", unit: "job", price: "" }]);

  function updateService(i: number, field: keyof ServiceDraft, value: string) {
    setServices((s) => s.map((svc, idx) => (idx === i ? { ...svc, [field]: value } : svc)));
  }

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch("/api/business", {
        category: business.category || null,
        phone: business.phone || null,
        address: business.address || null,
        currency: business.currency,
        taxLabel: business.taxLabel,
        taxRateBps: Math.round(parseFloat(business.taxRatePercent || "0") * 100),
        onboardingStep: 1
      });
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const valid = services.filter((s) => s.name.trim() && s.price.trim());
      for (const s of valid) {
        await api.post("/api/services", {
          name: s.name,
          unit: s.unit || "job",
          defaultUnitPriceCents: Math.round(parseFloat(s.price) * 100)
        });
      }
      await api.patch("/api/business", { onboardingStep: 2 });
      await api.post("/api/analytics/events", { event: "onboarding_completed" });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="flex gap-2 mb-8">
          <span className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-signal" : "bg-slate-light"}`} />
          <span className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-signal" : "bg-slate-light"}`} />
        </div>

        {step === 1 && (
          <form onSubmit={handleStep1} className="card p-8 space-y-4">
            <div>
              <h1 className="font-display text-2xl font-semibold">Tell us about your business</h1>
              <p className="text-sm text-slate mt-1">This shapes your quotes and AI suggestions.</p>
            </div>

            <div>
              <label className="label">What kind of work do you do?</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setBusiness((b) => ({ ...b, category: c }))}
                    className={`text-xs rounded-md border px-2 py-2 transition-colors ${
                      business.category === c
                        ? "border-ink bg-ink text-paper"
                        : "border-slate-light hover:border-ink"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="phone">
                  Phone
                </label>
                <input
                  id="phone"
                  className="input"
                  value={business.phone}
                  onChange={(e) => setBusiness((b) => ({ ...b, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="currency">
                  Currency
                </label>
                <select
                  id="currency"
                  className="input"
                  value={business.currency}
                  onChange={(e) => setBusiness((b) => ({ ...b, currency: e.target.value }))}
                >
                  {["USD", "EUR", "GBP", "ZAR", "DZD", "NGN", "KES"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="address">
                Business address
              </label>
              <input
                id="address"
                className="input"
                value={business.address}
                onChange={(e) => setBusiness((b) => ({ ...b, address: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="taxLabel">
                  Tax label
                </label>
                <input
                  id="taxLabel"
                  className="input"
                  value={business.taxLabel}
                  onChange={(e) => setBusiness((b) => ({ ...b, taxLabel: e.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="taxRate">
                  Tax rate (%)
                </label>
                <input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={business.taxRatePercent}
                  onChange={(e) => setBusiness((b) => ({ ...b, taxRatePercent: e.target.value }))}
                />
              </div>
            </div>

            {error && <p className="text-sm text-rust">{error}</p>}

            <button type="submit" disabled={saving} className="btn-accent w-full">
              {saving ? "Saving…" : "Continue"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="card p-8 space-y-4">
            <div>
              <h1 className="font-display text-2xl font-semibold">Add your services</h1>
              <p className="text-sm text-slate mt-1">
                This is what AI uses to draft quotes — you can add more anytime.
              </p>
            </div>

            <div className="space-y-3">
              {services.map((s, i) => (
                <div key={i} className="grid grid-cols-6 gap-2">
                  <input
                    className="input col-span-3"
                    placeholder="Service name"
                    value={s.name}
                    onChange={(e) => updateService(i, "name", e.target.value)}
                  />
                  <input
                    className="input col-span-1"
                    placeholder="unit"
                    value={s.unit}
                    onChange={(e) => updateService(i, "unit", e.target.value)}
                  />
                  <input
                    className="input col-span-2"
                    placeholder="Price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={s.price}
                    onChange={(e) => updateService(i, "price", e.target.value)}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => setServices((s) => [...s, { name: "", unit: "job", price: "" }])}
            >
              + Add another service
            </button>

            {error && <p className="text-sm text-rust">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-accent flex-1">
                {saving ? "Finishing up…" : "Finish setup"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={async () => {
                  await api.patch("/api/business", { onboardingStep: 2 });
                  router.push("/dashboard");
                  router.refresh();
                }}
              >
                Skip for now
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
