import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Activity, AlertCircle, AlertTriangle, ArrowRight, Bell, Box, Boxes, CalendarDays, Check, ChevronRight, CircuitBoard, Cpu,
  Database, Download, FileText, FolderGit2, Gauge, HardDrive, Heart, Info, Layers, MemoryStick, Monitor, RefreshCw,
  Server, Settings, ShieldCheck, Ship, Timer, Workflow, X,
} from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  api, fetchAlerts, fetchAlertRules, fetchDatasets, fetchDatasetVersions, fetchDeployments, fetchModels, fetchMonitoringSummary,
  fetchProjects, fetchSystemServices, fetchSystemStats, pingDeployment, triggerDriftCheck,
} from "../api/client";
import type { AlertRule, AlertSeverity, Deployment, DeploymentMetric, DriftEvaluationItem } from "../api/types";
import { useAuth } from "../context/AuthContext";
import "./MonitoringPage.css";

const lifecycle = [[Database, "Ingest"], [ShieldCheck, "Validate"], [Boxes, "Serve"], [Monitor, "Observe"], [Bell, "Alert"]] as const;
const serviceIcons: Record<string, typeof Database> = { Database: Box, MinIO: HardDrive, Docker: Ship, "Inference Gateway": Workflow };
const gatewayName = "Inference Gateway";
function serviceLabel(name: string) {
  if (name.startsWith("Model Serving")) return "Docker";
  if (name.toLowerCase().startsWith(gatewayName.toLowerCase())) return gatewayName;
  return name.split(" ")[0];
}
const colors = ["#075522", "#36bd17", "#248578", "#7567a8", "#385e9d"];
const chartTick = { fontSize: 10, fill: "#37445b" };
const chartAxis = { stroke: "#d7dfe7" };
const trafficLatencyColor = "#075522";
const trafficErrorColor = "#27ae16";
const healthColors = { Healthy: "#1abb37", Degraded: "#ffc128", Unhealthy: "#db5959", Unknown: "#aab3bf" };
const metricLabels: Record<string, string> = { auc: "AUC", roc_auc: "AUC", f1: "F1", f1_score: "F1", accuracy: "Accuracy", rmse: "RMSE", mae: "MAE", mape: "MAPE", precision: "Precision", recall: "Recall" };
const ruleMetrics = {
  drift_share: { label: "Drift share", Icon: Layers, format: (value: number) => `${numeric(value * 100)}%` },
  latency_p95_ms: { label: "p95 latency", Icon: Timer, format: (value: number) => `${numeric(value)} ms` },
  failed_deployments: { label: "Failed deployments", Icon: AlertTriangle, format: (value: number) => numeric(value) },
} satisfies Record<AlertRule["metric"], { label: string; Icon: typeof Timer; format: (value: number) => string }>;
const severityStyles = {
  INFO: { tone: "good", Icon: Info },
  WARNING: { tone: "warning", Icon: AlertTriangle },
  HIGH: { tone: "danger", Icon: AlertCircle },
  CRITICAL: { tone: "danger", Icon: AlertCircle },
} as const satisfies Record<AlertSeverity, { tone: string; Icon: typeof AlertCircle }>;
const dateLabel = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const titleCase = (value: string) => value.toLowerCase().split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
const numeric = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 4 });
const axisNumber = (value: number) => value.toLocaleString("en-US", { maximumSignificantDigits: 3 });
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const environment = (deployment: Deployment) => typeof deployment.config?.environment === "string" ? deployment.config.environment.trim().toLowerCase() : "";
const dayKey = (date: string) => new Date(date).toDateString();
const healthState = (prediction: { healthy?: boolean; status?: string } | undefined) =>
  prediction?.healthy === true ? "Healthy" : prediction?.status === "degraded" ? "Degraded" : prediction?.healthy === false ? "Unhealthy" : "Unknown";

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (!Number.isFinite(minutes)) return "—";
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)} d ago`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h ago`;
  return minutes ? `${minutes} min ago` : "Just now";
}

function Panel({ title, children, id, action }: { title: string; children: ReactNode; id?: string; action?: ReactNode }) {
  return <section className="overview-card monitoring-panel" id={id}>
    <h2>{title}<Info size={14} aria-hidden="true" />{action}</h2>{children}
  </section>;
}

function Table({ headings, children }: { headings: string[]; children: ReactNode }) {
  return <div className="monitoring-scroll"><table className="overview-table monitoring-table">
    <thead><tr>{headings.map(heading => <th key={heading} scope="col">{heading}</th>)}</tr></thead><tbody>{children}</tbody>
  </table></div>;
}

function Badge({ label, tone = "neutral", icon: Icon }: { label: string; tone?: "good" | "warning" | "danger" | "neutral"; icon?: typeof Info }) {
  return <span className={`monitoring-badge monitoring-badge-${tone}`}>
    {Icon ? <Icon size={12} aria-hidden="true" /> : <i aria-hidden="true" />}{label}
  </span>;
}

function ChartKeyItem({ label, color }: { label: string; color?: string }) {
  return <span>
    {color ? <i className="monitoring-key-line" style={{ color }} aria-hidden="true" /> : <i className="monitoring-key-bars" aria-hidden="true" />}
    {label}
  </span>;
}

function Trend({ values }: { values: (number | null)[] }) {
  const numbers = values.filter((value): value is number => value !== null);
  if (numbers.length < 2) return null;
  const min = Math.min(...numbers);
  const delta = Math.max(0.01, Math.max(...numbers) - min);
  const path = values.map((value, index) => value === null ? ""
    : `${index > 0 && values[index - 1] !== null ? "L" : "M"}${1 + index * 74 / (values.length - 1)},${16 - 13 * (value - min) / delta}`).join(" ");
  return <svg className="monitoring-sparkline" viewBox="0 0 76 19" aria-hidden="true"><path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

type Feature = { drift_detected?: boolean; p_value?: number; drift_score?: number; stat_test?: string; stattest_name?: string; stattest_threshold?: number; reference_mean?: number; current_mean?: number };
type PerformanceSample = { model_name: string; deployment_id: string | null; created_at: string; metrics: Record<string, number> | null };
function features(report: DriftEvaluationItem) {
  const details = report.metrics?.metrics;
  if (!Array.isArray(details)) return {} as Record<string, Feature>;
  return (details.find(item => item?.result?.drift_by_columns)?.result.drift_by_columns ?? {}) as Record<string, Feature>;
}

export function MonitoringPage() {
  const { user } = useAuth();
  const requestGradient = useId();
  const [project, setProject] = useState("");
  const [env, setEnv] = useState("");
  const [model, setModel] = useState("");
  const [days, setDays] = useState(14);
  const [metric, setMetric] = useState("");
  const [freshnessDatasetId, setFreshnessDatasetId] = useState("");
  const [healthSyncs, setHealthSyncs] = useState<{ date: string; scope: string; checked: number; healthy: number }[]>([]);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluationModel, setEvaluationModel] = useState("");
  const [reference, setReference] = useState("");
  const [current, setCurrent] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<DriftEvaluationItem>();
  const [downloading, setDownloading] = useState(false);
  const canEvaluate = user?.role !== "VIEWER" && Boolean(user);

  const projects = useQuery({ queryKey: ["monitoring-projects"], queryFn: fetchProjects });
  const registry = useQuery({ queryKey: ["monitoring-models", project], queryFn: () => fetchModels(project || undefined) });
  const deployments = useQuery({ queryKey: ["monitoring-deployments"], queryFn: fetchDeployments });
  const datasets = useQuery({ queryKey: ["monitoring-datasets"], queryFn: fetchDatasets });
  const services = useQuery({ queryKey: ["monitoring-services"], queryFn: fetchSystemServices, staleTime: 60_000 });
  const stats = useQuery({ queryKey: ["monitoring-system"], queryFn: () => fetchSystemStats() });
  const alerts = useQuery({ queryKey: ["monitoring-alerts"], queryFn: () => fetchAlerts({ limit: 100 }) });
  const rules = useQuery({ queryKey: ["monitoring-alert-rules"], queryFn: fetchAlertRules });
  const driftIndex = useQuery({
    queryKey: ["monitoring-drift-index"],
    queryFn: async () => (await api.get<{ reports: DriftEvaluationItem[] }>("/monitoring/")).data.reports,
  });
  const selectedProject = projects.data?.find(item => item.id === project);
  const projectDeployments = (deployments.data ?? []).filter(deployment => !project || deployment.project_id === project);
  const environments = [...new Set(projectDeployments.map(environment).filter(Boolean))].sort();
  const envDeployments = projectDeployments.filter(deployment => !env || (env === "unassigned" ? !environment(deployment) : environment(deployment) === env));
  const modelNames = [...new Set([...(registry.data ?? []).map(item => item.name), ...envDeployments.map(item => item.model_name)])]
    .filter(name => !env || envDeployments.some(deployment => deployment.model_name === name)).sort();
  const scope = envDeployments.filter(deployment => !model || deployment.model_name === model);
  const running = scope.filter(deployment => deployment.status === "RUNNING");
  const endpointQueries = useQueries({ queries: running.map(deployment => ({
    queryKey: ["monitoring-endpoint-health", deployment.id],
    queryFn: async () => healthState((await pingDeployment(deployment.id)).prediction),
    staleTime: 60_000,
    retry: false,
  })) });
  const probes = Object.fromEntries(running.map((deployment, index) => [deployment.id, endpointQueries[index].data ?? "Unknown"]));
  const dataScope = (datasets.data ?? []).filter(dataset => !project || dataset.project_id === project);
  const freshnessDataset = dataScope.find(dataset => dataset.id === freshnessDatasetId)
    ?? dataScope.find(dataset => dataset.latest_version || dataset.version_num)
    ?? dataScope[0];
  const freshnessVersions = useQuery({
    queryKey: ["monitoring-dataset-versions", freshnessDataset?.id],
    queryFn: () => fetchDatasetVersions(freshnessDataset!.id),
    enabled: Boolean(freshnessDataset),
  });
  const visibleNames = new Set(modelNames.filter(name => !model || name === model));
  const scopeIds = new Set(scope.map(deployment => deployment.id));
  const performanceSources = useQueries({ queries: [...visibleNames].slice(0, 5).map(name => ({
    queryKey: ["monitoring-performance", name],
    queryFn: async () => (await api.get<PerformanceSample[]>(`/monitoring/performance/${encodeURIComponent(name)}`, { params: { limit: 100 } })).data,
    staleTime: 60_000,
  })) });
  const versions = (registry.data ?? []).filter(item => visibleNames.has(item.name));
  const latest = modelNames.filter(name => visibleNames.has(name)).flatMap(name =>
    versions.filter(item => item.name === name).sort((a, b) => b.version - a.version).slice(0, 1));
  const indexedReports = (driftIndex.data ?? []).filter(item => visibleNames.has(item.model_name));
  const reportModel = model || indexedReports[0]?.model_name || modelNames[0];
  const summary = useQuery({
    queryKey: ["monitoring-detail", reportModel ?? ""],
    queryFn: () => fetchMonitoringSummary(reportModel),
  });
  const telemetry = useQueries({ queries: scope.map(deployment => ({
    queryKey: ["deployment-telemetry", deployment.id],
    queryFn: async () => (await api.get<DeploymentMetric[]>(`/deployments/${encodeURIComponent(deployment.id)}/metrics`, { params: { limit: 500 } })).data,
    staleTime: 30_000,
  })) });

  const now = Date.now();
  const period = Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - days + index + 1);
    const key = date.toDateString();
    const label = dateLabel(date);
    const end = date.setHours(23, 59, 59, 999);
    return { key, date: label, observedAt: Math.min(end, now) };
  });
  const dayKeys = new Set(period.map(day => day.key));
  const samplesByDay = new Map<string, DeploymentMetric[]>();
  for (const sample of telemetry.flatMap(query => query.data ?? [])) {
    const key = dayKey(sample.timestamp);
    if (!dayKeys.has(key)) continue;
    const items = samplesByDay.get(key) ?? [];
    items.push(sample);
    samplesByDay.set(key, items);
  }
  const traffic = period.map(day => {
    const samples = samplesByDay.get(day.key) ?? [];
    const requests = samples.reduce((sum, sample) => sum + sample.requests_count, 0);
    const errors = samples.reduce((sum, sample) => sum + sample.error_count, 0);
    return { date: day.date, requests: samples.length ? requests : null, errors,
      p95: mean(samples.flatMap(sample => sample.requests_count > 0 && sample.latency_p95_ms !== null ? [sample.latency_p95_ms] : [])),
      rate: requests ? errors / requests * 100 : null };
  });
  const requests = traffic.reduce((sum, day) => sum + (day.requests ?? 0), 0);
  const requestScale = traffic.some(day => (day.requests ?? 0) >= 1000) ? 1000 : 1;
  const requestLabel = requestScale === 1000 ? "Requests (k)" : "Requests";
  const averageP95 = mean([...samplesByDay.values()].flatMap(items =>
    items.flatMap(sample => sample.requests_count > 0 && sample.latency_p95_ms !== null ? [sample.latency_p95_ms] : [])));
  const errorRate = requests ? traffic.reduce((sum, day) => sum + day.errors, 0) / requests * 100 : null;
  const health = Object.entries(healthColors).map(([name, color]) => ({
    name, color, count: running.filter(deployment => (probes[deployment.id] ?? "Unknown") === name).length,
  }));
  let offset = 0;
  const healthSlices = health.filter(item => item.count).map(item => {
    const start = offset;
    offset += item.count / running.length * 100;
    return `${item.color} ${start}% ${offset}%`;
  });
  const scopedAlerts = (alerts.data ?? []).filter(alert =>
    (!project || alert.project_id === project || Boolean(alert.deployment_id && scope.some(item => item.id === alert.deployment_id))) &&
    (!model && !env || Boolean(alert.model_name && visibleNames.has(alert.model_name)) || Boolean(alert.deployment_id && scope.some(item => item.id === alert.deployment_id))));
  const incidentScope = scopedAlerts.filter(alert => dayKeys.has(dayKey(alert.created_at)))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const driftAlerts = incidentScope.filter(alert => alert.event_type.toLowerCase().includes("drift")).length;
  const driftTrend = alerts.isSuccess ? period.map(day =>
    incidentScope.filter(alert => dayKey(alert.created_at) === day.key && alert.event_type.toLowerCase().includes("drift")).length) : null;
  const rulesInScope = (rules.data ?? []).filter(rule => !rule.model_name || visibleNames.has(rule.model_name));
  const reports = (summary.data?.drift_history ?? []).filter(item => dayKeys.has(dayKey(item.created_at)));
  const reportByDay = new Map<string, { report: DriftEvaluationItem; results: Record<string, Feature> }>();
  for (const report of [...reports].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))) {
    const day = dayKey(report.created_at);
    const results = features(report);
    if (!reportByDay.has(day) && Object.keys(results).length) reportByDay.set(day, { report, results });
  }
  const columns = [...new Set([...reportByDay.values()].flatMap(({ results }) => Object.keys(results)))].slice(0, 6);
  const quality = summary.data?.latest_quality;
  const qualityDataset = dataScope.find(dataset => dataset.id === quality?.dataset_id);
  const versionTimes = (freshnessVersions.data ?? []).map(version => Date.parse(version.created_at))
    .filter(Number.isFinite).sort((a, b) => b - a);
  const freshness = period.map(day => {
    const latestVersion = versionTimes.find(timestamp => timestamp <= day.observedAt);
    return { date: day.date, age: latestVersion === undefined ? null : (day.observedAt - latestVersion) / 60_000 };
  });
  const measured = performanceSources.flatMap(query => query.data ?? []).filter(item =>
    (!project && !env || (item.deployment_id !== null && scopeIds.has(item.deployment_id))) && dayKeys.has(dayKey(item.created_at)));
  const versionSamples = versions.filter(item => dayKeys.has(dayKey(item.created_at)));
  const metricOptions = [...new Set([...measured, ...versionSamples].flatMap(item => Object.keys(item.metrics ?? {})))].sort();
  const activeMetric = metricOptions.includes(metric) ? metric
    : Object.keys(metricLabels).find(key => metricOptions.includes(key)) ?? metricOptions[0];
  const measuredMetric = measured.filter(item => activeMetric && Number.isFinite(item.metrics?.[activeMetric]));
  const sampled = measuredMetric.length ? measuredMetric.map(item => ({ ...item, name: item.model_name }))
    : versionSamples.filter(item => activeMetric && Number.isFinite(item.metrics?.[activeMetric]));
  const series = [...new Set(sampled.map(item => item.name))].slice(0, 5);
  const performanceLabel = activeMetric ? metricLabels[activeMetric] ?? titleCase(activeMetric) : "";
  const performance = period.map<{ date: string; [key: `series${number}`]: number | null }>(day => ({
    date: day.date,
    ...Object.fromEntries(series.map((name, index) => {
      const point = sampled.filter(item => item.name === name && dayKey(item.created_at) === day.key)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
      return [`series${index}`, point?.metrics?.[activeMetric] ?? null];
    })),
  }));
  const performanceValues = performance.flatMap(day => series.flatMap((_, index) => {
    const value = day[`series${index}`];
    return typeof value === "number" ? [value] : [];
  }));
  const aucScale = performanceLabel === "AUC" && performanceValues.length > 0 &&
    performanceValues.every(value => value >= 0 && value <= 1);
  const aucFloor = aucScale ? Math.min(0.8, Math.floor(Math.min(...performanceValues) * 20) / 20) : 0;
  const activityScope = JSON.stringify([project, env, model]);
  const activity = [
    ...indexedReports.map(item => ({ id: `report-${item.id}`, date: item.created_at, title: "Drift report generated", Icon: FileText,
      text: `${item.model_name} (${(item.drift_share * 100).toFixed(1)}% drift share)` })),
    ...scopedAlerts.flatMap(item => item.resolved_at ? [{ id: `alert-${item.id}`, date: item.resolved_at, title: "Alert resolved", Icon: Check, text: item.title }] : []),
    ...rulesInScope.map(item => ({ id: `rule-${item.id}`, date: item.created_at, title: "Monitoring rule created", Icon: Settings, text: item.name })),
    ...healthSyncs.filter(item => item.scope === activityScope).map(item => ({ id: `sync-${item.date}`, date: item.date,
      title: "Health sync completed", Icon: Check,
      text: `${item.checked} endpoint${item.checked === 1 ? "" : "s"} checked, ${item.healthy === item.checked ? "all healthy" : `${item.healthy} healthy`}` })),
  ].filter(item => dayKeys.has(dayKey(item.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const kpis = [
    ["Monitored Endpoints", deployments.isSuccess ? running.length : "—", Layers, "monitoring-endpoints", null],
    ["Healthy Services", services.isSuccess && services.data.length ? `${services.data.filter(service => service.status === "online").length} / ${services.data.length}` : "—", Heart, "monitoring-services", null],
    ["Avg p95 Latency", averageP95 === null ? "—" : `${Math.round(averageP95)} ms`, Gauge, "monitoring-traffic", traffic.map(day => day.p95)],
    ["Error Rate", errorRate === null ? "—" : `${errorRate.toFixed(2)}%`, AlertTriangle, "monitoring-traffic", traffic.map(day => day.rate)],
    ["Drift Alerts", alerts.isSuccess ? driftAlerts : "—", Layers, "monitoring-incidents", driftTrend],
    ["Uptime (30d)", "—", Timer, "monitoring-services", null],
  ] as const;

  function openEvaluation() {
    setEvaluationModel(reportModel ?? "");
    setReference("");
    setCurrent("");
    setMessage("");
    setShowEvaluation(true);
  }

  async function refresh() {
    setRefreshing(true);
    setMessage("");
    try {
      const [updates] = await Promise.all([
        Promise.all(endpointQueries.map(query => query.refetch())),
        projects.refetch(), registry.refetch(), deployments.refetch(), datasets.refetch(), services.refetch(), stats.refetch(),
        alerts.refetch(), rules.refetch(), driftIndex.refetch(), summary.refetch(),
        ...(freshnessDataset ? [freshnessVersions.refetch()] : []),
        ...telemetry.map(query => query.refetch()), ...performanceSources.map(query => query.refetch()),
      ]);
      if (updates.length) {
        const date = new Date().toISOString();
        const healthy = updates.filter(result => result.isSuccess && result.data === "Healthy").length;
        setHealthSyncs(previous => [{ date, scope: activityScope, checked: updates.length, healthy }, ...previous]);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function evaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!evaluationModel || !reference || !current || reference === current || evaluating) return;
    setEvaluating(true);
    setMessage("");
    try {
      await triggerDriftCheck({ model_name: evaluationModel, reference_dataset_id: reference, current_dataset_id: current });
      setModel(evaluationModel);
      setShowEvaluation(false);
      setMessage("Drift evaluation completed.");
      await Promise.all([driftIndex.refetch(), ...(evaluationModel === reportModel ? [summary.refetch()] : [])]);
    } catch {
      setMessage("Could not run the drift evaluation. Check the selected datasets and try again.");
    } finally {
      setEvaluating(false);
    }
  }

  async function download(item: DriftEvaluationItem) {
    setDownloading(true);
    setMessage("");
    try {
      const { data } = await api.get<Blob>(`/monitoring/reports/${encodeURIComponent(item.id)}/html`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `drift-report-${item.id}.html`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMessage("Could not download the drift report.");
    } finally {
      setDownloading(false);
    }
  }

  const noData = (text: string) => <p className="monitoring-empty">{text}</p>;
  const evaluatedDatasets = dataScope.filter(dataset => dataset.latest_version || dataset.version_num);

  return <div className="monitoring-dashboard">
    <header className="overview-hero monitoring-hero">
      <div><h1>Monitoring</h1><p>Observe model health, latency, drift, data quality, and service reliability across your ML workloads.</p></div>
      <div className="monitoring-lifecycle" aria-hidden="true">{lifecycle.map(([Icon, label], index) => <div key={label}>
        <span className="monitoring-stage-icon">
          <Icon size={38} strokeWidth={1.5} />
          {label === "Observe" && <Activity className="monitoring-screen-trend" size={21} strokeWidth={1.8} />}
        </span>
        <strong>{label}</strong>
        {index < lifecycle.length - 1 && <ArrowRight className="monitoring-arrow" size={22} />}
      </div>)}</div>
    </header>
    <div className="monitoring-toolbar" role="group" aria-label="Monitoring filters" aria-busy={refreshing}>
      <label><FolderGit2 size={15} /><b>Project:</b><select aria-label="Project" value={project} onChange={event => {
        setProject(event.target.value); setEnv(""); setModel("");
      }}><option value="">All Projects</option>{projects.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label><Layers size={15} /><b>Environment:</b><select aria-label="Environment" value={env} onChange={event => {
        setEnv(event.target.value); setModel("");
      }}><option value="">All Environments</option>{environments.map(item => <option key={item} value={item}>{titleCase(item)}</option>)}<option value="unassigned">Unassigned</option></select></label>
      <label><Box size={15} /><b>Model:</b><select aria-label="Model" value={model} onChange={event => setModel(event.target.value)}>
        <option value="">All Models</option>{modelNames.map(name => <option key={name}>{name}</option>)}</select></label>
      <label><CalendarDays size={15} /><b>Time Range:</b><select aria-label="Time Range" value={days} onChange={event => setDays(Number(event.target.value))}>
        {[7, 14, 30, 90].map(value => <option key={value} value={value}>Last {value} days</option>)}</select></label>
      <button className="primary-action" disabled={refreshing} onClick={() => void refresh()}><RefreshCw size={15} aria-hidden="true" />{refreshing ? "Refreshing…" : "Refresh Metrics"}</button>
    </div>

    <div className="overview-kpis monitoring-kpis">{kpis.map(([label, value, Icon, anchor, trend]) => <a className="overview-card kpi" href={`#${anchor}`} key={label}
      title={label === "Uptime (30d)" ? "30-day uptime history is unavailable" : undefined}>
      <span><Icon size={18} /><strong>{label}</strong></span><b>{value}<ChevronRight size={15} /></b>{trend && <Trend values={trend} />}
    </a>)}</div>
    {(message || registry.isError || deployments.isError) && <p role="status" className="monitoring-message">{message || `Could not load ${registry.isError ? "the model registry" : "deployments"}${selectedProject ? ` for ${selectedProject.name}` : ""}.`}</p>}

    <div className="monitoring-panels">
      <Panel id="monitoring-traffic" title="Traffic, Latency & Error Rate">
        <div className="monitoring-chart-key">
          <ChartKeyItem label="Request Volume" />
          <ChartKeyItem label="p95 Latency (ms)" color={trafficLatencyColor} />
          <ChartKeyItem label="Error Rate (%)" color={trafficErrorColor} />
        </div>
        {samplesByDay.size ? <div className="monitoring-chart monitoring-traffic-chart"><ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={traffic} margin={{ top: 8, left: 0, right: 5, bottom: 0 }}>
            <defs><linearGradient id={requestGradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d1f8d3" /><stop offset="100%" stopColor="#9ae99f" />
            </linearGradient></defs>
            <CartesianGrid vertical={false} stroke="#edf0f3" />
            <XAxis dataKey="date" height={23} minTickGap={6} tickLine={false} axisLine={chartAxis} tick={chartTick} />
            <YAxis yAxisId="requests" width={53} tickLine={false} axisLine={chartAxis} tick={chartTick} tickFormatter={value => axisNumber(value / requestScale)}
              label={{ value: requestLabel, angle: -90, position: "insideLeft", offset: 4, fontSize: 10, fill: chartTick.fill }} />
            <YAxis yAxisId="latency" width={47} orientation="right" unit=" ms" tickLine={false} axisLine={false} tick={chartTick} tickFormatter={axisNumber} />
            <YAxis yAxisId="error" width={44} orientation="right" unit="%" tickLine={false} axisLine={chartAxis} tick={chartTick} tickFormatter={axisNumber} />
            <Tooltip formatter={(value: number, name: string) => [numeric(value), name]} cursor={{ fill: "#edf7ef" }} />
            <Bar yAxisId="requests" dataKey="requests" name="Request Volume" fill={`url(#${requestGradient})`} maxBarSize={25} isAnimationActive={false} />
            <Line yAxisId="latency" dataKey="p95" name="p95 Latency (ms)" stroke={trafficLatencyColor} strokeWidth={2} dot={{ r: 2.8, fill: "#fff" }} isAnimationActive={false} />
            <Line yAxisId="error" dataKey="rate" name="Error Rate (%)" stroke={trafficErrorColor} strokeWidth={2} dot={{ r: 2.8, fill: "#fff" }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer></div> : noData(telemetry.some(query => query.isPending) ? "Loading recorded traffic…" : telemetry.some(query => query.isError) ? "Telemetry unavailable." : "No recorded telemetry in this period.")}
      </Panel>

      <Panel id="monitoring-performance" title="Model Performance Trends" action={<label className="monitoring-metric">
        <span>Metric:</span><select aria-label="Performance metric" value={activeMetric ?? ""} disabled={!metricOptions.length} onChange={event => setMetric(event.target.value)}>
          {!activeMetric && <option value="">—</option>}{metricOptions.map(key => <option key={key} value={key}>{metricLabels[key] ?? titleCase(key)}</option>)}
        </select>
      </label>}>
        {series.length ? <>
          {!measuredMetric.length && <p className="monitoring-caption">Recorded model version metrics</p>}
          <div className="monitoring-chart-key">{series.map((name, index) => <ChartKeyItem key={name} label={name} color={colors[index]} />)}</div>
          <div className="monitoring-chart monitoring-performance-chart"><ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={performance} margin={{ top: 8, left: 0, right: 9, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#edf0f3" />
              <XAxis dataKey="date" height={23} minTickGap={6} tickLine={false} axisLine={chartAxis} tick={chartTick} />
              <YAxis width={57} domain={aucScale ? [aucFloor, 1] : ["auto", "auto"]} tickCount={5} tick={chartTick} tickLine={false} axisLine={chartAxis}
                tickFormatter={value => aucScale ? value.toFixed(2) : axisNumber(value)}
                label={{ value: performanceLabel, angle: -90, position: "insideLeft", offset: 4, fontSize: 10, fill: chartTick.fill }} />
              <Tooltip formatter={(value: number, name: string) => [numeric(value), name]} cursor={chartAxis} />
              {series.map((name, index) => <Line key={name} dataKey={`series${index}`} name={name} stroke={colors[index]} strokeWidth={2}
                dot={{ r: 2.5, fill: "#fff" }} connectNulls isAnimationActive={false} />)}
            </ComposedChart>
          </ResponsiveContainer></div>
        </> : noData("No performance metrics in this period.")}
      </Panel>

      <Panel id="monitoring-services" title="Service Health">
        {services.data?.length ? <Table headings={["Service", "Status", "Probe Latency"]}>
          {services.data.map(service => {
            const name = serviceLabel(service.name);
            const Icon = serviceIcons[name] ?? Server;
            return <tr key={service.name}><td><span className="monitoring-inline" title={service.name}>
              {name === "MLflow" ? <span className="monitoring-mlflow-icon" aria-hidden="true">ml</span> : <Icon size={18} aria-hidden="true" />}
              {name}
            </span></td>
              <td><Badge label={service.status === "online" ? "Healthy" : "Offline"} tone={service.status === "online" ? "good" : "danger"} /></td>
              <td>{service.status === "online" ? service.latency.replace(/\s*ms$/, " ms") : "—"}</td></tr>;
          })}
          {!services.data.some(service => serviceLabel(service.name) === gatewayName) && <tr>
            <td><span className="monitoring-inline"><Workflow size={18} aria-hidden="true" />{gatewayName}</span></td>
            <td><Badge label="Unavailable" /></td><td>—</td>
          </tr>}
        </Table> : noData(services.isPending ? "Checking services…" : "Service health unavailable.")}
      </Panel>

      <Panel id="monitoring-endpoints" title="Endpoint Health">
        <div className="monitoring-health">
          <div className="monitoring-ring" style={{ backgroundImage: healthSlices.length ? `conic-gradient(${healthSlices.join(", ")})` : undefined }}>
            <div><strong>{deployments.isSuccess ? running.length : "—"}</strong><small>Endpoints</small></div>
          </div>
          <dl>{health.filter(item => item.name !== "Unknown" || item.count).map(item => <div key={item.name}>
            <dt><i aria-hidden="true" style={{ background: item.count || item.name !== "Unhealthy" ? item.color : healthColors.Unknown }} />
              {item.name} ({deployments.isSuccess ? item.count : "—"})
            </dt>
            <dd>{deployments.isSuccess && running.length ? `${(item.count / running.length * 100).toFixed(1)}%` : "—"}</dd>
          </div>)}</dl>
        </div>
      </Panel>

      <Panel id="monitoring-drift" title="Feature Drift Heatmap" action={canEvaluate && <button onClick={openEvaluation}>Run Evaluation <ChevronRight size={13} /></button>}>
        {columns.length ? <>
          {!model && reportModel && <p className="monitoring-caption">{reportModel}</p>}
          <div className="monitoring-scroll"><table className="overview-table monitoring-table monitoring-heatmap">
            <thead><tr><th scope="col">Feature</th>{period.map(day => <th key={day.key} scope="col">{day.date}</th>)}</tr></thead>
            <tbody>{columns.map(name => <tr key={name}><th scope="row">{name}</th>{period.map(day => {
              const entry = reportByDay.get(day.key);
              const feature = entry?.results[name];
              const state = feature?.drift_detected === true ? "drift" : feature?.drift_detected === false ? "stable" : "unknown";
              return <td key={day.key}>{entry && feature ? <button type="button" className={`monitoring-cell monitoring-cell-${state}`}
                title={`${name} · ${day.date} · ${state}`} aria-label={`${name}, ${day.date}: ${state}. Open report`} onClick={() => setReport(entry.report)} />
                : <span className="monitoring-cell monitoring-cell-unknown" role="img" aria-label="No result" title="No result" />}</td>;
            })}</tr>)}</tbody>
          </table></div>
        </> : noData(summary.isFetching ? "Loading drift evaluations…" : "No feature drift data in this period.")}
        {summary.data?.latest_drift && <button className="monitoring-text-action" onClick={() => setReport(summary.data!.latest_drift!)}>View latest drift report <ChevronRight size={12} /></button>}
      </Panel>

      <Panel id="monitoring-freshness" title="Data Freshness & Validation" action={freshnessDataset && <label className="monitoring-metric">
        <span>Dataset</span><select aria-label="Freshness dataset" value={freshnessDataset.id} onChange={event => setFreshnessDatasetId(event.target.value)}>
          {dataScope.map(dataset => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
        </select>
      </label>}>
        <div className="monitoring-freshness">
          <div>
            <div className="monitoring-chart-key"><ChartKeyItem label="Freshness (min)" color="#088b21" /></div>
            {freshness.some(day => day.age !== null) ? <div className="monitoring-chart monitoring-small-chart"><ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={freshness} margin={{ top: 5, left: 0, right: 6, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#edf0f3" />
                <XAxis dataKey="date" height={21} tick={chartTick} minTickGap={8} tickLine={false} axisLine={chartAxis} />
                <YAxis width={58} tickCount={5} tick={chartTick} tickLine={false} axisLine={chartAxis} tickFormatter={axisNumber}
                  label={{ value: "Freshness (min)", angle: -90, position: "insideLeft", offset: 4, fontSize: 10, fill: chartTick.fill }} />
                <Tooltip formatter={(value: number) => [`${Math.round(value).toLocaleString()} min`, "Age of latest version"]} />
                <Line dataKey="age" stroke="#088b21" strokeWidth={2} dot={{ r: 2.5, fill: "#fff" }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer></div> : noData(!freshnessDataset ? "No datasets available."
              : freshnessVersions.isPending ? "Loading dataset versions…"
                : freshnessVersions.isError ? "Dataset version history unavailable." : "No dataset versions available in this period.")}
          </div>
          <Table headings={["Dataset", "Quality Score"]}>
            {quality && qualityDataset && dayKeys.has(dayKey(quality.created_at))
              ? <tr><td>{qualityDataset.name}</td><td><Badge label={`${quality.score.toFixed(2)}%`} tone={quality.status === "PASS" ? "good" : quality.status === "FAIL" ? "danger" : "warning"} /></td></tr>
              : <tr><td colSpan={2} className="monitoring-validation-empty">{summary.isError ? "Validation unavailable." : summary.isPending ? "Loading validation…" : "No validation report available in this period."}</td></tr>}
          </Table>
        </div>
      </Panel>

      <Panel id="monitoring-incidents" title="Recent Alerts & Incidents">
        {incidentScope.length ? <Table headings={["Severity", "Model / Endpoint", "Description", "Status", "Time"]}>
          {incidentScope.slice(0, 4).map(alert => {
            const severity = severityStyles[alert.severity];
            return <tr key={alert.id}>
              <td><Badge label={titleCase(alert.severity)} tone={severity?.tone} icon={severity?.Icon} /></td>
              <td><strong>{alert.model_name ?? scope.find(item => item.id === alert.deployment_id)?.model_name ?? "—"}</strong></td>
              <td className="monitoring-ellipsis" title={alert.title}>{alert.title}</td>
              <td><Badge label={titleCase(alert.status)} tone={alert.status === "RESOLVED" ? "good" : "warning"} /></td>
              <td><time dateTime={alert.created_at}>{relativeTime(alert.created_at)}</time></td>
            </tr>;
          })}
        </Table> : noData(alerts.isPending ? "Loading incidents…" : alerts.isError ? "Alert history unavailable." : "No recorded incidents in this period.")}
      </Panel>

      <Panel id="monitoring-rules" title="Monitoring Rules Status">
        {rulesInScope.length ? <Table headings={["Rule", "Type", "Threshold", "Status"]}>
          {rulesInScope.slice(0, 5).map(rule => {
            const metric = ruleMetrics[rule.metric];
            const Icon = metric?.Icon ?? AlertTriangle;
            return <tr key={rule.id}>
              <td><span className="monitoring-inline"><Icon size={15} aria-hidden="true" />{rule.name}</span></td>
              <td>{metric?.label ?? titleCase(rule.metric)}</td>
              <td>{rule.operator} {metric?.format(rule.threshold) ?? numeric(rule.threshold)}</td>
              <td><Badge label={rule.enabled ? "Active" : "Disabled"} tone={rule.enabled ? "good" : "neutral"} /></td>
            </tr>;
          })}
        </Table> : noData(rules.isPending ? "Loading rules…" : rules.isError ? "Monitoring rules unavailable." : "No monitoring rules configured.")}
      </Panel>

      <Panel id="monitoring-resources" title="Resource Utilization">
        <div className="monitoring-resources">{([["CPU", "cpu", Cpu], ["Memory", "memory", MemoryStick], ["Storage", "storage", Database], ["GPU", null, CircuitBoard]] as const).map(([label, key, Icon]) => {
          const reading = key ? stats.data?.infrastructure?.[key] : null;
          const percent = typeof reading === "number" && Number.isFinite(reading) ? Math.min(100, Math.max(0, reading)) : null;
          return <div key={label}>
            <Icon size={20} aria-hidden="true" />
            <span>{label}<strong>{percent === null ? <span aria-label={key && stats.isPending ? "Loading" : "Unavailable"}>—</span> : `${Math.round(percent)}%`}</strong></span>
            {percent === null ? <span className="monitoring-resource-track" aria-hidden="true" /> :
              <span className="monitoring-resource-track" role="meter" aria-label={`${label} utilization`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                <i style={{ width: `${percent}%` }} />
              </span>}
          </div>;
        })}</div>
      </Panel>

      <Panel id="monitoring-models" title="Monitored Models">
        {latest.length ? <Table headings={["Model", "Stage", "Current Metric", "Drift Score (PSI)", "Status", "Last Evaluated"]}>
          {latest.slice(0, 5).map(item => {
            const points = indexedReports.find(entry => entry.model_name === item.name && dayKeys.has(dayKey(entry.created_at)));
            const availableMetrics = Object.entries(item.metrics ?? {}).filter(([, value]) => Number.isFinite(value));
            const preferredMetric = Object.keys(metricLabels).find(key => Number.isFinite(item.metrics?.[key]));
            const currentMetric = availableMetrics.find(([key]) => key === preferredMetric) ?? availableMetrics[0];
            const itemDeployments = running.filter(deployment => deployment.model_name === item.name);
            const states = itemDeployments.map(deployment => probes[deployment.id] ?? "Unknown");
            const status = item.stage === "ARCHIVED" && !states.length ? "Inactive"
              : states.includes("Unhealthy") ? "Unhealthy" : states.includes("Degraded") ? "Degraded"
              : states.length && states.every(state => state === "Healthy") ? "Healthy" : "Unknown";
            return <tr key={item.name}><td><span className="monitoring-inline"><Box size={17} aria-hidden="true" />{item.name}</span></td>
              <td><Badge label={titleCase(item.stage)} tone={item.stage === "PRODUCTION" ? "good" : "neutral"} /></td>
              <td>{currentMetric ? `${metricLabels[currentMetric[0]] ?? titleCase(currentMetric[0])}: ${numeric(currentMetric[1])}` : "—"}</td>
              <td><span title="Model-level PSI is unavailable" aria-label="PSI unavailable">—</span></td>
              <td><Badge label={status} tone={status === "Healthy" ? "good" : status === "Degraded" ? "warning" : status === "Unhealthy" ? "danger" : "neutral"}
                icon={status === "Degraded" ? AlertTriangle : status === "Unhealthy" ? AlertCircle : undefined} /></td>
              <td>{points ? <time dateTime={points.created_at}>{relativeTime(points.created_at)}</time> : "—"}</td></tr>;
          })}
        </Table> : noData(registry.isPending ? "Loading models…" : registry.isError ? "Model registry unavailable." : "No models match this selection.")}
      </Panel>

      <Panel id="monitoring-activity" title="Recent Monitoring Activity" action={activity.length > 4 &&
        <button type="button" aria-expanded={showAllActivity} aria-controls="monitoring-activity-list" onClick={() => setShowAllActivity(expanded => !expanded)}>
          {showAllActivity ? "Show Less" : "View All Activity"} <ChevronRight size={14} aria-hidden="true" />
        </button>}>
        {activity.length ? <ul className="monitoring-activity" id="monitoring-activity-list">{(showAllActivity ? activity : activity.slice(0, 4)).map(item => <li key={item.id}>
          <span className={`monitoring-activity-icon${item.Icon === Check ? " monitoring-activity-check" : ""}`}><item.Icon size={14} aria-hidden="true" /></span>
          <span><strong>{item.title}</strong> — {item.text}</span>
          <time dateTime={item.date} title={new Date(item.date).toLocaleString()}>{relativeTime(item.date)}</time>
        </li>)}</ul> : noData("No monitoring activity in this period.")}
      </Panel>
    </div>

    {showEvaluation && <div className="monitoring-overlay"><section className="overview-card monitoring-dialog" role="dialog" aria-modal="true" aria-label="Run Drift Evaluation">
      <header><h2>Run Drift Evaluation</h2><button aria-label="Close" disabled={evaluating} onClick={() => setShowEvaluation(false)}><X size={18} /></button></header>
      <form onSubmit={evaluate}>
        <label>Model<select value={evaluationModel} required onChange={event => setEvaluationModel(event.target.value)}><option value="">Select a model</option>{modelNames.map(name => <option key={name}>{name}</option>)}</select></label>
        <label>Reference dataset<select value={reference} required onChange={event => setReference(event.target.value)}><option value="">Select a dataset</option>{evaluatedDatasets.map(dataset => <option key={dataset.id} value={dataset.id} disabled={current === dataset.id}>{dataset.name}</option>)}</select></label>
        <label>Current dataset<select value={current} required onChange={event => setCurrent(event.target.value)}><option value="">Select a dataset</option>{evaluatedDatasets.map(dataset => <option key={dataset.id} value={dataset.id} disabled={reference === dataset.id}>{dataset.name}</option>)}</select></label>
        {datasets.isError && <p role="alert">Could not load the datasets.</p>}
        {message && <p role="alert">{message}</p>}
        <button className="primary-action" disabled={evaluating || !evaluationModel || !reference || !current}>{evaluating ? "Evaluating…" : "Run Drift Evaluation"}</button>
      </form>
    </section></div>}

    {report && <div className="monitoring-overlay"><section className="overview-card monitoring-dialog monitoring-report-dialog" role="dialog" aria-modal="true" aria-label="Drift Report">
      <header><h2>Drift Report · {report.model_name}</h2><button aria-label="Close" onClick={() => setReport(undefined)}><X size={18} /></button></header>
      <p>{new Date(report.created_at).toLocaleString()} · {(report.drift_share * 100).toFixed(1)}% drift share</p>
      <Table headings={["Feature", "Statistical Test", "Test Value", "Threshold", "Reference Mean", "Current Mean", "Status"]}>
        {Object.entries(features(report)).map(([name, result]) => <tr key={name}><td>{name}</td><td>{result.stat_test ?? result.stattest_name ?? "—"}</td>
          <td>{result.p_value ?? result.drift_score ?? "—"}</td><td>{result.stattest_threshold ?? "—"}</td><td>{result.reference_mean ?? "—"}</td><td>{result.current_mean ?? "—"}</td>
          <td>{result.drift_detected === true ? "Drift detected" : result.drift_detected === false ? "Stable" : "—"}</td></tr>)}
      </Table>
      {message && <p role="status">{message}</p>}
      <button className="secondary-action" disabled={downloading} onClick={() => void download(report)}><Download size={14} />{downloading ? "Downloading…" : "Download HTML Report"}</button>
    </section></div>}
  </div>;
}
