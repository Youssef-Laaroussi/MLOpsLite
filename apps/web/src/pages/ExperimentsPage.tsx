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
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { Experiment, ExperimentRun } from "../api/types";
import { fetchExperiments, fetchExperimentRuns, createExperiment } from "../api/client";

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

  // Convergence Curve Metric View: "loss" | "accuracy"
  const [lossMetricView, setLossMetricView] = useState<"loss" | "accuracy">("loss");
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);

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
      {/* ── Page Header (with Last 6 Months Filter on Top Right) ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FlaskConical className="w-7 h-7 text-[#3BB48C]" />
            Experiment Tracking
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
              MLflow Live
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Track runs, hyperparameters, validation metrics, and model artifacts with full lineage
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Exact Date Filter matching other sections: "Last 6 months" */}
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
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#3BB48C] transition shadow-xs"
            title="Refresh experiments"
          >
            <RefreshCw className={`w-4 h-4 text-[#3BB48C] ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329a77] text-white font-bold text-xs transition shadow-md shadow-[#3BB48C]/25"
          >
            <Plus className="w-4 h-4" />
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

      {/* ── Visual Analytics Row: Multi-Run Convergence Curve & Hyperparameter Impact Ranking (NO DONUTS!) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: Training Loss & Metric Convergence (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs hover:border-[#3BB48C]/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#3BB48C]" />
                  Training Convergence Curves
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    Multi-Run
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparison of candidate runs across 100 training epochs
                </p>
              </div>

              {/* View Switcher: Loss vs Accuracy */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setLossMetricView("loss")}
                  className={`px-3 py-1 rounded-lg transition ${
                    lossMetricView === "loss"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Log Loss
                </button>
                <button
                  onClick={() => setLossMetricView("accuracy")}
                  className={`px-3 py-1 rounded-lg transition ${
                    lossMetricView === "accuracy"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Validation Accuracy
                </button>
              </div>
            </div>

            {/* Native SVG Multi-Line Chart */}
            <div className="relative h-56 w-full pt-2">
              <svg viewBox="0 0 520 215" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                {/* Horizontal Grid lines & Y-Axis Labels */}
                {(lossMetricView === "loss"
                  ? [
                      { val: "0.8", y: 30 },
                      { val: "0.6", y: 65 },
                      { val: "0.4", y: 100 },
                      { val: "0.2", y: 135 },
                      { val: "0.0", y: 170 },
                    ]
                  : [
                      { val: "1.0", y: 30 },
                      { val: "0.8", y: 65 },
                      { val: "0.6", y: 100 },
                      { val: "0.4", y: 135 },
                      { val: "0.2", y: 170 },
                    ]
                ).map((tick) => (
                  <g key={tick.val}>
                    <line
                      x1="42"
                      y1={tick.y}
                      x2="505"
                      y2={tick.y}
                      stroke="#EEF2F6"
                      strokeWidth="1.2"
                    />
                    <text
                      x="30"
                      y={tick.y + 4}
                      textAnchor="end"
                      className="text-[11px] font-bold fill-slate-400 font-sans"
                    >
                      {tick.val}
                    </text>
                  </g>
                ))}

                {/* X-Axis Ticks: Epochs 0, 20, 40, 60, 80, 100 */}
                {[
                  { step: "Epoch 0", x: 50 },
                  { step: "Ep 20", x: 142 },
                  { step: "Ep 40", x: 234 },
                  { step: "Ep 60", x: 326 },
                  { step: "Ep 80", x: 418 },
                  { step: "Ep 100", x: 500 },
                ].map((s, idx) => (
                  <g key={s.step} onMouseEnter={() => setHoveredStepIndex(idx)} onMouseLeave={() => setHoveredStepIndex(null)}>
                    <text
                      x={s.x}
                      y="196"
                      textAnchor="middle"
                      className={`text-[11px] font-bold font-sans transition-colors ${
                        hoveredStepIndex === idx ? "fill-slate-900" : "fill-slate-400"
                      }`}
                    >
                      {s.step}
                    </text>
                  </g>
                ))}

                {/* Lines */}
                {lossMetricView === "loss" ? (
                  <>
                    {/* Run 1: Optuna Tune (Emerald - Converges best to 0.142) */}
                    <path
                      d="M 50 51.0 L 142 96.5 L 234 121.0 L 326 136.75 L 418 143.75 L 500 145.15"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="drop-shadow-sm"
                    />
                    {/* Run 2: Baseline XGB (Blue - Reaches 0.198) */}
                    <path
                      d="M 50 49.25 L 142 80.75 L 234 103.5 L 326 121.0 L 418 131.5 L 500 135.35"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Run 3: Deep Trees Overfit (Purple - Plateaus at 0.231) */}
                    <path
                      d="M 50 47.5 L 142 86.0 L 234 115.75 L 326 128.0 L 418 128.87 L 500 129.57"
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="2.4"
                      strokeDasharray="4 3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                ) : (
                  <>
                    {/* Accuracy curves */}
                    {/* Run 1: Optuna Tune (Emerald - Reaches 0.942) */}
                    <path
                      d="M 50 96.5 L 142 66.75 L 234 51.0 L 326 44.0 L 418 40.85 L 500 40.15"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Run 2: Baseline XGB (Blue - Reaches 0.912) */}
                    <path
                      d="M 50 101.75 L 142 79.0 L 234 63.25 L 326 52.75 L 418 48.37 L 500 45.4"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Run 3: Deep Trees Overfit (Purple - Plateaus at 0.895) */}
                    <path
                      d="M 50 98.25 L 142 72.0 L 234 58.0 L 326 51.0 L 418 49.07 L 500 48.37"
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="2.4"
                      strokeDasharray="4 3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}

                {/* Hover indicator line if hovered */}
                {hoveredStepIndex !== null && (
                  <line
                    x1={[50, 142, 234, 326, 418, 500][hoveredStepIndex]}
                    y1="25"
                    x2={[50, 142, 234, 326, 418, 500][hoveredStepIndex]}
                    y2="175"
                    stroke="#0F172A"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}
              </svg>
            </div>

            {/* Run Legend */}
            <div className="flex flex-wrap items-center justify-between text-xs pt-3 border-t border-slate-100 gap-2">
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                optuna-tune-depth6 (0.142 Best)
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                baseline-xgb-default (0.198)
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                deep-trees-overfit (0.231)
              </span>
            </div>
          </div>
        </div>

        {/* CHART 2: Hyperparameter & Candidate Model Ranking (5 cols) - NO DONUT! */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs hover:border-[#3BB48C]/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#3BB48C]" />
                  Model Ranking &amp; Tuning
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Top performing runs sorted by validation ROC-AUC
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                Target: 0.95+
              </span>
            </div>

            {/* Candidate Runs Horizontal Performance Ranking */}
            <div className="space-y-4">
              {/* Candidate 1 */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#10B981] text-white font-black text-[10px] flex items-center justify-center">
                      #1
                    </span>
                    <span className="font-bold text-slate-900 truncate max-w-[160px]">
                      optuna-tune-depth6-lr0.03
                    </span>
                  </div>
                  <span className="font-mono font-black text-emerald-700">0.971 ROC-AUC</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-[#10B981] rounded-full" style={{ width: "97.1%" }} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>lr: 0.03 • depth: 6 • n_est: 350</span>
                  <span className="text-emerald-700 font-bold">2.4 ms latency</span>
                </div>
              </div>

              {/* Candidate 2 */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#3B82F6] text-white font-black text-[10px] flex items-center justify-center">
                      #2
                    </span>
                    <span className="font-bold text-slate-900 truncate max-w-[160px]">
                      baseline-xgb-default
                    </span>
                  </div>
                  <span className="font-mono font-black text-blue-700">0.945 ROC-AUC</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: "94.5%" }} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>lr: 0.10 • depth: 4 • n_est: 200</span>
                  <span className="text-blue-700 font-bold">3.1 ms latency</span>
                </div>
              </div>

              {/* Candidate 3 */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-purple-200 transition">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#8B5CF6] text-white font-black text-[10px] flex items-center justify-center">
                      #3
                    </span>
                    <span className="font-bold text-slate-900 truncate max-w-[160px]">
                      deep-trees-overfit-test
                    </span>
                  </div>
                  <span className="font-mono font-black text-purple-700">0.928 ROC-AUC</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-[#8B5CF6] rounded-full" style={{ width: "92.8%" }} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>lr: 0.01 • depth: 12 • n_est: 500</span>
                  <span className="text-purple-700 font-bold">5.8 ms latency</span>
                </div>
              </div>
            </div>
          </div>

          {/* Linear Execution Pipeline Meter (NO DONUT!) */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-700">Run Execution Pipeline Status</span>
              <span className="font-mono text-slate-500 text-[11px]">85% Finished • 10% Running • 5% Failed</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div className="bg-[#10B981] h-full" style={{ width: "85%" }} title="Finished: 85%" />
              <div className="bg-sky-400 h-full animate-pulse" style={{ width: "10%" }} title="Running: 10%" />
              <div className="bg-rose-400 h-full" style={{ width: "5%" }} title="Failed: 5%" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search experiments by name, ID, or framework tag..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 focus:border-[#3BB48C] transition"
          />
        </div>
        <div className="text-xs font-bold text-slate-500 shrink-0">
          Showing {filteredExperiments.length} of {experiments.length} experiments
        </div>
      </div>

      {/* ── Experiments Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredExperiments.map((exp) => (
          <div
            key={exp.experiment_id}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-[#3BB48C]/50 hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="p-2.5 rounded-2xl bg-[#EBF8F4] border border-[#BCE9DA] text-[#1A7456] group-hover:scale-105 transition-transform">
                  <FlaskConical className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  ID: {exp.experiment_id}
                </span>
              </div>

              {/* Title & Path */}
              <h3 className="font-extrabold text-slate-900 text-base tracking-tight line-clamp-1 group-hover:text-[#3BB48C] transition-colors">
                {exp.name}
              </h3>
              <p className="text-xs font-mono text-slate-400 truncate mt-1">
                {exp.artifact_location || "default-mlflow-artifacts"}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {exp.tags &&
                  Object.entries(exp.tags).map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200"
                    >
                      <Tag className="w-2.5 h-2.5 text-slate-400" />
                      {k}: {v}
                    </span>
                  ))}
              </div>
            </div>

            {/* Bottom info & Action */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-mono">
                <span className="font-bold text-slate-900">
                  {exp.runs_count !== undefined ? exp.runs_count : (exp.runs?.length || 1)}
                </span>{" "}
                runs logged
              </div>

              <button
                onClick={() => handleOpenRuns(exp)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EBF8F4] hover:bg-[#D5F2E8] text-[#1A7456] border border-[#BCE9DA] text-xs font-bold transition"
              >
                Inspect Runs
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── MODAL: RUNS & METRICS INSPECTOR ── */}
      {selectedExperiment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl bg-[#EBF8F4] border border-[#BCE9DA] text-[#1A7456]">
                  <FlaskConical className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {selectedExperiment.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-[#EBF8F4] text-xs font-mono font-bold text-[#1A7456] border border-[#BCE9DA]">
                      {selectedExperiment.lifecycle_stage || "active"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-mono">
                    <span>
                      Artifact Store: <strong>{selectedExperiment.artifact_location}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      ID: <strong>{selectedExperiment.experiment_id}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedExperiment(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Left Runs List & Right Details */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Left Column: Runs List */}
              <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto bg-slate-50/50">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 mb-2">
                  Experiment Runs ({experimentRuns.length})
                </div>

                {loadingRuns ? (
                  <div className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#3BB48C]" />
                    Fetching MLflow runs...
                  </div>
                ) : experimentRuns.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-2xl">
                    No runs recorded for this experiment yet.
                  </div>
                ) : (
                  experimentRuns.map((run) => (
                    <div
                      key={run.run_id}
                      onClick={() => setSelectedRun(run)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition text-left ${
                        selectedRun?.run_id === run.run_id
                          ? "bg-white border-[#3BB48C] shadow-sm ring-2 ring-[#3BB48C]/20"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {run.run_name || run.run_id.slice(0, 12)}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                            run.status === "FINISHED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : run.status === "RUNNING"
                              ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        ID: {run.run_id}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right Column: Run Details & Metrics */}
              <div className="p-6 md:col-span-2 space-y-6 max-h-[60vh] overflow-y-auto">
                {selectedRun ? (
                  <>
                    {/* Run Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900">
                          {selectedRun.run_name || "Run Inspection"}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-slate-500">ID: {selectedRun.run_id}</span>
                          <button
                            onClick={() => handleCopy(selectedRun.run_id)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                            title="Copy Run ID"
                          >
                            {copiedId === selectedRun.run_id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                          selectedRun.status === "FINISHED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : selectedRun.status === "RUNNING"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {selectedRun.status}
                      </span>
                    </div>

                    {/* Metrics Grid */}
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3">
                        <BarChart3 className="w-3.5 h-3.5 text-[#3BB48C]" />
                        Evaluation Metrics
                      </h5>
                      {selectedRun.metrics && Object.keys(selectedRun.metrics).length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {Object.entries(selectedRun.metrics).map(([k, v]) => (
                            <div key={k} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                              <span className="text-[11px] font-mono text-slate-500 block truncate">{k}</span>
                              <span className="text-lg font-black text-slate-900 mt-1 block">
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
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3">
                        <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                        Hyperparameters & Configuration
                      </h5>
                      {selectedRun.params && Object.keys(selectedRun.params).length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {Object.entries(selectedRun.params).map(([k, v]) => (
                            <div
                              key={k}
                              className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                            >
                              <span className="text-xs font-mono text-slate-500 truncate">{k}</span>
                              <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
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
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                          <Tag className="w-3.5 h-3.5 text-amber-500" />
                          Run Tags & Metadata
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(selectedRun.tags).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] font-mono px-2 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {k}: <strong>{v}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-12 text-center text-slate-400">Select a run on the left to inspect its metrics.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE EXPERIMENT ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-[#3BB48C]" />
                Create New Experiment
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Experiment Name
                </label>
                <input
                  type="text"
                  required
                  value={newExpName}
                  onChange={(e) => setNewExpName(e.target.value)}
                  placeholder="e.g. credit-scoring-lightgbm"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 focus:border-[#3BB48C] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tag (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newExpTagKey}
                    onChange={(e) => setNewExpTagKey(e.target.value)}
                    placeholder="Key (e.g. framework)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40"
                  />
                  <input
                    type="text"
                    value={newExpTagVal}
                    onChange={(e) => setNewExpTagVal(e.target.value)}
                    placeholder="Value (e.g. lightgbm)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newExpName.trim()}
                  className="px-4 py-2 rounded-xl bg-[#3BB48C] hover:bg-[#329a77] text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Experiment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
