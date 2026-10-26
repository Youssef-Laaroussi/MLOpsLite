import React, { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2,
  Activity,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  Layers,
  Server,
  AlertTriangle,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { fetchMonitoringSummary, triggerDriftCheck } from "../api/client";
import { MonitoringSummary } from "../api/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { AXIS_TICK, GRID_PROPS, BiTooltip } from "../components/charts/ChartKit";

interface FeatureRow {
  feature: string;
  stat_test: string;
  p_val: number;
  score: number;
  drift: boolean;
  ref_mean: string;
  curr_mean: string;
}

export const MonitoringPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState<number>(0);

  const loadData = async (modelName?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchMonitoringSummary(modelName);
      setSummary(res);
      if (!selectedModel && res.model_name) {
        setSelectedModel(res.model_name);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load monitoring metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectModel = (model: string) => {
    setSelectedModel(model);
    setIsModelDropdownOpen(false);
    setSelectedFeatureIndex(0);
    loadData(model);
  };

  const handleRunEvaluation = async () => {
    if (!selectedModel && !summary?.model_name) return;
    setEvaluating(true);
    setError(null);
    try {
      await triggerDriftCheck({
        model_name: selectedModel || summary!.model_name,
        drift_threshold: 0.05,
      });
      await loadData(selectedModel || summary?.model_name);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Drift evaluation failed");
    } finally {
      setEvaluating(false);
    }
  };

  // Derive genuine features table from latest_drift metrics
  const features: FeatureRow[] = useMemo(() => {
    if (!summary?.latest_drift?.metrics?.metrics?.[0]?.result?.drift_by_columns) {
      return [];
    }
    const cols = summary.latest_drift.metrics.metrics[0].result.drift_by_columns;
    return Object.entries(cols).map(([name, col]: [string, any]) => {
      const pVal = col.p_value ?? 1.0;
      const isDrift = Boolean(col.drift_detected);
      const score = Math.round(Math.max(0, Math.min(100, (1 - (isDrift ? 0.7 : 0.05)) * 100 * pVal)));
      return {
        feature: name,
        stat_test: col.stat_test || "KS-test (2-sample)",
        p_val: pVal,
        score: score > 0 ? score : (isDrift ? 15 : 95),
        drift: isDrift,
        ref_mean: col.reference_mean !== undefined ? String(col.reference_mean) : "--",
        curr_mean: col.current_mean !== undefined ? String(col.current_mean) : "--",
      };
    });
  }, [summary]);

  // Derive genuine PSI / drift timeline from drift_history
  const psiTimeline = useMemo(() => {
    if (!summary?.drift_history?.length) return [];
    return summary.drift_history
      .slice()
      .reverse()
      .map((d) => ({
        date: new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        psi: d.drift_share,
      }));
  }, [summary]);

  const activeFeature = features[selectedFeatureIndex] || features[0];
  const driftedCount = features.filter((f) => f.drift).length;
  const currentPsi = summary?.latest_drift ? summary.latest_drift.drift_share : 0.0;
  const activeDeploymentsCount = summary?.active_deployments ?? 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
              Model Monitoring &amp; Observability
            </h2>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous real-time evaluation of data drift (Evidently AI, KS-test) and live serving telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Model Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-300 transition"
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>{selectedModel || summary?.model_name || "Select Model"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-md shadow-lg z-30 py-1 text-xs">
                {summary?.models_available && summary.models_available.length > 0 ? (
                  summary.models_available.map((m) => (
                    <button
                      key={m}
                      onClick={() => handleSelectModel(m)}
                      className={`w-full text-left px-3 py-1.5 text-xs transition ${
                        selectedModel === m
                          ? "bg-slate-100 text-slate-900 font-semibold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {m}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-400">No registered models found</div>
                )}
              </div>
            )}
          </div>

          {/* Run Evaluation Trigger */}
          <button
            onClick={handleRunEvaluation}
            disabled={evaluating || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#3BB48C] hover:bg-[#329F7B] text-white font-semibold text-xs shadow-2xs transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? "animate-spin" : ""}`} />
            {evaluating ? "Running Evaluation..." : "Run Drift Evaluation"}
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-center justify-between text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Backend Error: {error}</span>
          </div>
          <button
            onClick={() => loadData(selectedModel)}
            className="underline font-semibold hover:text-rose-900 ml-4 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPI StatCards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Data Drift Status"
          value={
            !summary?.latest_drift
              ? "No Evaluation Yet"
              : driftedCount === 0
              ? "0 Drifted Features"
              : `${driftedCount} Features Drifted`
          }
          subtitle={
            summary?.latest_drift
              ? `${features.length - driftedCount} / ${features.length} features stable`
              : "Run drift evaluation to analyze"
          }
          icon={CheckCircle2}
          color={!summary?.latest_drift ? "blue" : driftedCount === 0 ? "emerald" : "rose"}
          trend={!summary?.latest_drift ? "Pending" : driftedCount === 0 ? "In-Bounds" : "Shift Detected"}
        />
        <StatCard
          title="Active Serving Nodes"
          value={`${activeDeploymentsCount} Endpoints`}
          subtitle={`Docker Serving Fleet for ${selectedModel || "model"}`}
          icon={Server}
          color="brand"
          trend={activeDeploymentsCount > 0 ? "Online" : "Idle"}
        />
        <StatCard
          title="Drift Share Score"
          value={summary?.latest_drift ? `${(currentPsi * 100).toFixed(1)}%` : "--"}
          subtitle={
            summary?.latest_drift
              ? `Status: ${summary.latest_drift.drift_status}`
              : "Awaiting run"
          }
          icon={Activity}
          color={!summary?.latest_drift ? "blue" : currentPsi < 0.2 ? "emerald" : "amber"}
          trend={!summary?.latest_drift ? "--" : currentPsi < 0.2 ? "Stable Dist." : "Shift Detected"}
        />
        <StatCard
          title="Total Feedback Ingested"
          value={`${summary?.total_predictions ?? 0} Predictions`}
          subtitle="Real matched ground-truth records"
          icon={ShieldCheck}
          color="emerald"
          trend="Telemetry Active"
        />
      </div>

      {/* ── Main Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Drift Timeline Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Historical Drift Share Timeline
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sequential statistical drift evaluations from PostgreSQL &amp; MinIO
                </p>
              </div>
              <span className="font-mono text-xs text-slate-600 font-semibold">
                Latest: {summary?.latest_drift ? `${(summary.latest_drift.drift_share * 100).toFixed(1)}%` : "--"}
              </span>
            </div>

            <div className="h-56 w-full mt-2">
              {psiTimeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={psiTimeline} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis
                      domain={[0, 1.0]}
                      ticks={[0.0, 0.25, 0.5, 0.75, 1.0]}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                    <ReferenceLine
                      y={0.20}
                      stroke="#D97706"
                      strokeDasharray="3 3"
                      label={{ value: "Warning threshold (20%)", position: "insideTopRight", fill: "#D97706", fontSize: 10 }}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const val = payload[0].value as number;
                        return (
                          <BiTooltip
                            active
                            label={`Evaluation Time: ${label}`}
                            payload={[
                              { name: "Drift Share", value: `${(val * 100).toFixed(1)}%`, color: "#3BB48C" },
                              { name: "Threshold", value: "20.0%", color: "#64748B" },
                            ]}
                          />
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="psi"
                      stroke="#3BB48C"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#3BB48C" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Inbox className="w-8 h-8 mb-2 stroke-1 text-slate-300" />
                  <p className="font-semibold text-slate-600">No Drift History Available</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Click "Run Drift Evaluation" above to generate statistical analysis.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs font-mono text-slate-500">
            <span>Engine: 2-sample KS-test &amp; MinIO S3</span>
            <span className={currentPsi <= 0.2 ? "text-[#329F7B] font-semibold" : "text-amber-600 font-semibold"}>
              {summary?.latest_drift ? (currentPsi <= 0.2 ? "Stable Distribution" : "Action Required") : "Pending Run"}
            </span>
          </div>
        </div>

        {/* Real Live Latency & Telemetry */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Live Latency Telemetry
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  p50 &amp; p95 percentiles from Docker Serving containers
                </p>
              </div>
              <span className="font-mono text-xs text-slate-600 font-semibold">
                SLA: &lt; 20ms
              </span>
            </div>

            <div className="h-56 w-full mt-2">
              {summary?.telemetry && summary.telemetry.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.telemetry} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="time" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}ms`} />
                    <RechartsTooltip content={<BiTooltip valueFormatter={(v) => `${v} ms`} />} />
                    <Line type="monotone" dataKey="p50" name="p50" stroke="#3BB48C" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="p95" name="p95" stroke="#64748B" strokeWidth={1.5} dot={false} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Server className="w-8 h-8 mb-2 stroke-1 text-slate-300" />
                  <p className="font-semibold text-slate-600">No Telemetry Recorded</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Deploy a container to record live inference latency and error rates.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs font-mono text-slate-500">
            <span>Fleet Target: &lt; 20 ms</span>
            <span className="text-slate-600 font-medium">
              {summary?.telemetry?.length ?? 0} Points Recorded
            </span>
          </div>
        </div>
      </div>

      {/* ── Feature Distribution & Drift Scores Table ── */}
      <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Feature Distribution &amp; Statistical Drift
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Automated 2-sample hypothesis testing (KS-test) for each column in dataset
            </p>
          </div>
          <div className="flex items-center gap-3">
            {summary?.latest_drift?.id && (
              <a
                href={`/api/v1/monitoring/reports/${summary.latest_drift.id}/html`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-[#329F7B] hover:text-[#257A5E] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded transition"
              >
                <span>View Full HTML Report</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <span className="text-xs text-slate-500 font-mono">
              Evaluated:{" "}
              {summary?.latest_drift?.created_at
                ? new Date(summary.latest_drift.created_at).toLocaleString()
                : "Never"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {features.length > 0 ? (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Feature Column</th>
                  <th className="px-4 py-2.5">Statistical Test</th>
                  <th className="px-4 py-2.5">p-value</th>
                  <th className="px-4 py-2.5">Baseline Ref Mean</th>
                  <th className="px-4 py-2.5">Current Serving Mean</th>
                  <th className="px-4 py-2.5 min-w-[120px]">Distribution Stability</th>
                  <th className="px-4 py-2.5 text-right">Drift Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {features.map((item, idx) => {
                  const isSelected = selectedFeatureIndex === idx;
                  return (
                    <tr
                      key={item.feature}
                      onClick={() => setSelectedFeatureIndex(idx)}
                      className={`h-11 transition-colors cursor-pointer ${
                        isSelected ? "bg-slate-50 font-medium" : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td className="px-4 py-2 font-sans font-medium text-slate-900">
                        {item.feature}
                      </td>
                      <td className="px-4 py-2 text-slate-600 text-[11px]">
                        {item.stat_test}
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-semibold text-slate-900">{item.p_val}</span>
                        <span className="text-slate-400 text-[11px] ml-1">
                          ({item.drift ? "< 0.05" : ">= 0.05"})
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-600">{item.ref_mean}</td>
                      <td className="px-4 py-2 text-slate-900">{item.curr_mean}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                            <div
                              className={`h-full rounded-full ${item.drift ? "bg-rose-500" : "bg-[#3BB48C]"}`}
                              style={{ width: `${item.score}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-600 shrink-0">
                            {item.score}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {item.drift ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Drift Detected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#329F7B]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3BB48C]" />
                            Stable
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Inbox className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <p className="font-semibold text-slate-600">No Feature Drift Data Available</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm text-center">
                Trigger a drift evaluation on this model to compute 2-sample KS tests and inspect column distributions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
