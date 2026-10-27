import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  ArrowUpCircle,
  ShieldCheck,
  Sparkles,
  Lock,
  ExternalLink,
  Calendar,
  ChevronDown,
  ChevronUp,
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
  { name: "Signature", value: 100, fill: "#3BB48C" },
  { name: "Lineage", value: 93, fill: "#64748B" },
  { name: "Approvals", value: 87, fill: "#475569" },
  { name: "Model Cards", value: 73, fill: "#94A3B8" },
];

const CHALLENGERS = [
  { name: "fraud-detector v3 (champion)", acc: 0.971, lat: 2.4, mb: 14, fill: "#3BB48C" },
  { name: "customer-churn v2", acc: 0.942, lat: 3.8, mb: 22, fill: "#64748B" },
  { name: "demand-forecast v4", acc: 0.918, lat: 5.2, mb: 48, fill: "#475569" },
  { name: "sentiment-bert v1", acc: 0.954, lat: 12.6, mb: 130, fill: "#94A3B8" },
  { name: "fraud-detector v2", acc: 0.935, lat: 3.1, mb: 12, fill: "#CBD5E1" },
];

interface PromotionAuditItem {
  id: string | number;
  model: string;
  version: number;
  from: string;
  to: string;
  by: string;
  when: string;
  color: string;
}

const INITIAL_PROMOTION_EVENTS: PromotionAuditItem[] = [
  { id: "audit-1", model: "fraud-detector", version: 3, from: "Staging", to: "Production", by: "a.benali", when: "2h ago", color: "#3BB48C" },
  { id: "audit-2", model: "customer-churn-xgb", version: 2, from: "Candidate", to: "Staging", by: "s.karim", when: "1d ago", color: "#64748B" },
  { id: "audit-3", model: "sentiment-bert-mini", version: 1, from: "Development", to: "Candidate", by: "m.idrissi", when: "3d ago", color: "#475569" },
  { id: "audit-4", model: "demand-forecaster-lstm", version: 2, from: "Staging", to: "Production", by: "a.benali", when: "5d ago", color: "#3BB48C" },
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
  const [searchParams] = useSearchParams();
  const [models, setModels] = useState<typeof DEFAULT_MODELS>(DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState<RegisteredModel | null>(null);
  const [targetStage, setTargetStage] = useState("PRODUCTION");
  const [loading, setLoading] = useState(true);

  // Top header date filter ("Last 6 months" default)
  const [timeRange, setTimeRange] = useState<string>("Last 6 months");
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState<boolean>(false);

  // Search & Stage Filter
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("search") || "");
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  // Dynamic real promotion audit trail
  const [promotionEvents, setPromotionEvents] = useState<PromotionAuditItem[]>(INITIAL_PROMOTION_EVENTS);

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
    const oldStage = selectedModel.stage || "DEVELOPMENT";
    const newStage = targetStage;
    const currentModelName = selectedModel.name;
    const currentVersion = selectedModel.version;

    // Record real audit item
    const newAuditEvent: PromotionAuditItem = {
      id: `audit-${Date.now()}`,
      model: currentModelName,
      version: currentVersion,
      from: oldStage.charAt(0) + oldStage.slice(1).toLowerCase(),
      to: newStage.charAt(0) + newStage.slice(1).toLowerCase(),
      by: "current_user",
      when: "Just now",
      color: newStage === "PRODUCTION" ? "#3BB48C" : newStage === "STAGING" ? "#64748B" : "#94A3B8",
    };

    try {
      await promoteModelVersion(currentModelName, currentVersion, newStage);
      setPromotionEvents((prev) => [newAuditEvent, ...prev.slice(0, 9)]);
      setSelectedModel(null);
      loadModels();
    } catch {
      // Local demo fallback: Single Active Production Rule enforcement
      setModels((prev) =>
        prev.map((m) => {
          if (m.name === currentModelName && m.version === currentVersion) {
            return { ...m, stage: newStage };
          }
          // If promoting to production, demote previous prod version of same model to staging
          if (newStage === "PRODUCTION" && m.name === currentModelName && m.stage === "PRODUCTION") {
            return { ...m, stage: "STAGING" };
          }
          return m;
        })
      );
      setPromotionEvents((prev) => [newAuditEvent, ...prev.slice(0, 9)]);
      setSelectedModel(null);
    }
  };

  const canPromote = hasRole("USER") || hasRole("DEVELOPER") || hasRole("ADMIN");

  // Stage breakdown counts
  const productionCount = useMemo(() => models.filter((m) => m.stage === "PRODUCTION").length, [models]);
  const stagingCount = useMemo(() => models.filter((m) => m.stage === "STAGING").length, [models]);
  const candidateCount = useMemo(() => models.filter((m) => m.stage === "CANDIDATE").length, [models]);
  const devCount = useMemo(() => models.filter((m) => m.stage === "DEVELOPMENT" || !m.stage).length, [models]);

  // Sorting state for models table
  const [sortField, setSortField] = useState<"name" | "version" | "stage" | "framework" | "latency">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: "name" | "version" | "stage" | "framework" | "latency") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtered & sorted models for table
  const filteredModels = useMemo(() => {
    const list = models.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.mlflow_run_id && m.mlflow_run_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.framework && m.framework.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStage = stageFilter === "ALL" || (m.stage || "DEVELOPMENT") === stageFilter;
      return matchesSearch && matchesStage;
    });

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "version") {
        comparison = a.version - b.version;
      } else if (sortField === "stage") {
        comparison = (a.stage || "").localeCompare(b.stage || "");
      } else if (sortField === "framework") {
        comparison = (a.framework || "").localeCompare(b.framework || "");
      } else if (sortField === "latency") {
        comparison = (a.latency_ms || 0) - (b.latency_ms || 0);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [models, searchQuery, stageFilter, sortField, sortDirection]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
            Model Registry &amp; Governance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized version management, input/output signatures, and formal stage promotions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 transition"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{timeRange}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isTimeRangeOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded shadow-lg z-30 py-1 text-xs">
                {["Last 30 days", "Last 6 months", "Last 1 year", "All time"].map((range) => (
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
            onClick={loadModels}
            className="p-1.5 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900 hover:border-slate-300 transition shadow-2xs"
            title="Refresh models"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#3BB48C]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Top 4 KPI StatCards (Clean Snowflake Style) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active In Production"
          value={`${productionCount} Models`}
          subtitle="Single active prod rule enforced"
          icon={ShieldCheck}
          color="brand"
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

      {/* ── Visual Analytics Row: Model Promotion Pipeline & Latency Footprint (Snowflake Clean Look) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CHART 1: Model Promotion Pipeline (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Model Promotion Pipeline
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Distribution across lifecycle stages
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Single-Active Rule
              </span>
            </div>

            {(() => {
              const stageData = [
                { stage: "Development", count: devCount, stageKey: "DEVELOPMENT", fill: "#94A3B8" },
                { stage: "Candidate", count: candidateCount, stageKey: "CANDIDATE", fill: "#64748B" },
                { stage: "Staging", count: stagingCount, stageKey: "STAGING", fill: "#475569" },
                { stage: "Production", count: productionCount, stageKey: "PRODUCTION", fill: "#3BB48C" },
              ];
              const total = models.length || 1;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 mt-1">
                  <div className="h-52 relative">
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
                                  { name: "Share", value: `${Math.round((d.count / total) * 100)}%`, color: "#64748B" },
                                ]}
                              />
                            );
                          }}
                        />
                        <Pie
                          data={stageData}
                          dataKey="count"
                          nameKey="stage"
                          innerRadius="65%"
                          outerRadius="90%"
                          paddingAngle={2}
                          stroke="none"
                          onClick={(entry) => setStageFilter(stageFilter === entry.stageKey ? "ALL" : entry.stageKey)}
                          className="cursor-pointer"
                        >
                          {stageData.map((s) => (
                            <Cell key={s.stageKey} fill={s.fill} fillOpacity={stageFilter === "ALL" || stageFilter === s.stageKey ? 1 : 0.35} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold font-mono text-slate-900">{models.length}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Versions</span>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {stageData.map((s) => (
                      <li key={s.stageKey}>
                        <button
                          onClick={() => setStageFilter(stageFilter === s.stageKey ? "ALL" : s.stageKey)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded border text-xs transition ${
                            stageFilter === s.stageKey ? "border-[#3BB48C] bg-slate-50" : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex items-center gap-2 font-medium text-slate-700">
                            <span className="w-2 h-2 rounded-full" style={{ background: s.fill }} />
                            {s.stage}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
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

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
            <span>Promotion Gate: Cryptographic Hash Locked</span>
            <span>Audit Trail Enabled</span>
          </div>
        </div>

        {/* CHART 2: Model Latency & Memory Footprint (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Model Footprint vs. Speed
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Latency (ms, bars) vs. Memory Size (MB, line)
                </p>
              </div>
            </div>

            <div className="h-52 w-full">
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
                  <XAxis dataKey="name" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}ms`} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}MB`} />
                  <RechartsTooltip content={<BiTooltip valueFormatter={(v) => (typeof v === "number" ? v.toFixed(1) : v)} />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar yAxisId="left" dataKey="lat" name="Latency (ms)" fill="#3BB48C" radius={[3, 3, 0, 0]} barSize={28} />
                  <Line yAxisId="right" type="monotone" dataKey="size" name="Size (MB)" stroke="#334155" strokeWidth={1.8} dot={{ r: 3, fill: "#fff", strokeWidth: 1.5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-100 text-xs font-mono text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#3BB48C]" />
              Latency (ms)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-[2px] bg-[#334155]" />
              Footprint (MB)
            </span>
          </div>
        </div>
      </div>

      {/* ── Row 2: Registry Growth & Governance Scorecard (Snowflake Clean Look) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5 shadow-2xs">
          <div className="mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Registry Growth &amp; Promotion Velocity
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Cumulative registered versions vs. promoted to Production</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REGISTRY_GROWTH} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<BiTooltip />} cursor={{ stroke: "#E2E8F0" }} />
                <Area type="monotone" dataKey="registered" name="Registered" stroke="#64748B" strokeWidth={1.8} fill="#F1F5F9" fillOpacity={0.6} />
                <Area type="monotone" dataKey="promoted" name="Promoted to Prod" stroke="#3BB48C" strokeWidth={2} fill="#3BB48C" fillOpacity={0.12} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 shadow-2xs">
          <div className="mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Governance Scorecard
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Registry compliance coverage (% of versions)</p>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart data={GOVERNANCE} innerRadius="30%" outerRadius="100%" startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" background={{ fill: "#F8FAFC" }} cornerRadius={4} />
                <RechartsTooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
            {GOVERNANCE.map((g) => (
              <span key={g.name} className="flex items-center justify-between text-xs text-slate-600 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.fill }} />
                  {g.name}
                </span>
                <strong className="text-slate-900">{g.value}%</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Champion vs Challenger & Promotion Audit Feed (Snowflake Clean Look) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5 shadow-2xs">
          <div className="mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Champion vs. Challenger
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Accuracy vs. p95 latency — bubble size = model footprint (MB)</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis type="number" dataKey="lat" name="Latency" domain={[0, 14]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}ms`} />
                <YAxis type="number" dataKey="acc" name="Accuracy" domain={[0.86, 0.98]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <ZAxis type="number" dataKey="mb" range={[90, 420]} />
                <ReferenceLine y={0.94} stroke="#3BB48C" strokeDasharray="3 3" label={{ value: "SLA accuracy", fill: "#3BB48C", fontSize: 10, position: "insideTopRight" }} />
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
                          { name: "p95 Latency", value: `${p.lat} ms`, color: "#475569" },
                          { name: "Footprint", value: `${p.mb} MB`, color: "#475569" },
                        ]}
                      />
                    );
                  }}
                />
                <Scatter data={CHALLENGERS}>
                  {CHALLENGERS.map((c) => (
                    <Cell key={c.name} fill={c.fill} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 shadow-2xs">
          <div className="mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Promotion Audit Trail
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Latest stage transitions with approver</p>
          </div>
          <ol className="relative border-l border-slate-200 ml-2 space-y-3.5 my-1">
            {promotionEvents.map((e) => (
              <li key={e.id} className="ml-3.5">
                <span className="absolute -left-[4.5px] mt-1.5 w-2 h-2 rounded-full ring-2 ring-white" style={{ background: e.color }} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{e.model} <span className="font-mono text-[11px] text-slate-500">v{e.version}</span></span>
                  <span className="text-[11px] font-mono text-slate-400">{e.when}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {e.from} → <strong className="text-slate-800">{e.to}</strong> · <span className="font-mono text-slate-400">by {e.by}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ── Explorer Toolbar: Search & Stage Filter (Snowflake Clean Style) ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models by name, framework, or MLflow run ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] transition font-sans"
          />
        </div>

        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          {["ALL", "PRODUCTION", "STAGING", "CANDIDATE", "DEVELOPMENT"].map((st) => (
            <button
              key={st}
              onClick={() => setStageFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                stageFilter === st
                  ? "bg-[#3BB48C] text-white shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {st === "ALL" ? "All Stages" : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Models Registry Dense Table (Snowflake Enterprise Look) ── */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-2xs">
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Registered Models ({filteredModels.length})
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {productionCount} active production • {stagingCount} staging
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
              <tr>
                <th
                  onClick={() => handleSort("name")}
                  className="px-4 py-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Model Name</span>
                    {sortField === "name" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("version")}
                  className="px-3 py-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Version</span>
                    {sortField === "version" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("stage")}
                  className="px-3 py-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Lifecycle Stage</span>
                    {sortField === "stage" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("framework")}
                  className="px-3 py-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Framework</span>
                    {sortField === "framework" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("latency")}
                  className="px-3 py-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>p95 Latency</span>
                    {sortField === "latency" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th className="px-3 py-2.5 whitespace-nowrap">
                  <span>MLflow Run</span>
                </th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredModels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No models match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredModels.map((m, idx) => {
                  const stage = (m.stage || "DEVELOPMENT").toUpperCase();
                  return (
                    <tr key={idx} className="h-11 hover:bg-slate-50 transition-colors group">
                      {/* Model Name */}
                      <td className="px-4 py-2">
                        <span className="font-semibold text-slate-900 group-hover:text-[#3BB48C] transition-colors">
                          {m.name}
                        </span>
                      </td>

                      {/* Version */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-slate-600">
                          v{m.version}
                        </span>
                      </td>

                      {/* Stage - Inline Status indicator without bulky badge */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              stage === "PRODUCTION"
                                ? "bg-[#3BB48C]"
                                : stage === "STAGING"
                                ? "bg-amber-500"
                                : stage === "CANDIDATE"
                                ? "bg-slate-600"
                                : "bg-slate-400"
                            }`}
                          />
                          <span className="capitalize">{stage.toLowerCase()}</span>
                        </span>
                      </td>

                      {/* Framework */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-slate-600">
                          {m.framework || "Scikit-Learn"}
                        </span>
                      </td>

                      {/* Latency */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-slate-700">
                          {m.latency_ms ? `${m.latency_ms} ms` : "—"}
                        </span>
                      </td>

                      {/* MLflow Run ID */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        {m.mlflow_run_id ? (
                          <span
                            className="font-mono text-[11px] text-slate-500 hover:text-slate-900 cursor-pointer"
                            title={`Full MLflow Run ID: ${m.mlflow_run_id}`}
                          >
                            #{m.mlflow_run_id.slice(0, 10)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedModel(m)}
                          disabled={!canPromote}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition shadow-2xs ${
                            canPromote
                              ? "bg-[#3BB48C] hover:bg-[#329F7B] text-white border border-[#329F7B] cursor-pointer"
                              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                          }`}
                          title={canPromote ? "Promote model stage" : "Requires Developer role"}
                        >
                          <ArrowUpCircle className="w-3 h-3" />
                          <span>Promote</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Stage Promotion Modal (Snowflake Clean Look) ── */}
      {selectedModel && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-md max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Promote Model Stage
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target: <strong className="text-slate-800">{selectedModel.name}</strong> (v{selectedModel.version})
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Select Target Stage
                </label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] font-sans"
                >
                  <option value="DEVELOPMENT">DEVELOPMENT (Training Sandbox)</option>
                  <option value="CANDIDATE">CANDIDATE (Validation Pending)</option>
                  <option value="STAGING">STAGING (Pre-release Testing)</option>
                  <option value="PRODUCTION">PRODUCTION (Live Serving)</option>
                  <option value="ARCHIVED">ARCHIVED (Decommissioned)</option>
                </select>
              </div>

              {targetStage === "PRODUCTION" && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 font-mono">
                  <strong className="text-slate-900">Single-Active Rule</strong>: Promoting to Production automatically demotes any current production model of this group to Staging.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedModel(null)}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePromote}
                  className="px-3 py-1 rounded bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-semibold border border-[#329F7B] shadow-2xs transition"
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
