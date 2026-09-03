export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-slate-light rounded-lg">
      <h3 className="font-display font-semibold text-lg text-charcoal">{title}</h3>
      <p className="text-sm text-slate mt-1.5 max-w-sm">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
