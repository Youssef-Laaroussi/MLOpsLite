import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  color?: "brand" | "emerald" | "amber" | "rose" | "blue";
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "brand",
}) => {
  const colorMap = {
    brand: "text-[#3BB48C] bg-[#0D3326] border-[#1A7456]",
    emerald: "text-[#3BB48C] bg-[#0D3326] border-[#1A7456]",
    amber: "text-amber-400 bg-amber-950/50 border-amber-800/60",
    rose: "text-rose-400 bg-rose-950/50 border-rose-800/60",
    blue: "text-sky-400 bg-sky-950/50 border-sky-800/60",
  };

  return (
    <div className="bg-[#0D1F2D] border border-[#19364C] rounded-xl p-5 hover:border-[#3BB48C]/40 transition-all shadow-md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-lg border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-3xl font-extrabold text-white tracking-tight">{value}</div>
      {(subtitle || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          {trend && <span className="text-[#3BB48C] font-semibold">{trend}</span>}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
