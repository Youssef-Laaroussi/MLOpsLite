import React, { useEffect, useState, useMemo } from "react";
import {
  FolderGit2,
  Database,
  FlaskConical,
  Box,
  Server,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Zap,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Search,
  AlertTriangle,
  Info,
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import {
  fetchSystemStats,
  fetchSystemServices,
  fetchModels,
  fetchDeployments,
  pingDeployment,
} from "../api/client";
import { RegisteredModel, Deployment, SubsystemService, SystemStats } from "../api/types";
import { Link } from "react-router-dom";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  FunnelChart,
  Funnel,
  LabelList,
  Legend,
} from "recharts";
import { AXIS_TICK, GRID_PROPS, BiTooltip, PALETTE } from "../components/charts/ChartKit";

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
  } | null>(null);

  // Latency Chart filter state: 'all' | 'p50' | 'p95' | 'p99'
  const [latencyMetricFilter, setLatencyMetricFilter] = useState<"all" | "p50" | "p95" | "p99">("all");

  const loadData = async (range?: string) => {
    setLoading(true);
    setApiError(null);
    const activeRange = range !== undefined ? range : timeRange;
    try {
      const [statsData, modelsData, deploymentsData, servicesData] = await Promise.all([
        fetchSystemStats(activeRange),
        fetchModels(),
        fetchDeployments(),
        fetchSystemServices(),
      ]);

      if (statsData) {
        if (!statsData.system_healthy && (statsData as any).error) {
          setApiError(`Backend System Error: ${(statsData as any).error}`);
        }
        setStats(statsData);
      }

      setModels(modelsData || []);
      setDeployments(deploymentsData || []);
      setServices(servicesData || []);
    } catch (err: any) {
      setApiError(err?.response?.data?.detail || err?.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(timeRange);
  }, [timeRange]);

  const handleTestPing = async (dep: Deployment) => {
    setPingingId(dep.id);
    setPingResult(null);
    try {
      const res = await pingDeployment(dep.id);
      const isHealthy = Boolean(
        res.prediction?.healthy === true ||
        res.prediction?.status === "healthy" ||
        res.prediction?.status === "RUNNING"
      );
      setPingResult({
        id: dep.id,
        latency: res.latency_ms,
        isHealthy,
        prediction: res.prediction,
      } as any);
    } catch (err: any) {
      setPingResult({
        id: dep.id,
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

  // ── Resource Counts (Real DB counts) ───────────────────────────────
  const resourcesData = [
    {
      name: "Projects",
      count: stats.projects_count,
      trend: stats.projects_count > 0 ? "Active" : "None",
      icon: FolderGit2,
      iconColor: "text-slate-700",
      iconBg: "bg-slate-100 border-slate-200/60",
      barColor: PALETTE.brand,
    },
    {
      name: "Datasets",
      count: stats.datasets_count ?? 0,
      trend: (stats.datasets_count ?? 0) > 0 ? "Synced" : "None",
      icon: Database,
      iconColor: "text-slate-700",
      iconBg: "bg-slate-100 border-slate-200/60",
      barColor: PALETTE.brand,
    },
    {
      name: "Experiments",
      count: stats.experiments_count ?? 0,
      trend: (stats.experiments_count ?? 0) > 0 ? "Tracked" : "None",
      icon: FlaskConical,
      iconColor: "text-slate-700",
      iconBg: "bg-slate-100 border-slate-200/60",
      barColor: PALETTE.brand,
    },
    {
      name: "Models",
      count: stats.models_count,
      trend: stats.models_count > 0 ? "Registered" : "None",
      icon: Box,
      iconColor: "text-slate-700",
      iconBg: "bg-slate-100 border-slate-200/60",
      barColor: PALETTE.brand,
    },
    {
      name: "Deployments",
      count: stats.active_deployments,
      trend: stats.active_deployments > 0 ? "Running" : "None",
      icon: Server,
      iconColor: "text-slate-700",
      iconBg: "bg-slate-100 border-slate-200/60",
      barColor: PALETTE.brand,
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
      { name: "Production", value: stageCounts.PRODUCTION, color: PALETTE.brand },
      { name: "Candidate", value: stageCounts.CANDIDATE, color: PALETTE.brandLight },
      { name: "Staging", value: stageCounts.STAGING, color: PALETTE.brandPale },
      { name: "Development", value: stageCounts.DEVELOPMENT, color: PALETTE.grayLight },
      { name: "Archived", value: stageCounts.ARCHIVED, color: PALETTE.grayMid },
    ].filter((item) => item.value > 0);
  }, [stageCounts]);

  // Real Funnel Data from backend
  const funnelData = useMemo(() => {
    if (stats.funnel && stats.funnel.length > 0) {
      const colors = [
        PALETTE.grayLight,
        PALETTE.grayMid,
        PALETTE.brandPale,
        PALETTE.brandLight,
        PALETTE.brandDark,
      ];
      return stats.funnel.map((item, idx) => ({
        ...item,
        fill: colors[idx % colors.length],
      }));
    }
    return [];
  }, [stats.funnel]);

  // Real Latency Telemetry from backend
  const latencyData = stats.latency_telemetry || [];

  // Real Model Benchmarks from backend
  const benchmarkData = stats.benchmarks || [];

  // Real Drift Trajectory from backend
  const driftData = stats.drift_trajectory || [];

  // Filtered models and deployments for search
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    return models.filter((m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [models, searchQuery]);

  const filteredDeployments = useMemo(() => {
    if (!searchQuery.trim()) return deployments;
    return deployments.filter((d) =>
      d.model_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [deployments, searchQuery]);

  const displayModels = searchQuery.trim() ? filteredModels : filteredModels.slice(0, 3);
  const displayDeployments = searchQuery.trim() ? filteredDeployments : filteredDeployments.slice(0, 3);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* ── Backend Error Banner ───────────────────────────────────── */}
      {apiError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{apiError}</span>
          </div>
          <button
            onClick={() => loadData()}
            className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-[11px] transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Search Bar ─────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="mlite-global-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter models or running endpoints on this dashboard..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:border-[#3BB48C] focus:ring-1 focus:ring-[#3BB48C] transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          Quick actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            to="/app/datasets"
            className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition block group"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-700 flex items-center justify-center mb-2.5 group-hover:border-[#3BB48C]/40 group-hover:text-[#3BB48C] transition">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-semibold text-slate-900 group-hover:text-[#3BB48C] transition">
              Upload Dataset
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Sync CSV/Parquet files to MinIO S3
            </div>
          </Link>

          <Link
            to="/app/deployments"
            className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition block group"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-700 flex items-center justify-center mb-2.5 group-hover:border-[#3BB48C]/40 group-hover:text-[#3BB48C] transition">
              <Server className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-semibold text-slate-900 group-hover:text-[#3BB48C] transition">
              Deploy Container
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Launch isolated FastAPI Docker endpoint
            </div>
          </Link>

          <Link
            to="/app/experiments"
            className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition block group"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-700 flex items-center justify-center mb-2.5 group-hover:border-[#3BB48C]/40 group-hover:text-[#3BB48C] transition">
              <FlaskConical className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-semibold text-slate-900 group-hover:text-[#3BB48C] transition">
              New Experiment
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Track runs, params &amp; metrics with MLflow
            </div>
          </Link>

          <Link
            to="/app/projects"
            className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition block group"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-700 flex items-center justify-center mb-2.5 group-hover:border-[#3BB48C]/40 group-hover:text-[#3BB48C] transition">
              <FolderGit2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-semibold text-slate-900 group-hover:text-[#3BB48C] transition">
              Manage Workspaces
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Configure Git remotes and project metadata
            </div>
          </Link>
        </div>
      </div>

      {/* ── SECTION 1: HEADER & REFRESH ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
            Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live telemetry &amp; machine learning registry status calculated directly from SQL databases &amp; MLflow
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="relative">
            <button
              onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-300 transition"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{timeRange}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isTimeRangeOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-xs">
                {["All time", "Last 30 days", "Last 7 days"].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setTimeRange(range);
                      setIsTimeRangeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition ${
                      timeRange === range
                        ? "bg-slate-100 text-slate-900 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-[#3BB48C] hover:border-[#3BB48C]/40 transition shadow-2xs cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#3BB48C]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── SECTION 2: THE 5 RESOURCE KPI CARDS ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {resourcesData.map((res) => {
          const Icon = res.icon;
          const href = `/app/${res.name === "Models" ? "models" : res.name.toLowerCase()}`;
          return (
            <Link
              key={res.name}
              to={href}
              id={`kpi-${res.name.toLowerCase()}`}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all group cursor-pointer block"
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg border ${res.iconBg} ${res.iconColor}`}>
                  <Icon className="w-4 h-4 stroke-[2]" />
                </div>
                <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{res.name}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </div>
              <div className="text-xl font-bold font-sans text-slate-900 mt-2.5 mb-1 tracking-tight">
                {res.count}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <span>{res.trend}</span>
                <span className="text-slate-400 font-normal">in platform</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── SECTION 3: "RESOURCES OVERVIEW" BAR CHART ──────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-md p-4">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Resources Overview
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Inventory distribution across platform entities (real DB queries)</p>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Live Database Sync</span>
        </div>

        <div className="h-48 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={resourcesData}
              margin={{ top: 12, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <RechartsTooltip
                cursor={{ fill: "#F8FAFC" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <BiTooltip
                      active
                      label={label}
                      payload={[{ name: "Count", value: payload[0].value, color: PALETTE.brand }]}
                    />
                  );
                }}
              />
              <Bar dataKey="count" fill={PALETTE.brand} radius={[2, 2, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── SECTION 4: INFERENCE LATENCY & MODEL REGISTRY DONUT ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Latency Percentiles Curve */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Inference &amp; Telemetry Latency
                  </h3>
                  <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                    {latencyData.length > 0 ? `P95: ${latencyData[latencyData.length - 1].p95}ms` : "No telemetry"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  End-to-end response latency (P50, P95, P99 SLA threshold)
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center bg-slate-100/80 p-0.5 rounded border border-slate-200/60">
                {(["all", "p50", "p95", "p99"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLatencyMetricFilter(mode)}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition uppercase cursor-pointer ${
                      latencyMetricFilter === mode
                        ? "bg-white text-slate-900 border border-slate-200/60 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Metric Strip */}
            <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-slate-50/70 border border-slate-200/60 rounded text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide block">Median (P50)</span>
                <span className="text-xs font-semibold text-slate-900 font-mono">
                  {latencyData.length > 0 ? `${latencyData[latencyData.length - 1].p50} ms` : "--"}
                </span>
              </div>
              <div className="border-x border-slate-200/70">
                <span className="text-[10px] text-slate-500 uppercase tracking-wide block">Tail (P95)</span>
                <span className="text-xs font-semibold text-slate-900 font-mono">
                  {latencyData.length > 0 ? `${latencyData[latencyData.length - 1].p95} ms` : "--"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide block">Recorded Requests</span>
                <span className="text-xs font-semibold text-slate-900 font-mono">
                  {latencyData.reduce((acc, curr) => acc + curr.reqs, 0)}
                </span>
              </div>
            </div>

            {/* Recharts LineChart or Empty State */}
            {latencyData.length > 0 ? (
              <div className="h-44 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={latencyData}
                    margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="time" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}ms`} />
                    <RechartsTooltip
                      cursor={{ stroke: "#E2E8F0", strokeDasharray: "3 3" }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const p50Item = payload.find((p) => p.dataKey === "p50");
                        const p95Item = payload.find((p) => p.dataKey === "p95");
                        const p99Item = payload.find((p) => p.dataKey === "p99");
                        const tooltipItems = [
                          ...(p99Item?.value != null ? [{ name: "P99 Spike", value: `${p99Item.value} ms`, color: PALETTE.rose }] : []),
                          { name: "P95 Tail", value: p95Item?.value != null ? `${p95Item.value} ms` : "--", color: PALETTE.grayDark },
                          { name: "P50 Median", value: p50Item?.value != null ? `${p50Item.value} ms` : "--", color: PALETTE.brand },
                        ];
                        return (
                          <BiTooltip
                            active
                            label={label}
                            payload={tooltipItems}
                          />
                        );
                      }}
                    />
                    {(latencyMetricFilter === "all" || latencyMetricFilter === "p99") && latencyData.some((d) => d.p99 != null) && (
                      <Line type="monotone" dataKey="p99" stroke={PALETTE.rose} strokeWidth={1.5} strokeDasharray="3 3" dot={false} activeDot={{ r: 3 }} />
                    )}
                    {(latencyMetricFilter === "all" || latencyMetricFilter === "p95") && (
                      <Line type="monotone" dataKey="p95" stroke={PALETTE.grayDark} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                    )}
                    {(latencyMetricFilter === "all" || latencyMetricFilter === "p50") && (
                      <Line type="monotone" dataKey="p50" stroke={PALETTE.brand} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center p-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                <Activity className="w-6 h-6 text-slate-300 mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">No inference telemetry recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm">
                  Deploy a container endpoint and perform test predictions to log real P50/P95 latency curves.
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Target SLA: &lt;15ms</span>
            <span>Source: deployment_metrics table</span>
          </div>
        </div>

        {/* Model Registry Lifecycle Donut Chart */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Model Distribution
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Breakdown by lifecycle promotion stage
                </p>
              </div>
              <Link
                to="/app/models"
                className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-0.5 transition"
              >
                <span>Catalog</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Recharts Donut PieChart or Empty State */}
            {stageCounts.total > 0 ? (
              <div className="relative h-44 w-full my-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieStageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieStageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0];
                        return (
                          <BiTooltip
                            active
                            label={p.name}
                            payload={[
                              { name: "Model Count", value: p.value, color: p.payload.color },
                            ]}
                          />
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-semibold font-mono text-slate-900">
                    {stageCounts.total}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Versions
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center p-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 my-1">
                <Box className="w-6 h-6 text-slate-300 mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">No model versions registered</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Register models in the catalog to see stage breakdown.
                </p>
              </div>
            )}

            {/* Legend Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-emerald-500" />
                <span className="text-slate-600">Production ({stageCounts.PRODUCTION})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-emerald-400" />
                <span className="text-slate-600">Candidate ({stageCounts.CANDIDATE})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-emerald-300" />
                <span className="text-slate-600">Staging ({stageCounts.STAGING})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-slate-300" />
                <span className="text-slate-600">Development ({stageCounts.DEVELOPMENT})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-slate-400" />
                <span className="text-slate-600">Archived ({stageCounts.ARCHIVED})</span>
              </div>
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Catalog Total: {stats.models_count} Models</span>
            <span>Real SQL Aggregation</span>
          </div>
        </div>
      </div>

      {/* ── SECTION 5: INFRASTRUCTURE & LIFECYCLE FUNNEL ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Core Subsystem Availability (Real Network Probes) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Platform Subsystems Status
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Live connectivity &amp; network latency probes across MLOps services
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                /health/services
              </span>
            </div>

            <div className="space-y-2.5 my-3">
              {services.map((s) => (
                <div
                  key={s.name}
                  className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        s.status === "online" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <span className="font-semibold text-slate-800">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="text-slate-500">RTT: {s.latency}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        s.status === "online"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {s.uptime || s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>
              Status:{" "}
              {services.every((s) => s.status === "online")
                ? "All Subsystems Connected"
                : "Partial Service Degradation"}
            </span>
            <span>Real HTTP/TCP Probes</span>
          </div>
        </div>

        {/* Real Lifecycle Funnel */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="mb-2 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Lifecycle Funnel
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Ingestion to production progression</p>
            </div>

            {funnelData.some((f) => f.value > 0) ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <RechartsTooltip />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                      {funnelData.map((f, idx) => (
                        <Cell key={`funnel-${idx}`} fill={f.fill} />
                      ))}
                      <LabelList position="right" fill="#475569" stroke="none" dataKey="name" fontSize={11} />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center p-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                <Info className="w-6 h-6 text-slate-300 mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">Funnel pipeline is empty</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ingest datasets, execute runs and register models to view progression.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>In Production</span>
            <span className="font-semibold text-slate-700">
              {stageCounts.PRODUCTION} Models Active
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 6: MODEL BENCHMARKS & DRIFT TRAJECTORY ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Model Benchmark Matrix */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Model Benchmark Matrix
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Validation ROC-AUC vs. F1-Score recorded on registered model versions
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                MLflow Metrics
              </span>
            </div>

            {benchmarkData.length > 0 && benchmarkData.some((b) => b.has_metrics) ? (
              <div className="h-50 w-full my-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={benchmarkData}
                    margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                    barSize={12}
                  >
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="model" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 1.0]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(2)} />
                    <ReferenceLine y={0.80} stroke={PALETTE.grayMid} strokeDasharray="3 3" label={{ value: "Gate: 0.80", fill: PALETTE.grayDark, fontSize: 10, position: "insideBottomLeft" }} />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <BiTooltip
                            active
                            label={d.full_name || label}
                            payload={[
                              { name: "Stage", value: d.stage, color: PALETTE.grayDark },
                              { name: "ROC-AUC", value: d.auc > 0 ? d.auc.toFixed(3) : "N/A", color: PALETTE.brand },
                              { name: "F1-Score / Accuracy", value: d.f1 > 0 ? d.f1.toFixed(3) : "N/A", color: PALETTE.grayDark },
                            ]}
                          />
                        );
                      }}
                    />
                    <Bar dataKey="auc" name="ROC-AUC" fill={PALETTE.brand} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="f1" name="F1-Score" fill={PALETTE.grayDark} radius={[2, 2, 0, 0]} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-50 flex flex-col items-center justify-center p-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 my-1">
                <Box className="w-6 h-6 text-slate-300 mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">No benchmark metrics recorded</p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm">
                  Register models with validation metrics (ROC-AUC, F1, accuracy) from MLflow runs to plot benchmarks.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Source: ModelVersion.metrics</span>
            <span>Real Evaluation Scores</span>
          </div>
        </div>

        {/* Drift Evaluations Trajectory */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="mb-2 pb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Drift Evaluations
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Historical feature drift checks</p>
              </div>
              <Link
                to="/app/monitoring"
                className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-0.5 transition"
              >
                <span>Monitoring</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {driftData.length > 0 ? (
              <div className="space-y-2 my-2">
                {driftData.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{d.model_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{d.date}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-semibold text-slate-700">
                        Drift: {(d.drift_share * 100).toFixed(1)}%
                      </span>
                      <div className="text-[10px] text-slate-400 uppercase">{d.drift_status}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center p-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 my-1">
                <ShieldCheck className="w-6 h-6 text-slate-300 mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">No drift evaluations recorded</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Run drift checks on datasets or models in Monitoring to track drift.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Total Drift Checks: {driftData.length}</span>
            <span>Evidently PSI</span>
          </div>
        </div>
      </div>

      {/* ── SECTION 7: PRODUCTION MODELS & ACTIVE TEST PING ENDPOINTS ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Model Registry Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-700">
                  <Box className="w-4 h-4 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Model Registry
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Governed artifacts &amp; validation stages
                  </p>
                </div>
              </div>
              <Link
                to="/app/models"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 group transition"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {displayModels.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                No cataloged models found.
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayModels.map((m, idx) => (
                  <Link
                    key={idx}
                    to={`/app/models?search=${encodeURIComponent(m.name)}`}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:border-[#3BB48C]/60 group-hover:text-[#3BB48C] transition shrink-0 shadow-2xs">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs truncate group-hover:text-[#3BB48C] transition">
                            {m.name}
                          </span>
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            v{m.version}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate flex items-center gap-1.5">
                          <span>
                            {m.metrics?.f1_score
                              ? `F1: ${(m.metrics.f1_score * 100).toFixed(1)}%`
                              : m.metrics?.accuracy
                              ? `Acc: ${(m.metrics.accuracy * 100).toFixed(1)}%`
                              : "MLflow Tracked"}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-400">
                            Run #{m.mlflow_run_id ? m.mlflow_run_id.slice(0, 7) : `v${m.version}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2">
                      <StatusBadge status={m.stage || "DEVELOPMENT"} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Inference Endpoints Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-700">
                  <Server className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Active Inference Endpoints
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    FastAPI Docker microservices with live health probes
                  </p>
                </div>
              </div>
              <Link
                to="/app/deployments"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 group transition"
              >
                <span>Manage</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {displayDeployments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                No running containers found.
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayDeployments.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                          <Server className="w-4 h-4 text-slate-600" />
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-xs truncate">
                              {d.model_name}
                            </span>
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                              v{d.model_version}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate flex items-center gap-1.5">
                            <span className="text-emerald-700 font-medium font-mono">Port :{d.port}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-400">FastAPI Container</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTestPing(d)}
                        disabled={pingingId === d.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-900 hover:text-white text-slate-700 border border-slate-200 text-xs font-semibold transition-all shadow-2xs cursor-pointer group shrink-0 active:scale-95"
                      >
                        <Zap className={`w-3.5 h-3.5 text-emerald-600 group-hover:text-emerald-400 transition ${pingingId === d.id ? "animate-bounce" : ""}`} />
                        <span>{pingingId === d.id ? "Pinging..." : "Test Ping"}</span>
                      </button>
                    </div>

                    {pingResult && pingResult.id === d.id && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] animate-in fade-in">
                        {pingResult.isHealthy ? (
                          <>
                            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Probe OK • Latency {pingResult.latency}ms</span>
                            </div>
                            <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                              Status: {String(pingResult.prediction?.status || "HEALTHY")}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 text-rose-700 font-semibold font-mono">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>Probe Failed • {pingResult.latency > 0 ? `${pingResult.latency}ms` : "Unreachable"}</span>
                            </div>
                            <span
                              className="font-mono text-[10px] bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md font-semibold max-w-[220px] truncate"
                              title={String(pingResult.prediction?.error || pingResult.prediction?.detail || pingResult.prediction?.status || "UNREACHABLE")}
                            >
                              Status: {String(pingResult.prediction?.error || pingResult.prediction?.detail || pingResult.prediction?.status || "UNREACHABLE")}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
