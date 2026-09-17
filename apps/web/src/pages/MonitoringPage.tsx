import React from "react";
import { LineChart, CheckCircle2, AlertTriangle, Activity } from "lucide-react";
import { StatCard } from "../components/StatCard";

export const MonitoringPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Model Monitoring & Drift</h2>
        <p className="text-sm text-slate-400">
          Continuous evaluation of production data drift (Evidently AI, PSI score) and inference latency
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="Data Drift Status"
          value="0 Drifted Features"
          subtitle="Reference vs Current distribution"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Avg Inference Latency"
          value="3.2 ms"
          subtitle="p95: 5.8 ms"
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Monitored Predictions"
          value="24,819"
          subtitle="Captured in telemetry buffer"
          icon={LineChart}
          color="purple"
        />
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-semibold text-white mb-4">Feature Distribution & Drift Scores</h3>
        <div className="space-y-4">
          {[
            { feature: "transaction_amount", stat_test: "Wasserstein", p_val: 0.89, drift: false },
            { feature: "distance_from_home", stat_test: "KS Test", p_val: 0.74, drift: false },
            { feature: "card_age_months", stat_test: "KS Test", p_val: 0.95, drift: false },
            { feature: "daily_txn_count", stat_test: "Chi-Square", p_val: 0.62, drift: false },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
              <div>
                <div className="font-medium text-white text-sm">{item.feature}</div>
                <div className="text-xs text-slate-500">Test: {item.stat_test} • p-value: {item.p_val}</div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                No Drift
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
