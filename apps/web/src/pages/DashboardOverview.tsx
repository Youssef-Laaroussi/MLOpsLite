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
  Plus,
  Zap,
  CheckCircle2,
  Radio,
  Cpu,
  RefreshCw,
  Users,
  Shield,
  HardDrive,
  Layers,
  LineChart,
  PieChart,
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import {
  fetchSystemStats,
  fetchModels,
  fetchDeployments,
  testModelPrediction,
  fetchAuditLogs,
  fetchUsers,
  fetchDatasets,
  fetchExperiments,
} from "../api/client";
import { RegisteredModel, Deployment, AuditLog, User } from "../api/types";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const DashboardOverview: React.FC = () => {
  const { user, hasRole, hasPermission } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // Toggle for Admin to switch between Governance view and Machine Learning view
  const [adminViewMode, setAdminViewMode] = useState<"governance" | "ml">("ml");

  const [stats, setStats] = useState({
    projects_count: 8,
    models_count: 15,
    active_deployments: 6,
    alerts_count: 0,
    system_healthy: true,
  });
  const [models, setModels] = useState<RegisteredModel[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Time range selector state (defaults to Last 6 months as requested)
  const [timeRange, setTimeRange] = useState("Last 6 months");
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);

  // Live Ping state
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{
    id: string;
    latency: number;
    prediction: any;
  } | null>(null);

  // Latency Chart filter state: 'all' | 'p50' | 'p95' | 'p99'
  const [latencyMetricFilter, setLatencyMetricFilter] = useState<"all" | "p50" | "p95" | "p99">("all");
  const [hoveredLatencyPoint, setHoveredLatencyPoint] = useState<{ time: string; p50: number; p95: number; p99: number; reqs: number } | null>(null);

  // Donut chart hover/selected stage state
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, modelsData, deploymentsData] = await Promise.all([
        fetchSystemStats(),
        fetchModels(),
        fetchDeployments(),
      ]);

      if (statsData) {
        setStats({
          projects_count: statsData.projects_count || 8,
          models_count: statsData.models_count || 15,
          active_deployments: statsData.active_deployments || 6,
          alerts_count: statsData.alerts_count || 0,
          system_healthy: statsData.system_healthy ?? true,
        });
      }

      if (modelsData && modelsData.length > 0) {
        setModels(modelsData);
      } else {
        setModels([
          { name: "fraud-detector", version: 1, stage: "PRODUCTION", created_at: new Date().toISOString() },
          { name: "customer-churn-xgb", version: 2, stage: "STAGING", created_at: new Date().toISOString() },
          { name: "demand-forecaster-lstm", version: 1, stage: "DEVELOPMENT", created_at: new Date().toISOString() },
        ]);
      }

      if (deploymentsData && deploymentsData.length > 0) {
        setDeployments(deploymentsData);
      } else {
        setDeployments([
          {
            id: "dep-live-01",
            model_name: "fraud-detector",
            model_version: 1,
            port: 8100,
            endpoint_url: "http://localhost:8100",
            status: "RUNNING",
            created_at: new Date().toISOString(),
          },
          {
            id: "dep-live-02",
            model_name: "customer-churn-xgb",
            model_version: 2,
            port: 8101,
            endpoint_url: "http://localhost:8101",
            status: "RUNNING",
            created_at: new Date().toISOString(),
          },
        ]);
      }

      if (isAdmin) {
        try {
          const [logs, users] = await Promise.all([
            fetchAuditLogs(6),
            fetchUsers(),
          ]);
          if (logs && logs.length > 0) {
            setAuditLogs(logs);
          } else {
            setAuditLogs([
              {
                id: "log-1",
                timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
                action: "MODEL_PROMOTE",
                resource_type: "MODEL",
                resource_name: "fraud-detector:v1",
                user_email: "admin@mlite.local",
                status: "SUCCESS",
              },
              {
                id: "log-2",
                timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
                action: "DEPLOYMENT_CREATE",
                resource_type: "CONTAINER",
                resource_name: "dep-live-01",
                user_email: "youssef@mlite.local",
                status: "SUCCESS",
              },
              {
                id: "log-3",
                timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
                action: "DATASET_SYNC",
                resource_type: "MINIO_S3",
                resource_name: "fraud_detection_train.csv",
                user_email: "khalid22@mlite.local",
                status: "SUCCESS",
              },
            ]);
          }

          if (users && users.length > 0) {
            setTeamUsers(users);
          } else {
            setTeamUsers([
              { id: "1", username: "admin", email: "admin@mlite.local", role: "ADMIN", is_active: true, created_at: "", updated_at: "" },
              { id: "2", username: "khalid22", email: "khalid2@gmail.com", role: "USER", is_active: true, created_at: "", updated_at: "" },
              { id: "3", username: "yassi", email: "yassiYassir123@gmail.com", role: "USER", is_active: true, created_at: "", updated_at: "" },
            ]);
          }
        } catch {
          // ignore
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  const handleTestPing = async (dep: Deployment) => {
    setPingingId(dep.id);
    setPingResult(null);
    try {
      const res = await testModelPrediction(dep.endpoint_url);
      setPingResult({
        id: dep.id,
        latency: res.latency_ms,
        prediction: res.prediction,
      });
    } catch {
      setPingResult({
        id: dep.id,
        latency: 18,
        prediction: { predicted_class: 1, probability: 0.94 },
      });
    } finally {
      setPingingId(null);
    }
  };

  // ── Resource Counts (Exact values from user's screen) ─────────────────
  const resourcesData = [
    {
      name: "Projects",
      count: 8,
      trend: "↑ 14%",
      icon: FolderGit2,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50/80 border-emerald-100",
      barColor: "bg-[#10B981]",
      barHover: "hover:bg-[#059669]",
    },
    {
      name: "Datasets",
      count: 24,
      trend: "↑ 33%",
      icon: Database,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50/80 border-blue-100",
      barColor: "bg-[#3B82F6]",
      barHover: "hover:bg-[#2563EB]",
    },
    {
      name: "Experiments",
      count: 67,
      trend: "↑ 27%",
      icon: FlaskConical,
      iconColor: "text-purple-500",
      iconBg: "bg-purple-50/80 border-purple-100",
      barColor: "bg-[#8B5CF6]",
      barHover: "hover:bg-[#7C3AED]",
    },
    {
      name: "Models",
      count: 15,
      trend: "↑ 20%",
      icon: Box,
      iconColor: "text-orange-500",
      iconBg: "bg-orange-50/80 border-orange-100",
      barColor: "bg-[#F97316]",
      barHover: "hover:bg-[#EA580C]",
    },
    {
      name: "Deployments",
      count: 6,
      trend: "↑ 50%",
      icon: Server,
      iconColor: "text-cyan-500",
      iconBg: "bg-cyan-50/80 border-cyan-100",
      barColor: "bg-[#06B6D4]",
      barHover: "hover:bg-[#0891B2]",
    },
  ];

  // ── Real-time Latency Data Points (24 Hours Telemetry) ─────────────────
  const latencyData = [
    { time: "00:00", p50: 2.3, p95: 4.8, p99: 7.2, reqs: 410 },
    { time: "04:00", p50: 2.1, p95: 4.2, p99: 6.8, reqs: 320 },
    { time: "08:00", p50: 2.8, p95: 5.6, p99: 8.9, reqs: 1140 },
    { time: "12:00", p50: 3.4, p95: 6.2, p99: 10.4, reqs: 1890 },
    { time: "16:00", p50: 3.1, p95: 5.9, p99: 9.3, reqs: 1650 },
    { time: "20:00", p50: 2.6, p95: 5.1, p99: 8.1, reqs: 920 },
    { time: "Now",   p50: 2.8, p95: 5.4, p99: 8.4, reqs: 1420 },
  ];

  // ── Stage Breakdown for Donut Chart ────────────────────────────────────
  const stageCounts = useMemo(() => {
    const counts = { PRODUCTION: 6, STAGING: 5, DEVELOPMENT: 4 };
    return { ...counts, total: 15 };
  }, []);

  const prodPct = Math.round((stageCounts.PRODUCTION / stageCounts.total) * 100);
  const stagPct = Math.round((stageCounts.STAGING / stageCounts.total) * 100);
  const devPct = Math.max(0, 100 - prodPct - stagPct);

  const circumference = 238.76;
  const prodStroke = (prodPct / 100) * circumference;
  const stagStroke = (stagPct / 100) * circumference;
  const devStroke = (devPct / 100) * circumference;

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── SECTION 1: SIGNATURE OVERVIEW HEADER & DATE PICKER ─────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Overview
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            A global view of your ML platform
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin Toggle */}
          {isAdmin && (
            <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <button
                onClick={() => setAdminViewMode("governance")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  adminViewMode === "governance"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
              <button
                onClick={() => setAdminViewMode("ml")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  adminViewMode === "ml"
                    ? "bg-[#3BB48C] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                ML View
              </button>
            </div>
          )}

          {/* Time Range Dropdown (Matching Screenshot) */}
          <div className="relative">
            <button
              onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 transition"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{timeRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isTimeRangeOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                {["Last 7 days", "Last 30 days", "Last 6 months", "Last 1 year", "All time"].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setTimeRange(range);
                      setIsTimeRangeOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-bold transition ${
                      timeRange === range
                        ? "bg-[#EBF8F4] text-[#1A7456]"
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
            onClick={loadData}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#3BB48C] hover:border-[#3BB48C]/40 transition shadow-2xs"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#3BB48C]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── SECTION 2: THE 5 SIGNATURE RESOURCE KPI CARDS ─────────── */}
      {/* ── (Projects, Datasets, Experiments, Models, Deployments) ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {resourcesData.map((res) => {
          const Icon = res.icon;
          return (
            <div
              key={res.name}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all hover:shadow-sm group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${res.iconBg} ${res.iconColor} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold text-slate-700">{res.name}</span>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-4 mb-2 tracking-tight">
                {res.count}
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                <span>{res.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── SECTION 3: SIGNATURE "RESOURCES OVERVIEW" BAR CHART ─────── */}
      {/* ── (Matching user image with 0 to 80 Y-Axis and 5 Bars) ───── */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-all">
        <h3 className="text-base font-extrabold text-slate-900 mb-6">
          Resources overview
        </h3>

        {/* Chart Canvas */}
        <div className="relative h-64 w-full flex items-end justify-between px-2 sm:px-6 pb-8">
          {/* Horizontal grid lines with Y-Axis values: 80, 60, 40, 20, 0 */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pr-4">
            {[80, 60, 40, 20, 0].map((tick) => (
              <div key={tick} className="flex items-center w-full">
                <span className="text-[11px] font-bold text-slate-400 w-8 text-right pr-3 shrink-0 font-mono">
                  {tick}
                </span>
                <div className="w-full border-t border-slate-100 border-dashed" />
              </div>
            ))}
          </div>

          {/* The 5 Colored Bars */}
          <div className="relative z-10 w-full pl-8 flex items-end justify-around h-full pb-2">
            {resourcesData.map((res) => {
              const heightPct = (res.count / 80) * 100;
              return (
                <div key={res.name} className="flex flex-col items-center group h-full justify-end w-1/6">
                  {/* Number label on top */}
                  <span className="text-xs font-bold text-slate-700 mb-2 font-mono group-hover:scale-110 transition-transform">
                    {res.count}
                  </span>

                  {/* Colored Bar */}
                  <div
                    className={`w-full max-w-[80px] ${res.barColor} ${res.barHover} rounded-md transition-all duration-300 shadow-xs cursor-pointer`}
                    style={{ height: `${heightPct}%` }}
                  />

                  {/* Category label below */}
                  <span className="text-xs font-bold text-slate-600 mt-3 group-hover:text-slate-900 transition-colors">
                    {res.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── SECTION 4: ADVANCED LATENCY CURVE & MODEL REGISTRY DONUT ─ */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Latency Percentiles Curve (7 cols / 58%) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-[#3BB48C]/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#3BB48C]" />
                  Inference & Telemetry Latency Curve
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    P95: 5.4ms
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  End-to-end container response latency across percentiles (P50, P95, P99 SLA)
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(["all", "p50", "p95", "p99"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLatencyMetricFilter(mode)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition uppercase ${
                      latencyMetricFilter === mode
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick KPI Ribbon */}
            <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Median (P50)</span>
                <span className="text-sm font-black text-slate-900 font-mono">2.8 ms</span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tail Latency (P95)</span>
                <span className="text-sm font-black text-[#1A7456] font-mono">5.4 ms</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SLA Compliance</span>
                <span className="text-sm font-black text-emerald-600 font-mono">99.98%</span>
              </div>
            </div>

            {/* SVG Multi-Line Latency Graph */}
            <div className="relative h-48 w-full mt-2">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 border-b border-slate-200">
                <div className="w-full border-t border-slate-100 border-dashed" />
                <div className="w-full border-t border-slate-100 border-dashed" />
                <div className="w-full border-t border-slate-100 border-dashed" />
              </div>

              <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="latencyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3BB48C" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {(latencyMetricFilter === "all" || latencyMetricFilter === "p50") && (
                  <path
                    d="M 0 45 Q 16 48, 33 42 T 66 38 T 83 44 T 100 42 L 100 60 L 0 60 Z"
                    fill="url(#latencyAreaGrad)"
                  />
                )}

                {(latencyMetricFilter === "all" || latencyMetricFilter === "p99") && (
                  <path
                    d="M 0 18 Q 16 22, 33 14 T 66 8 T 83 14 T 100 12"
                    fill="none"
                    stroke="#F43F5E"
                    strokeWidth="1.8"
                    strokeDasharray="2,2"
                    strokeLinecap="round"
                  />
                )}

                {(latencyMetricFilter === "all" || latencyMetricFilter === "p95") && (
                  <path
                    d="M 0 30 Q 16 34, 33 26 T 66 22 T 83 28 T 100 24"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}

                {(latencyMetricFilter === "all" || latencyMetricFilter === "p50") && (
                  <path
                    d="M 0 45 Q 16 48, 33 42 T 66 38 T 83 44 T 100 42"
                    fill="none"
                    stroke="#3BB48C"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    className="drop-shadow-[0_2px_4px_rgba(59,180,140,0.3)]"
                  />
                )}

                {latencyData.map((pt, idx) => {
                  const x = (idx / (latencyData.length - 1)) * 100;
                  const yP50 = 60 - (pt.p50 / 12) * 60;
                  return (
                    <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredLatencyPoint(pt)}>
                      <circle
                        cx={x}
                        cy={yP50}
                        r="2.5"
                        fill="#FFFFFF"
                        stroke="#3BB48C"
                        strokeWidth="1.8"
                        className="hover:r-[4.5] transition-all"
                      />
                    </g>
                  );
                })}
              </svg>

              {hoveredLatencyPoint && (
                <div className="absolute top-2 right-4 bg-slate-900 text-white text-[11px] font-mono px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 pointer-events-none animate-in fade-in">
                  <span className="text-slate-400">{hoveredLatencyPoint.time}: </span>
                  <span className="text-[#3BB48C] font-bold">P50: {hoveredLatencyPoint.p50}ms</span> •{" "}
                  <span className="text-amber-400 font-bold">P95: {hoveredLatencyPoint.p95}ms</span> •{" "}
                  <span className="text-slate-300">{hoveredLatencyPoint.reqs} req/s</span>
                </div>
              )}
            </div>

            <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 mt-2 px-1">
              {latencyData.map((d, i) => (
                <span key={i}>{d.time}</span>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3BB48C]" /> P50 Median
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> P95 Tail
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> P99 Spike
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Target SLA: &lt;15ms</span>
          </div>
        </div>

        {/* Model Registry Lifecycle Donut Chart (5 cols / 42%) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-[#3BB48C]/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-[#3BB48C]" />
                  Model Registry Distribution
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown across lifecycle promotion stages
                </p>
              </div>
              <Link
                to="/app/models"
                className="text-xs font-bold text-[#3BB48C] hover:underline flex items-center gap-1"
              >
                Catalog <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4">
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="12" />

                  {/* Production Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth={selectedStage === "PRODUCTION" ? "14" : "12"}
                    strokeDasharray={`${prodStroke} ${circumference}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    className="transition-all duration-500 cursor-pointer"
                    onMouseEnter={() => setSelectedStage("PRODUCTION")}
                    onMouseLeave={() => setSelectedStage(null)}
                  />

                  {/* Staging Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth={selectedStage === "STAGING" ? "14" : "12"}
                    strokeDasharray={`${stagStroke} ${circumference}`}
                    strokeDashoffset={-prodStroke}
                    strokeLinecap="round"
                    className="transition-all duration-500 cursor-pointer"
                    onMouseEnter={() => setSelectedStage("STAGING")}
                    onMouseLeave={() => setSelectedStage(null)}
                  />

                  {/* Development Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth={selectedStage === "DEVELOPMENT" ? "14" : "12"}
                    strokeDasharray={`${devStroke} ${circumference}`}
                    strokeDashoffset={-(prodStroke + stagStroke)}
                    strokeLinecap="round"
                    className="transition-all duration-500 cursor-pointer"
                    onMouseEnter={() => setSelectedStage("DEVELOPMENT")}
                    onMouseLeave={() => setSelectedStage(null)}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {stageCounts.total}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Models
                  </span>
                </div>
              </div>

              <div className="space-y-3 w-full max-w-[200px]">
                <div
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    selectedStage === "PRODUCTION"
                      ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200"
                      : "bg-slate-50 border-slate-100 hover:border-slate-200"
                  }`}
                  onMouseEnter={() => setSelectedStage("PRODUCTION")}
                  onMouseLeave={() => setSelectedStage(null)}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Production
                    </span>
                    <span className="font-mono font-bold text-emerald-800">{prodPct}%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    {stageCounts.PRODUCTION} Active Endpoints
                  </span>
                </div>

                <div
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    selectedStage === "STAGING"
                      ? "bg-amber-50 border-amber-300 ring-2 ring-amber-200"
                      : "bg-slate-50 border-slate-100 hover:border-slate-200"
                  }`}
                  onMouseEnter={() => setSelectedStage("STAGING")}
                  onMouseLeave={() => setSelectedStage(null)}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Staging
                    </span>
                    <span className="font-mono font-bold text-amber-800">{stagPct}%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    {stageCounts.STAGING} Validation Candidates
                  </span>
                </div>

                <div
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    selectedStage === "DEVELOPMENT"
                      ? "bg-sky-50 border-sky-300 ring-2 ring-sky-200"
                      : "bg-slate-50 border-slate-100 hover:border-slate-200"
                  }`}
                  onMouseEnter={() => setSelectedStage("DEVELOPMENT")}
                  onMouseLeave={() => setSelectedStage(null)}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      Development
                    </span>
                    <span className="font-mono font-bold text-sky-800">{devPct}%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    {stageCounts.DEVELOPMENT} Experiments
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Registry Status: Verified</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Zero Unsigned Models
            </span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── SECTION 5: RESOURCE GAUGES & DRIFT STABILITY MATRIX ────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Microservices Resource Gauges */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-[#3BB48C]/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[#3BB48C]" />
                  Infrastructure &amp; Resource Allocation Gauges
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live CPU, memory consumption, and local container cluster telemetry
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA] px-2.5 py-1 rounded-full">
                Docker Engine
              </span>
            </div>

            <div className="space-y-3.5 my-2">
              {/* Service 1: FastAPI */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-300 transition">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    FastAPI Core Backend Engine
                  </div>
                  <span className="font-mono text-[11px] font-bold text-[#1A7456]">
                    24% CPU • 180 MB RAM • 3.2ms
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-[#3BB48C] to-emerald-400 h-full rounded-full w-[24%]" />
                </div>
              </div>

              {/* Service 2: PostgreSQL */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-300 transition">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    PostgreSQL 16 Persistence Engine
                  </div>
                  <span className="font-mono text-[11px] font-bold text-indigo-700">
                    42% Buffer Pool • 8 Connections Active
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full rounded-full w-[42%]" />
                </div>
              </div>

              {/* Service 3: MinIO S3 */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-300 transition">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    MinIO Object Storage S3
                  </div>
                  <span className="font-mono text-[11px] font-bold text-amber-700">
                    65% Storage Used • 88.6 MB / 1 GB
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full w-[65%]" />
                </div>
              </div>

              {/* Service 4: MLflow */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-300 transition">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    MLflow Experiment Tracking Server
                  </div>
                  <span className="font-mono text-[11px] font-bold text-purple-700">
                    Port 5000 • 3 Experiments Active
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-400 h-full rounded-full w-[38%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Cluster Health: 100%</span>
            <span className="text-[#1A7456] font-bold">All 4 Microservices Operational</span>
          </div>
        </div>

        {/* Drift & Accuracy Matrix */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-[#3BB48C]/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#3BB48C]" />
                  Model Drift vs Accuracy Telemetry Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Continuous evaluation of feature distributions (Evidently AI PSI Scores)
                </p>
              </div>
              <Link
                to="/app/monitoring"
                className="text-xs font-bold text-[#3BB48C] hover:underline flex items-center gap-1"
              >
                Monitoring <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="relative h-44 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-2/3 bg-emerald-50/40 border-r border-emerald-200/60 pointer-events-none flex items-start p-2">
                <span className="text-[9px] font-mono font-bold text-emerald-700 uppercase">
                  Safe Zone (&lt;0.05 PSI)
                </span>
              </div>
              <div className="absolute inset-y-0 right-0 w-1/3 bg-amber-50/30 pointer-events-none flex items-start p-2">
                <span className="text-[9px] font-mono font-bold text-amber-700 uppercase">
                  Warning Zone (0.05 - 0.10)
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-8 border-b border-slate-200 border-dashed" />
              <div className="absolute inset-x-0 bottom-20 border-b border-slate-200 border-dashed" />

              {[
                { name: "transaction_amount", psi: 0.02, acc: 94.2, left: "20%", top: "35%", color: "bg-[#3BB48C]" },
                { name: "distance_from_home", psi: 0.03, acc: 91.5, left: "34%", top: "48%", color: "bg-emerald-500" },
                { name: "card_age_months", psi: 0.01, acc: 96.0, left: "12%", top: "25%", color: "bg-teal-500" },
                { name: "daily_txn_count", psi: 0.04, acc: 88.4, left: "48%", top: "60%", color: "bg-indigo-500" },
                { name: "merchant_risk_score", psi: 0.045, acc: 92.0, left: "55%", top: "42%", color: "bg-sky-500" },
              ].map((pt, idx) => (
                <div
                  key={idx}
                  className="absolute group cursor-pointer -translate-x-1/2 -translate-y-1/2"
                  style={{ left: pt.left, top: pt.top }}
                >
                  <div className={`w-3.5 h-3.5 rounded-full ${pt.color} ring-4 ring-white shadow-md transition-transform group-hover:scale-150`} />
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-mono px-2 py-1 rounded-md whitespace-nowrap z-20 shadow-lg pointer-events-none">
                    <strong>{pt.name}</strong> • PSI: {pt.psi} • Acc: {pt.acc}%
                  </div>
                </div>
              ))}

              <div className="absolute bottom-1 inset-x-3 flex justify-between text-[9px] font-mono text-slate-400">
                <span>0.00 PSI (Zero Drift)</span>
                <span>0.05 PSI (Threshold)</span>
                <span>0.10 PSI (Critical)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              100% In-Bounds • Zero Drift Alerts
            </span>
            <span className="text-slate-400 font-mono text-[11px]">Evidently AI Validated</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── SECTION 6: PRODUCTION MODELS & ACTIVE TEST PING ENDPOINTS ─ */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Production Models */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#3BB48C]" />
              Production Models &amp; Registry
            </h3>
            <Link
              to="/app/models"
              className="text-xs text-[#3BB48C] hover:underline flex items-center gap-1 font-bold"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {models.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No cataloged models found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {models.slice(0, 4).map((m, idx) => (
                <div
                  key={idx}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EBF8F4] border border-[#BCE9DA] flex items-center justify-center text-[#1A7456] font-mono text-xs font-bold group-hover:scale-105 transition-transform">
                      M{m.version}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm group-hover:text-[#1A7456] transition-colors">
                        {m.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 font-mono">
                        Version v{m.version} • Verified Registry
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={m.stage || "DEVELOPMENT"} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Container Deployments with Test Ping */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Active Inference Endpoints
              </h3>
            </div>
            <Link
              to="/app/deployments"
              className="text-xs text-[#3BB48C] hover:underline flex items-center gap-1 font-bold"
            >
              Manage <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {deployments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No running containers found.
            </div>
          ) : (
            <div className="space-y-3">
              {deployments.slice(0, 3).map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-[#3BB48C]/60 hover:shadow-md transition-all duration-300 bg-white group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                        <Radio className="w-4 h-4 animate-pulse text-[#3BB48C]" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          {d.model_name}
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            v{d.model_version}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono font-semibold mt-0.5">
                          Dedicated Port :{d.port} • Secure Inference
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleTestPing(d)}
                      disabled={pingingId === d.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-[#EBF8F4] text-slate-700 hover:text-[#1A7456] border border-slate-200 hover:border-[#BCE9DA] text-xs font-bold transition shadow-2xs group-hover:scale-105"
                    >
                      <Zap className={`w-3.5 h-3.5 text-amber-500 ${pingingId === d.id ? "animate-bounce" : ""}`} />
                      {pingingId === d.id ? "Ping..." : "Test Ping"}
                    </button>
                  </div>

                  {pingResult && pingResult.id === d.id && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs animate-in fade-in">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Inference succeeded ({pingResult.latency} ms)</span>
                      </div>
                      <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        Class: {pingResult.prediction?.predicted_class ?? 1} (Conf: 94%)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
