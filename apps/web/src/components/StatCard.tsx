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
    brand: "text-emerald-600 bg-emerald-50 border-emerald-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
    rose: "text-rose-600 bg-rose-50 border-rose-200",
    blue: "text-sky-600 bg-sky-50 border-sky-200",
  };

  const getTrendStyle = (t: string) => {
    if (t.startsWith("-") || t.toLowerCase().includes("down")) {
      return "text-rose-600";
    }
    if (
      t.startsWith("+") ||
      t.startsWith("↑") ||
      t.toLowerCase().includes("uptime") ||
      t.toLowerCase().includes("ready") ||
      t.toLowerCase().includes("active") ||
      t.toLowerCase().includes("verified") ||
      t.toLowerCase().includes("online")
    ) {
      return "text-emerald-600";
    }
    return "text-slate-600";
  };

  return (
    <div className="group relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-6 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-100 hover:border-emerald-400/40 transition-all duration-200 shadow-xs cursor-pointer flex flex-col justify-between">
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
          <div className="text-xl font-bold font-sans text-slate-900 tracking-tight">
            {value}
          </div>
        </div>
      </div>

      <div className="mt-4 relative z-10">
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 text-xs">
            {trend && (
              <span className={`font-semibold shrink-0 ${getTrendStyle(trend)}`}>
                {trend}
              </span>
            )}
            {subtitle && <span className="text-slate-400 truncate">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};


