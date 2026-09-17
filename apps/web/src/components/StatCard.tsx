import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  color?: "blue" | "emerald" | "amber" | "rose" | "purple";
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
}) => {
  const colorMap = {
    blue: "text-sky-400 bg-sky-950/40 border-sky-800/40",
    emerald: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40",
    amber: "text-amber-400 bg-amber-950/40 border-amber-800/40",
    rose: "text-rose-400 bg-rose-950/40 border-rose-800/40",
    purple: "text-purple-400 bg-purple-950/40 border-purple-800/40",
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-lg border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
      {(subtitle || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          {trend && <span className="text-emerald-400 font-medium">{trend}</span>}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
