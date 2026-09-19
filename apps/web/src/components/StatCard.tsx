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
    <div className="group relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#3BB48C]/12 hover:border-[#3BB48C] transition-all duration-300 shadow-xs">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#3BB48C]/0 to-transparent group-hover:via-[#3BB48C] transition-all duration-500" />
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-xl border transition-transform duration-300 group-hover:scale-110 shadow-xs ${colorMap[color]}`}>
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>
      </div>
      <div className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-slate-950 transition-colors">{value}</div>
      {(subtitle || trend) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
          {trend && <span className="text-[#1A7456] font-bold bg-[#EBF8F4] px-1.5 py-0.5 rounded border border-[#BCE9DA]">{trend}</span>}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
