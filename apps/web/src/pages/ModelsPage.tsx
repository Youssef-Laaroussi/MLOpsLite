import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  ArrowUpCircle,
  ShieldCheck,
  Sparkles,
  Lock,
  ExternalLink,
  Calendar,
  ChevronDown,
  RefreshCw,
  Search,
  CheckCircle2,
  Activity,
  Layers,
  Zap,
  Cpu,
  HardDrive,
  ArrowRight,
  Sliders,
  Filter,
  Clock,
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { StatCard } from "../components/StatCard";
import { fetchModels, promoteModelVersion } from "../api/client";
import { RegisteredModel } from "../api/types";
import { useAuth } from "../context/AuthContext";
import {
  ComposedChart,
  PieChart,
  Pie,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
  ReferenceLine,
} from "recharts";
import { AXIS_TICK, GRID_PROPS, BiTooltip, PALETTE } from "../components/charts/ChartKit";

const REGISTRY_GROWTH = [
  { month: "May", registered: 4, promoted: 1 },
  { month: "Jun", registered: 6, promoted: 2 },
  { month: "Jul", registered: 9, promoted: 3 },
  { month: "Aug", registered: 11, promoted: 4 },
  { month: "Sep", registered: 13, promoted: 5 },
  { month: "Oct", registered: 15, promoted: 6 },
];

const GOVERNANCE = [
  { name: "Signature", value: 100, fill: PALETTE.brand },
  { name: "Lineage", value: 93, fill: PALETTE.blue },
  { name: "Approvals", value: 87, fill: PALETTE.violet },
  { name: "Model Cards", value: 73, fill: PALETTE.amber },
];

const CHALLENGERS = [
  { name: "fraud-detector v3 (champion)", acc: 0.971, lat: 2.4, mb: 14, fill: PALETTE.brand },
  { name: "customer-churn v2", acc: 0.942, lat: 3.8, mb: 22, fill: PALETTE.blue },
  { name: "demand-forecast v4", acc: 0.918, lat: 5.2, mb: 48, fill: PALETTE.violet },
  { name: "sentiment-bert v1", acc: 0.954, lat: 12.6, mb: 130, fill: PALETTE.amber },
  { name: "fraud-detector v2", acc: 0.935, lat: 3.1, mb: 12, fill: PALETTE.slate },
];

const PROMOTION_EVENTS = [
  { id: 1, model: "fraud-detector", version: 3, from: "Staging", to: "Production", by: "a.benali", when: "2h ago", color: PALETTE.brand },
  { id: 2, model: "customer-churn-xgb", version: 2, from: "Candidate", to: "Staging", by: "s.karim", when: "1d ago", color: PALETTE.blue },
  { id: 3, model: "sentiment-bert", version: 1, from: "Development", to: "Candidate", by: "m.idrissi", when: "3d ago", color: PALETTE.amber },
  { id: 4, model: "fraud-detector", version: 2, from: "Production", to: "Archived", by: "a.benali", when: "5d ago", color: PALETTE.slate },
];

// Realistic production baseline models for Data Analyst & MLOps evaluation
const DEFAULT_MODELS: (RegisteredModel & { framework?: string; latency_ms?: number; size_mb?: number })[] = [
  {
    name: "fraud-detector",
    version: 3,
    stage: "PRODUCTION",
    mlflow_run_id: "run-9a3b8f1c4e20",
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    framework: "XGBoost",
    latency_ms: 2.4,
    size_mb: 14.2,
  },
  {
    name: "customer-churn-xgb",
    version: 2,
    stage: "STAGING",
    mlflow_run_id: "run-7d2e1a90b4cf",
    created_at: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
    framework: "LightGBM",
    latency_ms: 3.8,
    size_mb: 22.5,
  },
  {
    name: "sentiment-bert-mini",
    version: 1,
    stage: "CANDIDATE",
    mlflow_run_id: "run-5f10ac83de92",
    created_at: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
    framework: "Transformers",
    latency_ms: 12.6,
    size_mb: 145.0,
  },
  {
    name: "demand-forecaster-lstm",
    version: 2,
    stage: "PRODUCTION",
    mlflow_run_id: "run-3c99a0b12fd7",
    created_at: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
    framework: "PyTorch",
    latency_ms: 5.2,
    size_mb: 38.4,
  },
  {
    name: "credit-default-risk",
    version: 1,
    stage: "PRODUCTION",
    mlflow_run_id: "run-2b81a70c5e11",
    created_at: new Date(Date.now() - 3600000 * 24 * 20).toISOString(),
    framework: "Scikit-Learn",
    latency_ms: 3.1,
    size_mb: 18.0,
  },
  {
    name: "ecommerce-recommender",
    version: 2,
    stage: "PRODUCTION",
    mlflow_run_id: "run-8c44d19e0f33",
    created_at: new Date(Date.now() - 3600000 * 24 * 25).toISOString(),
    framework: "TensorFlow",
    latency_ms: 4.5,
    size_mb: 65.0,
  },
  {
    name: "pricing-elasticity-glm",
    version: 1,
    stage: "PRODUCTION",
    mlflow_run_id: "run-1d77e20a9c44",
    created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    framework: "Statsmodels",
    latency_ms: 1.8,
    size_mb: 8.5,
  },
  {
    name: "lead-scoring-ensemble",
    version: 2,
    stage: "PRODUCTION",
    mlflow_run_id: "run-6e33f81b2d55",
    created_at: new Date(Date.now() - 3600000 * 24 * 35).toISOString(),
    framework: "CatBoost",
    latency_ms: 2.9,
    size_mb: 16.5,
  },
  {
    name: "churn-retention-lightgbm",
    version: 1,
    stage: "STAGING",
    mlflow_run_id: "run-4a99b12c8e66",
    created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
    framework: "LightGBM",
    latency_ms: 3.5,
    size_mb: 20.0,
  },
  {
    name: "timeseries-prophet-q3",
    version: 1,
    stage: "CANDIDATE",
    mlflow_run_id: "run-7c22a90d4f77",
    created_at: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
    framework: "Prophet",
    latency_ms: 8.4,
    size_mb: 54.0,
  },
  {
    name: "tabular-drift-sentinel",
    version: 1,
    stage: "CANDIDATE",
    mlflow_run_id: "run-9f44c11b0e88",
    created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
    framework: "Evidently",
    latency_ms: 4.0,
    size_mb: 12.0,
  },
  {
    name: "anomaly-autoencoder",
    version: 1,
    stage: "DEVELOPMENT",
    mlflow_run_id: "run-3e66a20d7c99",
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    framework: "PyTorch",
    latency_ms: 6.1,
    size_mb: 42.0,
  },
  {
    name: "speech-keyword-detector",
    version: 1,
    stage: "DEVELOPMENT",
    mlflow_run_id: "run-5a11c88d2f00",
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    framework: "ONNX",
    latency_ms: 18.2,
    size_mb: 210.0,
  },
  {
    name: "multimodal-clip-embedder",
    version: 1,
    stage: "DEVELOPMENT",
    mlflow_run_id: "run-2b33d44e5f11",
    created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    framework: "PyTorch",
    latency_ms: 24.0,
    size_mb: 320.0,
  },
  {
    name: "reinforcement-bid-agent",
    version: 1,
    stage: "DEVELOPMENT",
    mlflow_run_id: "run-8e77a11c9d22",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    framework: "RLlib",
    latency_ms: 7.5,
    size_mb: 80.0,
  },
];

export const ModelsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [models, setModels] = useState<typeof DEFAULT_MODELS>(DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState<RegisteredModel | null>(null);
  const [targetStage, setTargetStage] = useState("PRODUCTION");
  const [loading, setLoading] = useState(true);

  // Top header date filter ("Last 6 months" default)
  const [timeRange, setTimeRange] = useState<string>("Last 6 months");
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState<boolean>(false);

  // Search & Stage Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  const loadModels = async () => {
    setLoading(true);
    try {
      const data = await fetchModels();
      if (data && data.length > 0) {
        // Merge API data with rich details
        const merged = data.map((m, idx) => ({
          ...m,
          framework: DEFAULT_MODELS[idx % DEFAULT_MODELS.length]?.framework || "XGBoost",
          latency_ms: DEFAULT_MODELS[idx % DEFAULT_MODELS.length]?.latency_ms || 3.2,
          size_mb: DEFAULT_MODELS[idx % DEFAULT_MODELS.length]?.size_mb || 25.0,
        }));
        setModels(merged);
      } else {
        setModels(DEFAULT_MODELS);
      }
    } catch {
      setModels(DEFAULT_MODELS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handlePromote = async () => {
    if (!selectedModel) return;
    try {
      await promoteModelVersion(selectedModel.name, selectedModel.version, targetStage);
      setSelectedModel(null);
      loadModels();
    } catch {
      // Local demo fallback: Single Active Production Rule enforcement
      setModels((prev) =>
        prev.map((m) => {
          if (m.name === selectedModel.name && m.version === selectedModel.version) {
            return { ...m, stage: targetStage };
          }
          // If promoting to production, demote previous prod version of same model to staging
          if (targetStage === "PRODUCTION" && m.name === selectedModel.name && m.stage === "PRODUCTION") {
            return { ...m, stage: "STAGING" };
          }
          return m;
        })
      );
      setSelectedModel(null);
    }
  };

  const canPromote = hasRole("USER") || hasRole("DEVELOPER") || hasRole("ADMIN");

  // Stage breakdown counts
  const productionCount = useMemo(() => models.filter((m) => m.stage === "PRODUCTION").length, [models]);
  const stagingCount = useMemo(() => models.filter((m) => m.stage === "STAGING").length, [models]);
  const candidateCount = useMemo(() => models.filter((m) => m.stage === "CANDIDATE").length, [models]);
  const devCount = useMemo(() => models.filter((m) => m.stage === "DEVELOPMENT" || !m.stage).length, [models]);

  // Filtered models for table
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.mlflow_run_id && m.mlflow_run_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.framework && m.framework.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStage = stageFilter === "ALL" || (m.stage || "DEVELOPMENT") === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [models, searchQuery, stageFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* ── Page Header (with Last 6 Months Filter on Top Right) ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold font-display text-slate-900 tracking-tight flex items-center gap-2.5">
            <Box className="w-7 h-7 text-[#3BB48C]" />
            Model Registry &amp; Governance
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
              Single Active Prod
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Centralized version management, input/output signatures, and formal stage promotions
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Exact Date Filter matching all other sections */}
          <div className="relative">
            <button
              onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 transition cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{timeRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isTimeRangeOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                {["Last 30 days", "Last 6 months", "Last 1 year", "All time"].map((range) => (
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
            onClick={loadModels}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#3BB48C] transition shadow-xs"
            title="Refresh models"
          >
            <RefreshCw className={`w-4 h-4 text-[#3BB48C] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Top 4 KPI StatCards (Clean, 100% curve-free & sparkline-free) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active In Production"
          value={`${productionCount} Models`}
          subtitle="Single active prod rule enforced"
          icon={ShieldCheck}
          color="emerald"
          trend="100% SLA Active"
        />
        <StatCard
          title="Staging & Candidates"
          value={`${stagingCount + candidateCount} Validating`}
          subtitle="Pre-release shadow validation"
          icon={Sparkles}
          color="brand"
          trend="Ready to Promote"
        />
        <StatCard
          title="Cataloged Versions"
          value={`${models.length} Models`}
          subtitle="Tracked in MLflow registry"
          icon={Box}
          color="brand"
          trend="+20% this month"
        />
        <StatCard
          title="Governance Status"
          value="100% Verified"
          subtitle="Input/output schema signed"
          icon={CheckCircle2}
          color="emerald"
          trend="Audited"
        />
      </div>

      {/* ── Visual Analytics Row: Promotion Pipeline Bar Chart & Benchmark Footprint Matrix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CARD 1: Model Promotion Pipeline & Stages (7 cols) - Enterprise Standard Bar Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200/75 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#3BB48C]" />
                  Model Promotion Pipeline &amp; Stages
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Active model count distribution across lifecycle promotion stages
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Single-Active Enforced
              </span>
            </div>

            {/* Donut: stage distribution (click a slice to filter) */}
            {(() => {
              const stageData = [
                { stage: "Development", count: devCount, stageKey: "DEVELOPMENT", fill: PALETTE.slate },
                { stage: "Candidate", count: candidateCount, stageKey: "CANDIDATE", fill: PALETTE.amber },
                { stage: "Staging", count: stagingCount, stageKey: "STAGING", fill: PALETTE.blue },
                { stage: "Production", count: productionCount, stageKey: "PRODUCTION", fill: PALETTE.brand },
              ];
              const total = models.length || 1;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 mt-2">
                  <div className="h-[230px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <BiTooltip
                                active
                                label={d.stage}
                                payload={[
                                  { name: "Active Models", value: d.count, color: d.fill },
                                  { name: "Share of Registry", value: `${Math.round((d.count / total) * 100)}%`, color: PALETTE.slate },
                                ]}
                              />
                            );
                          }}
                        />
                        <Pie
                          data={stageData}
                          dataKey="count"
                          nameKey="stage"
                          innerRadius="62%"
                          outerRadius="92%"
                          paddingAngle={3}
                          cornerRadius={6}
                          stroke="none"
                          onClick={(entry) => setStageFilter(stageFilter === entry.stageKey ? "ALL" : entry.stageKey)}
                          className="cursor-pointer"
                        >
                          {stageData.map((s) => (
                            <Cell key={s.stageKey} fill={s.fill} fillOpacity={stageFilter === "ALL" || stageFilter === s.stageKey ? 1 : 0.3} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-extrabold text-slate-900">{models.length}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Versions</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5">
                    {stageData.map((s) => (
                      <li key={s.stageKey}>
                        <button
                          onClick={() => setStageFilter(stageFilter === s.stageKey ? "ALL" : s.stageKey)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition ${
                            stageFilter === s.stageKey ? "border-slate-300 bg-slate-50" : "border-slate-100 hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex items-center gap-2 font-semibold text-slate-700">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.fill }} />
                            {s.stage}
                          </span>
                          <span className="font-mono text-xs text-slate-500">
                            <strong className="text-slate-900">{s.count}</strong> · {Math.round((s.count / total) * 100)}%
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 font-mono">
            <span>Promotion Gate: Cryptographic Hash Locked</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Audit Trail Enabled
            </span>
          </div>
        </div>

        {/* CARD 2: Model Latency & Memory Footprint (5 cols) - Multi-Metric Composed Chart */}
        <div className="lg:col-span-5 bg-white border border-slate-200/75 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#3BB48C]" />
                  Model Footprint vs. Speed
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Latency (ms) vs. Memory Size (MB) trade-off
                </p>
              </div>
            </div>

            <div className="h-[250px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={[
                    { name: "fraud-det.", lat: 2.4, size: 14.2 },
                    { name: "cust-churn", lat: 3.8, size: 22.5 },
                    { name: "demand-c.", lat: 5.2, size: 38.4 },
                    { name: "sent-bert", lat: 12.6, size: 145.0 },
                  ]}
                  margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                >
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="name" tick={{...AXIS_TICK, fontSize: 10}} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}ms`} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}MB`} />
                  <RechartsTooltip 
                    cursor={{ fill: "#F1F5F9" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <BiTooltip
                          active
                          label={label}
                          payload={payload.map(p => ({
                            name: p.name === "lat" ? "Inference Latency" : "Memory Footprint",
                            value: p.name === "lat" ? `${p.value} ms` : `${p.value} MB`,
                            color: p.color
                          }))}
                        />
                      );
                    }}
                  />
                  <Bar yAxisId="left" dataKey="lat" fill={PALETTE.brand} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Line yAxisId="right" type="monotone" dataKey="size" stroke={PALETTE.violet} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-100 text-sm font-medium">
            <span className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-[3px] bg-[#3BB48C]"></span>
              Latency (ms)
            </span>
            <span className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-[3px] bg-[#8B5CF6]"></span>
              Footprint (MB)
            </span>
          </div>
        </div>
      </div>

      {/* ── Row 2: Registry Growth & Governance Scorecard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200/75 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#3BB48C]" />
            Registry Growth &amp; Promotion Velocity
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Cumulative registered versions vs. versions promoted to Production</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REGISTRY_GROWTH} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.brand} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={PALETTE.brand} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.violet} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={PALETTE.violet} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<BiTooltip />} />
                <Area type="monotone" dataKey="registered" name="Registered" stroke={PALETTE.brand} strokeWidth={2.5} fill="url(#gReg)" />
                <Area type="monotone" dataKey="promoted" name="Promoted to Prod" stroke={PALETTE.violet} strokeWidth={2.5} fill="url(#gProd)" />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200/75 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#3BB48C]" />
            Governance Scorecard
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-2">Registry compliance coverage (% of versions)</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart data={GOVERNANCE} innerRadius="25%" outerRadius="100%" startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" background={{ fill: "#F1F5F9" }} cornerRadius={8} />
                <RechartsTooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
            {GOVERNANCE.map((g) => (
              <span key={g.name} className="flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: g.fill }} />
                  {g.name}
                </span>
                <strong className="text-slate-900">{g.value}%</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Champion vs Challenger & Promotion Audit Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200/75 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#3BB48C]" />
            Champion vs. Challenger
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Accuracy vs. p95 latency — bubble size = model footprint (MB)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis type="number" dataKey="lat" name="Latency" domain={[0, 14]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}ms`} />
                <YAxis type="number" dataKey="acc" name="Accuracy" domain={[0.86, 0.98]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <ZAxis type="number" dataKey="mb" range={[90, 420]} />
                <ReferenceLine y={0.94} stroke={PALETTE.brand} strokeDasharray="4 4" label={{ value: "SLA accuracy", fill: PALETTE.brand, fontSize: 10, position: "insideTopRight" }} />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <BiTooltip
                        active
                        label={p.name}
                        payload={[
                          { name: "Accuracy", value: `${(p.acc * 100).toFixed(1)}%`, color: p.fill },
                          { name: "p95 Latency", value: `${p.lat} ms`, color: PALETTE.slate },
                          { name: "Footprint", value: `${p.mb} MB`, color: PALETTE.slate },
                        ]}
                      />
                    );
                  }}
                />
                <Scatter data={CHALLENGERS}>
                  {CHALLENGERS.map((c) => (
                    <Cell key={c.name} fill={c.fill} fillOpacity={0.85} stroke="#fff" strokeWidth={2} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200/75 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#3BB48C]" />
            Promotion Audit Trail
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Latest stage transitions with approver</p>
          <ol className="relative border-l border-slate-200 ml-2 space-y-4">
            {PROMOTION_EVENTS.map((e) => (
              <li key={e.id} className="ml-4">
                <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white" style={{ background: e.color }} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{e.model} <span className="font-mono text-xs text-slate-400">v{e.version}</span></span>
                  <span className="text-[11px] text-slate-400">{e.when}</span>
                </div>
                <div className="text-xs text-slate-500">{e.from} → <strong style={{ color: e.color }}>{e.to}</strong> · by {e.by}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ── Explorer Toolbar: Search & Stage Filter Pills ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models by name, framework, or MLflow run ID..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 focus:border-[#3BB48C] transition"
          />
        </div>

        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "PRODUCTION", "STAGING", "CANDIDATE", "DEVELOPMENT"].map((st) => (
            <button
              key={st}
              onClick={() => setStageFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                stageFilter === st
                  ? "bg-[#3BB48C] text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {st === "ALL" ? "All Stages" : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Models Registry Table ── */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Registered Models ({filteredModels.length})
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {productionCount} active production • {stagingCount} staging
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#F8FAFC] border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Model &amp; Signature</th>
                <th className="px-6 py-4">Version</th>
                <th className="px-6 py-4">Lifecycle Stage</th>
                <th className="px-6 py-4">MLflow Run</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredModels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No models match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredModels.map((m, idx) => (
                  <tr key={idx} className="hover:bg-[#F0FDF9]/40 transition group">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-[#EBF8F4] border border-[#BCE9DA] text-[#1A7456] group-hover:scale-105 transition-transform">
                          <Box className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{m.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Format: MLflow / {m.framework || "Scikit-Learn"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs">
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                        v{m.version}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={m.stage || "DEVELOPMENT"} />
                    </td>

                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                      {m.mlflow_run_id ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-700 border border-slate-200"
                          title={`MLflow Run: ${m.mlflow_run_id}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3BB48C]"></span>
                          {m.mlflow_run_id.slice(0, 10)}...
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedModel(m)}
                        disabled={!canPromote}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                          canPromote
                            ? "bg-slate-100 hover:bg-[#3BB48C] text-slate-700 hover:text-white border border-slate-200 hover:border-[#3BB48C]"
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        }`}
                        title={canPromote ? "Promote model stage" : "Requires Developer role"}
                      >
                        {canPromote ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        Promote Stage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Stage Promotion Modal ── */}
      {selectedModel && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-7 space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3BB48C]"></span>
                Promote Model Stage
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target: <strong className="text-slate-800">{selectedModel.name}</strong> (v{selectedModel.version})
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Select Target Stage
                </label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#3BB48C] transition font-semibold"
                >
                  <option value="DEVELOPMENT">DEVELOPMENT (Training Sandbox)</option>
                  <option value="CANDIDATE">CANDIDATE (Validation Pending)</option>
                  <option value="STAGING">STAGING (Pre-release Testing)</option>
                  <option value="PRODUCTION">PRODUCTION (Live Serving)</option>
                  <option value="ARCHIVED">ARCHIVED (Decommissioned)</option>
                </select>
              </div>

              {targetStage === "PRODUCTION" && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-[#1A7456]">
                  <strong>Single-Active Rule</strong>: Promoting to Production automatically demotes any current production model of this group to Staging.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedModel(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePromote}
                  className="px-5 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white text-sm font-bold shadow-md shadow-[#3BB48C]/25 transition"
                >
                  Confirm Stage Transition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
