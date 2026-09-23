import React, { useState, useMemo } from "react";
import {
  LineChart,
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

interface FeatureDrift {
  feature: string;
  stat_test: string;
  p_val: number;
  score: number;
  drift: boolean;
  ref_mean: string;
  curr_mean: string;
}

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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <LineChart className="w-7 h-7 text-[#3BB48C]" />
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

      {/* ── Visual Analytics Row: Clean Simple Graphs (NO DONUTS, NO SPARKLINES) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRAPH 1: Population Stability Index (PSI) Drift Timeline (7 cols) - Simple, Clean Line Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs hover:border-[#3BB48C]/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#3BB48C]" />
                  Population Stability Index (PSI) Trend
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily aggregate statistical drift against baseline distribution
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Current PSI: {currentPsi} (Stable)
                </span>
              </div>
            </div>

            {/* Clean SVG Line Chart */}
            <div className="relative w-full overflow-hidden bg-slate-50/50 rounded-2xl border border-slate-100 p-3 pt-4">
              <svg viewBox="0 0 540 180" className="w-full h-auto select-none" preserveAspectRatio="xMidYMid meet">
                <defs>
                  {/* Subtle area gradient under curve */}
                  <linearGradient id="psiAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3BB48C" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3BB48C" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Shaded Safe Zone (< 0.10 PSI: from y = 145 - (0.10/0.30)*120 = 105 to y = 145) */}
                <rect x="45" y="105" width="470" height="40" fill="rgba(16, 185, 129, 0.05)" />

                {/* Horizontal Threshold Lines */}
                {/* 0.25 Significant Drift Line */}
                <line x1="45" y1="45" x2="515" y2="45" stroke="#FCA5A5" strokeWidth="1" strokeDasharray="3 3" />
                <text x="515" y="40" fill="#EF4444" fontSize="8.5" textAnchor="end" fontFamily="monospace">
                  Drift Warning (0.25)
                </text>
                <text x="38" y="48" fill="#94A3B8" fontSize="8.5" textAnchor="end" fontFamily="monospace">0.25</text>

                {/* 0.10 Moderate Shift Line */}
                <line x1="45" y1="105" x2="515" y2="105" stroke="#FCD34D" strokeWidth="1" strokeDasharray="3 3" />
                <text x="515" y="100" fill="#D97706" fontSize="8.5" textAnchor="end" fontFamily="monospace">
                  Slight Shift (0.10)
                </text>
                <text x="38" y="108" fill="#94A3B8" fontSize="8.5" textAnchor="end" fontFamily="monospace">0.10</text>

                {/* Baseline 0.00 Line */}
                <line x1="45" y1="145" x2="515" y2="145" stroke="#CBD5E1" strokeWidth="1.2" />
                <text x="38" y="148" fill="#94A3B8" fontSize="8.5" textAnchor="end" fontFamily="monospace">0.00</text>

                {/* Area under PSI curve */}
                {/* Points: x = 45 + idx * (470 / 6) = 45, 123.3, 201.6, 280, 358.3, 436.6, 515 */}
                {/* y = 145 - (val / 0.30) * 120 */}
                <path
                  d={`M 45 145 L 45 ${145 - (psiTrend[0] / 0.3) * 120} L 123.3 ${145 - (psiTrend[1] / 0.3) * 120} L 201.6 ${145 - (psiTrend[2] / 0.3) * 120} L 280 ${145 - (psiTrend[3] / 0.3) * 120} L 358.3 ${145 - (psiTrend[4] / 0.3) * 120} L 436.6 ${145 - (psiTrend[5] / 0.3) * 120} L 515 ${145 - (psiTrend[6] / 0.3) * 120} L 515 145 Z`}
                  fill="url(#psiAreaGrad)"
                />

                {/* The Clean PSI Line */}
                <path
                  d={`M 45 ${145 - (psiTrend[0] / 0.3) * 120} L 123.3 ${145 - (psiTrend[1] / 0.3) * 120} L 201.6 ${145 - (psiTrend[2] / 0.3) * 120} L 280 ${145 - (psiTrend[3] / 0.3) * 120} L 358.3 ${145 - (psiTrend[4] / 0.3) * 120} L 436.6 ${145 - (psiTrend[5] / 0.3) * 120} L 515 ${145 - (psiTrend[6] / 0.3) * 120}`}
                  fill="none"
                  stroke="#3BB48C"
                  strokeWidth="2.5"
                />

                {/* Data Points on Line */}
                {psiTrend.map((val, idx) => {
                  const cx = 45 + idx * (470 / 6);
                  const cy = 145 - (val / 0.3) * 120;
                  return (
                    <g key={idx}>
                      <circle cx={cx} cy={cy} r="4" fill="#3BB48C" stroke="#FFFFFF" strokeWidth="1.5" />
                      <text
                        x={cx}
                        y={cy - 8}
                        fill="#0F172A"
                        fontSize="8.5"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Date Labels */}
                {["Sep 10", "Sep 12", "Sep 14", "Sep 16", "Sep 18", "Sep 20", "Sep 22"].map((date, idx) => (
                  <text
                    key={date}
                    x={45 + idx * (470 / 6)}
                    y="165"
                    fill="#64748B"
                    fontSize="9"
                    fontWeight="500"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {date}
                  </text>
                ))}
              </svg>
            </div>

            {/* Bottom Status strip */}
            <div className="mt-3.5 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between text-xs text-[#1A7456]">
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

        {/* GRAPH 2: Feature Distribution Comparison (5 cols) - Reference vs Current Serving */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs hover:border-[#3BB48C]/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#3BB48C]" />
                  Distribution Overlay
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reference baseline vs live serving distribution
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                {activeFeature.score}% Overlap
              </span>
            </div>

            {/* Feature selector tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2">
              {features.map((f, fIdx) => (
                <button
                  key={f.feature}
                  onClick={() => setSelectedFeatureIndex(fIdx)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition whitespace-nowrap ${
                    selectedFeatureIndex === fIdx
                      ? "bg-[#3BB48C] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.feature.length > 12 ? f.feature.slice(0, 10) + ".." : f.feature}
                </button>
              ))}
            </div>

            {/* Clean Density Distribution SVG */}
            <div className="relative w-full overflow-hidden bg-slate-50/50 rounded-2xl border border-slate-100 p-3 pt-3">
              <div className="flex items-center justify-end gap-3 text-[10px] font-mono mb-2">
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400"></span>
                  Reference
                </span>
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <span className="w-3 h-1 bg-[#3BB48C] rounded"></span>
                  Serving
                </span>
              </div>

              <svg viewBox="0 0 340 130" className="w-full h-auto select-none" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="distCurrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3BB48C" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3BB48C" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="distRefGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid line */}
                <line x1="20" y1="105" x2="320" y2="105" stroke="#CBD5E1" strokeWidth="1.2" />

                {/* Reference Baseline Bell Curve (Dashed Slate) */}
                <path
                  d="M 20 105 Q 80 105, 120 70 T 170 25 T 220 70 T 320 105 Z"
                  fill="url(#distRefGrad)"
                />
                <path
                  d="M 20 105 Q 80 105, 120 70 T 170 25 T 220 70 T 320 105"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.6"
                  strokeDasharray="4 3"
                />

                {/* Current Serving Stream Bell Curve (Solid Emerald) */}
                <path
                  d="M 20 105 Q 85 105, 125 68 T 175 22 T 225 68 T 320 105 Z"
                  fill="url(#distCurrGrad)"
                />
                <path
                  d="M 20 105 Q 85 105, 125 68 T 175 22 T 225 68 T 320 105"
                  fill="none"
                  stroke="#3BB48C"
                  strokeWidth="2.2"
                />

                {/* Mean marker lines */}
                <line x1="170" y1="25" x2="170" y2="105" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="175" y1="22" x2="175" y2="105" stroke="#10B981" strokeWidth="1.5" />

                <text x="30" y="120" fill="#94A3B8" fontSize="8.5" fontFamily="monospace">Low Value</text>
                <text x="172" y="120" fill="#475569" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  Mean: {activeFeature.curr_mean}
                </text>
                <text x="310" y="120" fill="#94A3B8" fontSize="8.5" textAnchor="end" fontFamily="monospace">High Value</text>
              </svg>
            </div>

            {/* Test statistics strip */}
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-mono block">Statistical Test</span>
                <span className="font-bold text-slate-800">{activeFeature.stat_test}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-mono block">p-value (Threshold &gt; 0.05)</span>
                <span className="font-bold text-emerald-700 font-mono">{activeFeature.p_val} (Passed)</span>
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
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
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
