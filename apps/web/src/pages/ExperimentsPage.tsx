import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity, ArrowDown, ArrowDownUp, ArrowRight, ArrowUp, ArrowUpRight, BarChart3, Box, Building2, Calendar, Check, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronsLeft, Clock, Copy, Database, Download, EllipsisVertical, ExternalLink, Eye, File, FlaskConical,
  Folder, Info, Layers, Play, Plus, RefreshCw, Rocket, Search, Settings, Tag, Trophy, X,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, createExperiment, deleteExperiment, downloadExperimentArtifact, fetchExperimentArtifacts, fetchExperimentRuns, fetchExperiments, fetchProjects, fetchRunMetricHistory } from "../api/client";
import type { Experiment, ExperimentRun } from "../api/types";
import { useActionFeedback } from "../components/ActionFeedback";
import "./ExperimentsPage.css";

const metrics = [
  { key: "accuracy", label: "Accuracy", aliases: ["accuracy", "test_accuracy", "val_accuracy"] },
  { key: "f1", label: "F1 Score", aliases: ["f1", "f1_score", "test_f1", "test_f1_score"] },
  { key: "precision", label: "Precision", aliases: ["precision", "test_precision"] },
  { key: "recall", label: "Recall", aliases: ["recall", "test_recall"] },
] as const;
type Metric = (typeof metrics)[number];
type MetricKey = Metric["key"];
const views = [[Play, "Runs"], [Activity, "Metrics"], [Settings, "Parameters"], [Folder, "Artifacts"], [Layers, "Models (Registry)"]] as const;
type View = (typeof views)[number][1];
const timeRanges = { "All time": null, "Last 30 days": 30, "Last 6 months": 183, "Last 1 year": 365 } as const;
type TimeRange = keyof typeof timeRanges;
const lifecycle = [[Database, "Data"], [Settings, "Train"], [BarChart3, "Evaluate"], [Layers, "Register"], [Rocket, "Deploy"]] as const;
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const runTableDate = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});
const axisTick = { fill: "#35425a", fontSize: 11 };
const comparisonColors = ["#20d500", "#145923", "#c5cbd1"];
type CountSnapshot = { observedAt: number; experiments: number; runs: number | null };

function KpiTrend({ values, showLine = true, lowerIsBetter = false }: { values: readonly number[]; showLine?: boolean; lowerIsBetter?: boolean }) {
  const readings = values.slice(-8);
  if (readings.length < 2) return null;
  const first = readings[0];
  const last = readings[readings.length - 1];
  const delta = first === 0 ? null : (last - first) / Math.abs(first) * 100;
  const min = Math.min(...readings);
  const spread = Math.max(...readings) - min;
  const points = readings.map((value, index) => `${2 + index * 76 / (readings.length - 1)},${spread ? 22 - 20 * (value - min) / spread : 12}`).join(" ");
  const Direction = last < first ? ArrowDown : ArrowUp;
  return <>
    {delta !== null && Math.abs(delta) >= .05 && <small className="experiments-kpi-change"
      data-improved={lowerIsBetter ? delta < 0 : delta > 0} title="Change since the oldest point in this trend">
      <Direction size={13} aria-hidden="true" />{delta > 0 ? "+" : ""}{Number(delta.toFixed(1))}%
    </small>}
    {showLine && <svg className="experiments-sparkline" viewBox="0 0 80 24" role="img" aria-label="Recent trend">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={78} cy={spread ? 22 - 20 * (last - min) / spread : 12} r={1.8} fill="currentColor" />
    </svg>}
  </>;
}

function projectTag(experiment: Experiment) {
  return experiment.tags?.["mlite.project"] ?? experiment.tags?.project_slug ?? experiment.tags?.project;
}

function metricValue(run: ExperimentRun, metric: Metric) {
  for (const key of metric.aliases) {
    const value = run.metrics?.[key];
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function runDuration(run: ExperimentRun) {
  return run.start_time != null && run.end_time != null && run.end_time >= run.start_time
    ? run.end_time - run.start_time : null;
}

function formatDuration(duration: number | null) {
  if (duration === null) return "—";
  const seconds = Math.round(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes} min ${String(seconds % 60).padStart(2, "0")} s` : `${seconds} s`;
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const detail = (error.response as { data?: { detail?: unknown } } | undefined)?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

function Panel({ title, action, children, className = "" }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`overview-card experiments-panel ${className}`}>
    <h2>{title}<Info size={14} aria-hidden="true" />{action}</h2>{children}
  </section>;
}

function RunStatus({ status }: { status: string }) {
  return <span className="experiments-status" data-status={status}>
    {status === "FINISHED" && <CheckCircle2 size={13} aria-hidden="true" />}
    {status === "FINISHED" ? "Completed" : status.replace(/_/g, " ").toLowerCase()}
  </span>;
}

function Values({ entries }: { entries: [string, string | number][] }) {
  return entries.length ? <dl className="experiments-values">{entries.map(([key, value]) =>
    <div key={key}><dt>{key}</dt><dd>{value}</dd></div>
  )}</dl> : <p className="experiments-empty">No values recorded.</p>;
}

function ExperimentForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [name, setName] = useState("");
  const [tagKey, setTagKey] = useState("");
  const [tagValue, setTagValue] = useState("");
  const create = useMutation({
    mutationFn: () => createExperiment({
      name: name.trim(),
      tags: tagKey.trim() && tagValue.trim() ? { [tagKey.trim()]: tagValue.trim() } : {},
    }),
    onSuccess: experiment => onCreated(String(experiment.experiment_id)),
  });

  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, []);

  return <dialog ref={dialog} className="overview-card experiments-dialog creation-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!create.isPending) onClose(); }}>
    <form onSubmit={event => { event.preventDefault(); if (name.trim() && !create.isPending) create.mutate(); }}>
      <header><h2 id={titleId}>New Experiment</h2><button type="button" aria-label="Close" disabled={create.isPending} onClick={onClose}><X size={18} /></button></header>
      <label>Experiment Name<input value={name} onChange={event => setName(event.target.value)} required autoFocus /></label>
      <div className="experiments-dialog-tags">
        <label>Tag key<input value={tagKey} onChange={event => setTagKey(event.target.value)} required={Boolean(tagValue.trim())} /></label>
        <label>Tag value<input value={tagValue} onChange={event => setTagValue(event.target.value)} required={Boolean(tagKey.trim())} /></label>
      </div>
      {create.isError && <p role="alert">{errorMessage(create.error, "Could not create this experiment.")}</p>}
      <footer><button type="button" className="secondary-action" disabled={create.isPending} onClick={onClose}>Cancel</button>
        <button type="submit" className="primary-action" disabled={create.isPending || !name.trim()}>{create.isPending ? "Creating…" : "Create Experiment"}</button></footer>
    </form>
  </dialog>;
}

function RegisterModel({ run }: { run: ExperimentRun }) {
  const queryClient = useQueryClient();
  const [modelName, setModelName] = useState("");
  const register = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ version: number }>("/models/register", { name: modelName.trim(), run_id: run.run_id });
      return data;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["models"] }); },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (modelName.trim() && !register.isPending) register.mutate();
  }
  return <form className="experiments-register" onSubmit={submit}>
    <label>Model name<input value={modelName} maxLength={200} disabled={register.isPending} onChange={event => {
      setModelName(event.target.value);
      register.reset();
    }} required /></label>
    <button type="submit" className="primary-action" disabled={!modelName.trim() || register.isPending || register.isSuccess}>
      {register.isPending ? "Registering…" : "Register Model"}
    </button>
    {register.isSuccess && <p role="status">Registered v{register.data.version}.</p>}
    {register.isError && <p role="alert">{errorMessage(register.error, "Could not register this run.")}</p>}
  </form>;
}

export function ExperimentsPage() {
  const { confirmAction, showSuccess } = useActionFeedback();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("");
  const [tag, setTag] = useState("");
  const [experimentFilter, setExperimentFilter] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("Last 30 days");
  const [countHistory, setCountHistory] = useState<CountSnapshot[]>([]);
  const [activeExperimentId, setActiveExperimentId] = useState("");
  const [activeRunId, setActiveRunId] = useState("");
  const [metricKey, setMetricKey] = useState<MetricKey>("accuracy");
  const [chartLimit, setChartLimit] = useState(20);
  const [view, setView] = useState<View>("Runs");
  const [expanded, setExpanded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: MetricKey; ascending: boolean }>();
  const [comparison, setComparison] = useState<{ experimentId: string; ids: Set<string> }>();
  const [copyStatus, setCopyStatus] = useState("");
  const [downloadingArtifact, setDownloadingArtifact] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const runPanel = useRef<HTMLElement>(null);
  const detailsPanel = useRef<HTMLElement>(null);

  const experimentQuery = useQuery({ queryKey: ["experiments-dashboard"], queryFn: () => fetchExperiments() });
  const projects = useQuery({ queryKey: ["experiments-projects"], queryFn: fetchProjects });
  const experiments = experimentQuery.data ?? [];
  const totalRuns = experimentQuery.data && experiments.every(experiment => experiment.runs_count != null)
    ? experiments.reduce((sum, experiment) => sum + (experiment.runs_count ?? 0), 0) : null;
  const experimentCount = experimentQuery.data?.length;
  const observedAt = experimentQuery.dataUpdatedAt;
  useEffect(() => {
    if (experimentCount === undefined || !observedAt) return;
    setCountHistory(previous => previous[previous.length - 1]?.observedAt === observedAt ? previous : [
      ...previous.slice(-7), { observedAt, experiments: experimentCount, runs: totalRuns },
    ]);
  }, [experimentCount, observedAt, totalRuns]);
  const projectLabels = new Map(projects.data?.flatMap(item => [[item.slug, item.name], [item.id, item.name]]));
  const projectName = (experiment: Experiment) => {
    const key = projectTag(experiment);
    return key ? projectLabels.get(key) ?? key : "—";
  };
  const experimentProjects = Array.from(new Set(experiments.map(projectTag).filter((item): item is string => Boolean(item))));
  const tags = Array.from(new Set(experiments.flatMap(experiment => Object.entries(experiment.tags ?? {})
    .filter(([key]) => !key.startsWith("mlflow.")).map(([key, value]) => `${key}: ${value}`)))).sort();
  const query = search.trim().toLowerCase();
  const eligibleExperiments = experiments.filter(experiment =>
    (!project || projectTag(experiment) === project) && (!tag || Object.entries(experiment.tags ?? {}).some(([key, value]) => `${key}: ${value}` === tag)));
  const matchingExperiments = eligibleExperiments.filter(experiment =>
    (!experimentFilter || experiment.experiment_id === experimentFilter) &&
    (!query || [experiment.name, experiment.experiment_id, projectName(experiment), ...Object.values(experiment.tags ?? {})]
      .some(value => value.toLowerCase().includes(query))));
  const selectedExperiment = matchingExperiments.find(experiment => experiment.experiment_id === activeExperimentId)
    ?? matchingExperiments[0]
    ?? (query ? eligibleExperiments.find(experiment => experiment.experiment_id === (experimentFilter || activeExperimentId))
      ?? (!experimentFilter && !activeExperimentId ? eligibleExperiments[0] : undefined) : undefined);
  const experimentId = selectedExperiment?.experiment_id ?? "";

  const runQuery = useQuery({
    queryKey: ["experiment-runs", experimentId],
    queryFn: () => fetchExperimentRuns(experimentId),
    enabled: Boolean(selectedExperiment),
  });
  const allRuns = runQuery.data ?? [];
  const days = timeRanges[timeRange];
  const cutoff = days === null ? 0 : Date.now() - days * 86_400_000;
  const timeFilteredRuns = allRuns.filter(run => days === null || (run.start_time ?? 0) >= cutoff);
  const searchRuns = Boolean(query && matchingExperiments.length === 0);
  const runs = searchRuns ? timeFilteredRuns.filter(run => [run.run_id, run.run_name].some(value => value?.toLowerCase().includes(query))) : timeFilteredRuns;
  const selectedRun = runs.find(run => run.run_id === activeRunId) ?? runs[0];
  const runId = selectedRun?.run_id ?? "";
  const artifactQuery = useQuery({
    queryKey: ["experiment-artifacts", experimentId, runId],
    queryFn: () => fetchExperimentArtifacts(experimentId, runId),
    enabled: Boolean(selectedRun),
    retry: false,
  });
  const artifacts = artifactQuery.data ?? [];
  const modelName = selectedRun?.params?.model_name ?? selectedRun?.params?.model ?? selectedRun?.tags?.model_name;
  const modelVersion = selectedRun?.params?.model_version ?? selectedRun?.tags?.model_version;
  const mlflowBase = import.meta.env.VITE_MLFLOW_URL?.replace(/\/+$/, "");
  const mlflowLink = mlflowBase && selectedRun ? `${mlflowBase}/#/experiments/${encodeURIComponent(experimentId)}/runs/${encodeURIComponent(runId)}` : null;

  const deleteMutation = useMutation({
    mutationFn: deleteExperiment,
    onSuccess: async (_, id) => {
      if (id === activeExperimentId) setActiveExperimentId("");
      if (id === experimentFilter) setExperimentFilter("");
      await client.invalidateQueries({ queryKey: ["experiments-dashboard"] });
      showSuccess("Experiment deleted.");
    },
  });

  async function removeExperiment(experiment: Experiment) {
    if (await confirmAction("Delete experiment?", `Delete “${experiment.name}” (ID: ${experiment.experiment_id})?`, "Delete experiment")) {
      deleteMutation.mutate(experiment.experiment_id);
    }
  }

  function chooseExperiment(id: string) {
    setActiveExperimentId(id);
    setActiveRunId("");
    setPage(1);
  }

  function openView(next: View) {
    setView(next);
    runPanel.current?.scrollIntoView({ block: "nearest" });
  }

  function inspectRun(id: string) {
    setActiveRunId(id);
    detailsPanel.current?.scrollIntoView({ block: "nearest" });
  }

  async function copyRunId() {
    try {
      await navigator.clipboard.writeText(runId);
      setCopyStatus(runId);
    } catch {
      setCopyStatus("failed");
    }
  }

  async function downloadArtifact(path: string, isDirectory: boolean) {
    if (downloadingArtifact) return;
    setDownloadingArtifact(path);
    setDownloadError("");
    try {
      const blob = await downloadExperimentArtifact(experimentId, runId, path);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${path.split("/").pop() || "artifact"}${isDirectory ? ".zip" : ""}`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError("Could not download this artifact. Please try again.");
    } finally {
      setDownloadingArtifact("");
    }
  }

  const chronologicalRuns = [...runs].reverse();
  const accuracy = chronologicalRuns.flatMap(run => metricValue(run, metrics[0]) ?? []);
  const bestAccuracy = accuracy.length ? Math.max(...accuracy) : null;
  const bestAccuracyTrend: number[] = [];
  for (const score of accuracy) bestAccuracyTrend.push(Math.max(bestAccuracyTrend[bestAccuracyTrend.length - 1] ?? score, score));
  let elapsed = 0;
  const durationTrend = chronologicalRuns.flatMap(run => runDuration(run) ?? []).map((duration, index) => {
    elapsed += duration;
    return elapsed / (index + 1);
  });
  const successful = runs.filter(run => run.status === "FINISHED").length;
  const statItems = [
    [FlaskConical, "Total Experiments", experimentCount ?? "—", countHistory.map(snapshot => snapshot.experiments)],
    [Layers, "Total Runs", totalRuns ?? "—", countHistory.flatMap(snapshot => snapshot.runs ?? [])],
    [Trophy, "Best Accuracy", bestAccuracy?.toFixed(4) ?? "—", bestAccuracyTrend],
    [Clock, "Avg. Run Time", formatDuration(durationTrend[durationTrend.length - 1] ?? null), durationTrend],
    [CheckCircle2, "Successful Runs", runs.length ? successful : "—", []],
  ] as const;
  const metric = metrics.find(item => item.key === metricKey) ?? metrics[0];
  const ordinal = new Map(allRuns.map((run, index) => [run.run_id, allRuns.length - index]));
  const comparisonIds = comparison?.experimentId === experimentId ? comparison.ids : undefined;
  const comparedRuns = runs.filter(run => comparisonIds?.has(run.run_id));
  const chartRuns = comparedRuns.length ? comparedRuns : runs.slice(0, chartLimit);
  const chart = [...chartRuns].reverse()
    .map(run => ({ number: ordinal.get(run.run_id), value: metricValue(run, metric) }));
  const historyRuns = chartRuns.flatMap(run => {
    const key = metric.aliases.find(alias => Number.isFinite(run.metrics?.[alias]));
    return key ? [{ id: run.run_id, key }] : [];
  }).slice(0, 3);
  const historyQuery = useQuery({
    queryKey: ["experiment-metric-history", experimentId, historyRuns],
    queryFn: ({ signal }) => Promise.all(historyRuns.map(async ({ id, key }) => ({
      id, points: await fetchRunMetricHistory(experimentId, id, key, signal),
    }))),
    enabled: Boolean(experimentId && historyRuns.length && comparedRuns.length <= 3),
    retry: false,
  });
  const histories = (historyQuery.data ?? []).filter(history => history.points.length > 0);
  const showHistory = comparedRuns.length <= 3 && histories.some(history => history.points.length > 1);
  const historyByStep = new Map<number, Record<string, number>>();
  if (showHistory) {
    for (const history of histories) {
      for (const { step, value } of history.points) {
        const point = historyByStep.get(step) ?? { number: step };
        point[history.id] = value;
        historyByStep.set(step, point);
      }
    }
  }
  const chartData = showHistory ? [...historyByStep.values()].sort((a, b) => a.number - b.number) : chart;
  const sortedMetric = metrics.find(item => item.key === sort?.key);
  const sortedRuns = sortedMetric && sort ? [...runs].sort((left, right) => {
    const a = metricValue(left, sortedMetric);
    const b = metricValue(right, sortedMetric);
    if (a === null) return b === null ? 0 : 1;
    if (b === null) return -1;
    return sort.ascending ? a - b : b - a;
  }) : runs;
  const pageCount = Math.max(1, Math.ceil(sortedRuns.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRuns = sortedRuns.slice(pageStart, pageStart + rowsPerPage);
  const checkedOnPage = pageRuns.filter(run => comparisonIds?.has(run.run_id)).length;

  function setComparedRuns(runIds: string[], checked: boolean) {
    setComparison(previous => {
      const ids = new Set(previous?.experimentId === experimentId ? previous.ids : undefined);
      for (const id of runIds) {
        if (checked) ids.add(id);
        else ids.delete(id);
      }
      return { experimentId, ids };
    });
  }
  const experimentRows = searchRuns && runs.length && selectedExperiment ? [selectedExperiment] : matchingExperiments;
  const params = Object.entries(selectedRun?.params ?? {});
  const runMessage = !selectedExperiment ? "Select an experiment." : runQuery.isPending
    ? "Loading runs…" : runQuery.isError ? errorMessage(runQuery.error, "Could not load runs from MLflow.") : "No runs match these filters.";
  const showRuns = view === "Runs";
  const artifactDescription = (path: string, isDirectory: boolean) => {
    const name = path.split("/").pop()?.toLowerCase();
    if (isDirectory && name === "model") return "Model artifacts";
    if (isDirectory && name === "plots") return "Training & evaluation plots";
    if (isDirectory && name === "reports") return "Metrics and evaluation reports";
    return isDirectory ? "Artifact folder" : "Run artifact";
  };
  const displayedArtifacts = (summary: boolean) => artifactQuery.isError
    ? <p className="experiments-empty" role="alert">{errorMessage(artifactQuery.error, "Artifacts could not be loaded.")}</p>
    : artifacts.length ? <ul className="experiments-artifacts">{(summary ? artifacts.slice(0, 3) : artifacts).map(item => {
      const Icon = item.is_dir ? Folder : File;
      return <li key={item.path}><Icon size={22} aria-hidden="true" />
        <div className="experiments-artifact-name"><strong>{item.path}{item.is_dir ? "/" : ""}</strong>
          <span>{artifactDescription(item.path, item.is_dir)}</span></div>
        <small>{item.size !== null ? new Intl.NumberFormat("en", { style: "unit", unit: item.size >= 1_000_000 ? "megabyte" : "kilobyte", maximumFractionDigits: 1 })
          .format(item.size / (item.size >= 1_000_000 ? 1_000_000 : 1_000)) : "—"}</small>
        <button type="button" aria-label={`Download ${item.path}${item.is_dir ? " as ZIP" : ""}`}
          disabled={Boolean(downloadingArtifact)} onClick={() => void downloadArtifact(item.path, item.is_dir)}>
          {downloadingArtifact === item.path ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
        </button>
      </li>;
    })}</ul> : <p className="experiments-empty">{selectedRun && artifactQuery.isPending ? "Loading artifacts…" : "No artifacts recorded."}</p>;

  return <div className="experiments-dashboard">
    <header className="overview-hero experiments-hero">
      <div><h1>Experiments</h1><p>Track, compare, and analyze your machine learning experiments with MLflow integration.</p></div>
      <div className="experiments-lifecycle" aria-hidden="true">
        <svg className="experiments-lifecycle-landscape" viewBox="0 0 640 90" preserveAspectRatio="none">
          <path fill="#dff5e5" d="M0 90 73 40Q100 20 122 34L232 90 298 46Q322 30 344 44L434 90 542 37Q568 20 592 34L640 57V90Z" />
          <path fill="#ebf9ee" d="m53 90 92-50q22-12 44 1l99 49 98-47q24-12 47 2l85 45 74-41q24-14 48-1v42Z" />
        </svg>
        {lifecycle.map(([Icon, label], index) =>
        <div key={label}><Icon size={42} strokeWidth={1.6} /><b>{label}</b>{index < lifecycle.length - 1 && <ArrowRight className="experiments-stage-arrow" size={24} />}</div>
      )}</div>
    </header>

    <div className="experiments-toolbar" role="group" aria-label="Experiment filters">
      <label><Search size={15} /><input aria-label="Search experiments or runs" placeholder="Search experiments or runs…" value={search}
        onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
      <label><Building2 size={15} /><select aria-label="Project" value={project} onChange={event => { setProject(event.target.value); setExperimentFilter(""); setPage(1); }}>
        <option value="">All Projects</option>{experimentProjects.map(key => <option key={key} value={key}>{projectLabels.get(key) ?? key}</option>)}
      </select></label>
      <label><FlaskConical size={15} /><select aria-label="Experiment" value={experimentFilter}
        onChange={event => { setExperimentFilter(event.target.value); chooseExperiment(event.target.value); }}>
        <option value="">All Experiments</option>{eligibleExperiments.map(experiment => <option key={experiment.experiment_id} value={experiment.experiment_id}>{experiment.name}</option>)}
      </select></label>
      <label><Tag size={15} /><select aria-label="Tag" value={tag} onChange={event => { setTag(event.target.value); setExperimentFilter(""); setPage(1); }}>
        <option value="">All Tags</option>{tags.map(item => <option key={item}>{item}</option>)}
      </select></label>
      <label><Calendar size={15} /><select aria-label="Run date range" value={timeRange} onChange={event => { setTimeRange(event.target.value as TimeRange); setPage(1); }}>
        {Object.keys(timeRanges).map(item => <option key={item}>{item}</option>)}
      </select></label>
      <button className="secondary-action" type="button" disabled={experimentQuery.isFetching || runQuery.isFetching}
        onClick={() => { void Promise.all([experimentQuery.refetch(), projects.refetch(), ...(experimentId ? [runQuery.refetch()] : []), ...(runId ? [artifactQuery.refetch()] : []), ...(historyRuns.length && comparedRuns.length <= 3 ? [historyQuery.refetch()] : [])]); }}><RefreshCw size={15} />Refresh</button>
      <button className="primary-action" type="button" onClick={() => setCreateOpen(true)}><Plus size={16} />New Experiment</button>
    </div>
    {(experimentQuery.isError || deleteMutation.isError) && <p className="experiments-notice" role="alert">
      {experimentQuery.isError ? errorMessage(experimentQuery.error, "Could not load experiments from MLflow.") : errorMessage(deleteMutation.error, "Could not delete this experiment.")}
    </p>}

    <div className="experiments-kpis">
      {statItems.map(([Icon, label, value, trend], index) => <div key={label} className="overview-card experiments-kpi"
        title={index > 1 ? "Based on the runs shown for the selected experiment" : undefined}>
        <Icon size={28} aria-hidden="true" /><div className="experiments-kpi-content"><strong>{label}</strong>
          <div className="experiments-kpi-reading"><b>{value}</b>
            <KpiTrend values={trend} showLine={index !== 3} lowerIsBetter={index === 3} />
            {index === 4 && runs.length > 0 && <><small>({(successful / runs.length * 100).toFixed(1)}%)</small>
              <progress aria-label="Successful runs" value={successful} max={runs.length} /></>}
          </div>
        </div>
      </div>)}
    </div>

    <div className="experiments-grid">
      <div className="experiments-main">
        <div className="experiments-top">
          <Panel className="experiments-list-panel" title={`Experiments (${experimentRows.length})`} action={<button type="button" onClick={() => setCreateOpen(true)}><Plus size={15} />New</button>}>
            <div className="experiments-scroll"><table className="overview-table experiments-list">
              <thead><tr><th scope="col">Experiment</th><th scope="col">Project</th><th scope="col">Runs</th></tr></thead>
              <tbody>{(expanded ? experimentRows : experimentRows.slice(0, 5)).map(experiment =>
                <tr key={experiment.experiment_id} data-active={experiment.experiment_id === experimentId}>
                  <td><button type="button" aria-pressed={experiment.experiment_id === experimentId} onClick={() => chooseExperiment(experiment.experiment_id)}>
                    <FlaskConical size={18} aria-hidden="true" /><span>{experiment.name}</span>
                  </button></td><td>{projectName(experiment)}</td><td>{experiment.runs_count ?? "—"}</td>
                </tr>
              )}</tbody>
            </table></div>
            {!experimentRows.length && <p className="experiments-empty">{experimentQuery.isPending ? "Loading experiments…" : searchRuns && runQuery.isFetching ? "Searching runs…" : "No experiments found."}</p>}
            {experimentRows.length > 5 && <button className="experiments-panel-link" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
              {expanded ? "Show Fewer Experiments" : "View All Experiments"}<ArrowRight size={14} />
            </button>}
          </Panel>

          <Panel className="experiments-comparison-panel" title="Run Comparison">
            <div className="experiments-chart-controls">
              <div className="experiments-segments" role="group" aria-label="Comparison metric">
                {metrics.map(item => <button key={item.key} type="button" aria-pressed={metricKey === item.key} onClick={() => setMetricKey(item.key)}>{item.label}</button>)}
              </div>
              {comparedRuns.length > 0 ? <button className="experiments-compare-reset" type="button" onClick={() => setComparison(undefined)}>
                {comparedRuns.length} selected <X size={13} aria-hidden="true" />
              </button> : <select aria-label="Number of runs to compare" value={chartLimit} onChange={event => setChartLimit(Number(event.target.value))}>
                {[10, 20, 50].map(limit => <option key={limit} value={limit}>Last {limit} Runs</option>)}
              </select>}
            </div>
            {chart.some(point => point.value !== null) ? <div className="experiments-chart-layout">
              <div className="experiments-chart" role="group" aria-label={`${metric.label} by ${showHistory ? "training step" : "run"}`}>
                <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} accessibilityLayer margin={{ top: 12, right: 11, bottom: 19, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e9edf1" />
                  <XAxis dataKey="number" type={showHistory ? "number" : "category"} domain={["dataMin", "dataMax"]}
                    allowDecimals={false} tick={axisTick} tickLine={false} axisLine={{ stroke: "#bfc9d3" }} minTickGap={5}
                    label={{ value: showHistory ? "Training step" : "Run #", position: "insideBottom", offset: -11, ...axisTick }} />
                  <YAxis width={44} tick={axisTick} tickLine={false} axisLine={{ stroke: "#bfc9d3" }}
                    tickFormatter={value => Number(value).toFixed(2)} domain={["auto", "auto"]} />
                  <Tooltip labelFormatter={number => showHistory ? `Step ${number}` : `Run #${number}`}
                    formatter={(value: number, name: string) => [value.toFixed(4), name]} />
                  {showHistory ? histories.map((history, index) =>
                    <Line key={history.id} dataKey={point => point[history.id]} name={`Run #${ordinal.get(history.id)}`}
                      stroke={comparisonColors[index]} strokeWidth={2} dot={history.points.length <= 30 ? { r: 2.8, fill: "#fff", strokeWidth: 1.8 } : false}
                      activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
                  ) : <Line dataKey="value" name={metric.label} stroke={comparisonColors[0]} strokeWidth={2}
                    dot={{ r: 2.8, fill: "#fff", strokeWidth: 1.8 }} activeDot={{ r: 4 }} isAnimationActive={false} />}
                </LineChart></ResponsiveContainer>
              </div>
              {showHistory && <ul className="experiments-chart-legend" aria-label="Latest recorded scores">
                {histories.map((history, index) => <li key={history.id}>
                  <span style={{ backgroundColor: comparisonColors[index] }} aria-hidden="true" />
                  Run #{ordinal.get(history.id)} ({history.points[history.points.length - 1].value.toFixed(4)})
                </li>)}
              </ul>}
              {historyQuery.isError && comparedRuns.length <= 3 &&
                <p className="experiments-chart-note">Metric history unavailable. Showing the latest score per run.</p>}
            </div> : <p className="experiments-empty experiments-chart-empty">{runs.length ? `No ${metric.label} values recorded.` : runMessage}</p>}
          </Panel>
        </div>

        <section className="experiments-run-area" ref={runPanel} aria-label="Run data">
          <nav className="overview-card experiments-tabs" aria-label="Run views">
            {views.map(([Icon, label]) => <button key={label} type="button" aria-pressed={view === label} onClick={() => setView(label)}>
              <Icon size={16} aria-hidden="true" />{label}{label === "Runs" && ` (${runs.length})`}
            </button>)}
          </nav>

          {showRuns ? <div className="overview-card experiments-runs">
            <div className="experiments-scroll"><table className="overview-table">
              <thead><tr><th scope="col"><input type="checkbox" aria-label="Compare all runs on this page" disabled={!pageRuns.length}
                checked={pageRuns.length > 0 && checkedOnPage === pageRuns.length}
                ref={input => { if (input) input.indeterminate = checkedOnPage > 0 && checkedOnPage < pageRuns.length; }}
                onChange={event => setComparedRuns(pageRuns.map(run => run.run_id), event.target.checked)} /></th><th scope="col">Run #</th><th scope="col">Status</th>
                {metrics.map(item => <th key={item.key} scope="col" className="experiments-run-metric"
                  aria-sort={sort?.key === item.key ? (sort.ascending ? "ascending" : "descending") : undefined}>
                  <button type="button" onClick={() => { setSort({ key: item.key, ascending: sort?.key === item.key && !sort.ascending }); setPage(1); }}>
                    {item.label}<ArrowDownUp size={11} aria-hidden="true" />
                  </button>
                </th>)}
                <th scope="col">Duration</th><th scope="col">Started At</th><th scope="col">Actions</th>
              </tr></thead>
              <tbody>{pageRuns.map(run => <tr key={run.run_id} data-active={run.run_id === runId}>
                <td><input type="checkbox" aria-label={`Compare run #${ordinal.get(run.run_id)}`} checked={comparisonIds?.has(run.run_id) ?? false}
                  onChange={event => setComparedRuns([run.run_id], event.target.checked)} /></td>
                <td><button type="button" className="experiments-run-number" aria-pressed={run.run_id === runId}
                  title={run.run_name ?? run.run_id} onClick={() => setActiveRunId(run.run_id)}>#{ordinal.get(run.run_id)}</button></td>
                <td><RunStatus status={run.status} /></td>
                {metrics.map(item => {
                  const value = metricValue(run, item);
                  const best = item.key === "accuracy" && value !== null && value === bestAccuracy;
                  return <td key={item.key} className="experiments-run-metric">
                    <span className={best ? "experiments-best" : undefined}>{value?.toFixed(4) ?? "—"}</span>
                  </td>;
                })}
                <td>{formatDuration(runDuration(run))}</td>
                <td>{run.start_time != null ? <time dateTime={new Date(run.start_time).toISOString()}
                  title={dateTime.format(run.start_time)}>{runTableDate.format(run.start_time)}</time> : "—"}</td>
                <td><span className="experiments-run-actions">
                  <button type="button" aria-label={`Inspect run #${ordinal.get(run.run_id)}`} onClick={() => inspectRun(run.run_id)}><Eye size={16} /></button>
                  <button type="button" aria-label={`Show metrics for run #${ordinal.get(run.run_id)}`} onClick={() => { setActiveRunId(run.run_id); setView("Metrics"); }}><EllipsisVertical size={15} /></button>
                </span></td>
              </tr>)}</tbody>
            </table></div>
            {!runs.length && <p className="experiments-empty">{runMessage}</p>}
            {runs.length > 0 && <footer className="experiments-pagination">
              <label>Rows per page <select value={rowsPerPage} onChange={event => { setRowsPerPage(Number(event.target.value)); setPage(1); }}>
                {[5, 10, 20].map(count => <option key={count}>{count}</option>)}
              </select></label>
              <span>Showing {pageStart + 1}–{Math.min(pageStart + rowsPerPage, runs.length)} of {runs.length} runs</span>
              <div role="group" aria-label="Run pagination">
                <button type="button" aria-label="First page" disabled={currentPage === 1} onClick={() => setPage(1)}><ChevronsLeft size={15} /></button>
                <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={15} /></button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map(number =>
                  <button type="button" key={number} aria-current={number === currentPage ? "page" : undefined} onClick={() => setPage(number)}>{number}</button>)}
                <button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={15} /></button>
              </div>
            </footer>}
          </div> : <Panel title={view}>
            {view === "Metrics" && <Values entries={Object.entries(selectedRun?.metrics ?? {})} />}
            {view === "Parameters" && <>
              <Values entries={params} />
              {selectedExperiment && <details className="experiments-metadata">
                <summary>Experiment metadata</summary>
                <Values entries={[["Experiment ID", experimentId], ["Artifact location", selectedExperiment.artifact_location ?? "—"],
                  ["Created", selectedExperiment.created_at ?? "—"], ...Object.entries(selectedExperiment.tags ?? {})]} />
                {experimentId !== "0" && <button type="button" disabled={deleteMutation.isPending} onClick={() => void removeExperiment(selectedExperiment)}>Delete Experiment</button>}
              </details>}
              {selectedRun?.tags && Object.keys(selectedRun.tags).length > 0 && <>
                <h3 className="experiments-subheading">Run Tags</h3>
                <Values entries={Object.entries(selectedRun.tags)} />
              </>}
            </>}
            {view === "Artifacts" && <>{displayedArtifacts(false)}{downloadError && <p className="experiments-notice" role="alert">{downloadError}</p>}</>}
            {view === "Models (Registry)" && <>
              {selectedRun?.status === "FINISHED" && <RegisterModel key={runId} run={selectedRun} />}
              <Link className="experiments-panel-link" to="/app/models">Open Model Registry<ArrowUpRight size={14} /></Link>
            </>}
          </Panel>}
        </section>
      </div>

      <aside className="experiments-sidebar" aria-label="Selected run details" ref={detailsPanel}>
        <Panel className="experiments-run-details" title="Run Details" action={mlflowLink && <a href={mlflowLink} target="_blank" rel="noreferrer">Open in MLflow<ExternalLink size={14} /></a>}>
          {selectedRun && selectedExperiment ? <dl className="experiments-values">
            <div><dt>Run ID</dt><dd><span title={runId}>{runId.slice(0, 8)}…</span>
              <button type="button" aria-label="Copy run ID" onClick={() => void copyRunId()}>{copyStatus === runId ? <Check size={13} /> : <Copy size={13} />}</button>
            </dd></div>
            <div><dt>Experiment</dt><dd>{selectedExperiment.name}</dd></div>
            <div><dt>Project</dt><dd>{projectName(selectedExperiment)}</dd></div>
            <div><dt>Status</dt><dd><RunStatus status={selectedRun.status} /></dd></div>
            <div><dt>Start Time</dt><dd>{selectedRun.start_time ? dateTime.format(selectedRun.start_time) : "—"}</dd></div>
            <div><dt>Duration</dt><dd>{formatDuration(runDuration(selectedRun))}</dd></div>
            <div><dt>Model</dt><dd className="experiments-model-badges">
              {modelName ? <span>{modelName}</span> : "—"}
              {modelVersion && <span>{/^v/i.test(modelVersion) ? modelVersion : `v${modelVersion}`}</span>}
            </dd></div>
          </dl> : <p className="experiments-empty">{runMessage}</p>}
          {copyStatus === "failed" && <p className="experiments-notice" role="status">Clipboard access is unavailable.</p>}
        </Panel>
        <Panel className="experiments-parameters-panel" title={<><Settings className="experiments-section-icon" size={18} />Parameters</>}
          action={params.length > 0 && <button type="button" onClick={() => openView("Parameters")}>View All<ChevronRight size={15} /></button>}>
          <Values entries={params.slice(0, 5)} />
        </Panel>
        <Panel title={<><Box className="experiments-section-icon" size={18} />Artifacts{artifactQuery.isSuccess ? ` (${artifacts.length})` : ""}</>}
          action={artifacts.length > 0 && <button type="button" onClick={() => openView("Artifacts")}>View All<ChevronRight size={15} /></button>}>
          {displayedArtifacts(true)}
          {downloadError && <p className="experiments-notice" role="alert">{downloadError}</p>}
        </Panel>
      </aside>
    </div>
    {createOpen && <ExperimentForm onClose={() => setCreateOpen(false)} onCreated={id => {
      setCreateOpen(false);
      setSearch("");
      setProject("");
      setTag("");
      setExperimentFilter("");
      chooseExperiment(id);
      void client.invalidateQueries({ queryKey: ["experiments-dashboard"] });
      showSuccess("Experiment created.");
    }} />}
  </div>;
}
