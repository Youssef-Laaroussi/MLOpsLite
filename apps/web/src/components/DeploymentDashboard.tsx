import { useState, type ReactNode } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, Box, CalendarDays, Check, ChevronRight, CircleCheck,
  Circle, CircleX, Code2, FolderGit2, Info, Layers, Monitor, Plus, RefreshCw, Rocket, RotateCcw,
  Search, ShieldCheck, StopCircle, Timer, TrendingUp, X,
} from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, deploymentPredictionUrl, fetchProjects, fetchSystemServices, pingDeployment } from "../api/client";
import type { Deployment, DeploymentMetric } from "../api/types";

type Props = {
  deployments: Deployment[];
  loading: boolean;
  error: string | null;
  canDeploy: boolean;
  canViewAudit: boolean;
  canRollback: boolean;
  canStop: boolean;
  onReload: () => Promise<void>;
  onCreate: () => void;
  onStop: (id: string) => Promise<void>;
  onRollback: (deployment: Deployment) => void;
};

type Rollback = {
  id: string;
  deployment_id: string | null;
  model_name: string;
  from_version: number;
  to_version: number;
  status: string;
  created_at: string;
  completed_at: string | null;
};

type Probe = {
  status: "Healthy" | "Degraded" | "Unhealthy" | "Unknown";
  latency?: number;
  checkedAt: string;
};

type Artifact = { artifact_available: boolean; signature: { inputs?: unknown } | null };
type RollbackChecks = { schema?: boolean; signature: boolean; artifact: boolean };

const workflow = ["Registry", "Container Build", "Endpoint", "Monitor"] as const;
const healthColors = { Healthy: "#18a933", Degraded: "#ffbd22", Unhealthy: "#d95757", Unknown: "#a8b0bc" };
const dayMs = 86_400_000;
const dayKey = (timestamp: string) => new Date(timestamp).toDateString();
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const ms = (value: number | null | undefined) => value == null ? "—" : `${Math.round(value)} ms`;
const stageLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
const environment = (deployment: Deployment) => typeof deployment.config?.environment === "string"
  ? deployment.config.environment.trim().toLowerCase() : "";
const textConfig = (deployment: Deployment, key: string) =>
  typeof deployment.config?.[key] === "string" ? String(deployment.config[key]).trim() : "";
const percent = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
const traffic = (deployment: Deployment) => percent(deployment.config?.traffic_percent);
const updated = (deployment: Deployment) => deployment.updated_at || deployment.created_at;
const deploymentVersion = (deployment: Deployment) => `${deployment.id}:v${deployment.model_version}`;

function age(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (!Number.isFinite(minutes)) return "—";
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)} d ago`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h ago`;
  return minutes ? `${minutes} min ago` : "Just now";
}

function Panel({ title, children, id, action }: { title: string; children: ReactNode; id?: string; action?: ReactNode }) {
  return <section id={id} className="overview-card deployment-panel">
    <h2>{title}<Info size={14} aria-hidden="true" />{action}</h2>{children}
  </section>;
}

function Table({ headings, children }: { headings: ReactNode[]; children: ReactNode }) {
  return <div className="deployment-table-scroll"><table className="overview-table deployment-table">
    <thead><tr>{headings.map((label, index) => <th key={index} scope="col">{label}</th>)}</tr></thead>
    <tbody>{children}</tbody>
  </table></div>;
}

function Status({ value }: { value: string }) {
  return <span className={`deployment-status deployment-status-${value.toLowerCase().replace(/\s+/g, "-")}`}>
    {value === "Ready" ? <Check size={12} aria-hidden="true" />
      : value === "Degraded" || value === "Warning" ? <AlertTriangle size={11} aria-hidden="true" />
      : <i aria-hidden="true" />}{value}
  </span>;
}

function RolloutBar({ deployment }: { deployment: Deployment }) {
  const share = traffic(deployment);
  const rollout = textConfig(deployment, "rollout");
  const strategy = rollout.toLowerCase();
  const canary = percent(deployment.config?.canary_percent) ?? (strategy === "canary" ? share : null);
  if (strategy === "staging only" || (environment(deployment) === "staging" && share === 0)) {
    return <span className="deployment-rollout-track"><span className="deployment-rollout-light">Staging only</span></span>;
  }
  if (canary === 0 || canary === 100) {
    return <>
      <span className="deployment-rollout-track"><span className={canary === 0 ? "deployment-rollout-dark" : "deployment-rollout-light"}>
        {canary === 0 ? "Stable" : "Canary"}
      </span></span>
      <span className="deployment-rollout-share">100%</span>
    </>;
  }
  if (canary !== null && canary > 0 && canary < 100) {
    const stable = Math.round((100 - canary) * 100) / 100;
    return <span className="deployment-rollout-track" role="img" aria-label={`Canary ${canary}%, Stable ${stable}%`}>
      <span className="deployment-rollout-light" style={{ flexBasis: `${canary}%` }} title={`Canary ${canary}%`}>Canary {canary}%</span>
      <span className="deployment-rollout-dark" title={`Stable ${stable}%`}>Stable {stable}%</span>
    </span>;
  }
  if (share === null) return <span className="deployment-rollout-unknown">{rollout || "Traffic allocation unavailable"}</span>;
  return <>
    <span className="deployment-rollout-track">
      <span className={share === 100 ? "deployment-rollout-dark" : "deployment-rollout-partial"}
        style={share === 100 ? undefined : { background: `linear-gradient(to right,#a0e7a7 ${share}%,#edf7ee ${share}%)` }}>
        {rollout || "Allocated traffic"}
      </span>
    </span>
    <span className="deployment-rollout-share">{share}%</span>
  </>;
}

function CheckCell({ value }: { value: boolean | undefined }) {
  return value === undefined ? <>—</> : value
    ? <Check className="deployment-check" size={15} aria-label="Passed" />
    : <CircleX className="deployment-check-failed" size={14} aria-label="Failed" />;
}

function canonicalSchema(value: unknown): string | undefined {
  let schema = value;
  if (typeof schema === "string") {
    try { schema = JSON.parse(schema); } catch { return undefined; }
  }
  if (!Array.isArray(schema) || !schema.length || !schema.every(field =>
    field && typeof field === "object" && typeof field.type === "string")) return undefined;
  return JSON.stringify(schema, (_, field) => field && typeof field === "object" && !Array.isArray(field)
    ? Object.fromEntries(Object.entries(field).sort(([a], [b]) => a.localeCompare(b))) : field);
}

function Trend({ values, bars }: { values: (number | null)[]; bars: boolean }) {
  const bucketCount = Math.min(7, values.length);
  const buckets = bars ? Array.from({ length: bucketCount }, (_, index) => {
    const start = Math.floor(index * values.length / bucketCount);
    const end = Math.floor((index + 1) * values.length / bucketCount);
    return values.slice(start, end).reduce<number>((count, value) => count + (value ?? 0), 0);
  }) : [];
  if (bars) {
    const peak = Math.max(1, ...buckets);
    return <svg className="deployment-kpi-trend deployment-kpi-bars" viewBox="0 0 76 20" aria-hidden="true">
      {buckets.map((count, index) => {
        const height = 16 * count / peak;
        return <rect key={index} x={3 + index * 10.5} y={18 - height} width={5} height={height} fill="currentColor" />;
      })}
    </svg>;
  }
  const max = Math.max(1, ...values.flatMap(value => value ?? []));
  const path = values.map((value, index) => value === null ? "" :
    `${index && values[index - 1] !== null ? "L" : "M"}${1 + index * 74 / (values.length - 1)},${16 - 13 * value / max}`).join(" ");
  return <svg className="deployment-kpi-trend" viewBox="0 0 76 20" aria-hidden="true">
    <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function WorkflowCube() {
  return <span className="iso-cube"><i /><b /><em /></span>;
}

function statusOf(deployment: Deployment, probe?: Probe) {
  if (deployment.status === "STOPPED") return "Inactive";
  if (deployment.status !== "RUNNING") return stageLabel(deployment.status);
  return probe && probe.status !== "Unknown" ? probe.status : "Running";
}

export function DeploymentDashboard({
  deployments, loading, error, canDeploy, canViewAudit, canRollback, canStop, onReload, onCreate, onStop, onRollback,
}: Props) {
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("");
  const [env, setEnv] = useState("");
  const [status, setStatus] = useState("");
  const [days, setDays] = useState(30);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string>();
  const [probes, setProbes] = useState<Record<string, Probe>>({});
  const [artifacts, setArtifacts] = useState<Record<string, Artifact>>({});
  const [rollbackChecks, setRollbackChecks] = useState<Record<string, RollbackChecks>>({});
  const [syncAt, setSyncAt] = useState<string>();
  const [syncing, setSyncing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [validationError, setValidationError] = useState("");
  const projects = useQuery({ queryKey: ["deployment-projects"], queryFn: fetchProjects });
  const services = useQuery({ queryKey: ["deployment-services"], queryFn: fetchSystemServices, staleTime: 60_000 });
  const rollbacks = useQuery({
    queryKey: ["deployment-rollbacks"],
    queryFn: async () => (await api.get<{ rollbacks: Rollback[] }>("/rollbacks", { params: { limit: 100 } })).data.rollbacks,
  });
  const environments = [...new Set(deployments.map(environment).filter(Boolean))].sort();
  const searchTerm = search.trim().toLowerCase();
  const scope = deployments.filter(deployment => {
    const projectName = projects.data?.find(item => item.id === deployment.project_id)?.name ?? "";
    return (!project || (project === "unassigned" ? !deployment.project_id : deployment.project_id === project)) &&
      (!env || (env === "unassigned" ? !environment(deployment) : environment(deployment) === env)) &&
      (!status || statusOf(deployment, probes[deployment.id]) === status) &&
      (!searchTerm || [deployment.model_name, deployment.id, deployment.endpoint_url, projectName, String(deployment.port)]
        .some(value => value?.toLowerCase().includes(searchTerm)));
  }).sort((a, b) => Date.parse(updated(b)) - Date.parse(updated(a)));
  const rows = expanded ? scope : scope.slice(0, 4);
  const running = scope.filter(deployment => deployment.status === "RUNNING");
  const detail = deployments.find(deployment => deployment.id === detailId);
  const metrics = useQueries({
    queries: scope.map(deployment => ({
      queryKey: ["deployment-telemetry", deployment.id],
      queryFn: async () => (await api.get<DeploymentMetric[]>(`/deployments/${encodeURIComponent(deployment.id)}/metrics`, { params: { limit: 500 } })).data,
      staleTime: 30_000,
    })),
  });
  const timeline = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - days + index + 1);
    return { key: date.toDateString(), date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
  });
  const period = new Set(timeline.map(day => day.key));
  const byDay = new Map<string, DeploymentMetric[]>();
  const byDeployment = new Map(scope.map((deployment, index) => {
    const samples = (metrics[index].data ?? []).filter(sample => period.has(dayKey(sample.timestamp)));
    for (const sample of samples) {
      const key = dayKey(sample.timestamp);
      const existing = byDay.get(key);
      if (existing) existing.push(sample);
      else byDay.set(key, [sample]);
    }
    return [deployment.id, samples] as const;
  }));
  const latencies = (samples: DeploymentMetric[], key: "latency_p50_ms" | "latency_p95_ms") =>
    samples.flatMap(sample => sample.requests_count > 0 && sample[key] !== null ? [sample[key]] : []);
  const daily = timeline.map(day => {
    const samples = byDay.get(day.key) ?? [];
    return {
      date: day.date,
      requests: samples.length ? samples.reduce((total, sample) => total + sample.requests_count, 0) : null,
      p50: average(latencies(samples, "latency_p50_ms")),
      p95: average(latencies(samples, "latency_p95_ms")),
    };
  });
  const displayThousands = daily.some(day => (day.requests ?? 0) >= 1000);
  const requestsLabel = displayThousands ? "Requests (k)" : "Requests";
  const runningSamples = running.flatMap(deployment => byDeployment.get(deployment.id) ?? []);
  const inferenceP95 = average(latencies(runningSamples, "latency_p95_ms"));
  const completed = scope.filter(deployment => period.has(dayKey(deployment.created_at)) && deployment.status !== "PENDING");
  const scopedNames = new Set(scope.map(deployment => deployment.model_name));
  const scopedIds = new Set(scope.map(deployment => deployment.id));
  const recentRollbacks = (rollbacks.data ?? []).filter(rollback =>
    (rollback.deployment_id ? scopedIds.has(rollback.deployment_id) : scopedNames.has(rollback.model_name)) &&
    period.has(dayKey(rollback.completed_at ?? rollback.created_at)));
  const health = Object.entries(healthColors).map(([label, color]) => ({
    label, color, count: running.filter(deployment => (probes[deployment.id]?.status ?? "Unknown") === label).length,
  }));
  let healthEnd = 0;
  const healthSlices = health.filter(item => item.count > 0).map(item => {
    const start = healthEnd;
    healthEnd += item.count / running.length * 100;
    return `${item.color} ${start}% ${healthEnd}%`;
  });
  const activity = [
    ...scope.map(deployment => ({
      id: deployment.id, date: deployment.status === "STOPPED" ? updated(deployment) : deployment.created_at,
      title: deployment.status === "STOPPED" ? "Deployment stopped" : deployment.status === "FAILED"
        ? "Deployment failed" : deployment.status === "PENDING" ? "Deployment pending" : "Deployment completed",
      description: `${deployment.model_name} v${deployment.model_version}`,
      status: deployment.status === "FAILED" ? "error" : deployment.status === "PENDING" ? "pending" : "complete",
    })),
    ...scope.flatMap(deployment => {
      const date = textConfig(deployment, "canary_started_at");
      return Number.isFinite(Date.parse(date)) ? [{
        id: `canary:${deployment.id}`, date, title: "Canary started",
        description: `${deployment.model_name} v${deployment.model_version}`, status: "pending",
      }] : [];
    }),
    ...recentRollbacks.map(rollback => ({
      id: rollback.id, date: rollback.completed_at ?? rollback.created_at,
      title: `Rollback ${rollback.status.toLowerCase().replace(/_/g, " ")}`,
      description: `${rollback.model_name} v${rollback.from_version} → v${rollback.to_version}`,
      status: rollback.status === "COMPLETED" ? "complete" : ["FAILED", "ABORTED"].includes(rollback.status) ? "error" : "pending",
    })),
    ...(syncAt ? [{ id: "sync", date: syncAt, title: "Health checks synced", description: "Endpoint probes refreshed", status: "complete" }] : []),
  ].filter(event => period.has(dayKey(event.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5);
  const selectedRunning = running.filter(deployment => selected.includes(deployment.id));
  const readiness = new Map(scope.map(deployment => {
    const health = probes[deployment.id]?.status;
    const checks = rollbackChecks[deploymentVersion(deployment)];
    const endpoint = health && health !== "Unknown" ? health === "Healthy" : undefined;
    const values = [endpoint, checks?.schema, checks?.signature, checks?.artifact];
    const status = deployment.status !== "RUNNING" ? "Not Applicable"
      : values.includes(false) ? "Warning" : values.every(value => value === true) ? "Ready" : "Pending Checks";
    return [deployment.id, { values, status }] as const;
  }));
  const checkCounts = ([
    ["Health Checks Passed", CircleCheck], ["Schema Compatibility", Layers],
    ["Signature Verified", ShieldCheck], ["Artifact Available", Box],
  ] as const).map(([title, Icon], index) => {
    const results = running.map(deployment => readiness.get(deployment.id)?.values[index]);
    return { title, Icon, count: results.filter(value => value === true).length, available: results.some(value => value !== undefined) };
  });
  const readinessNotices = running.flatMap(deployment => {
    const result = readiness.get(deployment.id);
    if (result?.status === "Ready") return [{ deployment, text: `Checks passed for rollback to v${deployment.model_version - 1}.` }];
    if (result?.status === "Warning") {
      return [{ deployment, text: result.values[0] === false ? "The endpoint health check did not pass." : "Review the rollback target’s schema, signature and artifact checks." }];
    }
    return [];
  }).slice(0, 3);
  const stats = [
    ["Active Deployments", running.length, Layers, "deployment-control"],
    ["Production Endpoints", environments.includes("production") ? running.filter(deployment => environment(deployment) === "production").length : "—", Monitor, "deployment-control"],
    ["Staging Endpoints", environments.includes("staging") ? running.filter(deployment => environment(deployment) === "staging").length : "—", Layers, "deployment-control"],
    ["Deployment Success Rate", completed.length ? `${(completed.filter(deployment => deployment.status !== "FAILED").length / completed.length * 100).toFixed(1)}%` : "—", Rocket, "deployment-activity"],
    ["Avg p95 Latency", ms(inferenceP95), Timer, "deployment-traffic"],
    ["Recent Rollbacks", rollbacks.isSuccess ? recentRollbacks.filter(rollback => rollback.status === "COMPLETED").length : "—", RotateCcw, "deployment-readiness"],
  ] as const;
  const trends = [
    timeline.map(day => running.filter(deployment => dayKey(deployment.created_at) === day.key).length),
    ...["production", "staging"].map(name => environments.includes(name) ? timeline.map(day =>
      running.filter(deployment => environment(deployment) === name && dayKey(deployment.created_at) === day.key).length) : null),
    timeline.map(day => {
      const finished = completed.filter(deployment => dayKey(deployment.created_at) === day.key);
      return finished.length ? finished.filter(deployment => deployment.status !== "FAILED").length / finished.length * 100 : null;
    }),
    daily.map(day => day.p95),
    rollbacks.isSuccess ? timeline.map(day => recentRollbacks.filter(rollback =>
      rollback.status === "COMPLETED" && dayKey(rollback.completed_at ?? rollback.created_at) === day.key).length) : null,
  ];
  const serviceRows = [
    ...(services.data ?? []).map(service => ({
      ...service, name: service.name.split(" ")[0] === "Model" ? "Docker" : service.name.split(" ")[0],
      duration: /^\s*\d+(\.\d+)?\s*ms\s*$/.test(service.latency) ? parseFloat(service.latency) : null,
      measurement: "Latest connectivity probe",
      highlight: service.name.startsWith("MLflow"),
    })),
    ...(inferenceP95 === null ? [] : [{ name: "Inference (avg p95)", status: "online", duration: inferenceP95, measurement: "Average of p95 values reported by running endpoints", highlight: true }]),
  ];
  const maxServiceTime = Math.max(1, ...serviceRows.map(service => service.status === "online" ? service.duration ?? 0 : 0));
  const checkedAll = rows.length > 0 && rows.every(deployment => selected.includes(deployment.id));

  async function probe(deployment: Deployment) {
    let result: Probe;
    const checkedAt = new Date().toISOString();
    try {
      const { prediction, latency_ms } = await pingDeployment(deployment.id);
      result = {
        checkedAt, latency: latency_ms,
        status: prediction?.healthy === true ? "Healthy" : prediction?.status === "degraded" ? "Degraded"
          : prediction?.healthy === false ? "Unhealthy" : "Unknown",
      };
    } catch {
      result = { status: "Unknown", checkedAt };
    }
    setProbes(current => ({ ...current, [deployment.id]: result }));
  }

  async function syncHealth() {
    setSyncing(true);
    try {
      const targets = selectedRunning.length ? selectedRunning : running;
      await Promise.all([
        onReload(), services.refetch(), rollbacks.refetch(), ...metrics.map(query => query.refetch()),
        ...targets.map(probe),
      ]);
      if (targets.length) setSyncAt(new Date().toISOString());
    } finally {
      setSyncing(false);
    }
  }

  async function checkArtifact(deployment: Deployment) {
    setChecking(true);
    setValidationError("");
    const currentVersion = deploymentVersion(deployment);
    setRollbackChecks(previous => {
      const next = { ...previous };
      delete next[currentVersion];
      return next;
    });
    try {
      const url = `/models/${encodeURIComponent(deployment.model_name)}/versions`;
      const targetVersion = deployment.model_version - 1;
      const checkTarget = deployment.status === "RUNNING" && targetVersion >= 1;
      const [current, target] = await Promise.allSettled([
        api.get<Artifact>(`${url}/${deployment.model_version}/validation`),
        checkTarget ? api.get<Artifact>(`${url}/${targetVersion}/validation`) : Promise.resolve(undefined),
        checkTarget ? probe(deployment) : Promise.resolve(),
      ] as const);
      if (current.status === "rejected") throw current.reason;
      const artifact = current.value.data;
      setArtifacts(previous => ({ ...previous, [currentVersion]: artifact }));
      if (target?.status === "rejected") setValidationError(`Could not verify rollback target v${targetVersion}.`);
      if (target?.status === "fulfilled" && target.value) {
        const targetArtifact = target.value.data;
        const currentSchema = canonicalSchema(artifact.signature?.inputs);
        const targetSchema = canonicalSchema(targetArtifact.signature?.inputs);
        setRollbackChecks(previous => ({ ...previous, [currentVersion]: {
          schema: currentSchema && targetSchema ? currentSchema === targetSchema : undefined,
          signature: Boolean(targetArtifact.signature), artifact: targetArtifact.artifact_available,
        } }));
      }
    } catch {
      setValidationError("Could not verify the model artifact or signature.");
    } finally {
      setChecking(false);
    }
  }

  return <>
    <header className="overview-hero deployment-hero">
      <div><h1>Deployments</h1><p>Manage live endpoints, rollout strategy, deployment health, latency, and rollback readiness across your ML workloads.</p></div>
      <div className="deployment-workflow" aria-hidden="true">{workflow.map((title, index) => <div key={title}>
        <div className="deployment-workflow-art">
          {title === "Registry" && <WorkflowCube />}
          {title === "Container Build" && <span className="deployment-workflow-stack"><WorkflowCube /><WorkflowCube /><WorkflowCube /><WorkflowCube /></span>}
          {title === "Endpoint" && <span className="deployment-workflow-window"><Code2 size={27} strokeWidth={1.9} /></span>}
          {title === "Monitor" && <span className="deployment-workflow-screen"><TrendingUp size={28} strokeWidth={1.9} /></span>}
        </div><strong>{title}</strong>
        {index < workflow.length - 1 && <ArrowRight className="deployment-workflow-arrow" size={20} />}
      </div>)}</div>
    </header>

    <div className="deployment-toolbar">
      <label><Search size={15} /><input aria-label="Search deployments" placeholder="Search deployments…" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <label><FolderGit2 size={15} /><select aria-label="Project" value={project} onChange={event => setProject(event.target.value)}>
        <option value="">All Projects</option>{projects.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="unassigned">Unassigned</option>
      </select></label>
      <label><Layers size={15} /><select aria-label="Environment" value={env} onChange={event => setEnv(event.target.value)}>
        <option value="">All Environments</option>{environments.map(item => <option key={item} value={item}>{stageLabel(item)}</option>)}<option value="unassigned">Unassigned</option>
      </select></label>
      <label><Activity size={15} /><select aria-label="Status" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All Statuses</option>{["Running", "Healthy", "Degraded", "Unhealthy", "Pending", "Failed", "Inactive"].map(item => <option key={item}>{item}</option>)}
      </select></label>
      <label><CalendarDays size={15} /><select aria-label="Activity date range" value={days} onChange={event => setDays(Number(event.target.value))}>
        {[7, 30, 90].map(value => <option key={value} value={value}>Last {value} days</option>)}
      </select></label>
      <div className="deployment-actions">
        <button className="secondary-action" type="button" disabled={syncing || loading} onClick={() => void syncHealth()}>
          <RefreshCw size={15} />{syncing ? "Syncing…" : "Sync Health"}
        </button>
        {canDeploy && <button className="primary-action" type="button" onClick={onCreate}><Plus size={16} />New Deployment</button>}
      </div>
    </div>
    {error && <p className="deployment-error" role="alert">{error} <button onClick={() => void onReload()}>Retry</button></p>}

    <div className="overview-kpis deployment-kpis">{stats.map(([title, value, Icon, link], index) => <a className="overview-card kpi" href={`#${link}`} key={title}>
      <span><Icon size={19} /><strong>{title}</strong></span><b>{loading && !deployments.length ? "—" : value}<ChevronRight size={15} /></b>
      {!loading && value !== "—" && trends[index] && <Trend values={trends[index]} bars={link === "deployment-readiness"} />}
    </a>)}</div>

    <Panel id="deployment-control" title="Deployment Control Center" action={scope.length > 4 && <button type="button" onClick={() => setExpanded(value => !value)}>
      {expanded ? "Show Fewer" : "View All Deployments"} <ChevronRight size={14} />
    </button>}>
      {rows.length ? <Table headings={[
        <input type="checkbox" aria-label="Select visible deployments" checked={checkedAll} onChange={() => setSelected(current => checkedAll
          ? current.filter(id => !rows.some(deployment => deployment.id === id))
          : [...new Set([...current, ...rows.map(deployment => deployment.id)])])} />,
        "Deployment", "Description", "Version", "Environment", "Endpoint Path", "Replicas", "Traffic", "p95 Latency", "Error Rate", "Status", "Updated", "Action",
      ]}>
        {rows.map(deployment => {
          const samples = byDeployment.get(deployment.id) ?? [];
          const requests = samples.reduce((total, sample) => total + sample.requests_count, 0);
          const errors = samples.reduce((total, sample) => total + sample.error_count, 0);
          const latestP95 = latencies(samples, "latency_p95_ms")[0];
          const trafficShare = traffic(deployment);
          const endpoint = deploymentPredictionUrl(deployment.id);
          const environmentName = environment(deployment);
          const description = textConfig(deployment, "description");
          const live = deployment.status === "RUNNING";
          return <tr key={deployment.id}>
            <td><input type="checkbox" aria-label={`Select ${deployment.model_name} v${deployment.model_version}`} checked={selected.includes(deployment.id)} onChange={() => setSelected(current =>
              current.includes(deployment.id) ? current.filter(id => id !== deployment.id) : [...current, deployment.id])} /></td>
            <td colSpan={2}><button className="deployment-table-name" onClick={() => { setDetailId(deployment.id); setValidationError(""); }}>
              <Box size={17} /><span><strong>{deployment.model_name}</strong>
                {description && <small className="deployment-description" title={description}>{description}</small>}
              </span>
            </button></td>
            <td><span className="health-pill">v{deployment.model_version}</span></td>
            <td>{environmentName ? <Status value={stageLabel(environmentName)} /> : "—"}</td>
            <td><span className="deployment-inline" title={endpoint}><Code2 size={13} />/predict</span></td>
            <td>{deployment.status === "RUNNING" && deployment.container_id ? 1 : deployment.status === "STOPPED" ? 0 : "—"}</td>
            <td>{trafficShare === null ? "—" : `${trafficShare}%`}</td>
            <td>{deployment.status === "STOPPED" ? "No live traffic" : ms(latestP95)}</td><td>{live && requests > 0 ? `${(errors / requests * 100).toFixed(2)}%` : "—"}</td>
            <td><Status value={statusOf(deployment, probes[deployment.id])} /></td><td>{age(updated(deployment))}</td>
            <td><button className="secondary-action" onClick={() => { setDetailId(deployment.id); setValidationError(""); }}>
              {live ? <>Open Deployment <ArrowUpRight size={12} /></> : <>View Details <ChevronRight size={13} /></>}
            </button></td>
          </tr>;
        })}
      </Table> : <p className="deployment-empty">{loading ? "Loading deployments…" : "No deployments match this selection."}</p>}
    </Panel>

    <div className="deployment-reports">
      <Panel id="deployment-traffic" title="Request Volume & Latency">
        <div className="deployment-legend"><span><i />{requestsLabel}</span><span><i />p50 Latency (ms)</span><span><i />p95 Latency (ms)</span></div>
        {byDay.size ? <div className="deployment-plot"><ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={daily} barCategoryGap="24%" margin={{ top: 5, left: 2, right: 2, bottom: 0 }}>
            <defs><linearGradient id="deployment-request-fill" x1="0" y1="0" x2="0" y2="100%">
              <stop offset="0%" stopColor="#d4f9d8" /><stop offset="100%" stopColor="#77df82" />
            </linearGradient></defs>
            <CartesianGrid stroke="#edf1f3" vertical={false} />
            <XAxis dataKey="date" height={18} minTickGap={8} interval="preserveStartEnd" axisLine={{ stroke: "#e3e9ed" }} tickLine={false} tick={{ fontSize: 9 }} />
            <YAxis yAxisId="requests" width={48} allowDecimals={false} axisLine={{ stroke: "#e3e9ed" }} tickLine={false}
              tickFormatter={value => displayThousands ? String(value / 1000) : String(value)} tick={{ fontSize: 10 }}
              label={{ value: requestsLabel, angle: -90, position: "insideLeft", offset: 5, fontSize: 10 }} />
            <YAxis yAxisId="latency" width={51} orientation="right" axisLine={{ stroke: "#e3e9ed" }} tickLine={false} tick={{ fontSize: 10 }}
              label={{ value: "Latency (ms)", angle: 90, position: "insideRight", offset: 5, fontSize: 10 }} />
            <Tooltip />
            <Bar yAxisId="requests" dataKey="requests" name="Requests" fill="url(#deployment-request-fill)" maxBarSize={13} isAnimationActive={false} />
            <Line yAxisId="latency" dataKey="p50" name="Mean reported p50 (ms)" stroke="#076d2a" strokeWidth={2}
              dot={{ r: 2.7, fill: "#fff", stroke: "#076d2a", strokeWidth: 1.7 }} isAnimationActive={false} />
            <Line yAxisId="latency" dataKey="p95" name="Mean reported p95 (ms)" stroke="#2fbd3f" strokeWidth={2}
              dot={{ r: 2.7, fill: "#fff", stroke: "#2fbd3f", strokeWidth: 1.7 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer></div> : <p className="deployment-empty">{metrics.some(query => query.isPending) ? "Loading telemetry…" :
          metrics.some(query => query.isError) ? "Telemetry unavailable." : "No recorded telemetry in this period."}</p>}
      </Panel>

      <Panel id="deployment-health" title="Endpoint Health">
        <div className="deployment-health-chart">
          <div className="deployment-donut" style={{ background: healthSlices.length ? `conic-gradient(${healthSlices.join(", ")})` : "#e7ebef" }}>
            <div><strong>{running.length}</strong><small>Endpoints</small></div>
          </div>
          <dl>{health.filter(item => item.label !== "Unknown" || item.count > 0).map(item => <div key={item.label}><dt><i style={{ background: item.color }} />{item.label} ({item.count})</dt><dd>{running.length ? `${(item.count / running.length * 100).toFixed(1)}%` : "—"}</dd></div>)}</dl>
        </div>
      </Panel>

      <Panel id="deployment-rollouts" title="Rollout Status">
        {running.length ? <ul className="deployment-rollouts">{running.slice(0, 4).map(deployment => (
          <li key={deployment.id}><strong title={deployment.model_name}>{deployment.model_name}</strong><RolloutBar deployment={deployment} /></li>
        ))}</ul> : <p className="deployment-empty">No active rollouts.</p>}
      </Panel>

      <Panel id="deployment-services" title="Service Response Time">
        {serviceRows.length ? <dl className="deployment-services">{serviceRows.map(service => <div key={service.name} title={service.measurement} className={service.highlight ? "deployment-service-highlight" : undefined}>
          <dt>{service.name}</dt><span className="deployment-service-bar" aria-hidden="true">
            {service.status === "online" && service.duration !== null && <i style={{ width: `${service.duration / maxServiceTime * 100}%` }} />}
          </span><dd>{service.status === "online" ? ms(service.duration) : "Offline"}</dd>
        </div>)}</dl> : <p className="deployment-empty">{services.isPending ? "Checking services…" : "Service timings unavailable."}</p>}
      </Panel>

      <Panel id="deployment-activity" title="Recent Deployment Activity" action={canViewAudit && <Link to="../audit">View Activity <ChevronRight size={14} /></Link>}>
        {activity.length ? <ul className="deployment-activity">{activity.map(event => {
          const Icon = event.status === "complete" ? Check : event.status === "error" ? CircleX : Circle;
          return <li key={event.id}>
            <span className={`deployment-event-marker deployment-event-${event.status}`}><Icon size={event.status === "complete" ? 12 : 17} aria-hidden="true" /></span>
            <span><strong>{event.title}</strong> — {event.description}</span><time dateTime={event.date}>{age(event.date)}</time>
          </li>;
        })}</ul> : <p className="deployment-empty">No activity recorded in this period.</p>}
      </Panel>
    </div>

    <Panel id="deployment-readiness" title="Rollback & Readiness" action={canRollback && running.length > 0 && <button type="button" onClick={() => onRollback(selectedRunning[0] ?? running[0])}>Rollback <ChevronRight size={14} /></button>}>
      <div className="deployment-readiness">
        {rows.length ? <Table headings={["Deployment", "Readiness", "Health Check", "Schema", "Signature", "Artifact"]}>
          {rows.map(deployment => {
            const result = readiness.get(deployment.id)!;
            return <tr key={deployment.id}>
              <td><button className="deployment-table-name" onClick={() => { setDetailId(deployment.id); setValidationError(""); }}><Box size={15} />{deployment.model_name}</button></td>
              <td><Status value={result.status} /></td>
              {result.values.map((value, index) => <td key={index} title={index === 0 ? "Current endpoint health" : "Default rollback target (previous version)"}>
                <CheckCell value={deployment.status === "RUNNING" ? value : undefined} />
              </td>)}
            </tr>;
          })}
        </Table> : <p className="deployment-empty">No deployment checks available.</p>}
        <div className="deployment-readiness-summary">
          <div className="deployment-checks">{checkCounts.map(({ title, count, Icon, available }) => <div key={title}>
            <Icon size={21} /><span>{title}<strong>{available ? `${count} / ${running.length}` : "—"}</strong></span>
          </div>)}</div>
          <div className="deployment-readiness-notes"><Info size={15} aria-hidden="true" />
            {readinessNotices.length ? <ul>{readinessNotices.map(({ deployment, text }) => <li key={deployment.id}><strong>{deployment.model_name}</strong> · {text}</li>)}</ul>
              : <p>{running.length ? "Open a deployment and select Check Readiness to verify the previous version." : "Readiness checks are available for running endpoints."}</p>}
          </div>
        </div>
      </div>
    </Panel>

    {detail && <div className="deployment-dialog-backdrop">
      <section className="overview-card deployment-dialog" role="dialog" aria-modal="true" aria-label="Deployment details"
        onKeyDown={event => { if (event.key === "Escape" && !checking) setDetailId(undefined); }}>
        <header><h2>{detail.model_name} <span className="health-pill">v{detail.model_version}</span></h2><button aria-label="Close" onClick={() => setDetailId(undefined)} disabled={checking} autoFocus><X size={20} /></button></header>
        <dl>
          <div><dt>Status</dt><dd><Status value={statusOf(detail, probes[detail.id])} /></dd></div>
          <div><dt>Prediction endpoint</dt><dd>{deploymentPredictionUrl(detail.id)}</dd></div>
          <div><dt>Authentication</dt><dd>Bearer token or X-API-Key header</dd></div>
          <div><dt>Port</dt><dd>{detail.port || "—"}</dd></div>
          <div><dt>Container</dt><dd>{detail.container_id || "—"}</dd></div>
          <div><dt>Health probe round-trip</dt><dd>{ms(probes[detail.id]?.latency)}</dd></div>
          <div><dt>Artifact</dt><dd>{artifacts[deploymentVersion(detail)]?.artifact_available ? "Available" : "—"}</dd></div>
          <div><dt>Signature</dt><dd>{artifacts[deploymentVersion(detail)] ? artifacts[deploymentVersion(detail)].signature ? "Present" : "Missing" : "—"}</dd></div>
        </dl>
        {(detail.error_message || validationError) && <p className="deployment-error" role="alert">{validationError || detail.error_message}</p>}
        <div className="deployment-actions">
          {detail.status === "RUNNING" && <button className="secondary-action" disabled={syncing || checking} onClick={async () => {
            setChecking(true);
            try { await probe(detail); } finally { setChecking(false); }
          }}><Activity size={14} />Test Endpoint</button>}
          <button className="secondary-action" disabled={checking} onClick={() => void checkArtifact(detail)}><ShieldCheck size={14} />
            {detail.status === "RUNNING" && detail.model_version > 1 ? "Check Readiness" : "Check Artifact"}
          </button>
          {canRollback && detail.status === "RUNNING" && <button className="secondary-action" disabled={checking} onClick={() => { setDetailId(undefined); onRollback(detail); }}><RotateCcw size={14} />Rollback</button>}
          {canStop && detail.status === "RUNNING" && <button className="secondary-action" disabled={loading || checking} onClick={() => void onStop(detail.id)}><StopCircle size={14} />Stop</button>}
        </div>
      </section>
    </div>}
  </>;
}
