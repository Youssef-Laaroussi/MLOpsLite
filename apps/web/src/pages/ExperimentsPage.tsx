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
  ChevronRight,
  Sliders,
  BarChart3,
  Layers,
  Copy,
  Check,
  X,
  Calendar,
  ChevronDown,
  Trash2,
  Tag,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { Experiment, ExperimentRun } from "../api/types";
import {
  fetchExperiments,
  fetchExperimentRuns,
  createExperiment,
  deleteExperiment,
} from "../api/client";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { AXIS_TICK, GRID_PROPS, BiTooltip } from "../components/charts/ChartKit";

export const ExperimentsPage: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Inspection modal state
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [experimentRuns, setExperimentRuns] = useState<ExperimentRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState<boolean>(false);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<ExperimentRun | null>(null);

  // New experiment modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newExpName, setNewExpName] = useState<string>("");
  const [newExpTagKey, setNewExpTagKey] = useState<string>("");
  const [newExpTagVal, setNewExpTagVal] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Time range filter
  const [timeRange, setTimeRange] = useState<string>("All time");
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchExperiments();
      setExperiments(data || []);
    } catch (err: any) {
      setExperiments([]);
      setLoadError(
        err?.response?.data?.detail || err?.message || "Failed to load experiments from MLflow server."
      );
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
    setRunsError(null);
    try {
      const runs = await fetchExperimentRuns(exp.experiment_id);
      setExperimentRuns(runs || []);
      if (runs && runs.length > 0) {
        setSelectedRun(runs[0]);
      }
    } catch (err: any) {
      setExperimentRuns([]);
      setRunsError(
        err?.response?.data?.detail || err?.message || "Failed to load runs from MLflow."
      );
    } finally {
      setLoadingRuns(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const tags: Record<string, string> = {};
      if (newExpTagKey.trim() && newExpTagVal.trim()) {
        tags[newExpTagKey.trim()] = newExpTagVal.trim();
      }
      const created = await createExperiment({ name: newExpName.trim(), tags });
      await loadData();
      setIsCreateOpen(false);
      setNewExpName("");
      setNewExpTagKey("");
      setNewExpTagVal("");
      setToastMessage(`Experiment "${created.name}" created in MLflow!`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setCreateError(
        err?.response?.data?.detail || err?.message || "Failed to create experiment."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (expId: string, expName: string) => {
    if (!confirm(`Are you sure you want to delete experiment "${expName}" (ID: ${expId})?`)) return;
    try {
      await deleteExperiment(expId);
      await loadData();
      setToastMessage(`Experiment "${expName}" deleted.`);
      setTimeout(() => setToastMessage(null), 3000);
      if (selectedExperiment?.experiment_id === expId) {
        setSelectedExperiment(null);
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || "Failed to delete experiment.");
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
        (e.tags &&
          Object.values(e.tags).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesQuery;
    });
  }, [experiments, searchQuery]);

  const totalRuns = useMemo(() => {
    return experiments.reduce((acc, curr) => acc + (curr.runs_count || 0), 0);
  }, [experiments]);

  // Real runs aggregation for dynamic charts if runs exist
  const runsWithMetrics = useMemo(() => {
    return experimentRuns.filter((r) => r.metrics && Object.keys(r.metrics).length > 0);
  }, [experimentRuns]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs font-mono px-4 py-2.5 rounded shadow-lg flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-[#3BB48C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
            Experiment Tracking
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real MLflow tracking server connected to S3 artifact store
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
            onClick={loadData}
            className="p-1.5 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900 hover:border-slate-300 transition shadow-2xs"
            title="Refresh experiments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#3BB48C]" : ""}`} />
          </button>

          <button
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-semibold shadow-2xs transition border border-[#329F7B]"
          >
            <Plus className="w-3.5 h-3.5" />
            New Experiment
          </button>
        </div>
      </div>

      {/* Backend Error Banner */}
      {loadError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">MLflow Backend Error</span>
            <span>{loadError}</span>
          </div>
          <button
            onClick={loadData}
            className="px-2 py-1 bg-white border border-rose-300 rounded font-medium hover:bg-rose-100 text-rose-800 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Top Stat Cards (Real live counts from MLflow) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Experiments"
          value={loading ? "..." : `${experiments.length} Experiments`}
          subtitle="Registered in MLflow server"
          icon={FlaskConical}
          color="brand"
          trend={experiments.length > 0 ? "Tracking" : "Empty"}
        />
        <StatCard
          title="Recorded Runs"
          value={loading ? "..." : `${totalRuns} Runs`}
          subtitle="Logged across all experiments"
          icon={Layers}
          color="brand"
          trend={totalRuns > 0 ? "Active" : "None"}
        />
        <StatCard
          title="MLflow Tracking Host"
          value="http://mlflow:5000"
          subtitle="Backend proxy operational"
          icon={CheckCircle2}
          color="emerald"
          trend="Live"
        />
        <StatCard
          title="Artifact Target"
          value="s3://mlflow-artifacts"
          subtitle="MinIO persistent bucket"
          icon={BarChart3}
          color="brand"
          trend="S3 MinIO"
        />
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search experiments by name, ID, or framework tag..."
            className="w-full pl-8 pr-4 py-1.5 text-xs bg-slate-50/50 border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] focus:bg-white transition"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono shrink-0">
          {filteredExperiments.length} experiment{filteredExperiments.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* ── Experiments Table ── */}
      <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            MLflow Experiments ({filteredExperiments.length})
          </h3>
          <span className="text-[11px] font-mono text-slate-400">Source: MLflow Server</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Experiment Name</th>
                <th className="px-3 py-2.5">ID</th>
                <th className="px-3 py-2.5">Runs</th>
                <th className="px-3 py-2.5">Tags / Metadata</th>
                <th className="px-3 py-2.5">Artifact Location</th>
                <th className="px-3 py-2.5">Created</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#3BB48C]" />
                    Loading experiments from MLflow...
                  </td>
                </tr>
              ) : filteredExperiments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <FlaskConical className="w-8 h-8 stroke-1 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700 text-xs">No experiments found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {searchQuery
                        ? "No experiment matches your search criteria."
                        : "Create an experiment above or log runs from your Python MLflow script."}
                    </p>
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
                        <span className="font-semibold text-slate-900">{exp.name}</span>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-slate-500">{exp.experiment_id}</span>
                    </td>

                    {/* Runs */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-medium text-slate-800">
                        {exp.runs_count ?? 0} run{exp.runs_count === 1 ? "" : "s"}
                      </span>
                    </td>

                    {/* Tags */}
                    <td className="px-3 py-2.5">
                      {exp.tags && Object.keys(exp.tags).length > 0 ? (
                        <div className="flex flex-wrap gap-1 font-mono text-[11px] text-slate-600">
                          {Object.entries(exp.tags).map(([k, v], idx) => (
                            <span key={k}>
                              <span className="text-slate-400">{k}:</span>
                              <span>{v}</span>
                              {idx < Object.keys(exp.tags || {}).length - 1 && (
                                <span className="text-slate-300 mr-1">,</span>
                              )}
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
                        {exp.artifact_location || "—"}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {exp.created_at ? new Date(exp.created_at).toLocaleDateString() : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenRuns(exp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-medium transition shadow-2xs hover:border-[#3BB48C]"
                          title="Inspect MLflow runs"
                        >
                          <span>Inspect Runs</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </button>

                        {exp.experiment_id !== "0" && (
                          <button
                            onClick={() => handleDelete(exp.experiment_id, exp.name)}
                            className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-200 text-[11px] transition"
                            title="Delete experiment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: RUNS & METRICS INSPECTOR ── */}
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
                      (ID: {selectedExperiment.experiment_id})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-mono">
                    <span>Artifact Store: {selectedExperiment.artifact_location}</span>
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

            {/* Error in modal if any */}
            {runsError && (
              <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{runsError}</span>
              </div>
            )}

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
                ) : experimentRuns.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <p className="font-medium text-slate-600">No runs logged yet</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Log runs using MLflow Python SDK:
                    </p>
                    <div className="mt-2 p-2 bg-slate-100 rounded text-[10px] font-mono text-left text-slate-700">
                      mlflow.set_experiment("{selectedExperiment.name}")<br />
                      with mlflow.start_run():<br />
                      &nbsp;&nbsp;mlflow.log_metric("loss", 0.1)
                    </div>
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
                          <span className="text-[11px] font-mono text-slate-500">
                            ID: {selectedRun.run_id}
                          </span>
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
                        Evaluation Metrics ({Object.keys(selectedRun.metrics || {}).length})
                      </h5>
                      {selectedRun.metrics && Object.keys(selectedRun.metrics).length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {Object.entries(selectedRun.metrics).map(([k, v]) => (
                            <div key={k} className="p-2.5 bg-slate-50/70 border border-slate-200 rounded">
                              <span className="text-[10px] font-mono text-slate-500 block truncate">{k}</span>
                              <span className="text-sm font-mono font-semibold text-slate-900 mt-0.5 block">
                                {typeof v === "number"
                                  ? v < 1 && v > 0
                                    ? v.toFixed(4)
                                    : v.toLocaleString()
                                  : v}
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
                        Hyperparameters &amp; Params ({Object.keys(selectedRun.params || {}).length})
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
                            <span key={k} className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <span className="text-slate-400">{k}:</span> {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-10 text-center text-xs text-slate-400">
                    Select a run on the left to inspect its parameters and metrics.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE EXPERIMENT ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-md w-full max-w-md p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#3BB48C]" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Create MLflow Experiment
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-2.5 mb-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                {createError}
              </div>
            )}

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
                  placeholder="e.g. churn-prediction-xgboost"
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
                    placeholder="Value (e.g. xgboost)"
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
