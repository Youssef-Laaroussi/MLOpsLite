import React, { useEffect, useState, useTransition } from "react";
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
  Trash2,
  RefreshCw,
  AlertCircle,
  Play,
  Check,
} from "lucide-react";
import {
  Alert,
  AlertRule,
  NotificationChannel,
  AlertSummary,
  AlertSeverity,
} from "../api/types";
import {
  fetchAlerts,
  fetchAlertsSummary,
  acknowledgeAlert,
  resolveAlert,
  fetchAlertRules,
  createAlertRule,
  toggleAlertRule,
  deleteAlertRule,
  evaluateAlertRules,
  fetchNotificationChannels,
  createNotificationChannel,
  deleteNotificationChannel,
  testNotificationChannel,
} from "../api/client";

function formatTimeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diff)) return "--";
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min}m ago`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "--";
  }
}

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "resolved">("all");
  const [channelTesting, setChannelTesting] = useState<string | null>(null);
  const [channelTestResult, setChannelTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  // Modal: New Rule
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleMetric, setNewRuleMetric] = useState<"drift_share" | "latency_p95_ms" | "failed_deployments">("drift_share");
  const [newRuleOperator, setNewRuleOperator] = useState<">" | ">=" | "<" | "<=">(">");
  const [newRuleThreshold, setNewRuleThreshold] = useState<number>(0.2);
  const [newRuleModel, setNewRuleModel] = useState<string>("");
  const [newRuleSeverity, setNewRuleSeverity] = useState<AlertSeverity>("WARNING");

  // Modal: New Channel
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChanName, setNewChanName] = useState("");
  const [newChanKind, setNewChanKind] = useState<"SLACK" | "DISCORD" | "WEBHOOK">("SLACK");
  const [newChanUrl, setNewChanUrl] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [alertsData, summaryData, rulesData, channelsData] = await Promise.all([
        fetchAlerts(),
        fetchAlertsSummary(),
        fetchAlertRules(),
        fetchNotificationChannels(),
      ]);
      setAlerts(alertsData);
      setSummary(summaryData);
      setRules(rulesData);
      setChannels(channelsData);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load alerts & alerting configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      const updated = await acknowledgeAlert(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      const s = await fetchAlertsSummary();
      setSummary(s);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to acknowledge alert");
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const updated = await resolveAlert(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      const s = await fetchAlertsSummary();
      setSummary(s);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to resolve alert");
    }
  };

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      const updated = await toggleAlertRule(rule.id, !rule.enabled);
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update alert rule");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this alert rule?")) return;
    try {
      await deleteAlertRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to delete alert rule");
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;
    try {
      const created = await createAlertRule({
        name: newRuleName.trim(),
        metric: newRuleMetric,
        operator: newRuleOperator,
        threshold: Number(newRuleThreshold),
        model_name: newRuleModel.trim() ? newRuleModel.trim() : null,
        severity: newRuleSeverity,
        enabled: true,
      });
      setRules((prev) => [created, ...prev]);
      setNewRuleName("");
      setNewRuleModel("");
      setIsRuleModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create rule");
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim() || !newChanUrl.trim()) return;
    try {
      const created = await createNotificationChannel({
        name: newChanName.trim(),
        kind: newChanKind,
        url: newChanUrl.trim(),
      });
      setChannels((prev) => [created, ...prev]);
      setNewChanName("");
      setNewChanUrl("");
      setIsChannelModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create notification channel");
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!window.confirm("Remove this notification webhook?")) return;
    try {
      await deleteNotificationChannel(id);
      setChannels((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to delete notification channel");
    }
  };

  const handleTestChannel = async (channel: NotificationChannel) => {
    setChannelTesting(channel.id);
    setChannelTestResult(null);
    try {
      const res = await testNotificationChannel(channel.id);
      setChannelTestResult({
        id: channel.id,
        ok: res.delivered,
        msg: res.delivered
          ? "Test delivered successfully ✓"
          : (res.error || "Dispatch failed (destination unreachable or rejected)"),
      });
      // reload channel to reflect last_test status
      const updatedChannels = await fetchNotificationChannels();
      setChannels(updatedChannels);
    } catch (err: any) {
      setChannelTestResult({
        id: channel.id,
        ok: false,
        msg: err?.response?.data?.detail || "Webhook test request failed",
      });
    } finally {
      setChannelTesting(null);
    }
  };

  const handleEvaluateRules = async () => {
    setEvaluating(true);
    setEvalResult(null);
    try {
      const res = await evaluateAlertRules();
      setEvalResult(`Evaluated ${res.evaluated} rule(s) — ${res.triggered.length} alert(s) triggered.`);
      // Reload alerts and summary
      const [alertsData, summaryData] = await Promise.all([
        fetchAlerts(),
        fetchAlertsSummary(),
      ]);
      setAlerts(alertsData);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Rule evaluation failed");
    } finally {
      setEvaluating(false);
    }
  };

  // Filter incidents list
  const filteredAlerts = alerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "resolved") return a.status === "RESOLVED";
    if (filter === "critical") return (a.severity === "CRITICAL" || a.severity === "HIGH") && a.status !== "RESOLVED";
    if (filter === "warning") return a.severity === "WARNING" && a.status !== "RESOLVED";
    return true;
  });

  const getSeverityBadge = (a: Alert) => {
    if (a.status === "RESOLVED") {
      return {
        pill: "bg-[#10b981] text-white",
        icon: CheckCircle2,
        label: "Resolved",
      };
    }
    if (a.status === "ACKNOWLEDGED") {
      return {
        pill: "bg-slate-700 text-white",
        icon: Activity,
        label: "Acknowledged",
      };
    }
    if (a.severity === "CRITICAL" || a.severity === "HIGH") {
      return {
        pill: "bg-[#ef4444] text-white",
        icon: AlertOctagon,
        label: a.severity === "CRITICAL" ? "Critical" : "High",
      };
    }
    if (a.severity === "WARNING") {
      return {
        pill: "bg-[#f59e0b] text-white",
        icon: AlertTriangle,
        label: "Warning",
      };
    }
    return {
      pill: "bg-[#3b82f6] text-white",
      icon: ShieldAlert,
      label: "Info",
    };
  };

  const getMetricIcon = (metric: string) => {
    if (metric === "drift_share") return Activity;
    if (metric === "latency_p95_ms") return Gauge;
    return ServerCrash;
  };

  const formatMetricLabel = (metric: string, op: string, threshold: number) => {
    if (metric === "drift_share") return `Drift share ${op} ${(threshold * 100).toFixed(0)}%`;
    if (metric === "latency_p95_ms") return `P95 Latency ${op} ${threshold} ms`;
    return `Failed containers ${op} ${threshold}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-600 font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Evaluation Notice ── */}
      {evalResult && (
        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{evalResult}</span>
          </div>
          <button
            onClick={() => setEvalResult(null)}
            className="text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
            <span>Alerts &amp; Incidents</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time threshold evaluation, incident tracking, and outbound webhooks for serving infrastructure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="alerts-evaluate-rules"
            onClick={handleEvaluateRules}
            disabled={evaluating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition active:translate-y-0.5 cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 text-[#3BB48C] ${evaluating ? "animate-spin" : ""}`} />
            {evaluating ? "Evaluating..." : "Evaluate Rules"}
          </button>
          <button
            id="alerts-refresh"
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs shadow-2xs transition active:translate-y-0.5 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            id="alerts-new-rule"
            onClick={() => setIsRuleModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-bold shadow-xs hover:shadow-md transition active:translate-y-0.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Alert Rule
          </button>
        </div>
      </div>

      {/* ── Metrics Summary Cards (Real Backend Metrics) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Open Criticals */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg border bg-rose-50 border-rose-200/60 text-[#ef4444] shrink-0">
                <AlertOctagon className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-semibold text-slate-700 flex-1 truncate">Active Criticals</span>
            </div>
            <div className="text-xl font-bold font-sans text-slate-900 mt-2.5 mb-1 tracking-tight">
              {summary ? summary.open_critical : "--"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <span>PostgreSQL live state</span>
          </div>
        </div>

        {/* Card 2: Open Warnings */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg border bg-amber-50 border-amber-200/60 text-[#f59e0b] shrink-0">
                <AlertTriangle className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-semibold text-slate-700 flex-1 truncate">Active Warnings</span>
            </div>
            <div className="text-xl font-bold font-sans text-slate-900 mt-2.5 mb-1 tracking-tight">
              {summary ? summary.open_warning : "--"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <span>PostgreSQL live state</span>
          </div>
        </div>

        {/* Card 3: Resolved (7d) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg border bg-emerald-50 border-emerald-200/60 text-[#10b981] shrink-0">
                <CheckCircle2 className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-semibold text-slate-700 flex-1 truncate">Resolved (7d)</span>
            </div>
            <div className="text-xl font-bold font-sans text-slate-900 mt-2.5 mb-1 tracking-tight">
              {summary ? summary.resolved_7d : "--"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
            <span>Past 7 days resolved</span>
          </div>
        </div>

        {/* Card 4: Mean Time to Resolve */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg border bg-slate-100 border-slate-200/60 text-slate-700 shrink-0">
                <BellRing className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-semibold text-slate-700 flex-1 truncate">Mean Time to Resolve</span>
            </div>
            <div className="text-xl font-bold font-sans text-slate-900 mt-2.5 mb-1 tracking-tight">
              {summary && summary.mttr_minutes !== null ? `${summary.mttr_minutes.toFixed(0)} min` : "No data"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <span>{summary && summary.mttr_minutes !== null ? "Calculated from resolved incidents" : "No resolved incidents yet"}</span>
          </div>
        </div>
      </div>

      {/* ── Incidents & Channels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Incidents Section */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Incident History</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time alerts log from DB</p>
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
                  <th className="px-6 py-3">Severity / State</th>
                  <th className="px-6 py-3">Incident &amp; Detail</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3 text-right">Time</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAlerts.map((alert) => {
                  const S = getSeverityBadge(alert);
                  const targetLabel = alert.model_name
                    ? alert.model_name
                    : alert.deployment_id
                    ? alert.deployment_id
                    : "System";
                  const targetLink = alert.model_name ? "/app/monitoring" : "/app/deployments";

                  return (
                    <tr
                      key={alert.id}
                      className="hover:bg-slate-50/80 transition-colors group"
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
                          {alert.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-normal">
                          {alert.message}
                        </div>
                        {alert.acknowledged_by && alert.status !== "RESOLVED" && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Acknowledged by {alert.acknowledged_by}
                          </div>
                        )}
                      </td>

                      {/* Target & ID */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <Link
                          to={targetLink}
                          className="text-xs font-mono font-medium text-slate-700 hover:text-[#3BB48C] flex items-center gap-1"
                        >
                          <span>{targetLabel}</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-[#3BB48C]" />
                        </Link>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[120px]" title={alert.id}>
                          {alert.id.substring(0, 12)}...
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-3.5 text-right whitespace-nowrap text-xs text-slate-500 font-mono">
                        {formatTimeAgo(alert.created_at)}
                      </td>

                      {/* Incident Action Buttons */}
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {alert.status === "OPEN" && (
                            <button
                              onClick={() => handleAcknowledge(alert.id)}
                              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer shadow-2xs"
                              title="Acknowledge alert"
                            >
                              Ack
                            </button>
                          )}
                          {alert.status !== "RESOLVED" && (
                            <button
                              onClick={() => handleResolve(alert.id)}
                              className="px-2.5 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-2xs"
                              title="Mark as resolved"
                            >
                              Resolve
                            </button>
                          )}
                          {alert.status === "RESOLVED" && (
                            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Done
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAlerts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                      {loading ? "Loading incidents..." : "No incidents found for the selected filter."}
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
              <p className="text-xs text-slate-500 mt-0.5">Outbound dispatch webhooks</p>
            </div>
            <button
              onClick={() => setIsChannelModalOpen(true)}
              className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#3BB48C] hover:bg-[#329F7B] text-white flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          <div className="space-y-3">
            {channels.map((c) => (
              <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition relative group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">{c.name}</span>
                  <div className="flex items-center gap-1.5">
                    {c.last_test_ok === true && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Tested ✓
                      </span>
                    )}
                    {c.last_test_ok === false && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        Failed
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteChannel(c.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"
                      title="Delete webhook"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-2 rounded bg-white border border-slate-200/80 font-mono text-[11px] text-slate-600 truncate">
                  {c.url}
                </div>

                {channelTestResult && channelTestResult.id === c.id && (
                  <div className={`mt-2 text-[11px] p-2 rounded-lg ${channelTestResult.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                    {channelTestResult.msg}
                  </div>
                )}

                <button
                  onClick={() => handleTestChannel(c)}
                  disabled={channelTesting === c.id}
                  className="mt-3 w-full py-1.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs active:translate-y-0.5 disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 text-[#3BB48C] ${channelTesting === c.id ? "animate-spin" : ""}`} />
                  <span>{channelTesting === c.id ? "Dispatching test..." : "Send Test Event"}</span>
                </button>
              </div>
            ))}

            {channels.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                No outbound webhook channels configured.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Alert Rules Section ── */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Alert Rules</h3>
            <p className="text-xs text-slate-500 mt-0.5">Automated threshold triggers evaluated against live data</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {rules.filter((r) => r.enabled).length}/{rules.length} active
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {rules.map((r) => {
            const Icon = getMetricIcon(r.metric);
            const conditionStr = formatMetricLabel(r.metric, r.operator, r.threshold);

            return (
              <div key={r.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${r.enabled ? "text-[#3BB48C]" : "text-slate-400"}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{r.name}</span>
                      <span className="text-xs text-slate-400 hidden md:inline">—</span>
                      <span className="text-xs font-mono text-slate-600 hidden md:inline">{conditionStr}</span>
                      {r.model_name && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {r.model_name}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.severity === "CRITICAL" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                        {r.severity}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 md:hidden mt-0.5 font-mono">
                      {conditionStr}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Minimal Clean Switch Toggle */}
                  <button
                    role="switch"
                    aria-checked={r.enabled}
                    id={`rule-toggle-${r.id}`}
                    onClick={() => handleToggleRule(r)}
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

                  <button
                    onClick={() => handleDeleteRule(r.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"
                    title="Delete rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {rules.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              No alert rules created yet. Click "New Alert Rule" to define one.
            </div>
          )}
        </div>
      </section>

      {/* ── Modal: New Alert Rule ── */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  New Alert Rule
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure automated trigger thresholds evaluated against PostgreSQL metrics
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
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
                  placeholder="e.g. Critical PSI Drift Spike"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#3BB48C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Metric
                </label>
                <select
                  value={newRuleMetric}
                  onChange={(e) => setNewRuleMetric(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#3BB48C] bg-white cursor-pointer"
                >
                  <option value="drift_share">Data Drift Share (PSI / KS Evidently)</option>
                  <option value="latency_p95_ms">P95 Inference Latency (ms)</option>
                  <option value="failed_deployments">Failed Container Deployments</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operator
                  </label>
                  <select
                    value={newRuleOperator}
                    onChange={(e) => setNewRuleOperator(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#3BB48C] bg-white cursor-pointer"
                  >
                    <option value=">">&gt; Greater than</option>
                    <option value=">=">&gt;= Greater or equal</option>
                    <option value="<">&lt; Less than</option>
                    <option value="<=">&lt;= Less or equal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Threshold
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newRuleThreshold}
                    onChange={(e) => setNewRuleThreshold(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 font-mono border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#3BB48C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model Scope (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="All models if empty"
                    value={newRuleModel}
                    onChange={(e) => setNewRuleModel(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#3BB48C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Severity
                  </label>
                  <select
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value as AlertSeverity)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#3BB48C] bg-white cursor-pointer"
                  >
                    <option value="WARNING">WARNING</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="INFO">INFO</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
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

      {/* ── Modal: New Notification Channel ── */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  New Notification Channel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect Slack, Discord, or generic incoming webhook URL
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChannelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddChannel} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Slack · #ml-production-alerts"
                  value={newChanName}
                  onChange={(e) => setNewChanName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#3BB48C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Channel Kind
                </label>
                <select
                  value={newChanKind}
                  onChange={(e) => setNewChanKind(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#3BB48C] bg-white cursor-pointer"
                >
                  <option value="SLACK">Slack Incoming Webhook</option>
                  <option value="DISCORD">Discord Webhook</option>
                  <option value="WEBHOOK">Generic HTTP Webhook</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://hooks.slack.com/services/... or https://discord.com/api/webhooks/..."
                  value={newChanUrl}
                  onChange={(e) => setNewChanUrl(e.target.value)}
                  className="w-full px-3.5 py-2 font-mono border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#3BB48C]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsChannelModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer"
                >
                  Add Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
