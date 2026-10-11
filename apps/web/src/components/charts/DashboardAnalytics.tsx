import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { Activity, ArrowUpRight, BarChart3, Cpu, PieChart as PieIcon, ShieldCheck } from "lucide-react";
import {
  AXIS_TICK,
  BiTooltip,
  ChartCard,
  GRID_PROPS,
  KpiStrip,
  LegendToggle,
  MiniBar,
  PALETTE,
  Pill,
  Segmented,
  fmtCompact,
  seeded,
} from "./ChartKit";

/* ───────────────────────── Data builders ───────────────────────── */

const RESOURCES = [
  { key: "Experiments", final: 67, color: PALETTE.violet },
  { key: "Datasets", final: 24, color: PALETTE.blue },
  { key: "Models", final: 15, color: PALETTE.orange },
  { key: "Projects", final: 8, color: PALETTE.brand },
  { key: "Deployments", final: 6, color: PALETTE.cyan },
];
const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const GROWTH = [0.38, 0.5, 0.61, 0.74, 0.86, 1];

const buildInventory = () =>
  MONTHS.map((m, i) => {
    const row: Record<string, number | string> = { month: m };
    RESOURCES.forEach((r) => {
      row[r.key] = Math.max(1, Math.round(r.final * GROWTH[i]));
    });
    row.total = RESOURCES.reduce((s, r) => s + (row[r.key] as number), 0);
    return row;
  });

const buildLatency = () => {
  const rnd = seeded(42);
  return Array.from({ length: 24 }, (_, h) => {
    const load = 0.5 + 0.5 * Math.sin(((h - 7) / 24) * Math.PI * 2); // diurnal profile
    const reqs = Math.round(260 + load * 1650 + rnd() * 140);
    const p50 = +(1.9 + load * 1.4 + rnd() * 0.35).toFixed(2);
    const p95 = +(p50 * 1.9 + rnd() * 0.6).toFixed(2);
    const p99 = +(p95 * 1.5 + rnd() * 1.1).toFixed(2);
    return { time: `${String(h).padStart(2, "0")}:00`, reqs, p50, p95, p99 };
  });
};

const SERVICES = [
  { name: "FastAPI Core", detail: "180 MB RAM · 3.2 ms", base: 24, color: PALETTE.brand, unit: "% CPU" },
  { name: "PostgreSQL 16", detail: "8 conns · buffer pool", base: 42, color: PALETTE.indigo, unit: "% Buffer" },
  { name: "MinIO S3", detail: "88.6 MB / 1 GB", base: 65, color: PALETTE.amber, unit: "% Storage" },
  { name: "MLflow Server", detail: "Port 5000 · 3 exps", base: 38, color: PALETTE.violet, unit: "% CPU" },
];

const buildServiceSeries = (base: number, seed: number) => {
  const rnd = seeded(seed);
  let v = base;
  return Array.from({ length: 40 }, (_, i) => {
    v = Math.max(4, Math.min(96, v + (rnd() - 0.5) * 8 + (base - v) * 0.15));
    return { t: i, label: `${40 - i} min ago`, v: +v.toFixed(1) };
  });
};

const DRIFT_FEATURES = [
  { name: "card_age_months", psi: 0.011, acc: 96.0, imp: 14 },
  { name: "transaction_amount", psi: 0.021, acc: 94.2, imp: 32 },
  { name: "distance_from_home", psi: 0.032, acc: 91.5, imp: 18 },
  { name: "daily_txn_count", psi: 0.041, acc: 88.4, imp: 12 },
  { name: "merchant_risk_score", psi: 0.046, acc: 92.0, imp: 26 },
  { name: "is_foreign_txn", psi: 0.018, acc: 95.1, imp: 9 },
  { name: "user_score", psi: 0.058, acc: 90.3, imp: 16 },
  { name: "device_trust", psi: 0.087, acc: 87.2, imp: 21 },
];

/* ───────────────────────── Component ───────────────────────── */

interface Props {
  stageCounts: { PRODUCTION: number; STAGING: number; DEVELOPMENT: number; total: number };
}

export const DashboardAnalytics: React.FC<Props> = ({ stageCounts }) => {
  const inventory = useMemo(buildInventory, []);
  const latency = useMemo(buildLatency, []);
  const services = useMemo(
    () => SERVICES.map((s, i) => ({ ...s, series: buildServiceSeries(s.base, 100 + i * 7) })),
    []
  );

  const [hiddenLat, setHiddenLat] = useState<Record<string, boolean>>({});
  const [invMode, setInvMode] = useState<"stacked" | "share">("stacked");

  const last = inventory[inventory.length - 1];
  const prev = inventory[inventory.length - 2];
  const totalNow = last.total as number;
  const totalPrev = prev.total as number;

  const avg = (k: "p50" | "p95" | "p99") => (latency.reduce((s, d) => s + d[k], 0) / latency.length).toFixed(1);
  const peakReqs = Math.max(...latency.map((d) => d.reqs));
  const totalReqs = latency.reduce((s, d) => s + d.reqs, 0) * 3600;

  const stageData = [
    { name: "Production", value: stageCounts.PRODUCTION, color: PALETTE.brand, note: "Live endpoints" },
    { name: "Staging", value: stageCounts.STAGING, color: PALETTE.amber, note: "Shadow / canary" },
    { name: "Development", value: stageCounts.DEVELOPMENT, color: PALETTE.blue, note: "Sandbox runs" },
  ];

  const shareData = inventory.map((row) => {
    const out: Record<string, number | string> = { month: row.month };
    RESOURCES.forEach((r) => {
      out[r.key] = +(((row[r.key] as number) / (row.total as number)) * 100).toFixed(1);
    });
    return out;
  });

  return (
    <div className="space-y-6">
      {/* ── ROW 1: Platform Inventory Growth ─────────────────────────── */}
      <ChartCard
        title="Platform Asset Inventory"
        subtitle="Month-over-month growth of every tracked MLOps asset across the workspace"
        icon={BarChart3}
        badge={<Pill tone="emerald">+{Math.round(((totalNow - totalPrev) / totalPrev) * 100)}% MoM</Pill>}
        actions={
          <Segmented
            value={invMode}
            onChange={setInvMode}
            options={[
              { value: "stacked", label: "Volume" },
              { value: "share", label: "Mix %" },
            ]}
          />
        }
        footer={
          <>
            <span>Source: PostgreSQL registry · refreshed live</span>
            <span className="font-semibold text-slate-700 tabular-nums">{totalNow} assets tracked</span>
          </>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={invMode === "stacked" ? inventory : shareData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  domain={invMode === "share" ? [0, 100] : [0, "auto"]}
                  tickFormatter={(v) => (invMode === "share" ? `${v}%` : `${v}`)}
                />
                <Tooltip
                  cursor={{ fill: "rgba(59,180,140,0.06)" }}
                  content={<BiTooltip showTotal={invMode === "stacked"} unit={invMode === "share" ? "%" : ""} labelPrefix="2026 · " />}
                />
                {RESOURCES.map((r, i) => (
                  <Bar
                    key={r.key}
                    dataKey={r.key}
                    stackId="inv"
                    fill={r.color}
                    maxBarSize={46}
                    radius={i === RESOURCES.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                    animationDuration={900}
                  />
                ))}
                {invMode === "stacked" && (
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total assets"
                    stroke="#0F172A"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: "#fff", stroke: "#0F172A", strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown table */}
          <div className="lg:col-span-4">
            <div className="grid grid-cols-12 text-[10px] font-semibold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
              <span className="col-span-5">Asset</span>
              <span className="col-span-2 text-right">Now</span>
              <span className="col-span-2 text-right">MoM</span>
              <span className="col-span-3 text-right">Share</span>
            </div>
            <div className="divide-y divide-slate-100">
              {RESOURCES.map((r) => {
                const now = last[r.key] as number;
                const before = prev[r.key] as number;
                const delta = before ? Math.round(((now - before) / before) * 100) : 0;
                const share = (now / totalNow) * 100;
                return (
                  <div key={r.key} className="grid grid-cols-12 items-center py-2.5 text-xs">
                    <span className="col-span-5 flex items-center gap-2 font-semibold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: r.color }} />
                      {r.key}
                    </span>
                    <span className="col-span-2 text-right font-bold text-slate-900 tabular-nums">{now}</span>
                    <span className="col-span-2 text-right font-bold text-emerald-600 tabular-nums">+{delta}%</span>
                    <span className="col-span-3 pl-3">
                      <MiniBar pct={share} color={r.color} />
                      <span className="block text-right text-[10px] text-slate-400 tabular-nums mt-0.5">{share.toFixed(1)}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ChartCard>

      {/* ── ROW 2: Latency + Registry Mix ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <ChartCard
          className="lg:col-span-8"
          title="Inference Latency & Throughput"
          subtitle="Hourly P50 / P95 / P99 response time (ms) overlaid on request volume — last 24h"
          icon={Activity}
          badge={<Pill tone="emerald" dot>SLA met</Pill>}
          actions={
            <LegendToggle
              items={[
                { key: "reqs", label: "Requests", color: "#CBD5E1" },
                { key: "p50", label: "P50", color: PALETTE.brand },
                { key: "p95", label: "P95", color: PALETTE.amber },
                { key: "p99", label: "P99", color: PALETTE.rose, dashed: true },
              ]}
              hidden={hiddenLat}
              onToggle={(k) => setHiddenLat((h) => ({ ...h, [k]: !h[k] }))}
            />
          }
          footer={
            <>
              <span>SLA contract: P95 &lt; 15 ms · Tier-1</span>
              <span className="font-semibold text-slate-700">{fmtCompact(totalReqs)} predictions served / 24h</span>
            </>
          }
        >
          <KpiStrip
            items={[
              { label: "P50 median", value: `${avg("p50")} ms`, delta: "−4.1%", color: PALETTE.brand },
              { label: "P95 tail", value: `${avg("p95")} ms`, delta: "−2.6%", color: PALETTE.amber },
              { label: "P99 spike", value: `${avg("p99")} ms`, delta: "+1.2%", positive: false, color: PALETTE.rose },
              { label: "Peak load", value: `${fmtCompact(peakReqs)} rps`, delta: "+18%" },
            ]}
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={latency} margin={{ top: 8, right: 0, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="dash-reqs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#CBD5E1" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#E2E8F0" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="dash-p50" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.brand} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={PALETTE.brand} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="time" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={3} />
                <YAxis yAxisId="ms" tick={AXIS_TICK} axisLine={false} tickLine={false} domain={[0, 18]} tickFormatter={(v) => `${v}ms`} />
                <YAxis yAxisId="rps" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmtCompact} />
                <Tooltip
                  cursor={{ stroke: "#CBD5E1", strokeDasharray: "4 4" }}
                  content={
                    <BiTooltip valueFormatter={(v, n) => (n === "Requests / h" ? `${v.toLocaleString()} rps` : `${v} ms`)} />
                  }
                />
                <ReferenceLine
                  yAxisId="ms"
                  y={15}
                  stroke={PALETTE.rose}
                  strokeDasharray="6 4"
                  label={{ value: "SLA 15 ms", position: "insideTopLeft", fill: PALETTE.rose, fontSize: 10, fontWeight: 700 }}
                />
                {!hiddenLat.reqs && (
                  <Bar yAxisId="rps" dataKey="reqs" name="Requests / h" fill="url(#dash-reqs)" radius={[4, 4, 0, 0]} maxBarSize={16} />
                )}
                {!hiddenLat.p50 && (
                  <Area yAxisId="ms" type="monotone" dataKey="p50" name="P50" stroke={PALETTE.brand} strokeWidth={2.5} fill="url(#dash-p50)" dot={false} activeDot={{ r: 4 }} />
                )}
                {!hiddenLat.p95 && (
                  <Line yAxisId="ms" type="monotone" dataKey="p95" name="P95" stroke={PALETTE.amber} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                )}
                {!hiddenLat.p99 && (
                  <Line yAxisId="ms" type="monotone" dataKey="p99" name="P99" stroke={PALETTE.rose} strokeWidth={1.8} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          className="lg:col-span-4"
          title="Registry Lifecycle Mix"
          subtitle="Model versions by promotion stage"
          icon={PieIcon}
          actions={
            <Link to="/app/models" className="text-xs font-bold text-[#1A7456] hover:underline flex items-center gap-1">
              Catalog <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          }
          footer={
            <>
              <span>Signed artefacts</span>
              <span className="font-semibold text-emerald-700">100% · 0 unsigned</span>
            </>
          }
        >
          <div className="relative h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<BiTooltip valueFormatter={(v) => `${v} models`} />} />
                <Pie
                  data={stageData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="66%"
                  outerRadius="92%"
                  paddingAngle={3}
                  cornerRadius={6}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {stageData.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">{stageCounts.total}</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Versions</span>
            </div>
          </div>
          <div className="mt-3 space-y-2.5">
            {stageData.map((s) => {
              const pct = (s.value / stageCounts.total) * 100;
              return (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-2 font-semibold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: s.color }} />
                      {s.name}
                      <span className="text-[10px] font-medium text-slate-400">{s.note}</span>
                    </span>
                    <span className="tabular-nums font-bold text-slate-900">
                      {s.value} <span className="text-slate-400 font-medium">· {pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <MiniBar pct={pct} color={s.color} />
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* ── ROW 3: Infra small-multiples + Drift scatter ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Infrastructure Utilisation"
          subtitle="Rolling 40-minute utilisation per microservice with 80% saturation threshold"
          icon={Cpu}
          badge={<Pill tone="emerald" dot>4/4 healthy</Pill>}
          footer={
            <>
              <span>Docker Engine · cAdvisor telemetry</span>
              <span className="font-semibold text-slate-700">Cluster health 100%</span>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((s, i) => {
              const current = s.series[s.series.length - 1].v;
              const first = s.series[0].v;
              const delta = current - first;
              return (
                <div key={s.name} className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 p-3.5 hover:border-slate-300 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {s.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{s.detail}</div>
                    </div>
                    <span className={`text-[10px] font-bold tabular-nums ${delta > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900">{current.toFixed(0)}</span>
                    <span className="text-[11px] font-semibold text-slate-400">{s.unit}</span>
                  </div>
                  <div className="h-14 -mx-1 mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={s.series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`svc-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" hide />
                        <YAxis hide domain={[0, 100]} />
                        <ReferenceLine y={80} stroke={PALETTE.rose} strokeDasharray="3 3" strokeOpacity={0.6} />
                        <Tooltip content={<BiTooltip unit="%" />} cursor={{ stroke: "#CBD5E1" }} />
                        <Area type="monotone" dataKey="v" name={s.unit.replace("% ", "")} stroke={s.color} strokeWidth={2} fill={`url(#svc-${i})`} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard
          title="Feature Drift vs Model Accuracy"
          subtitle="Population Stability Index per feature · bubble size = feature importance (SHAP)"
          icon={ShieldCheck}
          badge={<Pill tone="amber">1 warning</Pill>}
          actions={
            <Link to="/app/monitoring" className="text-xs font-bold text-[#1A7456] hover:underline flex items-center gap-1">
              Monitoring <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          }
          footer={
            <>
              <span>Evidently AI · KS & PSI tests</span>
              <span className="font-semibold text-slate-700">7 of 8 features in safe zone</span>
            </>
          }
        >
          <div className="h-[296px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 12, left: -10, bottom: 8 }}>
                <CartesianGrid stroke={PALETTE.grid} strokeDasharray="3 4" />
                <ReferenceArea x1={0} x2={0.05} fill={PALETTE.brand} fillOpacity={0.06} />
                <ReferenceArea x1={0.05} x2={0.1} fill={PALETTE.amber} fillOpacity={0.08} />
                <ReferenceArea x1={0.1} x2={0.12} fill={PALETTE.rose} fillOpacity={0.08} />
                <XAxis
                  type="number"
                  dataKey="psi"
                  name="PSI"
                  domain={[0, 0.12]}
                  ticks={[0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12]}
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Population Stability Index", position: "insideBottom", offset: -4, fontSize: 10, fill: PALETTE.axis }}
                />
                <YAxis
                  type="number"
                  dataKey="acc"
                  name="Accuracy"
                  domain={[85, 98]}
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <ZAxis type="number" dataKey="imp" range={[80, 520]} name="Importance" />
                <ReferenceLine x={0.05} stroke={PALETTE.amber} strokeDasharray="5 4" label={{ value: "Warn", position: "top", fontSize: 10, fill: PALETTE.amber, fontWeight: 700 }} />
                <ReferenceLine x={0.1} stroke={PALETTE.rose} strokeDasharray="5 4" label={{ value: "Critical", position: "top", fontSize: 10, fill: PALETTE.rose, fontWeight: 700 }} />
                <Tooltip
                  cursor={{ strokeDasharray: "4 4", stroke: "#CBD5E1" }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <BiTooltip
                        active
                        label={p.name}
                        payload={[
                          { name: "PSI", value: p.psi, color: p.psi > 0.05 ? PALETTE.amber : PALETTE.brand },
                          { name: "Accuracy", value: p.acc, color: PALETTE.blue },
                          { name: "Importance", value: p.imp, color: PALETTE.violet },
                        ]}
                        valueFormatter={(v, n) => (n === "Accuracy" ? `${v}%` : n === "Importance" ? `${v}%` : v.toFixed(3))}
                      />
                    );
                  }}
                />
                <Scatter data={DRIFT_FEATURES} fillOpacity={0.85}>
                  {DRIFT_FEATURES.map((f) => (
                    <Cell
                      key={f.name}
                      fill={f.psi > 0.05 ? PALETTE.amber : PALETTE.brand}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};
