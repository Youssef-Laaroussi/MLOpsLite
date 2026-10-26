import React from "react";

/* ──────────────────────────────────────────────────────────────────────────
 * MLite Chart Kit — shared building blocks for enterprise-grade analytics
 * (Power BI / Tableau / Looker inspired). Built on top of Recharts.
 * ────────────────────────────────────────────────────────────────────────── */

// Curated categorical palette for high-readability enterprise analytics:
// Primary emerald/sage green brand, clean slate grays, and red reserved for drift / alerts.
export const PALETTE = {
  brand: "#10B981",       // MLite Primary Emerald Green (kept brand identity)
  brandDark: "#047857",   // Deep Forest Green
  brandLight: "#34D399",  // Muted Soft Green
  brandPale: "#A7F3D0",   // Very light Sage
  grayDark: "#475569",    // Slate-600
  grayMid: "#94A3B8",     // Slate-400
  grayLight: "#CBD5E1",   // Slate-300
  slate: "#64748B",       // Slate-500
  border: "#E2E8F0",      // Slate-200 fine border
  subtleBg: "#F8FAFC",    // Slate-50 very light background
  rose: "#EF4444",        // Reserved for errors / critical drift
  amber: "#F59E0B",       // Warnings / gating
  blue: "#64748B",        // Shifted from loud electric blue to elegant slate
  indigo: "#475569",      // Secondary neutral
  violet: "#64748B",      // Secondary neutral
  cyan: "#0D9488",        // Subtle teal accent
  orange: "#EA580C",
  grid: "#F1F5F9",
  axis: "#64748B",
};

export const SERIES = [
  PALETTE.brand,
  PALETTE.brandDark,
  PALETTE.grayDark,
  PALETTE.brandLight,
  PALETTE.grayMid,
  PALETTE.cyan,
];

// Common axis / grid props for consistent Snowsight enterprise typography
export const AXIS_TICK = {
  fontSize: 11,
  fill: "#64748B",
  fontFamily: '"Inter", -apple-system, sans-serif',
  fontWeight: 400,
};

export const GRID_PROPS = {
  stroke: "#F1F5F9",
  strokeDasharray: "2 2",
  vertical: false,
};

// Deterministic pseudo-random generator (stable charts between renders)
export const seeded = (seed: number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/* ── Card Shell ──────────────────────────────────────────────────────────── */
interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  footer,
  className = "",
  children,
}) => (
  <div
    className={`group relative bg-white border border-slate-200/75 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col ${className}`}
  >
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-6 pt-6 pb-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-slate-700" />
            </span>
          )}
          <h3 className="text-base font-semibold text-slate-900 tracking-tight truncate">{title}</h3>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
    <div className="px-6 pb-5 flex-1 flex flex-col">{children}</div>
    {footer && (
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 rounded-b-3xl text-[11px] text-slate-500 flex items-center justify-between gap-3">
        {footer}
      </div>
    )}
  </div>
);

/* ── Badge ───────────────────────────────────────────────────────────────── */
type Tone = "emerald" | "blue" | "amber" | "rose" | "slate" | "violet";
const TONES: Record<Tone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
};

export const Pill: React.FC<{ tone?: Tone; children: React.ReactNode; dot?: boolean }> = ({
  tone = "emerald",
  children,
  dot,
}) => (
  <span
    className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${TONES[tone]}`}
  >
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
    {children}
  </span>
);

/* ── KPI Strip (headline numbers above a chart) ──────────────────────────── */
export interface KpiItem {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
  color?: string;
}

export const KpiStrip: React.FC<{ items: KpiItem[] }> = ({ items }) => (
  <div
    className="grid gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden mb-6 shadow-sm"
    style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
  >
    {items.map((k) => (
      <div key={k.label} className="bg-white px-5 py-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 tracking-wide">
          {k.color && <span className="w-2.5 h-2.5 rounded-sm" style={{ background: k.color }} />}
          <span className="truncate">{k.label}</span>
        </div>
        <div className="flex items-baseline gap-2.5 mt-2">
          <span className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{k.value}</span>
          {k.delta && (
            <span
              className={`text-xs font-semibold tabular-nums ${
                k.positive === false ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {k.delta}
            </span>
          )}
        </div>
      </div>
    ))}
  </div>
);

/* ── Segmented Control ───────────────────────────────────────────────────── */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-xl text-[11px] font-bold">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 rounded-[10px] transition-all ${
            value === o.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Interactive Legend ──────────────────────────────────────────────────── */
export const LegendToggle: React.FC<{
  items: { key: string; label: string; color: string; dashed?: boolean }[];
  hidden: Record<string, boolean>;
  onToggle: (key: string) => void;
}> = ({ items, hidden, onToggle }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {items.map((it) => (
      <button
        key={it.key}
        onClick={() => onToggle(it.key)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
          hidden[it.key]
            ? "border-slate-200 text-slate-400 bg-white line-through"
            : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
        }`}
      >
        <span
          className="w-3 h-[3px] rounded-full"
          style={{
            background: it.dashed
              ? `repeating-linear-gradient(90deg, ${it.color} 0 3px, transparent 3px 5px)`
              : it.color,
            opacity: hidden[it.key] ? 0.35 : 1,
          }}
        />
        {it.label}
      </button>
    ))}
  </div>
);

/* ── Power BI–style Tooltip (pass as `content={<BiTooltip />}`) ──────────── */
interface BiTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: any;
  unit?: string;
  labelPrefix?: string;
  valueFormatter?: (v: number, name: string) => string;
  showTotal?: boolean;
}

export const BiTooltip: React.FC<BiTooltipProps> = ({
  active,
  payload,
  label,
  unit = "",
  labelPrefix = "",
  valueFormatter,
  showTotal,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const rows = payload.filter((p) => p.value !== undefined && p.value !== null);
  const total = rows.reduce((s, p) => s + (typeof p.value === "number" ? p.value : 0), 0);
  const fmt = (v: any, name: string) =>
    typeof v === "number" ? (valueFormatter ? valueFormatter(v, name) : `${v.toLocaleString()}${unit}`) : String(v);

  return (
    <div className="min-w-[190px] rounded-md bg-white border border-slate-200 shadow-md text-slate-800 overflow-hidden text-xs">
      {label !== undefined && label !== "" && (
        <div className="px-3 py-2 font-medium text-slate-500 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <span>{labelPrefix}{label}</span>
        </div>
      )}
      <div className="px-3 py-2.5 space-y-1.5">
        {rows.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-slate-600 truncate">
              <span
                className="w-2 h-2 rounded-xs shrink-0"
                style={{ background: p.color || p.payload?.fill || p.stroke || PALETTE.brand }}
              />
              <span className="truncate">{p.name}</span>
            </span>
            <span className="font-semibold font-mono tabular-nums text-slate-900">{fmt(p.value, p.name)}</span>
          </div>
        ))}
      </div>
      {showTotal && rows.length > 1 && (
        <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Total</span>
          <span className="font-bold font-mono tabular-nums text-slate-900">{fmt(total, "Total")}</span>
        </div>
      )}
    </div>
  );
};

/* ── Mini progress bar used inside legends/tables ───────────────────────── */
export const MiniBar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
  </div>
);
