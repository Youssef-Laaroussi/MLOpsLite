import React from "react";
import { Bell, CheckCircle2, Webhook, ShieldAlert } from "lucide-react";

export const AlertsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Alerts & Notifications</h2>
        <p className="text-sm text-slate-400">
          Configure notification webhooks (Slack, Discord, Email) for drift anomalies and deployment crashes
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Webhook className="w-5 h-5 text-sky-400" />
          Active Webhook Integrations
        </h3>
        <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="font-medium text-white text-sm">Default Slack Notification Channel</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">https://hooks.slack.com/services/T00/B00/XXXX</div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
            Connected
          </span>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          Recent Alert Incident History
        </h3>
        <div className="text-center py-8 text-slate-500 text-sm">
          No alert incidents triggered in the last 30 days. System operating within nominal thresholds.
        </div>
      </div>
    </div>
  );
};
