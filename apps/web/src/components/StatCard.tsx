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
    <div className="bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          {isLive && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
        </div>

        <div>
          <div className="text-xl font-semibold font-mono text-slate-900 tracking-tight">
            {value}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100">
        {(subtitle || trend) && (
          <div className="flex items-center justify-between gap-2 text-[11px]">
            {subtitle && <span className="text-slate-400 truncate">{subtitle}</span>}
            {trend && (
              <span className={`font-medium shrink-0 font-mono ${getTrendStyle(trend)}`}>
                {trend}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


