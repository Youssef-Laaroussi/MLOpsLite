import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Webhook,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Activity,
  Gauge,
  ServerCrash,
  Send,
  Plus,
  ArrowUpRight,
  BellRing,
} from "lucide-react";

type Severity = "critical" | "warning" | "resolved";

const INCIDENTS: { id: string; sev: Severity; title: string; target: string; href: string; detail: string; time: string }[] = [
  { id: "INC-142", sev: "warning", title: "Feature drift above threshold", target: "churn-xgb v2", href: "/app/monitoring", detail: "PSI 0.21 on `tenure_months` (limit 0.20)", time: "12 min ago" },
  { id: "INC-141", sev: "critical", title: "P95 latency SLA breach", target: "dep-live-02", href: "/app/deployments", detail: "P95 = 14.2 ms for 5 min (limit 10 ms)", time: "2 h ago" },
  { id: "INC-139", sev: "resolved", title: "Container restarted (OOM)", target: "sentiment-bert v1", href: "/app/deployments", detail: "Auto-recovered after memory limit raised to 2 GiB", time: "Yesterday" },
  { id: "INC-137", sev: "resolved", title: "Accuracy drop detected", target: "fraud-detector v2", href: "/app/models", detail: "F1 0.91 → 0.89 — rolled back to v3", time: "3 days ago" },
];

const SEV_STYLE: Record<Severity, { pill: string; icon: React.ElementType; label: string }> = {
  critical: { pill: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertOctagon, label: "Critical" },
  warning: { pill: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertTriangle, label: "Warning" },
  resolved: { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Resolved" },
};

const INITIAL_RULES = [
  { id: "r1", icon: Activity, name: "Data drift (PSI)", condition: "PSI > 0.20 on any feature", scope: "All production models", enabled: true },
  { id: "r2", icon: Gauge, name: "Latency SLA", condition: "P95 > 10 ms for 5 min", scope: "All deployments", enabled: true },
  { id: "r3", icon: ServerCrash, name: "Container health", condition: "Restart or crash loop", scope: "All deployments", enabled: true },
  { id: "r4", icon: ShieldAlert, name: "Performance regression", condition: "F1 drop > 2% vs baseline", scope: "Staging + Production", enabled: false },
];

const CHANNELS = [
  { name: "Slack · #ml-alerts", url: "https://hooks.slack.com/services/T00/B00/XXXX" },
  { name: "Discord · ops", url: "https://discord.com/api/webhooks/1234/XXXX" },
];

export const AlertsPage: React.FC = () => {
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const [rules, setRules] = useState(INITIAL_RULES);
  const [testing, setTesting] = useState<string | null>(null);
  const [tested, setTested] = useState<string | null>(null);

  const list = filter === "all" ? INCIDENTS : INCIDENTS.filter((i) => i.sev === filter);
  const count = (s: Severity) => INCIDENTS.filter((i) => i.sev === s).length;

  const testWebhook = (name: string) => {
    setTesting(name);
    setTested(null);
    setTimeout(() => {
      setTesting(null);
      setTested(name);
    }, 900);
  };

  const summary = [
    { label: "Open critical", value: count("critical"), tone: "text-rose-600", bg: "bg-rose-50 border-rose-100", icon: AlertOctagon },
    { label: "Open warnings", value: count("warning"), tone: "text-amber-600", bg: "bg-amber-50 border-amber-100", icon: AlertTriangle },
    { label: "Resolved (7d)", value: count("resolved"), tone: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", icon: CheckCircle2 },
    { label: "Mean time to resolve", value: "18 min", tone: "text-slate-900", bg: "bg-slate-50 border-slate-100", icon: BellRing },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
            Alerts &amp; Incidents
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rules, incidents and notification channels for drift, latency and container health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="alerts-new-rule"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> New alert rule
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl border ${s.bg} ${s.tone}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500">{s.label}</span>
            </div>
            <div className={`mt-3 text-2xl font-semibold tracking-tight ${s.tone}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Incidents */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Incident history</h3>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(["all", "critical", "warning", "resolved"] as const).map((f) => (
                <button
                  key={f}
                  id={`alerts-filter-${f}`}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg capitalize transition ${
                    filter === f ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {list.map((inc) => {
              const S = SEV_STYLE[inc.sev];
              return (
                <li key={inc.id}>
                  <Link to={inc.href} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition group">
                    <S.icon className={`w-5 h-5 mt-0.5 shrink-0 ${S.pill.split(" ")[1]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">{inc.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${S.pill}`}>{S.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{inc.detail}</p>
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">
                        {inc.id} · {inc.target} · {inc.time}
                      </p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#3BB48C] transition" />
                  </Link>
                </li>
              );
            })}
            {list.length === 0 && <li className="px-6 py-10 text-center text-sm text-slate-400">No incidents.</li>}
          </ul>
        </section>

        {/* Channels */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-3 h-fit">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <Webhook className="w-4 h-4 text-[#3BB48C]" /> Notification channels
          </h3>
          {CHANNELS.map((c) => (
            <div key={c.name} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{c.name}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Connected
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono truncate mt-1">{c.url}</p>
              <button
                onClick={() => testWebhook(c.name)}
                className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-[#1A7456] transition"
              >
                <Send className={`w-3.5 h-3.5 ${testing === c.name ? "animate-pulse" : ""}`} />
                {testing === c.name ? "Sending…" : tested === c.name ? "Test delivered ✓" : "Send test event"}
              </button>
            </div>
          ))}
        </section>
      </div>

      {/* Rules */}
      <section className="bg-white border border-slate-200 rounded-2xl">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Alert rules</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-6 py-4">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <r.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                <p className="text-xs text-slate-500">
                  <span className="font-mono">{r.condition}</span> · {r.scope}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={r.enabled}
                id={`rule-toggle-${r.id}`}
                onClick={() => setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)))}
                className={`relative w-10 h-6 rounded-full transition ${r.enabled ? "bg-[#3BB48C]" : "bg-slate-300"}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${r.enabled ? "left-5" : "left-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
