import React from "react";
import { Webhook, ShieldAlert } from "lucide-react";

export const AlertsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Alerts & Notifications</h2>
        <p className="text-sm text-slate-500">
          Configure notification webhooks (Slack, Discord, Email) for drift anomalies and deployment crashes
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Webhook className="w-5 h-5 text-[#3BB48C]" />
          Active Webhook Integrations
        </h3>
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900 text-sm">Default Slack Notification Channel</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">https://hooks.slack.com/services/T00/B00/XXXX</div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
            Connected
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          Recent Alert Incident History
        </h3>
        <div className="text-center py-10 text-slate-400 text-sm">
          No alert incidents triggered in the last 30 days. System operating within nominal thresholds.
        </div>
      </div>
    </div>
  );
};
