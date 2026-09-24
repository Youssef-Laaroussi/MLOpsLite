import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  color?: "brand" | "emerald" | "amber" | "rose" | "blue";
  isLive?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "brand",
  isLive = false,
}) => {
  const colorMap = {
    brand: "text-[#1A7456] bg-[#EBF8F4] border-[#BCE9DA]",
    emerald: "text-[#1A7456] bg-[#EBF8F4] border-[#BCE9DA]",
    amber: "text-amber-800 bg-amber-50 border-amber-200",
    rose: "text-rose-700 bg-rose-50 border-rose-200",
    blue: "text-sky-700 bg-sky-50 border-sky-200",
  };

  return (
    <div className="group relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-6 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-100 hover:border-[#3BB48C]/40 transition-all duration-200 shadow-xs cursor-pointer flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {title}
            </span>
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </div>

          <div
            className={`p-2.5 rounded-2xl border transition-all duration-200 group-hover:scale-105 shadow-2xs ${colorMap[color]}`}
          >
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="relative z-10">
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {value}
          </div>
        </div>
      </div>

      <div className="mt-4 relative z-10">
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {trend && (
              <span className="text-[#1A7456] font-bold bg-[#EBF8F4] px-2 py-0.5 rounded-full border border-[#BCE9DA] shrink-0">
                {trend}
              </span>
            )}
            {subtitle && <span className="truncate">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};


