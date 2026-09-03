"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { computeTotals, formatCents } from "@/lib/money";

type Customer = { id: string; name: string; phone: string | null; email: string | null };
type Service = { id: string; name: string; unit: string; defaultUnitPriceCents: number };
type Item = { description: string; quantity: string; unitPrice: string; discount: string };

const emptyItem: Item = { description: "", quantity: "1", unitPrice: "", discount: "0" };

export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const initialCustomerId = searchParams.get("customerId");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [business, setBusiness] = useState<{ currency: string; taxRateBps: number; depositPercent: number } | null>(
    null
  );

  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [showNewCustomer, setShowNewCustomer] = useState(!initialCustomerId);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "" });

  const [items, setItems] = useState<Item[]>([{ ...emptyItem }]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [depositPercent, setDepositPercent] = useState("0");
  const [aiRationale, setAiRationale] = useState<string | null>(null);

  const [saving, setSaving] = useState<"draft" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ customers: Customer[] }>("/api/customers").then((d) => setCustomers(d.customers));
    api.get<{ services: Service[] }>("/api/services").then((d) => setServices(d.services));
    api.get<{ business: { currency: string; taxRateBps: number; depositPercent: number; quoteTerms: string | null } }>(
      "/api/business"
    ).then((d) => {
      setBusiness(d.business);
      setDepositPercent(String(d.business.depositPercent));
      setTerms(d.business.quoteTerms ?? "");
    });

    if (leadId) {
      const raw = sessionStorage.getItem(`leadforge:quoteDraft:${leadId}`);
      if (raw) {
        try {
          const draft = JSON.parse(raw) as {
            lines: { description: string; quantity: number; unitPriceCents: number; basis: string }[];
            rationale: string;
          };
          setItems(
            draft.lines.map((l) => ({
              description: l.description,
              quantity: String(l.quantity),
              unitPrice: (l.unitPriceCents / 100).toFixed(2),
              discount: "0"
            }))
          );
          setAiRationale(draft.rationale);
        } catch {
          // ignore malformed sessionStorage content
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsedItems = useMemo(
    () =>
      items.map((it) => ({
        quantity: parseFloat(it.quantity) || 0,
        unitPriceCents: Math.round((parseFloat(it.unitPrice) || 0) * 100),
        discountCents: Math.round((parseFloat(it.discount) || 0) * 100)
      })),
    [items]
  );

  const totals = useMemo(
    () => computeTotals(parsedItems, Math.round((parseFloat(discount) || 0) * 100), business?.taxRateBps ?? 0),
    [parsedItems, discount, business]
  );

  function updateItem(i: number, field: keyof Item, value: string) {
    setItems((its) => its.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function addServiceAsLine(service: Service) {
    setItems((its) => {
      const last = its[its.length - 1];
      const isLastBlank = last && !last.description.trim() && !last.unitPrice.trim();
      const base = isLastBlank ? its.slice(0, -1) : its;
      return [
        ...base,
        {
          description: service.name,
          quantity: "1",
          unitPrice: (service.defaultUnitPriceCents / 100).toFixed(2),
          discount: "0"
        }
      ];
    });
  }

  async function ensureCustomer(): Promise<string> {
    if (customerId) return customerId;
    const { customer } = await api.post<{ customer: { id: string } }>("/api/customers", {
      name: newCustomer.name,
      phone: newCustomer.phone || null,
      email: newCustomer.email || null
    });
    return customer.id;
  }

  async function handleSave(mode: "draft" | "send") {
    setSaving(mode);
    setError(null);
    try {
      const finalCustomerId = await ensureCustomer();
      const validItems = items.filter((it) => it.description.trim() && parseFloat(it.unitPrice) >= 0);
      if (validItems.length === 0) {
        setError("Add at least one line item.");
        setSaving(null);
        return;
      }

      const { quote } = await api.post<{ quote: { id: string } }>("/api/quotes", {
        leadId,
        customerId: finalCustomerId,
        items: validItems.map((it) => ({
          description: it.description,
          quantity: parseFloat(it.quantity) || 1,
          unitPriceCents: Math.round((parseFloat(it.unitPrice) || 0) * 100),
          discountCents: Math.round((parseFloat(it.discount) || 0) * 100)
        })),
        discountCents: Math.round((parseFloat(discount) || 0) * 100),
        notes: notes || null,
        terms: terms || null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        depositCents: Math.round((totals.totalCents * (parseFloat(depositPercent) || 0)) / 100)
      });

      await api.post("/api/analytics/events", { event: "quote_created" });

      if (mode === "send") {
        await api.post(`/api/quotes/${quote.id}/send`);
        await api.post("/api/analytics/events", { event: "quote_sent" });
      }

      if (leadId) sessionStorage.removeItem(`leadforge:quoteDraft:${leadId}`);
      router.push(`/dashboard/quotes/${quote.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(null);
    }
  }

  const currency = business?.currency ?? "USD";

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-semibold mb-1">Create quote</h1>
      <p className="text-sm text-slate mb-6">
        Totals are calculated automatically — you can override any line before sending.
      </p>

      {aiRationale && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900 mb-6">
          <p className="font-medium mb-1">AI-drafted from your price list</p>
          <p className="text-xs">{aiRationale}</p>
          <p className="text-xs mt-1">Review every line below before sending — nothing is sent yet.</p>
        </div>
      )}

      {/* Customer */}
      <div className="card p-5 mb-6">
        <p className="text-xs uppercase tracking-wide text-slate font-mono mb-3">Customer</p>
        {!showNewCustomer ? (
          <div className="flex gap-2">
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn-secondary text-sm shrink-0" onClick={() => setShowNewCustomer(true)}>
              + New
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <input
              className="input"
              placeholder="Name"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Phone"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Email"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer((c) => ({ ...c, email: e.target.value }))}
            />
            {customers.length > 0 && (
              <button
                type="button"
                className="col-span-3 text-xs text-slate text-left underline underline-offset-2"
                onClick={() => setShowNewCustomer(false)}
              >
                Choose an existing customer instead
              </button>
            )}
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wide text-slate font-mono">Line items</p>
          {services.length > 0 && (
            <select
              className="input max-w-[220px] text-xs"
              value=""
              onChange={(e) => {
                const service = services.find((s) => s.id === e.target.value);
                if (service) addServiceAsLine(service);
              }}
            >
              <option value="">+ Add from services…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input
                className="input col-span-5"
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(i, "description", e.target.value)}
              />
              <input
                className="input col-span-2"
                placeholder="Qty"
                type="number"
                step="0.01"
                value={item.quantity}
                onChange={(e) => updateItem(i, "quantity", e.target.value)}
              />
              <input
                className="input col-span-2"
                placeholder="Unit price"
                type="number"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
              />
              <input
                className="input col-span-2"
                placeholder="Discount"
                type="number"
                step="0.01"
                value={item.discount}
                onChange={(e) => updateItem(i, "discount", e.target.value)}
              />
              <button
                type="button"
                className="col-span-1 text-slate hover:text-rust text-xs"
                onClick={() => setItems((its) => its.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn-secondary text-xs mt-3"
          onClick={() => setItems((its) => [...its, { ...emptyItem }])}
        >
          + Add line
        </button>
      </div>

      {/* Details */}
      <div className="card p-5 mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="label">Order discount ({currency})</label>
          <input className="input" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <div>
          <label className="label">Deposit required (%)</label>
          <input
            className="input"
            type="number"
            step="1"
            min="0"
            max="100"
            value={depositPercent}
            onChange={(e) => setDepositPercent(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Expires on</label>
          <input className="input" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Notes to customer</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Terms</label>
          <textarea className="input" rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
        </div>
      </div>

      {/* Totals */}
      <div className="card p-5 mb-6">
        <div className="space-y-1.5 text-sm max-w-xs ml-auto">
          <div className="flex justify-between">
            <span className="text-slate">Subtotal</span>
            <span className="font-mono">{formatCents(totals.subtotalCents, currency)}</span>
          </div>
          {totals.discountCents > 0 && (
            <div className="flex justify-between">
              <span className="text-slate">Discount</span>
              <span className="font-mono">-{formatCents(totals.discountCents, currency)}</span>
            </div>
          )}
          {totals.taxCents > 0 && (
            <div className="flex justify-between">
              <span className="text-slate">Tax</span>
              <span className="font-mono">{formatCents(totals.taxCents, currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-display font-semibold text-base pt-1.5 border-t border-slate-light">
            <span>Total</span>
            <span className="font-mono">{formatCents(totals.totalCents, currency)}</span>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-rust mb-4">{error}</p>}

      <div className="flex gap-3">
        <button onClick={() => handleSave("draft")} disabled={!!saving} className="btn-secondary flex-1">
          {saving === "draft" ? "Saving…" : "Save as draft"}
        </button>
        <button onClick={() => handleSave("send")} disabled={!!saving} className="btn-accent flex-1">
          {saving === "send" ? "Sending…" : "Save & send"}
        </button>
      </div>
    </div>
  );
}
