import React, { useState } from "react";
import { LineChart, CheckCircle2, Activity, RefreshCw, Zap, ShieldCheck } from "lucide-react";
import { StatCard } from "../components/StatCard";

export const MonitoringPage: React.FC = () => {
  const [evaluating, setEvaluating] = useState(false);
  const [lastCheck, setLastCheck] = useState("Just now");

  const [features, setFeatures] = useState([
    { feature: "transaction_amount", stat_test: "Wasserstein", p_val: 0.89, score: 92, drift: false },
    { feature: "distance_from_home", stat_test: "KS Test", p_val: 0.74, score: 86, drift: false },
    { feature: "card_age_months", stat_test: "KS Test", p_val: 0.95, score: 98, drift: false },
    { feature: "daily_txn_count", stat_test: "Chi-Square", p_val: 0.62, score: 79, drift: false },
  ]);

  const handleRunEvaluation = () => {
    setEvaluating(true);
    setTimeout(() => {
      setEvaluating(false);
      setLastCheck("Few seconds ago");
      setFeatures((prev) =>
        prev.map((f) => ({
          ...f,
          p_val: parseFloat((0.65 + Math.random() * 0.3).toFixed(2)),
          score: Math.round(75 + Math.random() * 23),
        }))
      );
    }, 900);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Model Monitoring & Observability
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </h2>
          <p className="text-sm text-slate-500">
            Continuous evaluation of production data drift (Evidently AI, PSI score) and inference telemetry
          </p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="Data Drift Status"
          value="0 Drifted Features"
          subtitle="Reference vs Current distribution"
          icon={CheckCircle2}
          color="brand"
          trend="100% in-bounds"
        />
        <StatCard
          title="Avg Inference Latency"
          value="3.2 ms"
          subtitle="p95: 5.8 ms • Live cluster"
          icon={Activity}
          color="brand"
          isLive={true}
        />
        <StatCard
          title="Monitored Predictions"
          value="24,819"
          subtitle={`Telemetry buffer (${lastCheck})`}
          icon={LineChart}
          color="emerald"
          isLive={true}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#3BB48C]" />
            Feature Distribution & Drift Scores (Evidently AI)
          </h3>
          <span className="text-xs text-slate-400 font-mono">Last eval: {lastCheck}</span>
        </div>

        <div className="space-y-3">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#3BB48C]/60 hover:shadow-sm transition-all group"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm group-hover:text-[#1A7456] transition-colors">
                      {item.feature}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {item.stat_test}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    p-value: <strong className="text-slate-700">{item.p_val}</strong> (threshold &gt; 0.05)
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
                        className="h-full bg-gradient-to-r from-teal-400 to-[#3BB48C] rounded-full transition-all duration-500"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA] shrink-0 flex items-center gap-1.5">
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
