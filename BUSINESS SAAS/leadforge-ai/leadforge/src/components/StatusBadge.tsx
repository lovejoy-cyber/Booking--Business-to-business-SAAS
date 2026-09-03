const STYLES: Record<string, string> = {
  NEW: "bg-slate-light text-charcoal",
  CONTACTED: "bg-blue-100 text-blue-800",
  QUALIFIED: "bg-amber-100 text-amber-800",
  QUOTE_SENT: "bg-indigo-100 text-indigo-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  LOST: "bg-slate-light text-slate",
  CONVERTED: "bg-moss/20 text-moss",
  DRAFT: "bg-slate-light text-charcoal",
  SENT: "bg-indigo-100 text-indigo-800",
  VIEWED: "bg-amber-100 text-amber-800",
  CHANGES_REQUESTED: "bg-rust/10 text-rust",
  EXPIRED: "bg-slate-light text-slate",
  SCHEDULED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-light text-slate",
  PAID: "bg-emerald-100 text-emerald-800",
  OVERDUE: "bg-rust/10 text-rust"
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? "bg-slate-light text-charcoal";
  return <span className={`badge ${style}`}>{status.replace(/_/g, " ")}</span>;
}
