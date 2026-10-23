import React, { useState, useEffect, useMemo } from "react";
import {
  FlaskConical,
  Search,
  Plus,
  RefreshCw,
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sliders,
  BarChart3,
  Layers,
  Copy,
  Check,
  X,
  FileCode,
  Tag,
  FolderGit2,
  Calendar,
  ChevronDown,
  Activity,
  Zap,
  Trophy,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { Experiment, ExperimentRun } from "../api/types";
import { fetchExperiments, fetchExperimentRuns, createExperiment } from "../api/client";
import {
  ComposedChart,
  Bar,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { AXIS_TICK, GRID_PROPS, BiTooltip, PALETTE } from "../components/charts/ChartKit";

// Realistic fallback experiments for local development & demonstration
const FALLBACK_EXPERIMENTS: (Experiment & { runs: ExperimentRun[] })[] = [
  {
    experiment_id: "exp-01",
    name: "customer-churn-xgboost",
    artifact_location: "s3://mlopslite-artifacts/01/churn-xgb",
    lifecycle_stage: "active",
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    runs_count: 4,
    tags: {
      framework: "xgboost",
      team: "retention",
      env: "production-candidate",
    },
    runs: [
      {
        run_id: "run-xgb-a90f1",
        run_name: "optuna-tune-depth6-lr0.03",
        status: "FINISHED",
        start_time: Date.now() - 3600000 * 12,
        end_time: Date.now() - 3600000 * 11 - 120000,
        metrics: {
          accuracy: 0.942,
          f1_score: 0.938,
          roc_auc: 0.971,
          log_loss: 0.142,
          training_time_sec: 142.5,
        },
        params: {
          max_depth: "6",
          learning_rate: "0.03",
          n_estimators: "350",
          subsample: "0.85",
          colsample_bytree: "0.8",
        },
        tags: { commit: "b89fa01", best_model: "true" },
      },
      {
        run_id: "run-xgb-c41d2",
        run_name: "baseline-xgb-default",
        status: "FINISHED",
        start_time: Date.now() - 3600000 * 24,
        end_time: Date.now() - 3600000 * 23 - 450000,
        metrics: {
          accuracy: 0.912,
          f1_score: 0.904,
          roc_auc: 0.945,
          log_loss: 0.198,
          training_time_sec: 95.0,
        },
        params: {
          max_depth: "4",
          learning_rate: "0.1",
          n_estimators: "200",
          subsample: "1.0",
        },
        tags: { commit: "90ca214" },
      },
      {
        run_id: "run-xgb-e55f3",
        run_name: "deep-trees-overfit-test",
        status: "FINISHED",
        start_time: Date.now() - 3600000 * 36,
        end_time: Date.now() - 3600000 * 35,
        metrics: {
          accuracy: 0.895,
          f1_score: 0.887,
          roc_auc: 0.928,
          log_loss: 0.231,
          training_time_sec: 210.2,
        },
        params: {
          max_depth: "12",
          learning_rate: "0.01",
          n_estimators: "500",
          subsample: "0.7",
        },
        tags: { commit: "77aa331" },
      },
    ],
  },
  {
    experiment_id: "exp-02",
    name: "fraud-anomaly-detection",
    artifact_location: "s3://mlopslite-artifacts/02/fraud-detector",
    lifecycle_stage: "active",
    created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    runs_count: 3,
    tags: {
      framework: "isolation-forest",
      domain: "payments",
      priority: "critical",
    },
    runs: [
      {
        run_id: "run-fraud-88bf1",
        run_name: "ensemble-iforest-contamination0.01",
        status: "FINISHED",
        start_time: Date.now() - 3600000 * 4,
        end_time: Date.now() - 3600000 * 3 - 300000,
        metrics: {
          precision: 0.965,
          recall: 0.912,
          f1_score: 0.938,
          inference_latency_ms: 2.4,
        },
        params: {
          n_estimators: "300",
          contamination: "0.015",
          max_samples: "0.9",
        },
        tags: { commit: "0fbc772" },
      },
      {
        run_id: "run-fraud-44aa0",
        run_name: "continuous-streaming-run",
        status: "RUNNING",
        start_time: Date.now() - 600000,
        metrics: {
          precision: 0.945,
          recall: 0.89,
        },
        params: {
          n_estimators: "250",
          contamination: "0.02",
        },
        tags: { live: "streaming" },
      },
    ],
  },
  {
    experiment_id: "exp-03",
    name: "nlp-sentiment-bert-mini",
    artifact_location: "s3://mlopslite-artifacts/03/sentiment-bert",
    lifecycle_stage: "active",
    created_at: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
    runs_count: 2,
    tags: {
      framework: "transformers",
      task: "sentiment-analysis",
      quantized: "int8",
    },
    runs: [
      {
        run_id: "run-bert-77bb4",
        run_name: "bert-mini-lora-epoch4",
        status: "FINISHED",
        start_time: Date.now() - 3600000 * 48,
        end_time: Date.now() - 3600000 * 46,
        metrics: {
          eval_accuracy: 0.954,
          eval_f1: 0.951,
          eval_loss: 0.089,
          throughput_qps: 1840,
        },
        params: {
          batch_size: "64",
          learning_rate: "2e-5",
          warmup_steps: "500",
          lora_r: "16",
        },
        tags: { hardware: "nvidia-a10g" },
      },
    ],
  },
];

const LEADERBOARD = [
  { name: "optuna-tune-d6", auc: 0.971, loss: 0.142, color: PALETTE.brand },
  { name: "baseline-xgb", auc: 0.945, loss: 0.198, color: PALETTE.blue },
  { name: "deep-trees", auc: 0.928, loss: 0.231, color: PALETTE.violet },
];

const RUN_ACTIVITY = [
  { week: "W1", finished: 8, failed: 2, best_auc: 0.928 },
  { week: "W2", finished: 11, failed: 1, best_auc: 0.939 },
  { week: "W3", finished: 14, failed: 3, best_auc: 0.945 },
  { week: "W4", finished: 17, failed: 1, best_auc: 0.958 },
  { week: "W5", finished: 21, failed: 2, best_auc: 0.966 },
  { week: "W6", finished: 24, failed: 1, best_auc: 0.971 },
];

const HP_IMPORTANCE = [
  { param: "learning_rate", importance: 0.42 },
  { param: "max_depth", importance: 0.27 },
  { param: "n_estimators", importance: 0.16 },
  { param: "subsample", importance: 0.09 },
  { param: "colsample_bytree", importance: 0.06 },
];

const RADAR_DATA = [
  { axis: "ROC-AUC", "optuna-tune-d6": 97, "baseline-xgb": 94, "deep-trees": 92 },
  { axis: "F1", "optuna-tune-d6": 94, "baseline-xgb": 90, "deep-trees": 89 },
  { axis: "Latency", "optuna-tune-d6": 92, "baseline-xgb": 85, "deep-trees": 60 },
  { axis: "Train speed", "optuna-tune-d6": 78, "baseline-xgb": 95, "deep-trees": 55 },
  { axis: "Stability", "optuna-tune-d6": 93, "baseline-xgb": 88, "deep-trees": 62 },
];

export const ExperimentsPage: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [experimentRuns, setExperimentRuns] = useState<ExperimentRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState<boolean>(false);
  const [selectedRun, setSelectedRun] = useState<ExperimentRun | null>(null);

  // New experiment modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newExpName, setNewExpName] = useState<string>("");
  const [newExpTagKey, setNewExpTagKey] = useState<string>("");
  const [newExpTagVal, setNewExpTagVal] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Time range filter state ("Last 6 months" default)
  const [timeRange, setTimeRange] = useState<string>("Last 6 months");
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState<boolean>(false);


  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchExperiments();
      if (data && data.length > 0) {
        setExperiments(data);
      } else {
        setExperiments(FALLBACK_EXPERIMENTS);
      }
    } catch {
      setExperiments(FALLBACK_EXPERIMENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenRuns = async (exp: Experiment) => {
    setSelectedExperiment(exp);
    setSelectedRun(null);
    setLoadingRuns(true);
    try {
      const runs = await fetchExperimentRuns(exp.experiment_id);
      if (runs && runs.length > 0) {
        setExperimentRuns(runs);
        setSelectedRun(runs[0]);
      } else {
        // Fallback runs
        const fallback = FALLBACK_EXPERIMENTS.find((e) => e.experiment_id === exp.experiment_id);
        const runsList = fallback?.runs || [
          {
            run_id: `run-${Math.random().toString(36).substring(2, 8)}`,
            run_name: "initial-training-baseline",
            status: "FINISHED",
            start_time: Date.now() - 3600000 * 2,
            end_time: Date.now() - 3600000 * 1,
            metrics: { accuracy: 0.925, f1_score: 0.918, loss: 0.18 },
            params: { learning_rate: "0.01", batch_size: "32", epochs: "50" },
          },
        ];
        setExperimentRuns(runsList);
        setSelectedRun(runsList[0]);
      }
    } catch {
      const fallback = FALLBACK_EXPERIMENTS.find((e) => e.experiment_id === exp.experiment_id);
      const runsList = fallback?.runs || [];
      setExperimentRuns(runsList);
      if (runsList.length > 0) setSelectedRun(runsList[0]);
    } finally {
      setLoadingRuns(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpName.trim()) return;
    setCreating(true);
    try {
      const tags: Record<string, string> = {};
      if (newExpTagKey.trim() && newExpTagVal.trim()) {
        tags[newExpTagKey.trim()] = newExpTagVal.trim();
      }
      await createExperiment({ name: newExpName.trim(), tags });
      await loadData();
      setIsCreateOpen(false);
      setNewExpName("");
      setNewExpTagKey("");
      setNewExpTagVal("");
    } catch {
      // Local addition fallback
      const newExp: Experiment = {
        experiment_id: `exp-${Date.now().toString(36)}`,
        name: newExpName.trim(),
        artifact_location: `s3://mlopslite-artifacts/${newExpName.trim()}`,
        lifecycle_stage: "active",
        created_at: new Date().toISOString(),
        runs_count: 0,
        tags: newExpTagKey.trim() ? { [newExpTagKey.trim()]: newExpTagVal.trim() } : { env: "development" },
      };
      setExperiments((prev) => [newExp, ...prev]);
      setIsCreateOpen(false);
      setNewExpName("");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredExperiments = useMemo(() => {
    return experiments.filter((e) => {
      const matchesQuery =
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.experiment_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.tags && Object.values(e.tags).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesQuery;
    });
  }, [experiments, searchQuery]);

  const totalRuns = useMemo(() => {
    return experiments.reduce((acc, curr) => acc + (curr.runs_count || (curr.runs ? curr.runs.length : 1)), 0);
  }, [experiments]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
            Experiment Tracking
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track runs, hyperparameters, validation metrics, and model artifacts with full lineage
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
                    className={`w-full text-left px-3 py-1.5 text-xs transition ${timeRange === range
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
            onClick={loadData}
            className="p-1.5 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900 hover:border-slate-300 transition shadow-2xs"
            title="Refresh experiments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#3BB48C]" : ""}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-semibold shadow-2xs transition border border-[#329F7B]"
          >
            <Plus className="w-3.5 h-3.5" />
            New Experiment
          </button>
        </div>
      </div>

      {/* ── Top Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Experiments"
          value={`${experiments.length || 67} Workspaces`}
          subtitle="Managed MLflow projects"
          icon={FlaskConical}
          color="brand"
          trend="+14% this month"
        />
        <StatCard
          title="Recorded Runs"
          value={`${totalRuns || 142} Runs`}
          subtitle="Hyperparameters & metrics logged"
          icon={Layers}
          color="brand"
          trend="+28% this week"
        />
        <StatCard
          title="Peak Validation Metric"
          value="0.971 ROC-AUC"
          subtitle="Best: optuna-tune-d6"
          icon={BarChart3}
          color="emerald"
          trend="Top Candidate"
        />
        <StatCard
          title="MLflow Tracking Server"
          value="Port :5000 Active"
          subtitle="Local MLflow proxy ready"
          icon={CheckCircle2}
          color="brand"
          trend="100% Traced"
        />
      </div>

      {/* ── Visual Analytics Row: Run Leaderboard & Model Profile Comparison (Snowflake Clean Style) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CHART 1: Run Leaderboard — ROC-AUC (bars) vs Log Loss (line) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5 shadow-2xs">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Run Leaderboard
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ROC-AUC (bars) vs. log loss (line) with candidate threshold
              </p>
            </div>
            <div className="text-[11px] font-mono text-slate-600">
              Leader: <span className="font-semibold text-slate-900">{LEADERBOARD[0].name}</span>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={LEADERBOARD} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis yAxisId="auc" domain={[0.88, 1]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(2)} />
                <YAxis yAxisId="loss" orientation="right" domain={[0, 0.3]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(2)} />
                <RechartsTooltip content={<BiTooltip valueFormatter={(v) => (typeof v === "number" ? v.toFixed(3) : v)} />} cursor={{ fill: "#F8FAFC" }} />
                <ReferenceLine yAxisId="auc" y={0.95} stroke="#3BB48C" strokeDasharray="3 3" label={{ value: "Threshold ≥ 0.95", fill: "#3BB48C", fontSize: 10, position: "insideTopRight" }} />
                <Bar yAxisId="auc" dataKey="auc" name="ROC-AUC" radius={[3, 3, 0, 0]} barSize={42}>
                  {LEADERBOARD.map((r, i) => (
                    <Cell key={r.name} fill={i === 0 ? "#3BB48C" : "#94A3B8"} />
                  ))}
                </Bar>
                <Line yAxisId="loss" type="monotone" dataKey="loss" name="Log Loss" stroke="#334155" strokeWidth={1.8} dot={{ r: 3, fill: "#fff", strokeWidth: 1.5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Multi-dimensional model profile (radar) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 shadow-2xs">
          <div className="mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Model Profile Comparison
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Normalized score (0–100) across quality, latency &amp; speed
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={RADAR_DATA} outerRadius="70%">
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: "#64748B", fontWeight: 500 }} />
                <PolarRadiusAxis domain={[50, 100]} tick={false} axisLine={false} />
                <Radar name="optuna-tune-d6" dataKey="optuna-tune-d6" stroke="#3BB48C" fill="#3BB48C" fillOpacity={0.25} strokeWidth={1.5} />
                <Radar name="baseline-xgb" dataKey="baseline-xgb" stroke="#64748B" fill="#64748B" fillOpacity={0.1} strokeWidth={1.2} />
                <RechartsTooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Row 2: Run Activity & Hyperparameter Importance (Snowflake Clean Style) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5 shadow-2xs">
          <div className="mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Run Activity &amp; Success Rate
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Weekly runs by outcome, with top ROC-AUC trend</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={RUN_ACTIVITY} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis yAxisId="n" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis yAxisId="auc" orientation="right" domain={[0.9, 1]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(2)} />
                <RechartsTooltip content={<BiTooltip />} cursor={{ fill: "#F8FAFC" }} />
                <Bar yAxisId="n" stackId="s" dataKey="finished" name="Success" fill="#3BB48C" barSize={26} />
                <Bar yAxisId="n" stackId="s" dataKey="failed" name="Failed" fill="#E11D48" radius={[2, 2, 0, 0]} />
                <Line yAxisId="auc" type="monotone" dataKey="best_auc" name="Best ROC-AUC" stroke="#475569" strokeWidth={1.8} dot={{ r: 2.5 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 shadow-2xs">
          <div className="mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Hyperparameter Importance
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Impact on metric variance (Optuna fANOVA)</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={HP_IMPORTANCE} layout="vertical" margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} horizontal={false} />
                <XAxis type="number" domain={[0, 0.5]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                <YAxis type="category" dataKey="param" tick={{ ...AXIS_TICK, fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={100} />
                <RechartsTooltip content={<BiTooltip valueFormatter={(v) => (typeof v === "number" ? `${(v * 100).toFixed(1)}%` : v)} />} cursor={{ fill: "#F8FAFC" }} />
                <Bar dataKey="importance" name="Importance" radius={[0, 3, 3, 0]} barSize={14}>
                  {HP_IMPORTANCE.map((h, i) => (
                    <Cell key={h.param} fill={i === 0 ? "#3BB48C" : "#94A3B8"} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Toolbar (Snowflake Clean Style) ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search experiments by name, ID, or framework tag..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] transition font-sans"
          />
        </div>
        <div className="text-xs font-mono text-slate-500 shrink-0">
          {filteredExperiments.length} experiments
        </div>
      </div>

      {/* ── Experiments Dense Table (Snowflake Look) ── */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-2xs">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Experiment Workspaces
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({filteredExperiments.length})
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {totalRuns} total runs logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2">Experiment Name</th>
                <th className="px-3 py-2">Experiment ID</th>
                <th className="px-3 py-2">Runs Logged</th>
                <th className="px-3 py-2">Tags / Framework</th>
                <th className="px-3 py-2">Artifact Location</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExperiments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No experiment matches your search criteria.
                  </td>
                </tr>
              ) : (
                filteredExperiments.map((exp) => (
                  <tr key={exp.experiment_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Experiment Name */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-slate-100 text-slate-600 shrink-0">
                          <FlaskConical className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-slate-900">
                          {exp.name}
                        </span>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-slate-500">
                        {exp.experiment_id}
                      </span>
                    </td>

                    {/* Runs */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-medium text-slate-800">
                        {exp.runs_count !== undefined ? exp.runs_count : (exp.runs?.length || 1)} runs
                      </span>
                    </td>

                    {/* Tags / Framework */}
                    <td className="px-3 py-2.5">
                      {exp.tags && Object.keys(exp.tags).length > 0 ? (
                        <div className="flex flex-wrap gap-1 font-mono text-[11px] text-slate-600">
                          {Object.entries(exp.tags).map(([k, v], idx) => (
                            <span key={k}>
                              <span className="text-slate-400">{k}:</span>
                              <span>{v}</span>
                              {idx < Object.keys(exp.tags || {}).length - 1 && <span className="text-slate-300 mr-1">,</span>}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">—</span>
                      )}
                    </td>

                    {/* Artifact Location */}
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[11px] text-slate-500 truncate block max-w-xs">
                        {exp.artifact_location || "s3://mlopslite-artifacts/default"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenRuns(exp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-medium transition shadow-2xs hover:border-[#3BB48C]"
                      >
                        <span>Inspect Runs</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: RUNS & METRICS INSPECTOR (Snowflake Clean Style) ── */}
      {selectedExperiment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-md w-full max-w-5xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-slate-100 text-slate-700 shrink-0">
                  <FlaskConical className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {selectedExperiment.name}
                    </h3>
                    <span className="font-mono text-slate-500 text-[11px]">
                      ({selectedExperiment.lifecycle_stage || "active"})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-mono">
                    <span>
                      Artifact Store: {selectedExperiment.artifact_location}
                    </span>
                    <span>•</span>
                    <span>
                      ID: {selectedExperiment.experiment_id}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedExperiment(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Left Runs List & Right Details */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Left Column: Runs List */}
              <div className="p-3 space-y-1.5 max-h-[60vh] overflow-y-auto bg-slate-50/40">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-1 mb-2">
                  Recorded Runs ({experimentRuns.length})
                </div>

                {loadingRuns ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-[#3BB48C]" />
                    Fetching MLflow runs...
                  </div>
                ) : (
                  experimentRuns.map((run) => (
                    <div
                      key={run.run_id}
                      onClick={() => setSelectedRun(run)}
                      className={`p-2.5 rounded border cursor-pointer transition text-left ${
                        selectedRun?.run_id === run.run_id
                          ? "bg-white border-[#3BB48C] shadow-2xs"
                          : "bg-white border-slate-200/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-medium text-xs text-slate-900 truncate">
                          {run.run_name || run.run_id.slice(0, 12)}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-600">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              run.status === "FINISHED"
                                ? "bg-[#3BB48C]"
                                : run.status === "RUNNING"
                                ? "bg-amber-500 animate-pulse"
                                : "bg-rose-500"
                            }`}
                          />
                          <span className="capitalize">{run.status.toLowerCase()}</span>
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {run.run_id}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right Column: Run Details & Metrics */}
              <div className="p-5 md:col-span-2 space-y-4 max-h-[60vh] overflow-y-auto bg-white">
                {selectedRun ? (
                  <>
                    {/* Run Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">
                          {selectedRun.run_name || "Run Inspection"}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono text-slate-500">ID: {selectedRun.run_id}</span>
                          <button
                            onClick={() => handleCopy(selectedRun.run_id)}
                            className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                            title="Copy Run ID"
                          >
                            {copiedId === selectedRun.run_id ? (
                              <Check className="w-3 h-3 text-[#3BB48C]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            selectedRun.status === "FINISHED"
                              ? "bg-[#3BB48C]"
                              : selectedRun.status === "RUNNING"
                              ? "bg-amber-500 animate-pulse"
                              : "bg-rose-500"
                          }`}
                        />
                        <span className="font-medium capitalize">{selectedRun.status.toLowerCase()}</span>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div>
                      <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Evaluation Metrics
                      </h5>
                      {selectedRun.metrics && Object.keys(selectedRun.metrics).length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {Object.entries(selectedRun.metrics).map(([k, v]) => (
                            <div key={k} className="p-2.5 bg-slate-50/70 border border-slate-200 rounded">
                              <span className="text-[10px] font-mono text-slate-500 block truncate">{k}</span>
                              <span className="text-sm font-mono font-semibold text-slate-900 mt-0.5 block">
                                {typeof v === "number" ? (v < 1 && v > 0 ? v.toFixed(4) : v.toLocaleString()) : v}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No metrics reported for this run.</p>
                      )}
                    </div>

                    {/* Hyperparameters Grid */}
                    <div>
                      <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Hyperparameters &amp; Params
                      </h5>
                      {selectedRun.params && Object.keys(selectedRun.params).length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(selectedRun.params).map(([k, v]) => (
                            <div
                              key={k}
                              className="p-2 bg-white border border-slate-200 rounded flex items-center justify-between gap-2"
                            >
                              <span className="text-[11px] font-mono text-slate-500 truncate">{k}</span>
                              <span className="text-[11px] font-mono font-medium text-slate-900">
                                {String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No parameters recorded.</p>
                      )}
                    </div>

                    {/* Tags */}
                    {selectedRun.tags && Object.keys(selectedRun.tags).length > 0 && (
                      <div>
                        <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                          Tags
                        </h5>
                        <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-600">
                          {Object.entries(selectedRun.tags).map(([k, v]) => (
                            <span key={k}>
                              <span className="text-slate-400">{k}:</span> {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-10 text-center text-xs text-slate-400">Select a run on the left to inspect its metrics.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE EXPERIMENT (Snowflake Clean Style) ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-md w-full max-w-lg p-5 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[#3BB48C]/10 text-[#3BB48C]">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  New Experiment Workspace
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Experiment Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newExpName}
                  onChange={(e) => setNewExpName(e.target.value)}
                  placeholder="e.g. credit-scoring-lightgbm"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tag / Metadata (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newExpTagKey}
                    onChange={(e) => setNewExpTagKey(e.target.value)}
                    placeholder="Key (e.g. framework)"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] font-mono"
                  />
                  <input
                    type="text"
                    value={newExpTagVal}
                    onChange={(e) => setNewExpTagVal(e.target.value)}
                    placeholder="Value (e.g. lightgbm)"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newExpName.trim()}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-[#3BB48C] hover:bg-[#329F7B] disabled:opacity-50 rounded border border-[#329F7B] transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{creating ? "Creating..." : "Create Experiment"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
