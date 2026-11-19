import { useActionFeedback } from "../components/ActionFeedback";
import React, { useEffect, useId, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertCircle, AlertTriangle, ArrowRight, ArrowDown, ArrowUp, BadgeCheck, Bell, Box, Boxes, CalendarDays, CheckCircle2,
  ChevronRight, Database, EllipsisVertical, FolderGit2, Hash, Info, Layers, Mail, Play, Plus, RefreshCw,
  Rocket, Search, Settings, ShieldAlert, Slack, Trash2, Webhook, X,
} from "lucide-react";
import {
  Alert,
  AlertRule,
  NotificationChannel,
  Project,
  AlertSeverity,
} from "../api/types";
import {
  fetchAlerts,
  fetchProjects,
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

import "./AlertsPage.css";

const severities = {
  CRITICAL: {label: "Critical", color: "#e52d27", tone: "danger", Icon: AlertTriangle},
  HIGH: {label: "High", color: "#ae2988", tone: "danger", Icon: AlertTriangle},
  WARNING: {label: "Warning", color: "#f59e0b", tone: "warning", Icon: AlertTriangle},
  INFO: {label: "Info", color: "#15ae35", tone: "good", Icon: Info},
} as const;
const statuses = {
  OPEN: {label: "Open", tone: "danger"},
  ACKNOWLEDGED: {label: "In Progress", tone: "info"},
  RESOLVED: {label: "Resolved", tone: "good"},
} as const;
const sources = {
  Model: {Icon: Box, color: "#13ad34"},
  Deployment: {Icon: Rocket, color: "#90d992"},
  Dataset: {Icon: Database, color: "#ffc14e"},
  Service: {Icon: Layers, color: "#b9c0cb"},
} as const;
type AlertSource = keyof typeof sources;

function alertSource(alert: Alert): AlertSource {
  const event = alert.event_type.toUpperCase();
  if (alert.deployment_id || /DEPLOYMENT|LATENCY/.test(event)) return "Deployment";
  if (/DATASET|QUALITY|FRESHNESS|SCHEMA/.test(event)) return "Dataset";
  if (alert.model_name || event.includes("DRIFT")) return "Model";
  return "Service";
}

function AlertsPanel({title, action, children}: {title: string; action?: React.ReactNode; children: React.ReactNode}) {
  return <section className="overview-card alerts-panel">
    <h2>{title}<Info size={14} aria-hidden="true" />{action}</h2>
    {children}
  </section>;
}

function AlertPill({label, tone, severity = false}: {label: string; tone: string; severity?: boolean}) {
  return <span className={`alerts-pill alerts-pill-${tone}`}>
    {severity ? <span aria-hidden="true" className="alerts-severity-mark">!</span> : <i aria-hidden="true" />}{label}
  </span>;
}

function AlertBreakdown({title, rows, percentageWithLabel = false}: {
  title: string; rows: {label: string; count: number; color: string}[]; percentageWithLabel?: boolean;
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  let offset = 0;
  const slices = rows.filter(row => row.count).map(row => {
    const start = offset;
    offset += row.count / total * 100;
    return `${row.color} ${start}% ${offset}%`;
  });
  return <AlertsPanel title={title}>
    <div className="alerts-breakdown">
      <div className="alerts-ring" style={{backgroundImage: total ? `conic-gradient(${slices.join(", ")})` : undefined}}>
        <span><strong>{total}</strong>Alerts</span>
      </div>
      <dl>{rows.map(row => {
        const percentage = total > 0 ? ` (${(row.count / total * 100).toFixed(percentageWithLabel ? 0 : 1)}%)` : "";
        return <div key={row.label}>
          <dt><i style={{backgroundColor: row.color}} aria-hidden="true" />{row.label}{percentageWithLabel ? percentage : ""}</dt>
          <dd>{row.count}{percentageWithLabel ? "" : percentage}</dd>
        </div>;
      })}</dl>
    </div>
  </AlertsPanel>;
}

function AlertTrend({values}: {values: number[]}) {
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => `${index * 70 / (values.length - 1)},${20 - value * 17 / max}`).join(" ");
  return <svg className="alerts-sparkline" viewBox="0 0 70 23" aria-hidden="true">
    <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>;
}

function localDay(date: Date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

export const AlertsPage: React.FC = () => {
  const { confirmAction, showSuccess } = useActionFeedback();
  const barGradient = useId();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [project, setProject] = useState("");
  const [source, setSource] = useState("");
  const [severity, setSeverity] = useState("");
  const [days, setDays] = useState(7);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(() => new Set());
  const [showAllRules, setShowAllRules] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string>();
  const [pendingAlertAction, setPendingAlertAction] = useState(false);
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
      const [alertsResult, rulesResult, channelsResult, projectsResult] = await Promise.allSettled([
        fetchAlerts({limit: 200}),
        fetchAlertRules(),
        fetchNotificationChannels(),
        fetchProjects(),
      ]);
      if (alertsResult.status === "fulfilled") {
        setAlerts(alertsResult.value);
        setAlertsLoaded(true);
      }
      if (rulesResult.status === "fulfilled") setRules(rulesResult.value);
      if (channelsResult.status === "fulfilled") {
        setChannels(channelsResult.value);
        setChannelsLoaded(true);
      }
      if (projectsResult.status === "fulfilled") setProjects(projectsResult.value);
      const failures = [[alertsResult, "alerts"], [rulesResult, "rules"], [channelsResult, "channels"], [projectsResult, "projects"]] as const;
      const unavailable = failures.flatMap(([result, label]) => result.status === "rejected" ? [label] : []);
      if (unavailable.length) setError(`Could not load ${unavailable.join(", ")}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAcknowledge = async (id: string) => {
    setError(null);
    try {
      const updated = await acknowledgeAlert(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to acknowledge alert");
    }
  };

  const handleResolve = async (id: string) => {
    setError(null);
    try {
      const updated = await resolveAlert(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to resolve alert");
    }
  };

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      const updated = await toggleAlertRule(rule.id, !rule.enabled);
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
      showSuccess("Alert rule updated.");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update alert rule");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!(await confirmAction("Delete alert rule?", "This rule will no longer be evaluated.", "Delete rule"))) return;
    try {
      await deleteAlertRule(id);
      showSuccess("Alert rule deleted.");
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
      showSuccess("Alert rule created.");
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
      showSuccess("Notification channel created.");
      setNewChanName("");
      setNewChanUrl("");
      setIsChannelModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create notification channel");
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!(await confirmAction("Remove notification channel?", "Alerts will no longer be sent through this channel.", "Remove channel"))) return;
    try {
      await deleteNotificationChannel(id);
      showSuccess("Notification channel removed.");
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
      setAlerts(await fetchAlerts({limit: 200}));
      setAlertsLoaded(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Rule evaluation failed");
    } finally {
      setEvaluating(false);
    }
  };

  const projectNames = new Map(projects.map(item => [item.id, item.name]));
  const projectOptions = [...new Set([...projectNames.keys(), ...alerts.flatMap(alert => alert.project_id ? [alert.project_id] : [])])];
  const query = search.trim().toLowerCase();
  const matching = alerts.filter(alert =>
    (!project || alert.project_id === project) &&
    (!source || alertSource(alert) === source) &&
    (!severity || alert.severity === severity) &&
    (!query || [alert.title, alert.message, alert.model_name, alert.deployment_id, projectNames.get(alert.project_id ?? "")]
      .some(value => value?.toLowerCase().includes(query))));
  const today = new Date();
  const timeline = Array.from({length: days * 2}, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - days * 2 + index + 1);
    const key = localDay(date);
    return {
      key, date: date.toLocaleDateString("en-US", {month: "short", day: "numeric"}),
      CRITICAL: 0, HIGH: 0, WARNING: 0, INFO: 0, resolved: 0,
    };
  });
  const byDay = new Map(timeline.map(day => [day.key, day]));
  for (const alert of matching) {
    const triggered = byDay.get(localDay(new Date(alert.created_at)));
    if (triggered) triggered[alert.severity] += 1;
    const resolved = alert.resolved_at && byDay.get(localDay(new Date(alert.resolved_at)));
    if (resolved) resolved.resolved += 1;
  }
  const period = timeline.slice(days);
  const filteredAlerts = matching.filter(alert => {
    const timestamp = Date.parse(alert.created_at);
    return timestamp >= period[0].key && timestamp <= today.getTime();
  })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const selectedAlert = alerts.find(alert => alert.id === selectedAlertId);
  const visibleAlerts = showAllAlerts ? filteredAlerts : filteredAlerts.slice(0, 5);
  const selectedVisible = visibleAlerts.filter(alert => selectedAlerts.has(alert.id));
  const allVisibleSelected = visibleAlerts.length > 0 && selectedVisible.length === visibleAlerts.length;
  const selectedOpen = selectedVisible.filter(alert => alert.status === "OPEN");

  function selectAlerts(ids: string[], checked: boolean) {
    setSelectedAlerts(previous => {
      const next = new Set(previous);
      ids.forEach(id => checked ? next.add(id) : next.delete(id));
      return next;
    });
  }

  async function acknowledgeSelected() {
    setPendingAlertAction(true);
    setError(null);
    try {
      const results = await Promise.allSettled(selectedOpen.map(alert => acknowledgeAlert(alert.id)));
      const updated = new Map(results.flatMap(result => result.status === "fulfilled" ? [[result.value.id, result.value] as const] : []));
      setAlerts(previous => previous.map(alert => updated.get(alert.id) ?? alert));
      selectAlerts([...updated.keys()], false);
      if (updated.size < selectedOpen.length) setError(`Could not acknowledge ${selectedOpen.length - updated.size} selected alert(s).`);
    } finally {
      setPendingAlertAction(false);
    }
  }
  const severityRows = (Object.keys(severities) as AlertSeverity[]).filter(level => level !== "HIGH" || filteredAlerts.some(alert => alert.severity === level));
  const selectedPeriod = new Intl.DateTimeFormat("en-US", {dateStyle: "medium", timeStyle: "short"});
  const cards = [
    {title: "Total Alerts", Icon: Bell, color: "#008713", value: (day: typeof period[number]) => day.CRITICAL + day.HIGH + day.WARNING + day.INFO},
    {title: "Critical", Icon: AlertTriangle, color: "#d32925", value: (day: typeof period[number]) => day.CRITICAL},
    {title: "Warning", Icon: AlertTriangle, color: "#b76502", value: (day: typeof period[number]) => day.WARNING},
    {title: "Info", Icon: Info, color: "#008713", value: (day: typeof period[number]) => day.INFO},
    {title: "Resolved", Icon: CheckCircle2, color: "#008713", value: (day: typeof period[number]) => day.resolved},
  ];
  const integrations = [
    {kind: "SLACK", label: "Slack", Icon: Slack},
    {kind: "EMAIL", label: "Email", Icon: Mail},
    {kind: "WEBHOOK", label: "Webhook", Icon: Webhook},
    ...(channels.some(channel => channel.kind === "DISCORD") ? [{kind: "DISCORD", label: "Discord", Icon: Hash}] : []),
  ];
  const formatCondition = (rule: AlertRule) => {
    if (rule.metric === "drift_share") return `Drift share ${rule.operator} ${Number((rule.threshold * 100).toFixed(2))}%`;
    if (rule.metric === "latency_p95_ms") return `p95 ${rule.operator} ${rule.threshold} ms`;
    return `Failed containers ${rule.operator} ${rule.threshold}`;
  };

  return (
    <div className="alerts-dashboard">
      <header className="overview-hero alerts-hero">
        <div><h1>Alerts</h1><p>Detect, track, and respond to issues across your models, deployments, and data pipelines.</p></div>
        <div className="alerts-lifecycle" aria-hidden="true">
          {([[Boxes, "Detect"], [ShieldAlert, "Alert"], [Settings, "Investigate"], [BadgeCheck, "Resolve"]] as const).map(([Icon, label], index) => (
            <div key={label}><span><Icon size={38} strokeWidth={1.55} /></span><strong>{label}</strong>
              {index < 3 && <ArrowRight className="alerts-stage-arrow" size={22} />}
            </div>
          ))}
        </div>
      </header>

      <div className="alerts-toolbar" role="group" aria-label="Alert filters">
        <label><Search size={15} /><input aria-label="Search alerts" placeholder="Search alerts (e.g., drift, latency, error)…" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label><FolderGit2 size={15} /><select aria-label="Project" value={project} onChange={event => setProject(event.target.value)}>
          <option value="">All Projects</option>{projectOptions.map(id => <option key={id} value={id}>{projectNames.get(id) ?? id}</option>)}
        </select></label>
        <label><Layers size={15} /><select aria-label="Source" value={source} onChange={event => setSource(event.target.value)}>
          <option value="">All Sources</option>{Object.keys(sources).map(name => <option key={name}>{name}</option>)}
        </select></label>
        <label><AlertTriangle size={15} /><select aria-label="Severity" value={severity} onChange={event => setSeverity(event.target.value)}>
          <option value="">All Severities</option>{Object.entries(severities).map(([key, level]) => <option key={key} value={key}>{level.label}</option>)}
        </select></label>
        <label><CalendarDays size={15} /><select aria-label="Time range" value={days} onChange={event => setDays(Number(event.target.value))}>
          {[7, 14, 30, 90].map(value => <option key={value} value={value}>Last {value} days</option>)}
        </select></label>
        <button className="primary-action" id="alerts-new-rule" onClick={() => setIsRuleModalOpen(true)}><Plus size={16} />New Alert Rule</button>
      </div>

      {error && <div className="alerts-notice alerts-notice-error" role="alert"><AlertCircle size={15} />{error}<button onClick={() => setError(null)}>Dismiss</button></div>}
      {evalResult && <div className="alerts-notice" role="status"><CheckCircle2 size={15} />{evalResult}<button onClick={() => setEvalResult(null)}>Dismiss</button></div>}

      <div className="overview-kpis alerts-kpis">
        {cards.map(({title, Icon, color, value}) => {
          const values = period.map(value);
          const total = values.reduce((sum, count) => sum + count, 0);
          const previous = timeline.slice(0, days).reduce((sum, day) => sum + value(day), 0);
          const change = previous && alerts.length < 200 ? Math.round((total - previous) / previous * 100) : null;
          return <div className="overview-card alerts-kpi" key={title} style={{color}}>
            <Icon size={24} className={title === "Warning" ? "alerts-warning-icon" : undefined} aria-hidden="true" />
            <div><strong>{title}</strong><b>{alertsLoaded ? total : "—"}
              {change !== null && <small className={change > 0 ? "alerts-delta-up" : undefined} title="Change from the previous period">
                {change > 0 ? <ArrowUp size={11} aria-hidden="true" /> : change < 0 ? <ArrowDown size={11} aria-hidden="true" /> : null}
                {change > 0 ? "+" : ""}{change}%
              </small>}</b></div>
            {total > 0 && <AlertTrend values={values} />}
          </div>;
        })}
      </div>

      <div className="alerts-charts">
        <AlertsPanel title="Alerts Over Time">
          <div className="alerts-chart-key">{severityRows.map(level => <span key={level}><i style={{backgroundColor: severities[level].color}} />{severities[level].label}</span>)}</div>
          {alertsLoaded ? <div className="alerts-bar-chart"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={period} margin={{top: 4, left: 0, right: 8, bottom: 0}}>
              <defs>{severityRows.map(level => <linearGradient key={level} id={`${barGradient}-${level}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={severities[level].color} stopOpacity={0.72} />
                <stop offset="100%" stopColor={severities[level].color} />
              </linearGradient>)}</defs>
              <CartesianGrid vertical={false} stroke="#edf0f3" />
              <XAxis dataKey="date" height={23} tickLine={false} axisLine={{stroke: "#e2e8f0"}} tick={{fontSize: 10}} minTickGap={6} />
              <YAxis width={30} allowDecimals={false} tickLine={false} axisLine={false} tick={{fontSize: 10}} />
              <Tooltip cursor={{fill: "#f0f7f1"}} itemStyle={{color: "#17213a"}} />
              {severityRows.map(level => <Bar key={level} dataKey={level} name={severities[level].label}
                stackId="alerts" fill={`url(#${barGradient}-${level})`} maxBarSize={43} isAnimationActive={false} />)}
            </BarChart>
          </ResponsiveContainer></div> : <p className="alerts-chart-empty">{loading ? "Loading alerts…" : "Alert history unavailable."}</p>}
        </AlertsPanel>
        {alertsLoaded ? <AlertBreakdown title="Alerts by Source" percentageWithLabel rows={(Object.keys(sources) as AlertSource[]).map(label => ({
          label: `${label}s`, color: sources[label].color, count: filteredAlerts.filter(alert => alertSource(alert) === label).length,
        }))} /> : <AlertsPanel title="Alerts by Source"><p className="alerts-chart-empty">{loading ? "Loading alerts…" : "Alert history unavailable."}</p></AlertsPanel>}
        {alertsLoaded ? <AlertBreakdown title="Alerts by Severity" rows={severityRows.map(level => ({
          label: severities[level].label, color: severities[level].color, count: filteredAlerts.filter(alert => alert.severity === level).length,
        }))} /> : <AlertsPanel title="Alerts by Severity"><p className="alerts-chart-empty">{loading ? "Loading alerts…" : "Alert history unavailable."}</p></AlertsPanel>}
      </div>

      <AlertsPanel title="Recent Alerts" action={<>
        <button className="alerts-refresh" id="alerts-refresh" onClick={loadData} disabled={loading || pendingAlertAction} aria-label="Refresh alerts"><RefreshCw size={14} /></button>
        {filteredAlerts.length > 5 && <button onClick={() => setShowAllAlerts(!showAllAlerts)} aria-expanded={showAllAlerts}>
          {showAllAlerts ? "Show Less" : "View All Alerts"}<ChevronRight size={14} />
        </button>}
      </>}>
        {selectedVisible.length > 0 && <div className="alerts-selection" aria-live="polite">
          <span>{selectedVisible.length} selected</span>
          {selectedOpen.length > 0 && <button className="secondary-action" disabled={pendingAlertAction} onClick={acknowledgeSelected}>Acknowledge Selected</button>}
          <button className="secondary-action" onClick={() => selectAlerts(selectedVisible.map(alert => alert.id), false)}>Clear Selection</button>
        </div>}
        <div className="alerts-scroll"><table className="overview-table alerts-table alerts-recent-table">
          <thead><tr>
            <th scope="col"><input type="checkbox" aria-label="Select all visible alerts" checked={allVisibleSelected} disabled={!visibleAlerts.length}
              ref={node => { if (node) node.indeterminate = selectedVisible.length > 0 && !allVisibleSelected; }}
              onChange={event => selectAlerts(visibleAlerts.map(alert => alert.id), event.target.checked)} /></th>
            {["Alert", "Source", "Project", "Severity", "Status", "Triggered At", "Description", "Action"].map(title => <th scope="col" key={title}>{title}</th>)}
          </tr></thead>
          <tbody>{visibleAlerts.map(alert => {
            const level = severities[alert.severity];
            const status = statuses[alert.status];
            const source = alertSource(alert);
            const SourceIcon = sources[source].Icon;
            return <tr key={alert.id} data-selected={selectedAlerts.has(alert.id)}>
              <td><input type="checkbox" aria-label={`Select ${alert.title}`} checked={selectedAlerts.has(alert.id)}
                onChange={event => selectAlerts([alert.id], event.target.checked)} /></td>
              <td><span className={`alerts-inline alerts-level-${level.tone}`}><level.Icon size={17} className={alert.severity === "WARNING" ? "alerts-warning-icon" : undefined} aria-hidden="true" /><strong>{alert.title}</strong></span></td>
              <td><span className="alerts-inline"><SourceIcon size={15} aria-hidden="true" />{source}</span></td>
              <td>{alert.project_id ? projectNames.get(alert.project_id) ?? alert.project_id : "—"}</td>
              <td><AlertPill {...level} severity /></td><td><AlertPill {...status} /></td>
              <td><time dateTime={alert.created_at}>{selectedPeriod.format(new Date(alert.created_at))}</time></td>
              <td className="alerts-description" title={alert.message}>{alert.message}</td>
              <td><div className="alerts-actions">
                <button className="alerts-row-action" onClick={() => setSelectedAlertId(alert.id)}>{alert.status === "RESOLVED" ? "View Details" : "Investigate"}<ArrowRight size={13} aria-hidden="true" /></button>
                <details className="alerts-row-menu">
                  <summary aria-label={`More actions for ${alert.title}`}><EllipsisVertical size={16} aria-hidden="true" /></summary>
                  <div>
                    <button onClick={event => {
                      event.currentTarget.closest("details")?.removeAttribute("open");
                      setSelectedAlertId(alert.id);
                    }}>View Details</button>
                    {alert.status === "OPEN" && <button disabled={pendingAlertAction} onClick={async event => {
                      event.currentTarget.closest("details")?.removeAttribute("open");
                      setPendingAlertAction(true);
                      try { await handleAcknowledge(alert.id); } finally { setPendingAlertAction(false); }
                    }}>Acknowledge</button>}
                  </div>
                </details>
              </div></td>
            </tr>;
          })}{!filteredAlerts.length && <tr><td colSpan={9} className="alerts-empty">{loading ? "Loading alerts…" : alertsLoaded ? "No alerts match these filters." : "Alert history unavailable."}</td></tr>}</tbody>
        </table></div>
        {alerts.length === 200 && <p className="alerts-data-note">Based on the 200 most recent alerts.</p>}
      </AlertsPanel>

      <div className="alerts-bottom">
        <AlertsPanel title={`Alert Rules (${rules.length})`} action={rules.length > 0 &&
          <button type="button" onClick={() => setShowAllRules(expanded => !expanded)} aria-expanded={showAllRules} aria-controls="alerts-rules-table">
            {showAllRules ? "Show Less" : "View All Rules"}<ChevronRight size={14} aria-hidden="true" />
          </button>}>
          <div className="alerts-scroll" id="alerts-rules-table"><table className="overview-table alerts-table alerts-rules-table">
            <thead><tr>{["Rule Name", "Source", "Condition", "Severity", "Status"].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead>
            <tbody>{(showAllRules ? rules : rules.slice(0, 5)).map(rule => {
              const source = rule.metric === "drift_share" ? "Model" : "Deployment";
              const RuleIcon = sources[source].Icon;
              return <tr key={rule.id}>
                <td><strong>{rule.name}</strong></td><td><span className="alerts-inline"><RuleIcon size={15} aria-hidden="true" />{source}</span></td>
                <td>{formatCondition(rule)}{rule.model_name && <small className="alerts-rule-target">{rule.model_name}</small>}</td>
                <td><AlertPill {...severities[rule.severity]} /></td>
                <td><div className="alerts-rule-actions">
                  <button type="button" role="switch" aria-checked={rule.enabled} aria-label={`Enable ${rule.name}`} id={`rule-toggle-${rule.id}`} className="alerts-switch" onClick={() => handleToggleRule(rule)}><span /></button>
                  {showAllRules && <button type="button" className="alerts-icon-button" onClick={() => handleDeleteRule(rule.id)} aria-label={`Delete ${rule.name}`}><Trash2 size={14} /></button>}
                </div></td>
              </tr>;
            })}{!rules.length && <tr><td colSpan={5} className="alerts-empty">{loading ? "Loading rules…" : "No alert rules configured."}</td></tr>}</tbody>
          </table></div>
          {showAllRules && <div className="alerts-rule-tools">
            <button type="button" className="secondary-action" id="alerts-evaluate-rules" disabled={evaluating} onClick={handleEvaluateRules}>
              <Play size={13} aria-hidden="true" />{evaluating ? "Evaluating…" : "Evaluate Rules"}
            </button>
          </div>}
        </AlertsPanel>

        <AlertsPanel title="Notifications & Integrations" action={<button type="button" onClick={() => setShowChannels(expanded => !expanded)} aria-expanded={showChannels} aria-controls="alerts-channel-settings">
          Configure<ChevronRight size={14} aria-hidden="true" />
        </button>}>
          <div className="alerts-integrations">
            {integrations.map(({kind, label, Icon}) => {
              const matchingChannels = channels.filter(channel => channel.kind === kind);
              const enabled = matchingChannels.some(channel => channel.enabled);
              const status = enabled ? "Enabled" : kind === "EMAIL" ? "Unavailable"
                : !channelsLoaded ? (loading ? "Loading…" : "Unavailable") : matchingChannels.length ? "Disabled" : "Not configured";
              return <div className="alerts-integration" data-enabled={enabled} key={kind}>
                <Icon className={`alerts-integration-logo alerts-integration-${kind.toLowerCase()}`} size={34} strokeWidth={1.7} aria-hidden="true" />
                <span><strong>{label}</strong><small>{status}</small></span>
                {enabled && <span className="alerts-integration-check"><CheckCircle2 size={14} aria-hidden="true" /></span>}
              </div>;
            })}
          </div>
          <div className="alerts-notice alerts-integration-note">
            <Info size={23} aria-hidden="true" />
            <p><strong>Get alerted when a monitoring rule triggers.</strong><br />Set severity levels and choose where to send notifications.</p>
          </div>
          <div className="alerts-channels" id="alerts-channel-settings" hidden={!showChannels}>
            <button className="secondary-action" onClick={() => setIsChannelModalOpen(true)}><Plus size={14} />Add Channel</button>
            {channels.map(channel => <div key={channel.id} className="alerts-channel">
              <strong>{channel.name}</strong>
              <span>{channel.last_test_ok === true ? "Passed last test" : channel.last_test_ok === false ? "Last test failed" : ""}</span>
              <button className="secondary-action" disabled={channelTesting === channel.id} onClick={() => handleTestChannel(channel)}>{channelTesting === channel.id ? "Testing…" : "Send Test Event"}</button>
              <button className="alerts-icon-button" onClick={() => handleDeleteChannel(channel.id)} aria-label={`Delete ${channel.name}`}><Trash2 size={15} /></button>
              <code>{channel.url}</code>
              {channelTestResult?.id === channel.id && <p role="status">{channelTestResult.msg}</p>}
            </div>)}
          </div>
        </AlertsPanel>
      </div>

      {selectedAlert && <div className="alerts-overlay"><section className="overview-card alerts-detail" role="dialog" aria-modal="true" aria-labelledby="alert-detail-title"
        onKeyDown={event => { if (event.key === "Escape") setSelectedAlertId(undefined); }}>
        <header><h2 id="alert-detail-title">{selectedAlert.title}</h2><button autoFocus onClick={() => setSelectedAlertId(undefined)} aria-label="Close alert details"><X size={18} /></button></header>
        <div className="alerts-inline"><AlertPill {...severities[selectedAlert.severity]} /><AlertPill {...statuses[selectedAlert.status]} /></div>
        <p>{selectedAlert.message}</p>
        {selectedAlert.model_name && <p>Model · {selectedAlert.model_name}</p>}
        {selectedAlert.deployment_id && <p>Deployment · {selectedAlert.deployment_id}</p>}
        {selectedAlert.acknowledged_by && <p>Acknowledged by {selectedAlert.acknowledged_by}</p>}
        {error && <p role="alert">{error}</p>}
        <footer>{selectedAlert.status === "OPEN" && <button className="secondary-action" disabled={pendingAlertAction} onClick={async () => {
          setPendingAlertAction(true);
          try { await handleAcknowledge(selectedAlert.id); } finally { setPendingAlertAction(false); }
        }}>Acknowledge</button>}
        {selectedAlert.status !== "RESOLVED" && <button className="primary-action" disabled={pendingAlertAction} onClick={async () => {
          setPendingAlertAction(true);
          try { await handleResolve(selectedAlert.id); } finally { setPendingAlertAction(false); }
        }}>Resolve</button>}</footer>
      </section></div>}

      {/* ── Modal: New Alert Rule ── */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="creation-dialog bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
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
          <div className="creation-dialog bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
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
