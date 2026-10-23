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

const SEV_STYLE: Record<Severity, { pill: string; icon: React.ElementType; label: string; iconColor: string }> = {
  critical: { pill: "bg-[#ef4444] text-white", icon: AlertOctagon, label: "Critical", iconColor: "text-[#ef4444]" },
  warning: { pill: "bg-[#f59e0b] text-white", icon: AlertTriangle, label: "Warning", iconColor: "text-[#f59e0b]" },
  resolved: { pill: "bg-[#10b981] text-white", icon: CheckCircle2, label: "Resolved", iconColor: "text-[#10b981]" },
};

const INITIAL_RULES = [
  { id: "r1", icon: Activity, name: "Data drift (PSI)", condition: "PSI > 0.20 on any feature", scope: "All production models", category: "Data Integrity", enabled: true },
  { id: "r2", icon: Gauge, name: "Latency SLA", condition: "P95 > 10 ms for 5 min", scope: "All deployments", category: "Performance", enabled: true },
  { id: "r3", icon: ServerCrash, name: "Container health", condition: "Restart or crash loop", scope: "All deployments", category: "Infrastructure", enabled: true },
  { id: "r4", icon: ShieldAlert, name: "Performance regression", condition: "F1 drop > 2% vs baseline", scope: "Staging + Production", category: "Model Quality", enabled: false },
];

const CHANNELS = [
  { name: "Slack · #ml-alerts", url: "https://hooks.slack.com/services/T00/B00/XXXX", status: "Active" },
  { name: "Discord · ops", url: "https://discord.com/api/webhooks/1234/XXXX", status: "Active" },
];

export const AlertsPage: React.FC = () => {
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const [rules, setRules] = useState(INITIAL_RULES);
  const [testing, setTesting] = useState<string | null>(null);
  const [tested, setTested] = useState<string | null>(null);

  // Modal New Alert Rule
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleCondition, setNewRuleCondition] = useState("PSI > 0.15 on any feature");
  const [newRuleScope, setNewRuleScope] = useState("All production models");
  const [newRuleCategory, setNewRuleCategory] = useState("Data Integrity");

  const list = filter === "all" ? INCIDENTS : INCIDENTS.filter((i) => i.sev === filter);
  const count = (s: Severity) => INCIDENTS.filter((i) => i.sev === s).length;

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const created = {
      id: `r-${Date.now()}`,
      icon: Activity,
      name: newRuleName.trim(),
      condition: newRuleCondition.trim(),
      scope: newRuleScope.trim(),
      category: newRuleCategory,
      enabled: true,
    };

    setRules([created, ...rules]);
    setNewRuleName("");
    setIsModalOpen(false);
  };

  const testWebhook = (name: string) => {
    setTesting(name);
    setTested(null);
    setTimeout(() => {
      setTesting(null);
      setTested(name);
    }, 900);
  };

  const summary = [
    { label: "Active Criticals", value: count("critical"), tone: "text-[#ef4444]", badgeBg: "bg-rose-50 border-rose-200 text-[#ef4444]", icon: AlertOctagon },
    { label: "Active Warnings", value: count("warning"), tone: "text-[#f59e0b]", badgeBg: "bg-amber-50 border-amber-200 text-[#f59e0b]", icon: AlertTriangle },
    { label: "Resolved (7d)", value: count("resolved"), tone: "text-[#10b981]", badgeBg: "bg-emerald-50 border-emerald-200 text-[#10b981]", icon: CheckCircle2 },
    { label: "Mean Time to Resolve", value: "18 min", tone: "text-slate-900", badgeBg: "bg-slate-100 border-slate-200 text-slate-700", icon: BellRing },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
            <span>Alerts &amp; Incidents</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time threshold rules, incident lineage, and operational webhooks for serving infrastructure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="alerts-new-rule"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-bold shadow-xs hover:shadow-md transition active:translate-y-0.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Alert Rule
          </button>
        </div>
      </div>

      {/* ── Metrics Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((s) => (
          <div
            key={s.label}
            className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg border bg-slate-100 border-slate-200/60 text-slate-700 shrink-0`}>
                  <s.icon className="w-4 h-4 stroke-[2]" />
                </div>
                <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{s.label}</span>
                <span className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0">↗</span>
              </div>
              <div className="text-xl font-bold font-sans text-slate-900 mt-2.5 mb-1 tracking-tight">
                {s.value}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <span>{s.label.includes("Critical") ? "Live Monitor" : "Active SLA"}</span>
              <span className="text-slate-400 font-normal">vs prev. period</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Incidents & Channels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Incidents Section - Clean Professional Table */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Incident History</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time alerts log</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(["all", "critical", "warning", "resolved"] as const).map((f) => (
                <button
                  key={f}
                  id={`alerts-filter-${f}`}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition cursor-pointer ${
                    filter === f ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Incident &amp; Detail</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3 text-right">Time</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((inc) => {
                  const S = SEV_STYLE[inc.sev];
                  return (
                    <tr
                      key={inc.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => window.location.href = inc.href}
                    >
                      {/* Severity Pill */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${S.pill}`}>
                          <S.icon className="w-3 h-3" />
                          {S.label}
                        </span>
                      </td>

                      {/* Title & Detail */}
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-sm text-slate-900 group-hover:text-[#3BB48C] transition-colors">
                          {inc.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-normal">
                          {inc.detail}
                        </div>
                      </td>

                      {/* Target & ID */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="text-xs font-mono font-medium text-slate-700">
                          {inc.target}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {inc.id}
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-3.5 text-right whitespace-nowrap text-xs text-slate-500 font-mono">
                        {inc.time}
                      </td>

                      {/* Navigation arrow */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#3BB48C] transition-colors inline" />
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                      No incidents match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Notification Webhooks */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Webhook className="w-4 h-4 text-[#3BB48C]" /> Notification Channels
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Automated dispatch endpoints</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              2 Connected
            </span>
          </div>

          <div className="space-y-3">
            {CHANNELS.map((c) => (
              <div key={c.name} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">{c.name}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#10b981] text-white shadow-2xs">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200/80 font-mono text-[11px] text-slate-600 truncate">
                  {c.url}
                </div>
                <button
                  onClick={() => testWebhook(c.name)}
                  className="mt-3 w-full py-1.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs active:translate-y-0.5"
                >
                  <Send className={`w-3.5 h-3.5 text-[#3BB48C] ${testing === c.name ? "animate-spin" : ""}`} />
                  <span>{testing === c.name ? "Dispatching event..." : tested === c.name ? "Test Delivered ✓" : "Send Test Event"}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Alert Rules Section ── */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Alert Rules</h3>
            <p className="text-xs text-slate-500 mt-0.5">Automated threshold triggers</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {rules.filter(r => r.enabled).length}/{rules.length} active
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <r.icon className={`w-4 h-4 shrink-0 ${r.enabled ? "text-[#3BB48C]" : "text-slate-400"}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{r.name}</span>
                    <span className="text-xs text-slate-400 hidden md:inline">—</span>
                    <span className="text-xs text-slate-500 hidden md:inline">{r.condition}</span>
                  </div>
                  <div className="text-xs text-slate-400 md:hidden mt-0.5">
                    {r.condition}
                  </div>
                </div>
              </div>

              {/* Minimal Clean Switch Toggle */}
              <button
                role="switch"
                aria-checked={r.enabled}
                id={`rule-toggle-${r.id}`}
                onClick={() => setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)))}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  r.enabled ? "bg-[#10b981]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    r.enabled ? "translate-x-4 mt-0.5" : "translate-x-0.5 mt-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modal: New Alert Rule ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  New Alert Rule
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure automated trigger thresholds for models &amp; deployments
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRule} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Memory Spike or PSI Drift Warning"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#3BB48C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={newRuleCategory}
                  onChange={(e) => setNewRuleCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#3BB48C] bg-white cursor-pointer"
                >
                  <option value="Data Integrity">Data Integrity (PSI, KS drift)</option>
                  <option value="Performance">Performance (Latency SLA)</option>
                  <option value="Infrastructure">Infrastructure (Crash loop, OOM)</option>
                  <option value="Model Quality">Model Quality (F1 score decay)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Threshold Condition
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PSI > 0.20 or P95 > 12ms"
                  value={newRuleCondition}
                  onChange={(e) => setNewRuleCondition(e.target.value)}
                  className="w-full px-3.5 py-2 font-mono border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#3BB48C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scope
                </label>
                <input
                  type="text"
                  required
                  value={newRuleScope}
                  onChange={(e) => setNewRuleScope(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#3BB48C]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
