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
    brand: "text-[#1A7456] bg-[#EBF8F4] border-[#BCE9DA]",
    emerald: "text-[#1A7456] bg-[#EBF8F4] border-[#BCE9DA]",
    amber: "text-amber-800 bg-amber-50 border-amber-200",
    rose: "text-rose-700 bg-rose-50 border-rose-200",
    blue: "text-sky-700 bg-sky-50 border-sky-200",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#3BB48C]/50 hover:shadow-md transition-all shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-xl border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</div>
      {(subtitle || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          {trend && <span className="text-[#1A7456] font-bold">{trend}</span>}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
