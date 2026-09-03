"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";

type LeadAnalysis = {
  requestedService: string;
  missingInformation: string[];
  followUpQuestions: string[];
  jobSizeEstimate: string;
  urgency: string;
  customerIntent: string;
};

type Lead = {
  id: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  inquiryText: string;
  serviceRequested: string | null;
  location: string | null;
  status: string;
  notes: string | null;
  aiAnalysis: LeadAnalysis | null;
  customerId: string | null;
  quotes: { id: string; quoteNumber: string; status: string; totalCents: number; currency: string }[];
  messages: { id: string; sender: string; body: string; createdAt: string }[];
};

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "QUOTE_SENT", "ACCEPTED", "LOST", "CONVERTED"];
const TONES = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "short_whatsapp", label: "Short (WhatsApp)" }
] as const;

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { push } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const [insufficientInfo, setInsufficientInfo] = useState<{ reason: string; stillNeeded: string[] } | null>(
    null
  );
  const [tone, setTone] = useState<(typeof TONES)[number]["value"]>("friendly");
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [draftingMessage, setDraftingMessage] = useState(false);
  const [notes, setNotes] = useState("");

  function load() {
    setLoading(true);
    api
      .get<{ lead: Lead }>(`/api/leads/${id}`)
      .then((d) => {
        setLead(d.lead);
        setNotes(d.lead.notes ?? "");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      await api.post(`/api/leads/${id}/analyze`);
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Analysis failed.", "error");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleStatusChange(status: string) {
    if (!lead) return;
    setLead({ ...lead, status });
    try {
      await api.patch(`/api/leads/${id}`, { status });
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Couldn't update status.", "error");
    }
  }

  async function handleSaveNotes() {
    try {
      await api.patch(`/api/leads/${id}`, { notes });
      push("Notes saved.", "success");
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Couldn't save notes.", "error");
    }
  }

  async function handleGenerateQuote() {
    if (!lead) return;
    setGeneratingQuote(true);
    setInsufficientInfo(null);
    try {
      const { draft } = await api.post<{
        draft:
          | { sufficient: true; lines: any[]; rationale: string }
          | { sufficient: false; reason: string; stillNeeded: string[] };
      }>("/api/quotes/generate", { leadId: id });

      if (!draft.sufficient) {
        setInsufficientInfo({ reason: draft.reason, stillNeeded: draft.stillNeeded });
        return;
      }

      let customerId = lead.customerId;
      if (!customerId) {
        const { customer } = await api.post<{ customer: { id: string } }>("/api/customers", {
          name: lead.customerName,
          phone: lead.phone,
          email: lead.email
        });
        customerId = customer.id;
        await api.patch(`/api/leads/${id}`, { customerId });
      }

      sessionStorage.setItem(
        `leadforge:quoteDraft:${id}`,
        JSON.stringify({ lines: draft.lines, rationale: draft.rationale })
      );
      router.push(`/dashboard/quotes/new?leadId=${id}&customerId=${customerId}`);
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Couldn't generate a quote draft.", "error");
    } finally {
      setGeneratingQuote(false);
    }
  }

  async function handleDraftMessage() {
    setDraftingMessage(true);
    try {
      const { message } = await api.post<{ message: string }>("/api/ai/follow-up-message", {
        leadId: id,
        tone
      });
      setFollowUpDraft(message);
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Couldn't draft a message.", "error");
    } finally {
      setDraftingMessage(false);
    }
  }

  if (loading) return <div className="text-sm text-slate py-8 text-center">Loading…</div>;
  if (!lead) return <div className="text-sm text-rust py-8 text-center">Lead not found.</div>;

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/leads" className="text-sm text-slate hover:text-ink">
        ← All leads
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">{lead.customerName}</h1>
          <p className="text-sm text-slate mt-1">
            {[lead.phone, lead.email, lead.location].filter(Boolean).join(" · ") || "No contact details"}
          </p>
        </div>
        <select
          className="input max-w-[180px]"
          value={lead.status}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="card p-5 mb-6">
        <p className="text-xs uppercase tracking-wide text-slate font-mono mb-2">Customer inquiry</p>
        <p className="text-sm">{lead.inquiryText}</p>
      </div>

      {/* AI Analysis */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wide text-signal font-mono">AI lead analysis</p>
          <button onClick={handleAnalyze} disabled={analyzing} className="btn-secondary text-xs px-3 py-1.5">
            {analyzing ? "Analyzing…" : lead.aiAnalysis ? "Re-analyze" : "Analyze with AI"}
          </button>
        </div>

        {!lead.aiAnalysis ? (
          <p className="text-sm text-slate">
            Run AI analysis to identify missing details, urgency, and suggested follow-up questions.
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate">Service</p>
                <p>{lead.aiAnalysis.requestedService}</p>
              </div>
              <div>
                <p className="text-xs text-slate">Job size (AI estimate)</p>
                <p className="capitalize">{lead.aiAnalysis.jobSizeEstimate}</p>
              </div>
              <div>
                <p className="text-xs text-slate">Urgency (AI estimate)</p>
                <p className="capitalize">{lead.aiAnalysis.urgency}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate mb-1">Customer intent</p>
              <p>{lead.aiAnalysis.customerIntent}</p>
            </div>
            {lead.aiAnalysis.missingInformation.length > 0 && (
              <div>
                <p className="text-xs text-slate mb-1">Missing information</p>
                <ul className="list-disc list-inside text-charcoal/80">
                  {lead.aiAnalysis.missingInformation.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            {lead.aiAnalysis.followUpQuestions.length > 0 && (
              <div>
                <p className="text-xs text-slate mb-1">Suggested questions to ask</p>
                <ul className="list-disc list-inside text-charcoal/80">
                  {lead.aiAnalysis.followUpQuestions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quote generation */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wide text-slate font-mono">Quote</p>
          <div className="flex gap-2">
            <button onClick={handleGenerateQuote} disabled={generatingQuote} className="btn-accent text-xs px-3 py-1.5">
              {generatingQuote ? "Drafting…" : "Generate Quote with AI"}
            </button>
            <Link
              href={`/dashboard/quotes/new?leadId=${id}${lead.customerId ? `&customerId=${lead.customerId}` : ""}`}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Build manually
            </Link>
          </div>
        </div>

        {insufficientInfo && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900 mb-3">
            <p className="font-medium mb-1">More information is required before generating a reliable estimate.</p>
            <p className="text-xs mb-2">{insufficientInfo.reason}</p>
            <ul className="list-disc list-inside text-xs">
              {insufficientInfo.stillNeeded.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}

        {lead.quotes.length === 0 ? (
          <p className="text-sm text-slate">No quotes yet for this lead.</p>
        ) : (
          <div className="divide-y divide-slate-light -mx-5">
            {lead.quotes.map((q) => (
              <Link
                key={q.id}
                href={`/dashboard/quotes/${q.id}`}
                className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-light/30"
              >
                <span className="font-mono text-sm">{q.quoteNumber}</span>
                <StatusBadge status={q.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Follow-up message drafting */}
      <div className="card p-5 mb-6">
        <p className="text-xs uppercase tracking-wide text-slate font-mono mb-3">Draft a follow-up</p>
        <div className="flex gap-2 mb-3">
          {TONES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTone(t.value)}
              className={`badge border ${tone === t.value ? "bg-ink text-paper border-ink" : "border-slate-light"}`}
            >
              {t.label}
            </button>
          ))}
          <button onClick={handleDraftMessage} disabled={draftingMessage} className="btn-secondary text-xs px-3 py-1 ml-auto">
            {draftingMessage ? "Drafting…" : "Draft message"}
          </button>
        </div>
        {followUpDraft && (
          <div>
            <textarea readOnly className="input" rows={3} value={followUpDraft} />
            <button
              className="btn-secondary text-xs mt-2"
              onClick={() => {
                navigator.clipboard.writeText(followUpDraft);
                push("Copied to clipboard.", "success");
              }}
            >
              Copy
            </button>
          </div>
        )}
        <p className="text-xs text-slate mt-2">
          Nothing is sent automatically — copy this into WhatsApp, SMS, or email yourself.
        </p>
      </div>

      {/* Notes */}
      <div className="card p-5">
        <p className="text-xs uppercase tracking-wide text-slate font-mono mb-3">Internal notes</p>
        <textarea
          className="input"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Private notes about this lead — never shown to the customer."
        />
        <button onClick={handleSaveNotes} className="btn-secondary text-xs mt-2">
          Save notes
        </button>
      </div>
    </div>
  );
}
