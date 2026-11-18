import { Cpu, HardDrive } from "lucide-react";
import { OverviewActivity } from "../components/OverviewActivity";
import { LifecycleArtwork } from "../components/LifecycleArtwork";
import { TimelineChart, EmptyChart } from "../components/charts/LifecycleCharts";
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Network, Layers, Rocket, LineChart, ChevronRight, Info, CheckCircle2, TrendingUp, TrendingDown,
  FolderGit2,
  Database,
  FlaskConical,
  Box,
  Server,
  ChevronDown,
  ShieldCheck,
  RefreshCw,
  Search,
  BellRing,
} from "lucide-react";
import {
  fetchExperiments,
  fetchSystemStats,
  fetchSystemServices,
  fetchModels,
  fetchDeployments,
  pingDeployment,
} from "../api/client";
import { Experiment, RegisteredModel, Deployment, SubsystemService, SystemStats } from "../api/types";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, LabelList, CartesianGrid, XAxis, YAxis,
  PieChart,
  Pie,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { PALETTE } from "../components/charts/ChartKit";

export const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState<SystemStats>({
    projects_count: 0,
    models_count: 0,
    datasets_count: 0,
    experiments_count: 0,
    active_deployments: 0,
    alerts_count: 0,
    system_healthy: true,
    stages: { production: 0, staging: 0, development: 0, archived: 0 },
    funnel: [],
    benchmarks: [],
    latency_telemetry: [],
    drift_trajectory: [],
  });

  const [models, setModels] = useState<RegisteredModel[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [services, setServices] = useState<SubsystemService[]>([]);
  const [hasStats, setHasStats] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Search input state
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Time range selector state
  const [timeRange, setTimeRange] = useState("All time");
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);

  // Live Ping state
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{
    id: string;
    latency: number;
    isHealthy: boolean;
    prediction: any;
    checkedAt: number;
  } | null>(null);

  type Source = "metrics" | "models" | "deployments" | "services";
  const [updatedAt, setUpdatedAt] = useState<Partial<Record<Source, number>>>({});
  const [failedSources, setFailedSources] = useState<Source[]>([]);
  const [now, setNow] = useState(Date.now());
  const latestRequest = useRef(0);
  const inFlight = useRef(false);

  const freshness = (source: Source) => {
    const last = updatedAt[source];
    if (!last) return loading ? "Loading…" : "Unavailable";
    const age = Math.max(0, Math.floor((now - last) / 1000));
    const stale = failedSources.includes(source) || age > 120;
    return `${stale ? "Stale · " : ""}Updated ${age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`} ago`;
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadData = async (range?: string) => {
    const request = ++latestRequest.current;
    inFlight.current = true;
    setLoading(true);
    setApiError(null);
    const activeRange = range !== undefined ? range : timeRange;
    const [statsResult, modelsResult, deploymentsResult, servicesResult] = await Promise.allSettled([
      fetchSystemStats(activeRange),
      fetchModels(),
      fetchDeployments(),
      fetchSystemServices(),
    ]);

    if (request !== latestRequest.current) return;

    inFlight.current = false;
    const statsAvailable = statsResult.status === "fulfilled" && !statsResult.value.error;
    setHasStats(statsAvailable);
    if (statsAvailable) setStats(statsResult.value);
    setModels(modelsResult.status === "fulfilled" ? modelsResult.value ?? [] : []);
    setDeployments(deploymentsResult.status === "fulfilled" ? deploymentsResult.value ?? [] : []);
    setServices(servicesResult.status === "fulfilled" ? servicesResult.value : []);

    const succeeded: Source[] = [];
    if (statsAvailable) succeeded.push("metrics");
    if (modelsResult.status === "fulfilled") succeeded.push("models");
    if (deploymentsResult.status === "fulfilled") succeeded.push("deployments");
    if (servicesResult.status === "fulfilled") succeeded.push("services");
    const completedAt = Date.now();
    setNow(completedAt);
    setUpdatedAt((previous) => ({ ...previous, ...Object.fromEntries(succeeded.map((source) => [source, completedAt])) }));
    setFailedSources((["metrics", "models", "deployments", "services"] as Source[]).filter((source) => !succeeded.includes(source)));
    const unavailable = [
      statsResult.status === "rejected" && "system metrics",
      modelsResult.status === "rejected" && "models",
      deploymentsResult.status === "rejected" && "deployments",
      servicesResult.status === "rejected" && "service status",
    ].filter(Boolean);
    if (unavailable.length) {
      setApiError(`Could not refresh: ${unavailable.join(", ")}.`);
    } else if (statsResult.status === "fulfilled" && statsResult.value.error) {
      setApiError(statsResult.value.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    setHasStats(false);
    void loadData(timeRange);
    const savedInterval = Number(localStorage.getItem("mlite_pref_refresh"));
    const interval = [5, 15, 30, 60].includes(savedInterval) ? savedInterval : 15;
    const timer = window.setInterval(() => {
      if (!document.hidden && !inFlight.current) void loadData(timeRange);
    }, interval * 1000);
    return () => {
      window.clearInterval(timer);
      latestRequest.current++;
    };
  }, [timeRange]);

  const handleTestPing = async (dep: Deployment) => {
    setPingingId(dep.id);
    setPingResult(null);
    try {
      const res = await pingDeployment(dep.id);
      const isHealthy = Boolean(
        res.prediction?.healthy === true
      );
      setPingResult({
        id: dep.id,
        checkedAt: Date.now(),
        latency: res.latency_ms,
        isHealthy,
        prediction: res.prediction,
      } as any);
    } catch (err: any) {
      setPingResult({
        id: dep.id,
        checkedAt: Date.now(),
        latency: 0,
        isHealthy: false,
        prediction: {
          healthy: false,
          status: "UNREACHABLE",
          error: err?.response?.data?.detail || err?.message || "Container unreachable",
        },
      } as any);
    } finally {
      setPingingId(null);
    }
  };

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [experimentsError, setExperimentsError] = useState(false);
  const [experimentsLoaded, setExperimentsLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    fetchExperiments().then(items => { if (active) { setExperiments([...items].sort((a,b) => (b.created_at || "").localeCompare(a.created_at || ""))); setExperimentsError(false); setExperimentsLoaded(true); } }).catch(() => { if (active) setExperimentsError(true); });
    return () => { active = false; };
  }, [updatedAt.metrics]);
  const groupDates = (dates: (string | undefined | null)[]) => {
    const counts = new Map<string, number>();
    dates.forEach(date => { if (date && !Number.isNaN(Date.parse(date))) { const key = new Date(date).toISOString().slice(0, 10); counts.set(key, (counts.get(key) || 0) + 1); } });
    return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([date,count]) => ({ date, count }));
  };
  const activeExperiments = experiments.filter(item => item.lifecycle_stage === "active");
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const datedActive = activeExperiments.filter(item => item.created_at && Number.isFinite(Date.parse(item.created_at)));
  const recentExperiments = datedActive.filter(item => { const age = now - Date.parse(item.created_at!); return age >= 0 && age < weekMs; }).length;
  const priorExperiments = datedActive.filter(item => { const age = now - Date.parse(item.created_at!); return age >= weekMs && age < 2 * weekMs; }).length;
  const experimentGrowth = experimentsLoaded && !experimentsError && datedActive.length === activeExperiments.length && priorExperiments > 0
    ? Math.round((recentExperiments - priorExperiments) / priorExperiments * 100) : null;
  const [experimentPeriod, setExperimentPeriod] = useState("14");
  const experimentHistory = groupDates(experiments.filter(item => experimentPeriod === "all" || (item.created_at && Date.parse(item.created_at) >= now - Number(experimentPeriod) * 86400000)).map(item => item.created_at));

  // ── Resource Counts (Real DB counts) ───────────────────────────────
  const resourcesData = [
    {
      name: "Projects",
      count: stats.projects_count,
      icon: FolderGit2,
    },
    {
      name: "Datasets",
      count: stats.datasets_count ?? 0,
      icon: Database,
    },
    {
      name: "Models",
      count: stats.models_count,
      icon: Box,
    },
    {
      name: "Deployments",
      count: stats.active_deployments,
      icon: Server,
    },
    {
      name: "Alerts",
      count: stats.alerts_count,
      icon: BellRing,
    },
  ];

  // ── Stage Breakdown for Donut Chart (Real values only) ─────────────
  const stageCounts = useMemo(() => {
    const prod = stats.stages?.production || 0;
    const cand = stats.stages?.candidate || 0;
    const stag = stats.stages?.staging || 0;
    const dev = stats.stages?.development || 0;
    const arch = stats.stages?.archived || 0;
    const total = prod + cand + stag + dev + arch;
    return {
      PRODUCTION: prod,
      CANDIDATE: cand,
      STAGING: stag,
      DEVELOPMENT: dev,
      ARCHIVED: arch,
      total,
    };
  }, [stats.stages]);

  const pieStageData = useMemo(() => {
    return [
      { name: "Production", value: stageCounts.PRODUCTION, color: "#b4e99b" },
      { name: "Candidate", value: stageCounts.CANDIDATE, color: PALETTE.brandLight },
      { name: "Staging", value: stageCounts.STAGING, color: "#00823b" },
      { name: "Development", value: stageCounts.DEVELOPMENT, color: PALETTE.grayLight },
      { name: "Archived", value: stageCounts.ARCHIVED, color: PALETTE.grayMid },
    ].filter((item) => item.value > 0 || ["Staging", "Production", "Archived"].includes(item.name));
  }, [stageCounts]);

  const driftData = stats.drift_trajectory || [];
  const scoredVersions = (stats.benchmarks ?? []).filter(({ has_metrics }) => has_metrics);
  const driftModels = Array.from(new Set(driftData.map(({ model_name }) => model_name)));
  const [driftModel, setDriftModel] = useState("");
  const selectedDriftModel = driftModels.includes(driftModel) ? driftModel : driftModels[driftModels.length - 1] ?? "";
  const modelDrift = driftData.filter(({ model_name }) => model_name === selectedDriftModel);
  const selectedRange = timeRange === "All time" ? "all time" : timeRange.toLowerCase();

  // Filtered models and deployments for search
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    return models.filter((m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [models, searchQuery]);

  const filteredDeployments = useMemo(() => {
    const running = deployments.filter((d) => d.status === "RUNNING");
    if (!searchQuery.trim()) return running;
    return running.filter((d) =>
      d.model_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [deployments, searchQuery]);

  const displayModels = searchQuery.trim() ? filteredModels : filteredModels.slice(0, 3);
  const displayDeployments = searchQuery.trim() ? filteredDeployments : filteredDeployments.slice(0, 3);

  return (
    <div className="lifecycle-dashboard">
      {apiError && <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{apiError}<button onClick={() => loadData()} className="font-bold">Retry</button></div>}
      <div className="overview-hero">
        <div><h1>Lifecycle &amp; Registry Overview</h1><p>An end-to-end view of your ML lifecycle — from data and experiments to model registry,<br className="hidden 2xl:block" /> deployment, and monitoring — all within your self-hosted MLite platform.</p></div>
        <LifecycleArtwork />
      </div>
      <nav className="lifecycle-strip" aria-label="ML Lifecycle">
        <span className="lifecycle-label"><Network size={23} />ML Lifecycle</span>
        {[
          { label: "Data", detail: "Ingest & prepare", icon: Database, href: "datasets" },
          { label: "Validation", detail: "Check quality & rules", icon: ShieldCheck, href: "monitoring" },
          { label: "Experiments", detail: "Train & evaluate", icon: FlaskConical, href: "experiments" },
          { label: "Registry", detail: "Version & govern", icon: Layers, href: "models" },
          { label: "Deploy", detail: "Serve to production", icon: Rocket, href: "deployments" },
          { label: "Monitor", detail: "Track performance & drift", icon: LineChart, href: "monitoring" },
        ].map(({ label, detail, icon: Icon, href }, index) => <Link to={`/app/${href}`} key={label}><Icon size={25} /><span><strong>{label}</strong><small>{detail}</small></span>{index < 5 && <ChevronRight size={16} className="step-chevron" />}</Link>)}
      </nav>
      <div className="overview-kpis">
        {resourcesData.filter(item => item.name !== "Alerts").map(({ name, count, icon: Icon }) => (
          <Link className="overview-card kpi" to={`/app/${name.toLowerCase()}`} key={name}>
            <span><Icon size={22} /><strong>{name}</strong></span>
            <b>{hasStats ? count : "—"}<ChevronRight size={17} /></b>
          </Link>
        ))}
        <Link className="overview-card kpi" to="/app/experiments">
          <span><FlaskConical size={22} /><strong>Active Experiments</strong></span>
          <div className="kpi-experiment-value">
            <b>{experimentsLoaded && !experimentsError ? activeExperiments.length : "—"}<ChevronRight size={17} /></b>
            <span className={`growth-badge ${experimentGrowth === null ? "growth-unavailable" : experimentGrowth < 0 ? "growth-negative" : ""}`} title="Newly created active experiments in the last 7 days compared with the preceding 7 days">
              {experimentGrowth !== null && (experimentGrowth < 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />)}
              {experimentGrowth === null ? "—" : `${experimentGrowth >= 0 ? "+" : ""}${experimentGrowth}%`}
            </span>
            <small>vs. prior 7d</small>
          </div>
        </Link>
        <Link to="/app/models" className="overview-card kpi">
          <span><ShieldCheck size={22} /><strong>Registry Health</strong><Info size={15} className="kpi-info" /></span>
          <span title="Platform connectivity" className={`health-pill ${!hasStats ? "health-unknown" : !stats.system_healthy ? "health-warning" : ""}`}>
            {hasStats && stats.system_healthy ? <span className="health-check">✓</span> : <Info size={15} />}
            {!hasStats ? "Unknown" : stats.system_healthy ? "Healthy" : "Needs attention"}
          </span>
        </Link>
      </div>
      <div className="overview-toolbar"><p role="status">Inventory: current totals · Scores and drift: {selectedRange} · {freshness("metrics")}</p><div className="flex items-center gap-2"><div className="relative"><button className="range-button" onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}>{timeRange}<ChevronDown size={12} /></button>{isTimeRangeOpen && <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border bg-white p-1 shadow-lg">{["All time", "Last 30 days", "Last 7 days"].map(range => <button key={range} className="block w-full rounded p-2 text-left text-xs hover:bg-emerald-50" onClick={() => { setTimeRange(range); setIsTimeRangeOpen(false); }}>{range}</button>)}</div>}</div><button title="Refresh metrics" onClick={() => loadData()} disabled={loading}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button></div></div>
      <div className="overview-charts">
        <section className="overview-card chart-card"><h3><FlaskConical />Experiments Over Time<select className="chart-period" aria-label="Experiment history period" value={experimentPeriod} onChange={event => setExperimentPeriod(event.target.value)}><option value="14">Last 14 Days</option><option value="30">Last 30 Days</option><option value="all">All time</option></select></h3>{experimentHistory.length ? <TimelineChart data={experimentHistory} dataKey="count" /> : <EmptyChart text={experimentsError ? "Experiments unavailable" : "No experiment history yet"} />}</section>
        <section className="overview-card chart-card"><h3><Network />Model Score Comparison</h3>{hasStats && scoredVersions.length ? <><div className="chart-legend"><span><i style={{background: '#00823b'}} />Accuracy</span><span><i style={{background: '#b4e99b'}} />F1 Score</span></div><div className="score-plot" role="img" aria-label="Model scores, scale 0 to 1"><ResponsiveContainer width="100%" height="100%"><BarChart data={scoredVersions.slice(0, 4)} layout="vertical" margin={{left: 0, right: 34, bottom: 0}}><CartesianGrid horizontal={false} stroke="#edf0f2" /><XAxis type="number" domain={[0, 1]} tick={{fontSize: 9}} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="model" width={100} tick={{fontSize: 9, fill: '#172035'}} axisLine={false} tickLine={false} /><RechartsTooltip /><Bar dataKey="accuracy" name="Accuracy" fill="#00823b" radius={[0,3,3,0]} isAnimationActive={false}><LabelList dataKey="accuracy" position="right" formatter={(value: number | null) => value == null ? "" : value.toFixed(3)} style={{fontSize:9,fill:'#263249',fontWeight:600}} /></Bar><Bar dataKey="f1" name="F1 Score" fill="#b4e99b" radius={[0,3,3,0]} isAnimationActive={false}><LabelList dataKey="f1" position="right" formatter={(value: number | null) => value == null ? "" : value.toFixed(3)} style={{fontSize:9,fill:'#263249',fontWeight:600}} /></Bar></BarChart></ResponsiveContainer></div><div className="sr-only">{scoredVersions.map(v => <span key={v.model}>{v.f1?.toFixed(3)}</span>)}</div></> : <EmptyChart text={loading ? "Loading scores…" : "No scores recorded for these versions"} />}</section>
        <section className="overview-card chart-card"><h3><Layers />Registry Distribution</h3>{hasStats && stageCounts.total > 0 ? <div className="registry-chart"><div className="relative h-[150px] min-w-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie isAnimationActive={false} data={pieStageData} dataKey="value" innerRadius="65%" outerRadius="90%" stroke="none">{pieStageData.map(entry => <Cell key={entry.name} fill={entry.color} />)}</Pie><RechartsTooltip /></PieChart></ResponsiveContainer><div className="donut-label"><b>{stageCounts.total}</b><small>Versions</small></div></div><div className="stage-legend">{pieStageData.map(entry => <span key={entry.name}><i style={{background: entry.color}} />{entry.name} ({entry.value}) <b>{stageCounts.total ? Math.round(entry.value / stageCounts.total * 100) : 0}%</b></span>)}</div></div> : <EmptyChart text={hasStats ? "No registered model versions" : loading ? "Loading model versions…" : "Model versions unavailable"} />}</section>
        <section className="overview-card chart-card"><h3><LineChart />Model Drift<select className="chart-period" aria-label="Scores and drift observation period" value={timeRange} onChange={event => setTimeRange(event.target.value)}><option>All time</option><option>Last 7 days</option><option>Last 30 days</option></select></h3>{hasStats && modelDrift.length ? <><label className="chart-caption flex items-center gap-2">Model<select aria-label="Model" className="min-w-0 max-w-[180px] rounded border border-slate-100 bg-white text-[10px]" value={selectedDriftModel} onChange={event => setDriftModel(event.target.value)}>{driftModels.map(name => <option key={name}>{name}</option>)}</select></label><TimelineChart data={modelDrift.map(item => ({ ...item, value: item.drift_share }))} dataKey="value" percent /><div className="sr-only">{modelDrift.map((item, i) => <span key={i}>{(item.drift_share * 100).toFixed(1)}%</span>)}</div></> : <EmptyChart text={loading ? "Loading drift evaluations…" : "No drift evaluations in this period"} />}</section>
      </div>
      <OverviewActivity deployments={deployments} experiments={experiments} models={models}
        deploymentsUnavailable={failedSources.includes("deployments")} experimentsUnavailable={experimentsError} infrastructure={
      <section className="overview-card infrastructure-card" aria-labelledby="infrastructure-title">
        <h3 id="infrastructure-title"><Cpu />Infrastructure Utilization</h3>
        <div className="infrastructure-grid">
          {([
            ["cpu", "CPU", Cpu],
            ["memory", "Memory", Layers],
            ["storage", "Storage", HardDrive],
          ] as const).map(([key, label, Icon]) => {
            const value = hasStats ? stats.infrastructure?.[key] : null;
            const usage = value == null ? null : Math.max(0, Math.min(100, Math.round(value)));
            return <div className="infrastructure-metric" key={key}>
              <h4><Icon size={19} />{label}</h4>
              <strong>{usage == null ? "—" : `${usage}%`}</strong>
              <div className="infrastructure-meter" role={usage == null ? undefined : "meter"}
                aria-label={usage == null ? undefined : label} aria-valuemin={0} aria-valuemax={100}
                aria-valuenow={usage ?? undefined}>
                <span style={{ width: `${usage ?? 0}%` }} />
              </div>
            </div>;
          })}
        </div>
        <p className="infrastructure-scope">CPU and memory visible to the API · API root filesystem storage</p>
      </section>
      } />
      <section className="overview-card next-steps"><div className="empty-cube" aria-hidden="true"><div className="iso-cube"><i /><b /><em /></div></div><div><h2>{failedSources.includes("deployments") ? "Deployment Status Unavailable" : !updatedAt.deployments ? "Loading Deployments…" : filteredDeployments.length ? `${filteredDeployments.length} Running Deployment${filteredDeployments.length > 1 ? "s" : ""}` : "No Active Deployments"}</h2><p>{filteredDeployments.length ? "Manage your inference endpoints and check their readiness below." : "Deploy a registered model to start serving predictions and track it in real time."}</p><div className="mt-3 flex flex-wrap gap-3"><Link className="primary-action" to="/app/deployments"><Rocket size={15} />Create Deployment</Link><Link className="secondary-action" to="/app/models"><Layers size={15} />Go to Registry</Link></div></div><div className="steps-list"><h3>Next Steps</h3>{["Promote a model to Production from the Registry.", "Create a deployment for the promoted model.", "Monitor performance, latency, and drift once it’s live."].map((step,index) => <p key={step}><b>{index+1}</b>{step}</p>)}</div></section>
      <details className="overview-details"><summary>Inventory &amp; endpoint readiness</summary><div className="relative my-4"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter models or running endpoints on this dashboard..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 text-sm" /></div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="min-w-0 rounded-[20px] border border-[#dce5dd] bg-white p-4 shadow-sm">
          <header className="mb-3 flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Model Registry</h3>
              <p className="mt-1 text-xs text-slate-500">{freshness("models")}</p>
            </div>
            <Link to="/app/models" className="text-xs font-medium text-slate-600 hover:text-slate-900">View all →</Link>
          </header>
          {displayModels.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              {failedSources.includes("models") ? "Model catalog unavailable. Retry the refresh." : !updatedAt.models && loading ? "Loading model catalog…" : "No cataloged models found."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400">
                  <tr><th className="pb-2 font-medium">Model / run</th><th className="px-3 pb-2 font-medium">Version</th><th className="px-3 pb-2 font-medium">Score</th><th className="pb-2 text-right font-medium">Stage</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayModels.map((m) => (
                    <tr key={`${m.name}-${m.version}`} className="hover:bg-slate-50/60">
                      <td className="py-3 pr-3">
                        <Link to={`/app/models?search=${encodeURIComponent(m.name)}`} className="font-medium text-slate-900 hover:underline">{m.name}</Link>
                        <div className="mt-1 font-mono text-[10px] text-slate-400">{m.mlflow_run_id ? `Run #${m.mlflow_run_id.slice(0, 7)}` : "No linked run"}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-500">v{m.version}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-slate-600">{m.metrics?.f1_score != null ? `F1: ${(m.metrics.f1_score * 100).toFixed(1)}%` : m.metrics?.accuracy != null ? `Acc: ${(m.metrics.accuracy * 100).toFixed(1)}%` : "No score recorded"}</td>
                      <td className="py-3 text-right text-[10px] font-medium text-slate-600">{m.stage || "DEVELOPMENT"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="min-w-0 rounded-[20px] border border-[#dce5dd] bg-white p-4 shadow-sm">
          <header className="mb-3 flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Running Inference Endpoints</h3>
              <p className="mt-1 text-xs text-slate-500">{freshness("deployments")}</p>
            </div>
            <Link to="/app/deployments" className="text-xs font-medium text-slate-600 hover:text-slate-900">Manage →</Link>
          </header>
          {displayDeployments.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              {failedSources.includes("deployments") ? "Deployments unavailable. Retry the refresh." : !updatedAt.deployments && loading ? "Loading deployments…" : searchQuery ? "No running endpoints match this search." : "No running containers found."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400">
                  <tr><th className="pb-2 font-medium">Model / version</th><th className="px-3 pb-2 font-medium">Port</th><th className="pb-2 font-medium">Readiness</th><th className="pb-2 text-right font-medium">Check</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayDeployments.map((d) => (
                    <React.Fragment key={d.id}>
                      <tr className="hover:bg-slate-50/60">
                        <td className="py-3 pr-3"><span className="font-medium text-slate-900">{d.model_name}</span><div className="mt-1 font-mono text-[10px] text-slate-400">v{d.model_version}</div></td>
                        <td className="px-3 py-3 font-mono text-slate-500">{d.port}</td>
                        <td className="py-3 text-slate-600">{pingResult?.id === d.id && now - pingResult.checkedAt <= 120000 ? pingResult.isHealthy ? "Last check: ready" : "Last check: not ready" : "Readiness unverified"}</td>
                        <td className="py-3 pl-3 text-right"><button onClick={() => handleTestPing(d)} disabled={pingingId !== null} className="whitespace-nowrap text-xs font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950 disabled:opacity-50">{pingingId === d.id ? "Checking…" : "Check readiness"}</button></td>
                      </tr>
                      {pingResult?.id === d.id && (
                        <tr><td colSpan={4} className="pb-3 text-[11px] text-slate-500">
                          <p>{pingResult.isHealthy ? `Probe OK · Check round-trip ${pingResult.latency}ms` : `Probe failed · ${String(pingResult.prediction?.error || pingResult.prediction?.detail || pingResult.prediction?.status || "Unreachable")}`}</p>
                          <p className="mt-1">Checked {Math.max(0, Math.floor((now - pingResult.checkedAt) / 1000))}s ago · Not inference latency</p>
                        </td></tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      </details>
    </div>
  );
};
