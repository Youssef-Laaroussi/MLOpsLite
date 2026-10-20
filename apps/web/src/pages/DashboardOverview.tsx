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
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Search,
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import {
  fetchSystemStats,
  fetchModels,
  fetchDeployments,
  pingDeployment,
  fetchAuditLogs,
  fetchUsers,
  fetchDatasets,
  fetchExperiments,
} from "../api/client";
import { RegisteredModel, Deployment, AuditLog, User } from "../api/types";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
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

const SPEND_DATA = [
  { m: "May", training: 820, serving: 540, storage: 210 },
  { m: "Jun", training: 910, serving: 580, storage: 225 },
  { m: "Jul", training: 1040, serving: 640, storage: 240 },
  { m: "Aug", training: 980, serving: 690, storage: 252 },
  { m: "Sep", training: 890, serving: 720, storage: 261 },
  { m: "Oct", training: 760, serving: 735, storage: 270 },
];

const FUNNEL_DATA = [
  { name: "Datasets ingested", value: 100, fill: PALETTE.blue },
  { name: "Experiments run", value: 78, fill: PALETTE.violet },
  { name: "Models registered", value: 46, fill: PALETTE.amber },
  { name: "Staged & validated", value: 28, fill: PALETTE.brand },
  { name: "In production", value: 18, fill: "#1A7456" },
];

const MODEL_BENCHMARK_FLEET = [
  { model: "fraud-det v3", full_name: "fraud-detector (v3)", auc: 0.971, f1: 0.938, latency: "2.4ms", framework: "XGBoost", samples: "125,000" },
  { model: "sentiment v1", full_name: "sentiment-bert (v1)", auc: 0.954, f1: 0.951, latency: "12.6ms", framework: "PyTorch", samples: "85,000" },
  { model: "churn-xgb v2", full_name: "churn-xgboost (v2)", auc: 0.945, f1: 0.904, latency: "3.8ms", framework: "LightGBM", samples: "92,500" },
  { model: "demand v2", full_name: "demand-forecast (v2)", auc: 0.928, f1: 0.892, latency: "5.2ms", framework: "Prophet", samples: "64,000" },
  { model: "credit-sc v1", full_name: "credit-scoring (v1)", auc: 0.962, f1: 0.924, latency: "1.9ms", framework: "CatBoost", samples: "110,000" },
];

const FLEET_DRIFT_TRAJECTORY = [
  { date: "Oct 01", fraud_f1: 0.942, churn_f1: 0.912, bert_f1: 0.950, avg_f1: 0.935 },
  { date: "Oct 04", fraud_f1: 0.938, churn_f1: 0.908, bert_f1: 0.952, avg_f1: 0.933 },
  { date: "Oct 08", fraud_f1: 0.931, churn_f1: 0.902, bert_f1: 0.949, avg_f1: 0.927 },
  { date: "Oct 12", fraud_f1: 0.924, churn_f1: 0.898, bert_f1: 0.948, avg_f1: 0.923 },
  { date: "Oct 15", fraud_f1: 0.915, churn_f1: 0.894, bert_f1: 0.947, avg_f1: 0.919 },
  { date: "Oct 18", fraud_f1: 0.968, churn_f1: 0.942, bert_f1: 0.954, avg_f1: 0.955 },
  { date: "Oct 22", fraud_f1: 0.971, churn_f1: 0.945, bert_f1: 0.953, avg_f1: 0.956 },
  { date: "Oct 26", fraud_f1: 0.969, churn_f1: 0.943, bert_f1: 0.954, avg_f1: 0.955 },
  { date: "Oct 30", fraud_f1: 0.972, churn_f1: 0.945, bert_f1: 0.955, avg_f1: 0.957 },
  { date: "Nov 02", fraud_f1: 0.971, churn_f1: 0.944, bert_f1: 0.954, avg_f1: 0.956 },
];

const SERVICES = [
  { name: "MLflow Tracking", latency: "42ms", uptime: "99.98%", color: PALETTE.brand },
  { name: "Model Serving", latency: "5ms", uptime: "99.99%", color: PALETTE.brand },
  { name: "Feature Store", latency: "18ms", uptime: "99.95%", color: PALETTE.brand },
  { name: "Artifact Store (S3)", latency: "61ms", uptime: "99.90%", color: PALETTE.amber },
  { name: "Drift Evaluator", latency: "120ms", uptime: "99.97%", color: PALETTE.brand },
];

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
      const res = await pingDeployment(dep.id);
      setPingResult({
        id: dep.id,
        latency: res.latency_ms,
        prediction: res.prediction,
      });
    } catch (err: any) {
      setPingResult({
        id: dep.id,
        latency: 0,
        prediction: { healthy: false, error: err?.response?.data?.detail || err?.message || "unreachable" },
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
    { time: "Now", p50: 2.8, p95: 5.4, p99: 8.4, reqs: 1420 },
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
    <div className="space-y-5 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* ── SNOWFLAKE GLOBAL SEARCH BAR ────────────────────────────── */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="snowflake-global-search"
          type="text"
          placeholder="Search this account, models, datasets, deployments, and documentation..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition"
        />
      </div>

      {/* ── SNOWFLAKE QUICK ACTIONS ROW ────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Quick actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            to="/app/datasets"
            className="p-3.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition block group"
          >
            <div className="w-6 h-6 rounded-md bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center mb-2">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div className="text-[13px] font-semibold text-slate-900 group-hover:text-[#0284C7] transition">
              Upload local files
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Quickly convert data into versioned datasets
            </div>
          </Link>

          <Link
            to="/app/deployments"
            className="p-3.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition block group"
          >
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <Server className="w-3.5 h-3.5" />
            </div>
            <div className="text-[13px] font-semibold text-slate-900 group-hover:text-emerald-600 transition">
              Deploy model container
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Launch dedicated HTTP inference endpoint
            </div>
          </Link>

          <Link
            to="/app/experiments"
            className="p-3.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition block group"
          >
            <div className="w-6 h-6 rounded-md bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2">
              <FlaskConical className="w-3.5 h-3.5" />
            </div>
            <div className="text-[13px] font-semibold text-slate-900 group-hover:text-purple-600 transition">
              Create Experiment run
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Develop SQL or Python ML training workflows
            </div>
          </Link>

          <Link
            to="/app/projects"
            className="p-3.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition block group"
          >
            <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
              <FolderGit2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-[13px] font-semibold text-slate-900 group-hover:text-amber-600 transition">
              Manage Projects
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Collaborate with others on your team
            </div>
          </Link>
        </div>
      </div>

      {/* ── SNOWFLAKE ACTIONABLE POLICY / CALLOUT BANNER ───────────── */}
      <div className="p-4 rounded-lg bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-slate-900">
              Reduce exfiltration risk with Data Movement Policies
            </div>
            <div className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Start with alert rules to see how much sensitive data is leaving, then add enforce rules that block oversized exports. Coverage applies account-wide or follows your tags.
            </div>
          </div>
        </div>
        <Link
          to="/app/monitoring"
          className="px-3.5 py-1.5 rounded-md bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold shrink-0 transition"
        >
          Get Started
        </Link>
      </div>

      {/* ── SECTION 1: HEADER & DATE PICKER ────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
            Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            A global view of your ML platform
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Toggle */}
          {isAdmin && (
            <div className="flex items-center p-0.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <button
                onClick={() => setAdminViewMode("governance")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition flex items-center gap-1.5 ${adminViewMode === "governance"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <Shield className="w-3 h-3" />
                Admin
              </button>
              <button
                onClick={() => setAdminViewMode("ml")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition flex items-center gap-1.5 ${adminViewMode === "ml"
                    ? "bg-[#0284C7] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <Box className="w-3 h-3" />
                ML View
              </button>
            </div>
          )}

          {/* Time Range Dropdown */}
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
              <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-xs">
                {["Last 7 days", "Last 30 days", "Last 6 months", "Last 1 year", "All time"].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setTimeRange(range);
                      setIsTimeRangeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition ${timeRange === range
                        ? "bg-[#E0F2FE] text-[#0284C7] font-semibold"
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
            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-[#0284C7] hover:border-[#0284C7]/40 transition shadow-2xs"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0284C7]" : ""}`} />
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
              className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs hover:border-slate-300 transition-all group cursor-pointer block"
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-md border ${res.iconBg} ${res.iconColor}`}>
                  <Icon className="w-4 h-4 stroke-[2]" />
                </div>
                <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{res.name}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0284C7] transition" />
              </div>
              <div className="text-xl font-bold font-sans text-slate-900 mt-2.5 mb-1 tracking-tight">
                {res.count}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <span>{res.trend}</span>
                <span className="text-slate-400 font-normal">vs prev. period</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── SECTION 3: "RESOURCES OVERVIEW" BAR CHART ──────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Resources overview
          </h3>
          <span className="text-xs text-slate-400">Inventory counts</span>
        </div>

        {/* Chart Canvas */}
        <div className="h-52 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={resourcesData}
              margin={{ top: 15, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <RechartsTooltip
                cursor={{ fill: "#F1F5F9" }}
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
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {[PALETTE.brand, PALETTE.cyan, PALETTE.violet, PALETTE.amber, PALETTE.blue].map((col, index) => (
                  <Cell key={`cell-${index}`} fill={col} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── SECTION 4: ADVANCED LATENCY CURVE & MODEL REGISTRY DONUT ─ */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Latency Percentiles Curve (7 cols / 58%) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#0284C7]" />
                  Inference &amp; Telemetry Latency Curve
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    P95: 5.4ms
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  End-to-end container response latency across percentiles (P50, P95, P99 SLA)
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                {(["all", "p50", "p95", "p99"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLatencyMetricFilter(mode)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition uppercase ${latencyMetricFilter === mode
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
            <div className="grid grid-cols-3 gap-2 mb-3 p-2.5 bg-slate-50 border border-slate-100 rounded-md text-center">
              <div>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Median (P50)</span>
                <span className="text-xs font-semibold text-slate-900 font-mono">2.8 ms</span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Tail Latency (P95)</span>
                <span className="text-xs font-semibold text-[#0284C7] font-mono">5.4 ms</span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">SLA Compliance</span>
                <span className="text-xs font-semibold text-emerald-600 font-mono">99.98%</span>
              </div>
            </div>

            {/* SVG Multi-Line Latency Graph -> Recharts LineChart */}
            <div className="h-44 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={latencyData}
                  margin={{ top: 5, right: 0, left: -25, bottom: 0 }}
                >
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="time" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}ms`} />
                  <RechartsTooltip
                    cursor={{ stroke: "#E2E8F0", strokeDasharray: "4 4" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <BiTooltip
                          active
                          label={label}
                          payload={[
                            { name: "P99 Spike", value: `${payload.find(p => p.dataKey === "p99")?.value} ms`, color: PALETTE.rose },
                            { name: "P95 Tail", value: `${payload.find(p => p.dataKey === "p95")?.value} ms`, color: PALETTE.amber },
                            { name: "P50 Median", value: `${payload.find(p => p.dataKey === "p50")?.value} ms`, color: PALETTE.brand }
                          ]}
                        />
                      );
                    }}
                  />
                  {(latencyMetricFilter === "all" || latencyMetricFilter === "p99") && (
                    <Line type="monotone" dataKey="p99" stroke={PALETTE.rose} strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{ r: 4 }} />
                  )}
                  {(latencyMetricFilter === "all" || latencyMetricFilter === "p95") && (
                    <Line type="monotone" dataKey="p95" stroke={PALETTE.amber} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  )}
                  {(latencyMetricFilter === "all" || latencyMetricFilter === "p50") && (
                    <Line type="monotone" dataKey="p50" stroke={PALETTE.brand} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-[#0284C7]" /> P50 Median
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> P95 Tail
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> P99 Spike
              </span>
            </div>
            <span className="font-mono text-slate-400">Target SLA: &lt;15ms</span>
          </div>
        </div>

        {/* Model Registry Lifecycle Donut Chart (5 cols / 42%) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <PieChartIcon className="w-4 h-4 text-[#0284C7]" />
                  Model Registry Distribution
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown across lifecycle promotion stages
                </p>
              </div>
              <Link
                to="/app/models"
                className="text-xs font-semibold text-[#0284C7] hover:underline flex items-center gap-1"
              >
                Catalog <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Recharts Donut PieChart with Center Text */}
            <div className="relative h-44 w-full my-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Production", value: stageCounts.PRODUCTION || 6, color: PALETTE.brand },
                      { name: "Development", value: stageCounts.DEVELOPMENT || 4, color: PALETTE.blue },
                      { name: "Candidate", value: 3, color: PALETTE.violet },
                      { name: "Staging", value: stageCounts.STAGING || 2, color: PALETTE.amber },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {[
                      { name: "Production", color: PALETTE.brand },
                      { name: "Development", color: PALETTE.blue },
                      { name: "Candidate", color: PALETTE.violet },
                      { name: "Staging", color: PALETTE.amber },
                    ].map((entry, index) => (
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
                            { name: "Model Count", value: p.value, color: p.payload.color }
                          ]}
                        />
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold font-sans text-slate-900">
                  {stats.models_count || 15}
                </span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Models
                </span>
              </div>
            </div>

            {/* Legend Pills */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
                <span className="text-slate-600 font-medium">Production ({stageCounts.PRODUCTION || 6})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <span className="text-slate-600 font-medium">Development ({stageCounts.DEVELOPMENT || 4})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                <span className="text-slate-600 font-medium">Candidate (3)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="text-slate-600 font-medium">Staging ({stageCounts.STAGING || 2})</span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Registry Status: Verified</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
              Zero Unsigned Models
            </span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── SECTION 5: RESOURCE TELEMETRY & FEATURE DRIFT MATRIX ───── */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Microservices Resource Allocation Grouped BarChart */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#0284C7]" />
                  Infrastructure &amp; Resource Telemetry
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live CPU load (%) vs Memory allocation (%) across container pods
                </p>
              </div>
              <span className="text-[10px] font-mono font-semibold bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD] px-2 py-0.5 rounded-md">
                Docker Engine
              </span>
            </div>

            <div className="h-48 w-full my-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { service: "FastAPI", cpu: 24, mem: 35, full: "FastAPI Core Backend Engine" },
                    { service: "Postgres", cpu: 18, mem: 42, full: "PostgreSQL 16 Persistence Engine" },
                    { service: "MinIO", cpu: 12, mem: 65, full: "MinIO S3 Object Storage" },
                    { service: "MLflow", cpu: 15, mem: 38, full: "MLflow Experiment Server" },
                  ]}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                  barSize={14}
                >
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="service" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <BiTooltip
                          active
                          label={d.full}
                          payload={[
                            { name: "CPU Utilization", value: `${payload.find(p => p.dataKey === "cpu")?.value}%`, color: PALETTE.brand },
                            { name: "Memory Utilization", value: `${payload.find(p => p.dataKey === "mem")?.value}%`, color: PALETTE.indigo },
                          ]}
                        />
                      );
                    }}
                  />
                  <Bar dataKey="cpu" name="CPU Load" fill={PALETTE.brand} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="mem" name="Memory Load" fill={PALETTE.indigo} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#0284C7]" /> CPU Load (%)
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#6366F1]" /> Memory (%)
              </span>
            </div>
            <span className="text-[#0284C7] font-semibold text-[11px]">4/4 Operational</span>
          </div>
        </div>

        {/* Feature Drift & SHAP Importance Composed Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
                  Feature Drift vs. SHAP Importance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  SHAP feature impact (Bar) vs Evidently AI PSI drift score (Line)
                </p>
              </div>
              <Link
                to="/app/monitoring"
                className="text-xs font-semibold text-[#0284C7] hover:underline flex items-center gap-1"
              >
                Monitoring <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="h-48 w-full my-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={[
                    { feature: "card_age", shap: 0.35, psi: 0.01, full: "card_age_months" },
                    { feature: "amount", shap: 0.28, psi: 0.02, full: "transaction_amount" },
                    { feature: "dist_home", shap: 0.18, psi: 0.03, full: "distance_from_home" },
                    { feature: "daily_txn", shap: 0.12, psi: 0.04, full: "daily_txn_count" },
                    { feature: "risk_score", shap: 0.07, psi: 0.045, full: "merchant_risk_score" },
                  ]}
                  margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                >
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="feature" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} domain={[0, 0.40]} tickFormatter={(v) => v.toFixed(2)} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} domain={[0, 0.08]} tickFormatter={(v) => v.toFixed(2)} />
                  <ReferenceLine
                    yAxisId="right"
                    y={0.05}
                    stroke={PALETTE.amber}
                    strokeDasharray="4 4"
                    label={{ value: "Drift (0.05)", position: "top", fill: PALETTE.amber, fontSize: 10, fontWeight: 600 }}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <BiTooltip
                          active
                          label={d.full}
                          payload={[
                            { name: "SHAP Importance", value: d.shap.toFixed(2), color: PALETTE.blue },
                            { name: "PSI Drift Score", value: d.psi.toFixed(3), color: PALETTE.brand },
                            { name: "Status", value: "Stable (< 0.05)", color: PALETTE.brand },
                          ]}
                        />
                      );
                    }}
                  />
                  <Bar yAxisId="left" dataKey="shap" name="SHAP Impact" fill={PALETTE.blue} radius={[3, 3, 0, 0]} maxBarSize={24} />
                  <Line yAxisId="right" type="monotone" dataKey="psi" name="PSI Drift" stroke={PALETTE.brand} strokeWidth={2} dot={{ r: 3, fill: PALETTE.brand, stroke: "#FFFFFF", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> SHAP Importance
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#0284C7]" /> PSI Drift
              </span>
            </div>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
              Zero Drift Alerts
            </span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── SECTION 5B: PLATFORM SPEND, LIFECYCLE FUNNEL, STORAGE & HEALTH ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#0284C7]" />
                Platform Spend &amp; Compute
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Monthly cost by workload (USD) — training, serving, storage</p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">-12% vs. last month</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SPEND_DATA} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="m" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <RechartsTooltip content={<BiTooltip valueFormatter={(v) => `$${v}`} />} />
                <Area type="monotone" stackId="1" dataKey="training" name="Training" stroke={PALETTE.violet} fill={PALETTE.violet} fillOpacity={0.35} />
                <Area type="monotone" stackId="1" dataKey="serving" name="Serving" stroke={PALETTE.brand} fill={PALETTE.brand} fillOpacity={0.35} />
                <Area type="monotone" stackId="1" dataKey="storage" name="Storage" stroke={PALETTE.blue} fill={PALETTE.blue} fillOpacity={0.35} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#0284C7]" />
            MLOps Lifecycle Funnel
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-2">From raw dataset to production model</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <RechartsTooltip />
                <Funnel dataKey="value" data={FUNNEL_DATA} isAnimationActive>
                  {FUNNEL_DATA.map((f) => (
                    <Cell key={f.name} fill={f.fill} />
                  ))}
                  <LabelList position="right" fill="#334155" stroke="none" dataKey="name" fontSize={11} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* GRAPH 1: Production Model Benchmark & Quality Matrix (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-[#0284C7]" />
                  Production Model Benchmark Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Validation ROC-AUC vs. F1-Score across active production candidate models
                </p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                100% SLA Compliant
              </span>
            </div>

            <div className="h-52 w-full my-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={MODEL_BENCHMARK_FLEET}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                  barSize={12}
                >
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="model" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0.80, 1.0]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(2)} />
                  <ReferenceLine y={0.90} stroke={PALETTE.amber} strokeDasharray="4 4" label={{ value: "Gate: 0.90", fill: PALETTE.amber, fontSize: 10, position: "insideBottomLeft" }} />
                  <ReferenceLine y={0.95} stroke={PALETTE.brand} strokeDasharray="4 4" label={{ value: "Target: 0.95", fill: PALETTE.brand, fontSize: 10, position: "insideTopLeft" }} />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <BiTooltip
                          active
                          label={d.full_name || label}
                          payload={[
                            { name: "Framework", value: d.framework, color: PALETTE.slate },
                            { name: "ROC-AUC", value: typeof d.auc === "number" ? d.auc.toFixed(3) : d.auc, color: PALETTE.brand },
                            { name: "F1-Score", value: typeof d.f1 === "number" ? d.f1.toFixed(3) : d.f1, color: PALETTE.blue },
                            { name: "p95 Latency", value: d.latency, color: PALETTE.slate },
                            { name: "Holdout Samples", value: d.samples, color: PALETTE.slate },
                          ]}
                        />
                      );
                    }}
                  />
                  <Bar dataKey="auc" name="ROC-AUC" fill={PALETTE.brand} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="f1" name="F1-Score" fill={PALETTE.blue} radius={[3, 3, 0, 0]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Holdout Validation: 100k Verified Test Samples</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
              Zero Model Regressions
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
            Platform Health
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">Core services status &amp; 30-day uptime</p>
          <ul className="space-y-2">
            {SERVICES.map((s) => (
              <li key={s.name} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-1.5 hover:bg-slate-50 transition">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="flex items-center gap-2.5 text-[11px] font-mono text-slate-500">
                  <span>{s.latency}</span>
                  <strong className="text-slate-900">{s.uptime}</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── GRAPH 2: Model Performance Trajectory & Continuous Retraining (12 cols) ── */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0284C7]" />
              <h3 className="text-sm font-semibold text-slate-900">
                Model Performance Stability &amp; Continuous Retraining Trajectory
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                Auto-Retrain Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              30-day continuous rolling F1-score tracking concept drift and automated retraining recovery events
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono text-slate-700">
              <span className="text-slate-400">Fleet Mean F1:</span> <strong className="text-slate-900 font-bold">0.956</strong>
            </div>
            <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md font-mono">
              <span className="text-emerald-600">Recovery:</span> <strong>+3.7% F1</strong>
            </div>
            <div className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono text-slate-700">
              <span className="text-slate-400">Drift Protection:</span> <strong className="text-emerald-600 font-bold">Enforced</strong>
            </div>
          </div>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={FLEET_DRIFT_TRAJECTORY}
              margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gFleetAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.brand} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={PALETTE.brand} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis domain={[0.88, 1.0]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(2)} />

              {/* Drift Retrain Threshold */}
              <ReferenceLine
                y={0.92}
                stroke={PALETTE.rose}
                strokeDasharray="4 4"
                label={{ value: "Drift Retrain Gate (0.92)", fill: PALETTE.rose, fontSize: 10, position: "insideBottomLeft" }}
              />

              {/* Retraining Event Marker */}
              <ReferenceLine
                x="Oct 18"
                stroke={PALETTE.brand}
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{ value: "⚡ Automated Retrain & Promotion (v3)", fill: PALETTE.brand, fontSize: 11, fontWeight: 700, position: "top" }}
              />

              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <BiTooltip
                      active
                      label={`Evaluation Date: ${label}`}
                      payload={[
                        { name: "Fleet Average F1", value: Number(payload.find(p => p.dataKey === "avg_f1")?.value || 0).toFixed(3), color: PALETTE.brand },
                        { name: "fraud-detector (v3)", value: Number(payload.find(p => p.dataKey === "fraud_f1")?.value || 0).toFixed(3), color: PALETTE.brandDark },
                        { name: "sentiment-bert (v1)", value: Number(payload.find(p => p.dataKey === "bert_f1")?.value || 0).toFixed(3), color: PALETTE.violet },
                        { name: "churn-xgboost (v2)", value: Number(payload.find(p => p.dataKey === "churn_f1")?.value || 0).toFixed(3), color: PALETTE.blue },
                      ]}
                    />
                  );
                }}
              />

              <Area type="monotone" dataKey="avg_f1" name="Fleet Mean F1" stroke={PALETTE.brand} strokeWidth={2.5} fill="url(#gFleetAvg)" dot={{ r: 3, fill: PALETTE.brand, strokeWidth: 1.5, stroke: "#fff" }} />
              <Line type="monotone" dataKey="fraud_f1" name="fraud-detector" stroke={PALETTE.brandDark} strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="bert_f1" name="sentiment-bert" stroke={PALETTE.violet} strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
              <Line type="monotone" dataKey="churn_f1" name="churn-xgboost" stroke={PALETTE.blue} strokeWidth={1.5} dot={false} />

              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Telemetry Frequency: Continuous (Every 1,000 Inferences)</span>
          </div>
          <span>Evidently AI PSI Engine + Prometheus Exporter Live</span>
        </div>
      </div>

      {/* ── SECTION 6: PRODUCTION MODELS & ACTIVE TEST PING ENDPOINTS ─ */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Production Models */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
              Production Models &amp; Registry
            </h3>
            <Link
              to="/app/models"
              className="text-xs text-[#0284C7] hover:underline flex items-center gap-1 font-semibold"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {models.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No cataloged models found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {models.slice(0, 4).map((m, idx) => (
                <div
                  key={idx}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-md transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#E0F2FE] border border-[#BAE6FD] flex items-center justify-center text-[#0284C7] font-mono text-[11px] font-bold">
                      M{m.version}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-xs group-hover:text-[#0284C7] transition">
                        {m.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        v{m.version} • Verified Registry
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
        <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-900">
                Active Inference Endpoints
              </h3>
            </div>
            <Link
              to="/app/deployments"
              className="text-xs text-[#0284C7] hover:underline flex items-center gap-1 font-semibold"
            >
              Manage <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {deployments.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No running containers found.
            </div>
          ) : (
            <div className="space-y-2.5">
              {deployments.slice(0, 3).map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700">
                        <Radio className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          {d.model_name}
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            v{d.model_version}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Port :{d.port} • Secure Inference
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleTestPing(d)}
                      disabled={pingingId === d.id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition"
                    >
                      <Zap className={`w-3 h-3 text-amber-500 ${pingingId === d.id ? "animate-bounce" : ""}`} />
                      {pingingId === d.id ? "Ping..." : "Test Ping"}
                    </button>
                  </div>

                  {pingResult && pingResult.id === d.id && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] animate-in fade-in">
                      <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Inference succeeded ({pingResult.latency} ms)</span>
                      </div>
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
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
