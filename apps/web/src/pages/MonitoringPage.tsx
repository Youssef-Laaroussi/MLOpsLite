import React, { useState, useMemo } from "react";
import {
  LineChart as LineChartIcon,
  CheckCircle2,
  Activity,
  RefreshCw,
  Zap,
  ShieldCheck,
  Calendar,
  ChevronDown,
  Layers,
  ArrowUpRight,
  Filter,
  BarChart3,
  Sliders,
  Check,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { AXIS_TICK, GRID_PROPS, BiTooltip, PALETTE } from "../components/charts/ChartKit";

interface FeatureDrift {
  feature: string;
  stat_test: string;
  p_val: number;
  score: number;
  drift: boolean;
  ref_mean: string;
  curr_mean: string;
}

const FEATURE_DISTRIBUTIONS: Record<string, { bin: string; reference: number; serving: number }[]> = {
  transaction_amount: [
    { bin: "$0-40", reference: 5, serving: 4 },
    { bin: "$40-80", reference: 14, serving: 13 },
    { bin: "$80-120", reference: 28, serving: 25 },
    { bin: "$120-160", reference: 34, serving: 36 },
    { bin: "$160-200", reference: 12, serving: 15 },
    { bin: "$200-240", reference: 5, serving: 5 },
    { bin: "$240+", reference: 2, serving: 2 },
  ],
  distance_from_home: [
    { bin: "0-5km", reference: 16, serving: 15 },
    { bin: "5-10km", reference: 32, serving: 30 },
    { bin: "10-15km", reference: 26, serving: 28 },
    { bin: "15-20km", reference: 14, serving: 16 },
    { bin: "20-25km", reference: 8, serving: 7 },
    { bin: "25km+", reference: 4, serving: 4 },
  ],
  card_age_months: [
    { bin: "0-6m", reference: 12, serving: 13 },
    { bin: "6-12m", reference: 20, serving: 21 },
    { bin: "12-24m", reference: 36, reference: 36, serving: 34 },
    { bin: "24-36m", reference: 20, serving: 21 },
    { bin: "36m+", reference: 12, serving: 11 },
  ],
  daily_txn_count: [
    { bin: "1-2", reference: 26, serving: 24 },
    { bin: "3-4", reference: 44, serving: 42 },
    { bin: "5-6", reference: 20, serving: 22 },
    { bin: "7-8", reference: 7, serving: 8 },
    { bin: "9+", reference: 3, serving: 4 },
  ],
};

export const MonitoringPage: React.FC = () => {
  const [evaluating, setEvaluating] = useState(false);
  const [lastCheck, setLastCheck] = useState("Just now");

  // Top header date filter ("Last 6 months" default)
  const [timeRange, setTimeRange] = useState<string>("Last 6 months");
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState<boolean>(false);

  // Model selection
  const [selectedModel, setSelectedModel] = useState<string>("fraud-detector (v3)");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);

  // Selected feature for distribution visualization
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState<number>(0);

  const [features, setFeatures] = useState<FeatureDrift[]>([
    {
      feature: "transaction_amount",
      stat_test: "Wasserstein",
      p_val: 0.89,
      score: 94,
      drift: false,
      ref_mean: "$142.50",
      curr_mean: "$144.10",
    },
    {
      feature: "distance_from_home",
      stat_test: "KS Test",
      p_val: 0.74,
      score: 88,
      drift: false,
      ref_mean: "14.2 km",
      curr_mean: "15.0 km",
    },
    {
      feature: "card_age_months",
      stat_test: "KS Test",
      p_val: 0.95,
      score: 98,
      drift: false,
      ref_mean: "28.4 mo",
      curr_mean: "28.1 mo",
    },
    {
      feature: "daily_txn_count",
      stat_test: "Chi-Square",
      p_val: 0.62,
      score: 82,
      drift: false,
      ref_mean: "4.1 txns",
      curr_mean: "4.3 txns",
    },
  ]);

  // Daily PSI trend data points
  const [psiTrend, setPsiTrend] = useState<number[]>([
    0.032, 0.041, 0.038, 0.052, 0.044, 0.039, 0.035,
  ]);

  const psiChartData = useMemo(() => {
    const dates = ["Sep 10", "Sep 12", "Sep 14", "Sep 16", "Sep 18", "Sep 20", "Sep 22"];
    return dates.map((date, idx) => ({
      date,
      psi: psiTrend[idx] ?? 0.035,
    }));
  }, [psiTrend]);

  const handleRunEvaluation = () => {
    setEvaluating(true);
    setTimeout(() => {
      setEvaluating(false);
      setLastCheck("Few seconds ago");
      setFeatures((prev) =>
        prev.map((f) => ({
          ...f,
          p_val: parseFloat((0.68 + Math.random() * 0.28).toFixed(2)),
          score: Math.round(82 + Math.random() * 16),
        }))
      );
      setPsiTrend([
        0.032,
        0.041,
        0.038,
        0.052,
        0.044,
        0.039,
        parseFloat((0.025 + Math.random() * 0.02).toFixed(3)),
      ]);
    }, 850);
  };

  const activeFeature = features[selectedFeatureIndex] || features[0];
  const currentPsi = psiTrend[psiTrend.length - 1];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* ── Page Header (with Last 6 Months Filter on Top Right) ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold font-display text-slate-900 tracking-tight flex items-center gap-2.5">
            <LineChartIcon className="w-7 h-7 text-[#3BB48C]" />
            Model Monitoring &amp; Observability
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Continuous evaluation of production data drift (Evidently AI, PSI score) and inference telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Top-Right Calendar Filter matching all sections */}
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

          {/* Model Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 transition cursor-pointer"
            >
              <Layers className="w-4 h-4 text-[#3BB48C]" />
              <span>{selectedModel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                {[
                  "fraud-detector (v3)",
                  "customer-churn-xgb (v2)",
                  "demand-forecaster-lstm (v2)",
                  "credit-default-risk (v1)",
                ].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedModel(m);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-bold transition ${
                      selectedModel === m
                        ? "bg-[#EBF8F4] text-[#1A7456]"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleRunEvaluation}
            disabled={evaluating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-xs transition shadow-md shadow-[#3BB48C]/25 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? "animate-spin" : ""}`} />
            {evaluating ? "Calculating Drift..." : "Run Drift Evaluation"}
          </button>
        </div>
      </div>

      {/* ── Top 4 KPI StatCards (Clean, 100% curve-free & sparkline-free) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Data Drift Status"
          value="0 Drifted Features"
          subtitle="4 / 4 features in baseline bounds"
          icon={CheckCircle2}
          color="emerald"
          trend="100% In-Bounds"
        />
        <StatCard
          title="Avg Inference Latency"
          value="3.2 ms"
          subtitle="P95: 5.8 ms • Live cluster"
          icon={Activity}
          color="brand"
          trend="Sub-10ms SLA"
        />
        <StatCard
          title="Monitored Predictions"
          value="24,819"
          subtitle={`Telemetry buffer (${lastCheck})`}
          icon={Zap}
          color="brand"
          trend="+12% traffic"
        />
        <StatCard
          title="Evidently AI Health"
          value="100% Verified"
          subtitle="KS & Wasserstein tests pass"
          icon={ShieldCheck}
          color="emerald"
          trend="Audited"
        />
      </div>

      {/* ── Visual Analytics Row: Enterprise Standard Observability Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRAPH 1: Population Stability Index (PSI) Drift Timeline (7 cols) - Enterprise Standard AreaChart */}
        <div className="lg:col-span-7 bg-white border border-slate-200/75 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#3BB48C]" />
                  Population Stability Index (PSI) Trend
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Daily aggregate statistical drift against baseline reference distribution
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Current PSI: {currentPsi} (Stable)
                </span>
              </div>
            </div>

            {/* Standard Recharts PSI Line / Area Chart */}
            <div className="h-[210px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={psiChartData}
                  margin={{ top: 15, right: 20, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="psiAreaGrad" x1="0%" y1="0%" x2="0%" y2="1">
                      <stop offset="5%" stopColor={PALETTE.brand} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={PALETTE.brand} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 0.30]}
                    ticks={[0.0, 0.10, 0.20, 0.30]}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.toFixed(2)}
                  />
                  <ReferenceLine
                    y={0.10}
                    stroke={PALETTE.amber}
                    strokeDasharray="4 4"
                    label={{ value: "Slight Shift (0.10)", position: "top", fill: PALETTE.amber, fontSize: 10, fontWeight: 600 }}
                  />
                  <ReferenceLine
                    y={0.25}
                    stroke={PALETTE.rose}
                    strokeDasharray="4 4"
                    label={{ value: "Drift Warning (0.25)", position: "top", fill: PALETTE.rose, fontSize: 10, fontWeight: 600 }}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const val = payload[0].value as number;
                      return (
                        <BiTooltip
                          active
                          label={`Evaluation: ${label}`}
                          payload={[
                            { name: "PSI Score", value: val.toFixed(3), color: PALETTE.brand },
                            { name: "Safe Threshold", value: "< 0.10", color: PALETTE.amber },
                            { name: "Stability Status", value: val < 0.10 ? "Stable (In Bounds)" : "Investigate Drift", color: val < 0.10 ? PALETTE.brand : PALETTE.rose },
                          ]}
                        />
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="psi"
                    stroke={PALETTE.brand}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#psiAreaGrad)"
                    dot={{ r: 4, fill: PALETTE.brand, stroke: "#FFFFFF", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom Status strip */}
            <div className="mt-3.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between text-xs text-[#1A7456]">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#3BB48C]" />
                All 7 evaluation checkpoints securely within the safe green band (&lt; 0.10 PSI).
              </span>
              <span className="font-mono font-bold">Stable Distribution</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Evaluation Engine: Evidently AI v0.4</span>
            <span className="text-slate-700 font-bold">Sampling: 100% Production Traffic</span>
          </div>
        </div>

        {/* GRAPH 2: Feature Distribution Comparison (5 cols) - Enterprise Standard Histogram Overlay */}
        <div className="lg:col-span-5 bg-white border border-slate-200/75 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#3BB48C]" />
                  Distribution Overlay
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Reference baseline vs live serving distribution
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {activeFeature.score}% Overlap
              </span>
            </div>

            {/* Feature selector tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2">
              {features.map((f, fIdx) => (
                <button
                  key={f.feature}
                  onClick={() => setSelectedFeatureIndex(fIdx)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition whitespace-nowrap cursor-pointer ${
                    selectedFeatureIndex === fIdx
                      ? "bg-[#3BB48C] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.feature.length > 14 ? f.feature.slice(0, 12) + ".." : f.feature}
                </button>
              ))}
            </div>

            {/* Standard Recharts Binned Density Area Chart */}
            <div className="h-[210px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={FEATURE_DISTRIBUTIONS[activeFeature.feature] || FEATURE_DISTRIBUTIONS["transaction_amount"]}
                  margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="distServingGrad" x1="0%" y1="0%" x2="0%" y2="1">
                      <stop offset="5%" stopColor={PALETTE.brand} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={PALETTE.brand} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="bin" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <BiTooltip
                          active
                          label={`Bucket: ${label}`}
                          payload={[
                            { name: "Live Serving", value: `${payload.find(p => p.dataKey === "serving")?.value}%`, color: PALETTE.brand },
                            { name: "Reference Baseline", value: `${payload.find(p => p.dataKey === "reference")?.value}%`, color: PALETTE.slate },
                          ]}
                        />
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="reference"
                    stroke={PALETTE.slate}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill={PALETTE.slate}
                    fillOpacity={0.1}
                  />
                  <Area
                    type="monotone"
                    dataKey="serving"
                    stroke={PALETTE.brand}
                    strokeWidth={2.5}
                    fill="url(#distServingGrad)"
                    fillOpacity={1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Test statistics strip */}
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-mono block">Statistical Test</span>
                <span className="font-semibold text-slate-800">{activeFeature.stat_test}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-mono block">p-value (Threshold &gt; 0.05)</span>
                <span className="font-semibold text-emerald-700 font-mono">{activeFeature.p_val} (Passed)</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Reference: {activeFeature.ref_mean}</span>
            <span className="text-slate-800 font-bold">Serving: {activeFeature.curr_mean}</span>
          </div>
        </div>
      </div>

      {/* ── Feature Distribution & Drift Scores (Evidently AI) Table ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#3BB48C]" />
              Feature Distribution &amp; Drift Scores (Evidently AI)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated 2-sample hypothesis testing for each model input column
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Last eval: {lastCheck}</span>
        </div>

        <div className="space-y-3">
          {features.map((item, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedFeatureIndex(idx)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                selectedFeatureIndex === idx
                  ? "bg-slate-50/80 border-[#3BB48C] shadow-xs"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm group-hover:text-[#1A7456] transition-colors">
                      {item.feature}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-bold">
                      {item.stat_test}
                    </span>
                    {selectedFeatureIndex === idx && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
                        Active Overlay
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-3">
                    <span>
                      p-value: <strong className="text-slate-800">{item.p_val}</strong> (threshold &gt; 0.05)
                    </span>
                    <span>•</span>
                    <span>Ref: {item.ref_mean}</span>
                    <span>•</span>
                    <span>Curr: {item.curr_mean}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  {/* Visual Confidence Bar */}
                  <div className="w-32 hidden md:block">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Stability</span>
                      <span className="font-mono font-bold text-emerald-700">{item.score}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3BB48C] rounded-full transition-all duration-500"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>

                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA] shrink-0 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3BB48C]" />
                    Stable
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
