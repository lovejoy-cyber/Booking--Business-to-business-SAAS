"use client";

import { useEffect, useState } from "react";

const STAGES = ["inquiry", "analyzing", "quote"] as const;
type Stage = (typeof STAGES)[number];

const LINES = [
  { label: "Interior painting — per room", qty: "3 rooms", price: "$180.00", total: "$540.00" },
  { label: "Wall prep & filler", qty: "1 job", price: "$95.00", total: "$95.00" },
  { label: "Premium paint & materials", qty: "3 rooms", price: "$60.00", total: "$180.00" }
];

export function HeroDemo() {
  const [stage, setStage] = useState<Stage>("inquiry");

  useEffect(() => {
    const t1 = setTimeout(() => setStage("analyzing"), 1600);
    const t2 = setTimeout(() => setStage("quote"), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0">
      <div className="card p-5 min-h-[320px] flex flex-col">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-light">
          <span className="h-2 w-2 rounded-full bg-moss" />
          <span className="text-xs font-mono text-slate">New inquiry — WhatsApp</span>
        </div>

        <div
          className={`transition-all duration-500 ${
            stage === "inquiry" ? "opacity-100" : "opacity-40"
          }`}
        >
          <div className="bg-slate-light/60 rounded-lg rounded-tl-none px-4 py-3 text-sm max-w-[85%]">
            "Hi, how much would it cost to paint a 3-bedroom house?"
          </div>
        </div>

        {stage === "analyzing" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate animate-pulse">
            <span className="font-mono text-xs uppercase tracking-wide text-signal">AI</span>
            Identifying service, missing details, and matching your price list…
          </div>
        )}

        {stage === "quote" && (
          <div className="mt-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wide text-slate">Draft quote Q-0042</span>
              <span className="badge bg-amber-100 text-amber-800">Review needed</span>
            </div>
            <div className="space-y-1.5">
              {LINES.map((l) => (
                <div key={l.label} className="flex justify-between text-xs">
                  <span className="text-charcoal/80">
                    {l.label} <span className="text-slate">× {l.qty}</span>
                  </span>
                  <span className="font-mono">{l.total}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t border-slate-light font-medium">
              <span>Total</span>
              <span className="font-mono">$815.00</span>
            </div>
          </div>
        )}

        <div className="mt-auto pt-4 flex gap-2">
          {STAGES.map((s) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                STAGES.indexOf(stage) >= STAGES.indexOf(s) ? "bg-signal" : "bg-slate-light"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
