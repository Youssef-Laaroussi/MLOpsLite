import { useId } from "react";

export function countBy<T>(items: readonly T[], select: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = select(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts, ([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

interface MetricDistributionProps {
  title: string;
  description: string;
  rows: { label: string; value: number }[];
  loading?: boolean;
  unavailable?: boolean;
}

export function MetricDistribution({ title, description, rows, loading, unavailable }: MetricDistributionProps) {
  const headingId = useId();
  const max = Math.max(1, ...rows.map(({ value }) => value));

  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <header className="mb-4 border-b border-slate-100 pb-3">
        <h3 id={headingId} className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </header>
      {loading || unavailable || !rows.length ? (
        <p role="status" className="rounded-lg bg-slate-50 px-4 py-5 text-sm text-slate-600">
          {loading ? "Loading…" : unavailable ? "Data unavailable" : "No matching data"}
        </p>
      ) : (
        <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          {rows.map(({ label, value }) => (
            <li key={label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-xs">
              <span className="break-words font-medium text-slate-700">{label}</span>
              <span className="font-mono tabular-nums text-slate-900">{value.toLocaleString()}</span>
              <div aria-hidden="true" className="col-span-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${value / max * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
