import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity, ArrowRight, ArrowUpFromLine, ArrowUpRight, Box, CalendarDays,
  Check, ChevronRight, CircleCheck, CircleX, Clock, FolderGit2, Info, Layers, Minus, Monitor, Plus, RefreshCw,
  Rocket, Search, ShieldCheck, SquareCheck, Workflow, X,
} from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  api, fetchAuditLogs, fetchDeployments, fetchModels, fetchProjects, promoteModelVersion, syncModelMetrics,
} from "../api/client";
import type { RegisteredModel } from "../api/types";
import { useActionFeedback } from "../components/ActionFeedback";
import { useAuth } from "../context/AuthContext";
import "./ModelsPage.css";

const stages = [
  { value: "PRODUCTION", label: "Production", color: "#088332" },
  { value: "STAGING", label: "Staging", color: "#39c849" },
  { value: "CANDIDATE", label: "Candidate", color: "#97e6a4" },
  { value: "DEVELOPMENT", label: "Development", color: "#c7f2ce" },
  { value: "ARCHIVED", label: "Archived", color: "#a5adbc" },
];
const lifecycle = [
  [Box, "Register"], [SquareCheck, "Validate"], [Layers, "Version"],
  [ArrowUpFromLine, "Promote"], [Rocket, "Deploy"], [Activity, "Monitor"],
] as const;
const dayMs = 86_400_000;
const modelKey = (model: RegisteredModel) => `${model.name}:v${model.version}`;
const stageName = (value: string) => stages.find(stage => stage.value === value)?.label ?? (value || "—");
const metricLabels: Record<string, string> = {
  auc: "AUC", roc_auc: "AUC", f1: "F1", f1_score: "F1", accuracy: "Accuracy",
  rmse: "RMSE", mae: "MAE", precision: "Precision", recall: "Recall",
};
const metricValue = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 4 });
const boundedMetrics = new Set(["auc", "roc_auc", "f1", "f1_score", "accuracy", "precision", "recall"]);

function relativeTime(value?: string | null) {
  const elapsed = Date.now() - Date.parse(value ?? "");
  if (!Number.isFinite(elapsed)) return "—";
  if (elapsed >= dayMs) return `${Math.floor(elapsed / dayMs)} d ago`;
  if (elapsed >= 3_600_000) return `${Math.floor(elapsed / 3_600_000)} h ago`;
  if (elapsed >= 60_000) return `${Math.floor(elapsed / 60_000)} min ago`;
  return "Just now";
}

function errorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    const detail = (error.response as { data?: { detail?: unknown } } | undefined)?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

function primaryMetric(model: RegisteredModel) {
  const metrics = model.metrics ?? {};
  const key = Object.keys(metricLabels).find(name => Number.isFinite(metrics[name]))
    ?? Object.keys(metrics).find(name => Number.isFinite(metrics[name]));
  return key ? { key, label: metricLabels[key] ?? key, value: metrics[key] } : null;
}

function MiniTrend({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values);
  const points = values.map((value, index) =>
    `${index * 78 / (values.length - 1) + 1},${18 - 15 * value / max}`).join(" ");
  return <svg className="models-kpi-trend" viewBox="0 0 80 22" role="img" aria-label={label}>
    <title>{label}</title>
    <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function Panel({ title, children, action, id }: { title: string; children: ReactNode; action?: ReactNode; id?: string }) {
  return <section className="overview-card models-panel" id={id}>
    <h3>{title}<Info aria-hidden="true" />{action}</h3>
    {children}
  </section>;
}

function RegistryTable({ headings, children }: { headings: ReactNode[]; children: ReactNode }) {
  return <div className="models-table-scroll"><table className="overview-table models-table">
    <thead><tr>{headings.map((heading, index) => <th key={index} scope="col">{heading}</th>)}</tr></thead>
    <tbody>{children}</tbody>
  </table></div>;
}

function StagePill({ stage }: { stage: string }) {
  return <span className={`health-pill models-stage stage-${stage.toLowerCase()}`}>
    <i aria-hidden="true" />{stageName(stage)}
  </span>;
}

function Dialog({ title, onClose, children, creation = false }: { title: string; onClose: () => void; children: ReactNode; creation?: boolean }) {
  return <div className="models-dialog-backdrop" onKeyDown={event => { if (event.key === "Escape") onClose(); }}>
    <section className={`overview-card models-dialog${creation ? " creation-dialog" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="models-dialog-header"><h2>{title}</h2><button type="button" aria-label="Close" onClick={onClose}><X size={19} /></button></div>
      {children}
    </section>
  </div>;
}

type Validation = { artifact_available: boolean; signature: Record<string, unknown> | null };

function inputSchemaStatus(inputs: unknown) {
  if (inputs == null) return "—";
  let schema = inputs;
  if (typeof inputs === "string") {
    try {
      schema = JSON.parse(inputs);
    } catch {
      return "Invalid";
    }
  }
  return Array.isArray(schema) && schema.length > 0 && schema.every(
    column => column && typeof column === "object" && typeof column.type === "string",
  ) ? "Valid" : "Invalid";
}
type Lineage = {
  run_id: string | null;
  metrics: Record<string, number>;
  git_commit: string | null;
  dataset_sha256: string | null;
  matching_datasets: { name: string; version: number }[];
  model_artifact_present: boolean | null;
  dependency_files: string[];
};

export function ModelsPage() {
  const { user } = useAuth();
  const { showSuccess } = useActionFeedback();
  const [params, setParams] = useSearchParams();
  const project = params.get("project") ?? "";
  const search = params.get("search") ?? "";
  const canRegister = Boolean(user && user.role !== "VIEWER");
  const canPromote = user?.role === "USER" || user?.role === "MAINTAINER" || user?.role === "ADMIN";
  const canViewAudit = Boolean(user);
  const [stageFilter, setStageFilter] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState("");
  const [days, setDays] = useState(30);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<RegisteredModel | null>(null);
  const [registering, setRegistering] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [validations, setValidations] = useState<Record<string, Validation & { checkedAt: string }>>({});
  const [metricSyncs, setMetricSyncs] = useState<Record<string, { date: string; detail: string }>>({});
  const [lineage, setLineage] = useState<Lineage>();
  const [targetStage, setTargetStage] = useState("");

  const registry = useQuery({ queryKey: ["model-registry", project], queryFn: () => fetchModels(project || undefined) });
  const projects = useQuery({ queryKey: ["model-registry-projects"], queryFn: fetchProjects });
  const deployments = useQuery({ queryKey: ["model-registry-deployments"], queryFn: fetchDeployments });
  const audit = useQuery({ queryKey: ["model-registry-audit", user?.id], queryFn: () => fetchAuditLogs(100), enabled: canViewAudit });
  const models = registry.data ?? [];
  const grouped = new Map<string, RegisteredModel[]>();
  for (const model of models) {
    const versions = grouped.get(model.name) ?? [];
    versions.push(model);
    grouped.set(model.name, versions);
  }
  for (const versions of grouped.values()) versions.sort((a, b) => b.version - a.version);
  const latest = [...grouped.values()].map(versions => versions[0]).sort((a, b) => a.name.localeCompare(b.name));
  const frameworks = [...new Set(latest.map(model => model.framework).filter(Boolean))].sort();
  const needle = search.trim().toLowerCase();
  const visible = latest.flatMap(model => {
    const versions = grouped.get(model.name)!;
    const match = versions.find(version =>
      (!stageFilter || version.stage === stageFilter) &&
      (!frameworkFilter || (frameworkFilter === "unknown" ? !version.framework : version.framework === frameworkFilter)));
    const searchable = [model.name, model.description, ...versions.flatMap(version => [version.framework, version.mlflow_run_id])];
    return match && (!needle || searchable.some(value => value?.toLowerCase().includes(needle))) ? [match] : [];
  });
  const visibleNames = new Set(visible.map(model => model.name));
  const visibleVersions = models.filter(model => visibleNames.has(model.name));
  const rows = showAll ? visible : visible.slice(0, 4);
  const active = deployments.data?.filter(deployment => deployment.status === "RUNNING" && visibleNames.has(deployment.model_name));
  const validated = visible.filter(model => validations[modelKey(model)]?.signature);
  const hasValidation = visible.some(model => validations[modelKey(model)]);
  const stageCounts = stages.map(stage => ({ ...stage, count: visible.filter(model => model.stage === stage.value).length }));
  let stageEnd = 0;
  const stageSlices = stageCounts.filter(stage => stage.count).map(stage => {
    const start = stageEnd;
    stageEnd += stage.count / visible.length * 100;
    return `${stage.color} ${start}% ${stageEnd}%`;
  });
  const timeline = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - days + index + 1);
    return { key: date.toDateString(), date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), versions: 0, promotions: 0 };
  });
  const activityByDay = new Map(timeline.map(day => [day.key, day]));
  const trendByDay = (dates: string[]) => {
    const counts = new Map<string, number>();
    for (const date of dates) {
      const key = new Date(date).toDateString();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return timeline.map(day => counts.get(day.key) ?? 0);
  };
  const promotions = (canViewAudit ? audit.data ?? [] : []).filter(event =>
    event.action === "MODEL_PROMOTE" && event.resource_name &&
    visibleVersions.some(model => modelKey(model) === event.resource_name));
  for (const model of visibleVersions) {
    const day = activityByDay.get(new Date(model.created_at).toDateString());
    if (day) day.versions++;
  }
  for (const event of promotions) {
    const day = activityByDay.get(new Date(event.timestamp).toDateString());
    if (day) day.promotions++;
  }
  const hasPromotionHistory = canViewAudit && audit.isSuccess;
  const activityPeak = Math.max(...timeline.map(day => Math.max(day.versions, day.promotions)));
  const activityTickStep = Math.max(2, Math.ceil(activityPeak / 10) * 2);
  const activityTicks = Array.from({ length: 6 }, (_, index) => index * activityTickStep);
  const activity = [
    ...visibleVersions.map(model => ({
      id: modelKey(model), date: model.created_at, label: model.version === 1 ? "Model registered" : "Version created",
      name: model.name, detail: model.version === 1 ? `v${model.version} registered` : `v${model.version}`, stage: "", icon: Box,
    })),
    ...promotions.map(event => {
      const stage = String(event.changes_json?.target_stage ?? "");
      const promoted = stage === "PRODUCTION";
      const previous = event.changes_json?.previous_stage;
      return {
        id: event.id, date: event.timestamp, label: promoted ? "Version promoted" : "Stage changed",
        name: event.resource_name!.replace(/:v\d+$/, ""),
        detail: !promoted && typeof previous === "string" ? stageName(previous) : event.resource_name!.split(":").pop(),
        stage, icon: promoted ? Box : Layers,
      };
    }),
    ...visibleVersions.flatMap(model => {
      const key = modelKey(model);
      const sync = metricSyncs[key];
      const validation = validations[key];
      return [
        ...(sync ? [{ ...sync, id: `metrics:${key}`, label: "Metrics synced", name: model.name, stage: "", icon: RefreshCw }] : []),
        ...(validation?.signature ? [{
          id: `signature:${key}`, date: validation.checkedAt, label: "Signature verified", name: model.name,
          detail: `v${model.version} signature validated`, stage: "", icon: ShieldCheck,
        }] : []),
      ];
    }),
  ].filter(event => activityByDay.has(new Date(event.date).toDateString()))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5);
  const performance = visible.flatMap(model => {
    const metric = primaryMetric(model);
    return metric ? [{ name: model.name, ...metric }] : [];
  }).slice(0, 4);
  const allChecked = rows.length > 0 && rows.every(model => selected.includes(model.name));

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setShowAll(false);
  }

  function openModel(model: RegisteredModel) {
    setDetail(model);
    setTargetStage("");
    setLineage(undefined);
    setFormError(undefined);
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get("name") ?? "").trim();
    if (!name || busy) return;
    setBusy(true);
    setFormError(undefined);
    try {
      await api.post("/models/register", {
        name,
        run_id: String(fields.get("run") ?? "").trim() || undefined,
        description: String(fields.get("description") ?? "").trim() || undefined,
        artifact_path: String(fields.get("artifact") ?? "").trim() || undefined,
        project_slug: String(fields.get("project") ?? "") || undefined,
      });
      setRegistering(false);
      showSuccess(`Registered ${name}.`);
      await registry.refetch();
    } catch (error) {
      setFormError(errorMessage(error, "Could not register the model."));
    } finally {
      setBusy(false);
    }
  }

  async function syncMetrics() {
    setSyncing(true);
    const candidates = visibleVersions.filter(model => model.mlflow_run_id);
    try {
      const results = await Promise.allSettled(candidates.map(async model => {
        const metrics = await syncModelMetrics(model.name, model.version);
        const detail = Object.entries(metrics ?? {})
          .filter(([, value]) => Number.isFinite(value)).slice(0, 2)
          .map(([name, value]) => `${metricLabels[name] ?? name}: ${metricValue(value)}`).join(", ");
        return [modelKey(model), { date: new Date().toISOString(), detail: detail || `v${model.version}` }] as const;
      }));
      const synced = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
      setMetricSyncs(current => ({ ...current, ...Object.fromEntries(synced) }));
      await Promise.all([registry.refetch(), deployments.refetch()]);
      setMessage(results.length
        ? `Synced metrics for ${synced.length} of ${results.length} versions.`
        : "No model versions with an MLflow run in this selection.");
    } finally {
      setSyncing(false);
    }
  }

  async function inspect(model: RegisteredModel, operation: "validation" | "lineage") {
    setBusy(true);
    setFormError(undefined);
    try {
      const url = `/models/${encodeURIComponent(model.name)}/versions/${model.version}/${operation}`;
      if (operation === "validation") {
        const { data } = await api.get<Validation>(url);
        setValidations(current => ({ ...current, [modelKey(model)]: { ...data, checkedAt: new Date().toISOString() } }));
      } else {
        const { data } = await api.get<Lineage>(url);
        setLineage(data);
      }
    } catch (error) {
      setFormError(errorMessage(error, `Could not load model ${operation}.`));
    } finally {
      setBusy(false);
    }
  }

  async function promote(model: RegisteredModel) {
    if (!targetStage || busy) return;
    setBusy(true);
    setFormError(undefined);
    try {
      await promoteModelVersion(model.name, model.version, targetStage);
      showSuccess(`Model stage updated to ${stageName(targetStage)}.`);
      setDetail(null);
      await Promise.all([registry.refetch(), ...(canViewAudit ? [audit.refetch()] : [])]);
    } catch (error) {
      setFormError(errorMessage(error, error instanceof Error ? error.message : "Could not change the stage."));
    } finally {
      setBusy(false);
    }
  }

  const empty = <p className="models-empty">{registry.isPending ? "Loading models…" : "No models match this selection."}</p>;
  const summary = [
    ["Registered Models", visible.length, Box, "model-registry", trendByDay(visibleVersions.filter(model => model.version === 1).map(model => model.created_at)), "Model registrations per day"],
    ["Model Versions", visibleVersions.length, Layers, "model-versions", timeline.map(day => day.versions), "Versions created per day"],
    ["Production Models", stageCounts[0].count, Rocket, "model-stages", audit.isSuccess ? trendByDay(promotions.filter(event => event.changes_json?.target_stage === "PRODUCTION").map(event => event.timestamp)) : null, "Production promotions per day"],
    ["Staging Models", stageCounts[1].count, Layers, "model-stages", audit.isSuccess ? trendByDay(promotions.filter(event => event.changes_json?.target_stage === "STAGING").map(event => event.timestamp)) : null, "Staging promotions per day"],
    ["Signature Verified", hasValidation ? `${validated.length} / ${visible.length}` : "—", ShieldCheck, "model-validation", hasValidation ? trendByDay(validated.map(model => validations[modelKey(model)].checkedAt)) : null, "Signatures checked in this session per day"],
    ["Active Deployments", active?.length ?? "—", Monitor, "model-deployments", active ? trendByDay(active.map(deployment => deployment.created_at)) : null, "Creation dates of deployments that are active now"],
  ] as const;

  return <div className="models-dashboard">
    <div className="overview-hero models-hero">
      <div><h1>Models</h1><p>Manage registered models, versions, stages, signatures, metrics, and promotion workflows across your ML pipelines.</p></div>
      <div className="models-lifecycle" aria-hidden="true">{lifecycle.map(([Icon, label], index) => (
        <div key={label} className={`models-lifecycle-${label.toLowerCase()}`}>
          {label === "Register"
            ? <span className="models-lifecycle-icon iso-cube"><i /><b /><em /></span>
            : <span className="models-lifecycle-icon"><Icon size={30} strokeWidth={1.8} /></span>}
          <strong>{label}</strong>
          {index < lifecycle.length - 1 && <ArrowRight className="models-lifecycle-arrow" size={16} />}
        </div>
      ))}</div>
    </div>

    <div className="models-toolbar">
      <label><Search size={15} /><input aria-label="Search models" placeholder="Search models…" value={search} onChange={event => setFilter("search", event.target.value)} /></label>
      <label><FolderGit2 size={15} /><select aria-label="Project" value={project} onChange={event => setFilter("project", event.target.value)}>
        <option value="">All Projects</option>
        {project && !projects.data?.some(item => item.slug === project || item.id === project) && <option value={project}>{project}</option>}
        {projects.data?.map(item => <option key={item.id} value={item.id === project ? item.id : item.slug}>{item.name}</option>)}
      </select></label>
      <label><Layers size={15} /><select aria-label="Stage" value={stageFilter} onChange={event => setStageFilter(event.target.value)}>
        <option value="">All Stages</option>{stages.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
      </select></label>
      <label><Workflow size={15} /><select aria-label="Framework" value={frameworkFilter} onChange={event => setFrameworkFilter(event.target.value)}>
        <option value="">All Frameworks</option>{frameworks.map(framework => <option key={framework} value={framework}>{framework}</option>)}
        <option value="unknown">Unknown framework</option>
      </select></label>
      <label><CalendarDays size={15} /><select aria-label="Activity date range" value={days} onChange={event => setDays(Number(event.target.value))}>
        {[7, 30, 90].map(count => <option key={count} value={count}>Last {count} days</option>)}
      </select></label>
      <div className="models-toolbar-actions">
        <button className="secondary-action" type="button" disabled={registry.isFetching || syncing}
          onClick={() => canRegister ? void syncMetrics() : void Promise.all([registry.refetch(), deployments.refetch()])}>
          <RefreshCw size={14} />{syncing ? "Syncing…" : canRegister ? "Sync Metrics" : "Refresh Registry"}
        </button>
        {canRegister && <button className="primary-action" type="button" onClick={() => { setFormError(undefined); setRegistering(true); }}><Plus size={16} />Register Model</button>}
      </div>
    </div>
    <div className="overview-kpis models-kpis">
      {summary.map(([label, value, Icon, anchor, trend, trendLabel]) => <a className="overview-card kpi" href={`#${anchor}`} key={label}>
        <span><Icon size={18} /><strong>{label}</strong></span><b>{registry.isPending ? "—" : value}<ChevronRight size={16} /></b>
        {registry.isSuccess && trend && <MiniTrend values={trend} label={trendLabel} />}
      </a>)}
    </div>
    {registry.isError && <p role="alert" className="models-error">Could not load the model registry.</p>}
    {message && <p role="status">{message}</p>}

    <Panel id="model-registry" title={`Model Registry (${visible.length})`} action={visible.length > 4 && <button className="models-panel-action" onClick={() => setShowAll(current => !current)}>{showAll ? "Show Fewer" : "View All Models"} <ChevronRight size={14} /></button>}>
      {rows.length ? <RegistryTable headings={[
        <input type="checkbox" aria-label="Select visible models" checked={allChecked} onChange={() => setSelected(current => allChecked ? current.filter(name => !rows.some(row => row.name === name)) : [...new Set([...current, ...rows.map(row => row.name)])])} />,
        "Model", stageFilter || frameworkFilter ? "Latest Matching Version" : "Latest Version", "Stage", "Framework", "Primary Metric", "Owner", "Last Updated", "Action",
      ]}>
        {rows.map(model => {
          const metric = primaryMetric(model);
          return <tr key={model.name}>
            <td><input type="checkbox" aria-label={`Select ${model.name}`} checked={selected.includes(model.name)} onChange={() => setSelected(current => current.includes(model.name) ? current.filter(name => name !== model.name) : [...current, model.name])} /></td>
            <td><button type="button" className="models-name" onClick={() => openModel(model)}><Box size={17} /><span><strong>{model.name}</strong>{model.description && <small>{model.description}</small>}</span></button></td>
            <td><span className="health-pill">v{model.version}</span></td><td><StagePill stage={model.stage} /></td>
            <td>{model.framework ? <span className="models-framework" data-framework={model.framework.toLowerCase()}>{model.framework}</span> : "—"}</td>
            <td>{metric ? <span className="health-pill">{metric.label}: {metricValue(metric.value)}</span> : "—"}</td>
            <td>{model.owner ? <span className="models-inline models-owner"><i aria-hidden="true">{model.owner.trim().slice(0, 1).toUpperCase()}</i>{model.owner}</span> : "—"}</td>
            <td>{model.updated_at ? <span className="models-inline models-updated"><Clock size={12} />{relativeTime(model.updated_at)}</span> : "—"}</td>
            <td><button type="button" className="secondary-action" onClick={() => openModel(model)}>View Model <ArrowUpRight size={12} /></button></td>
          </tr>;
        })}
      </RegistryTable> : empty}
    </Panel>

    <div className="models-panel-grid">
      <Panel id="model-versions" title={`Version Activity (${days} days)`}>
        <div className="models-chart-key">
          <span><i />Versions Created</span>
          <span className={hasPromotionHistory ? undefined : "models-chart-key-unavailable"}
            title={hasPromotionHistory ? undefined : "Promotion history unavailable"}><i />Stage Promotions</span>
        </div>
        <div className="models-version-chart"><ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={timeline} barCategoryGap="23%" margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
            <defs><linearGradient id="models-version-fill" x1="0" y1="0" x2="0" y2="100%">
              <stop offset="0%" stopColor="#d4f9d7" /><stop offset="100%" stopColor="#74e180" />
            </linearGradient></defs>
            <CartesianGrid vertical={false} stroke="#edf0f3" />
            <XAxis dataKey="date" minTickGap={9} interval="preserveStartEnd" height={18} tickLine={false} axisLine={{ stroke: "#edf0f3" }} tick={{ fontSize: 9, fill: "#24314a" }} />
            <YAxis allowDecimals={false} width={30} domain={[0, activityTickStep * 5]} ticks={activityTicks}
              axisLine={{ stroke: "#edf0f3" }} tickLine={false} tickMargin={9} tick={{ fontSize: 10, fill: "#24314a" }} />
            <Tooltip />
            <Bar dataKey="versions" name="Versions Created" fill="url(#models-version-fill)" maxBarSize={13} isAnimationActive={false} />
            {hasPromotionHistory && <Line dataKey="promotions" name="Stage Promotions" stroke="#087b30" strokeWidth={2}
              dot={{ r: 2.6, fill: "#fff", stroke: "#087b30", strokeWidth: 1.6 }} isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer></div>
      </Panel>
      <Panel id="model-performance" title="Performance Comparison">
        {performance.length ? <RegistryTable headings={["Model", <span className="sr-only">Value</span>, <span className="sr-only">Relative value</span>, <span className="sr-only">Displayed value</span>]}>
          {performance.map(metric => {
            const peers = visible.map(model => model.metrics?.[metric.key]).filter((value): value is number => value != null && Number.isFinite(value));
            const bounded = boundedMetrics.has(metric.key) && peers.every(value => value >= 0 && value <= 1);
            const maximum = bounded ? 1 : Math.max(0, ...peers);
            const fill = (bounded || peers.length > 1) && maximum > 0 && metric.value >= 0 ? metric.value / maximum * 100 : null;
            const value = metricValue(metric.value);
            return <tr key={metric.name}><td><strong>{metric.name}</strong> <small>({metric.label})</small></td><td>{value}</td>
              <td>{fill === null ? "—" : <div className="models-metric-bar" title={bounded ? "Value on a 0–1 scale" : `Relative to the highest recorded ${metric.label}`}><i style={{ width: `${fill}%` }} /></div>}</td>
              <td aria-hidden="true">{fill !== null && value}</td>
            </tr>;
          })}
        </RegistryTable> : <p className="models-empty">No recorded performance metrics.</p>}
      </Panel>
      <Panel id="model-stages" title="Registry by Stage">
        <div className="models-stage-chart">
          <div className="models-donut" style={{ background: stageSlices.length ? `conic-gradient(${stageSlices.join(", ")})` : "#e7ebef" }}>
            <div><strong>{visible.length}</strong><small>Models</small></div>
          </div>
          <dl>{stageCounts.map(stage => <div key={stage.value}><dt><i style={{ background: stage.color }} />{stage.label} ({stage.count})</dt><dd>{visible.length ? `${(stage.count / visible.length * 100).toFixed(1)}%` : "—"}</dd></div>)}</dl>
        </div>
      </Panel>
      <Panel id="model-validation" title="Validation & Signature Health">
        {rows.length ? <RegistryTable headings={["Model", "Schema Status", "Signature Validation", "Artifact Available", "Model Card"]}>
          {rows.map(model => {
            const validation = validations[modelKey(model)];
            const schemaStatus = inputSchemaStatus(validation?.signature?.inputs);
            return <tr key={model.name}>
              <td><button className="models-text-action" title="Open model validation" onClick={() => openModel(model)}>{model.name}</button></td>
              <td>{schemaStatus === "Valid"
                ? <span className="models-validation-ok" title="Input schema structure checked"><Check size={14} aria-hidden="true" />Valid</span>
                : schemaStatus}</td>
              <td>{validation?.signature
                ? <span className="models-validation-ok" title="Signature found in the model artifact"><Check size={14} aria-hidden="true" />Verified</span>
                : validation ? "Missing" : "—"}</td>
              <td>{validation?.artifact_available
                ? <span className="models-validation-ok"><Check size={14} aria-hidden="true" />Available</span>
                : validation ? "Unavailable" : "—"}</td>
              <td title="Model card status unavailable">—</td>
            </tr>;
          })}
        </RegistryTable> : empty}
      </Panel>
      <Panel id="model-activity" title="Recent Model Activity" action={<Link to="/app/settings?tab=activity">View Activity &amp; Logs <ChevronRight size={14} /></Link>}>
        {activity.length ? <RegistryTable headings={["Time", "Activity", "Model", "Details"]}>
          {activity.map(({ icon: Icon, ...event }) => <tr key={event.id}><td title={new Date(event.date).toLocaleString()}>{relativeTime(event.date)}</td><td><span className="models-inline"><Icon size={14} aria-hidden="true" />{event.label}</span></td>
            <td><strong>{event.name}</strong></td><td>{event.detail} {event.stage && <>→ <StagePill stage={event.stage} /></>}</td>
          </tr>)}
        </RegistryTable> : <p className="models-empty">No recorded activity in this period.</p>}
      </Panel>
      <Panel id="model-promotion" title="Promotion Readiness">
        {rows.length ? <RegistryTable headings={["Model", "Current Stage", "Checks", "Ready to Promote"]}>
          {rows.map(model => {
            const result = validations[modelKey(model)];
            const passed = result ? Number(result.artifact_available) + Number(Boolean(result.signature)) : null;
            return <tr key={model.name}>
              <td><button className="models-text-action" onClick={() => openModel(model)}>{model.name}</button></td><td><StagePill stage={model.stage} /></td>
              <td>{passed === null ? "—" : <span className="models-promotion-checks" title="Artifact availability and signature presence">
                {passed === 2 ? <Check size={14} aria-hidden="true" /> : <CircleX size={13} aria-hidden="true" />}
                {passed} / 2
              </span>}</td>
              <td>{model.stage === "PRODUCTION" ? "—"
                : model.stage === "ARCHIVED" ? <span className="health-pill models-promotion-neutral"><Minus size={12} aria-hidden="true" />Not Applicable</span>
                : passed === 2 ? <span className="health-pill"><CircleCheck size={12} aria-hidden="true" />Ready</span>
                : passed !== null ? <span className="health-pill models-promotion-neutral"><CircleX size={12} aria-hidden="true" />Not Ready</span>
                : "Not checked"}</td>
            </tr>;
          })}
        </RegistryTable> : empty}
      </Panel>
      <Panel id="model-deployments" title="Deployment Readiness">
        <div className="models-deployment">
          <span aria-hidden="true"><Layers size={24} strokeWidth={2.2} /></span>
          <strong>{deployments.isError ? "Deployment status unavailable" : deployments.isPending ? "Loading deployments…" : active?.length ? `${active.length} active deployment${active.length === 1 ? "" : "s"}` : "No active deployments"}</strong>
          {deployments.isSuccess && !active?.length && <p>
            There are no active deployments for the selected models.
            {canPromote && <><br />Select a model and version in the registry to deploy it.</>}
          </p>}
          <a className="secondary-action" href="#model-registry"><Rocket size={15} />{canPromote ? "Deploy from Registry" : "View Registry"}</a>
        </div>
      </Panel>
    </div>

    {registering && <Dialog creation title="Register Model" onClose={() => { if (!busy) setRegistering(false); }}>
      <form className="models-form" onSubmit={submitRegistration}>
        <label>Model name<input name="name" required maxLength={200} autoFocus /></label>
        <label>Project<select name="project" defaultValue={project}>
          <option value="">No project</option>
          {project && !projects.data?.some(item => item.slug === project || item.id === project) && <option value={project}>{project}</option>}
          {projects.data?.map(item => <option key={item.id} value={item.id === project ? item.id : item.slug}>{item.name}</option>)}
        </select></label>
        <label>MLflow run ID<input name="run" /></label><label>Artifact path<input name="artifact" /></label>
        <label>Description<textarea name="description" rows={2} /></label>
        {formError && <p className="models-error" role="alert">{formError}</p>}
        <button type="submit" className="primary-action" disabled={busy}>{busy ? "Registering…" : "Register Model"}</button>
      </form>
    </Dialog>}

    {detail && <Dialog title={detail.name} onClose={() => { if (!busy) setDetail(null); }}>
      <div className="models-form">
        <label>Version<select autoFocus disabled={busy} value={detail.version} onChange={event => {
          const version = grouped.get(detail.name)?.find(model => model.version === Number(event.target.value));
          if (version) openModel(version);
        }}>{grouped.get(detail.name)?.map(model => <option key={model.version} value={model.version}>v{model.version} · {stageName(model.stage)}</option>)}</select></label>
        <dl className="models-detail-list">
          <div><dt>Framework</dt><dd>{detail.framework ?? "—"}</dd></div>
          <div><dt>Registered</dt><dd>{relativeTime(detail.created_at)}</dd></div>
          <div><dt>MLflow run</dt><dd>{detail.mlflow_run_id ?? "—"}</dd></div>
          <div><dt>Metrics</dt><dd>{Object.entries(detail.metrics ?? {}).map(([name, value]) => `${name}: ${metricValue(value)}`).join(", ") || "—"}</dd></div>
        </dl>
        <div className="models-toolbar-actions">
          <button className="secondary-action" disabled={busy} onClick={() => void inspect(detail, "validation")}>Validate</button>
          <button className="secondary-action" disabled={busy} onClick={() => void inspect(detail, "lineage")}>View Lineage</button>
          {canPromote && <Link className="secondary-action" to={`../deployments?${new URLSearchParams({ model: detail.name, version: String(detail.version) })}`}>Deploy <ArrowUpRight size={12} /></Link>}
        </div>
        {validations[modelKey(detail)] && <p role="status">Artifact available. Input signature {validations[modelKey(detail)].signature ? "present" : "missing"}.</p>}
        {lineage && <dl className="models-detail-list">
          <div><dt>Git commit</dt><dd>{lineage.git_commit ?? "—"}</dd></div>
          <div><dt>Dataset SHA-256</dt><dd>{lineage.dataset_sha256 ?? "—"}</dd></div>
          <div><dt>Matching dataset versions</dt><dd>{lineage.matching_datasets.map(dataset => `${dataset.name} v${dataset.version}`).join(", ") || "None found"}</dd></div>
          <div><dt>Model artifact</dt><dd>{lineage.model_artifact_present == null ? "—" : lineage.model_artifact_present ? "Found" : "Missing"}</dd></div>
          <div><dt>Dependency manifests</dt><dd>{lineage.dependency_files.join(", ") || "—"}</dd></div>
        </dl>}
        {canPromote && <form className="models-form" onSubmit={event => { event.preventDefault(); void promote(detail); }}>
          <label>Target stage<select required value={targetStage} onChange={event => setTargetStage(event.target.value)}>
            <option value="">Select a stage</option>{stages.filter(stage => stage.value !== detail.stage).map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
          </select></label>
          {targetStage === "PRODUCTION" && <p>Promoting to Production archives the current Production version of this model.</p>}
          <button className="primary-action" disabled={!targetStage || busy}>Confirm Stage Transition</button>
        </form>}
        {formError && <p className="models-error" role="alert">{formError}</p>}
      </div>
    </Dialog>}
  </div>;
}
