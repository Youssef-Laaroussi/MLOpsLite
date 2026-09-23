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
  sparkline?: number[];
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "brand",
  isLive = false,
  sparkline,
}) => {
  const colorMap = {
    brand: "text-[#1A7456] bg-[#EBF8F4] border-[#BCE9DA]",
    emerald: "text-[#1A7456] bg-[#EBF8F4] border-[#BCE9DA]",
    amber: "text-amber-800 bg-amber-50 border-amber-200",
    rose: "text-rose-700 bg-rose-50 border-rose-200",
    blue: "text-sky-700 bg-sky-50 border-sky-200",
  };

  const sparklineStroke = {
    brand: "#3BB48C",
    emerald: "#10B981",
    amber: "#F59E0B",
    rose: "#F43F5E",
    blue: "#0284C7",
  }[color];

  const getSparklinePath = (pts: number[], w = 100, h = 24) => {
    if (pts.length < 2) return "";
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || 1;
    const step = w / (pts.length - 1);
    return pts
      .map((val, i) => {
        const x = (i * step).toFixed(1);
        const y = (h - ((val - min) / range) * (h - 8) - 4).toFixed(1);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  return (
    <div className="group relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-6 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-[#3BB48C]/12 hover:border-[#3BB48C] transition-all duration-300 shadow-xs cursor-pointer flex flex-col justify-between">
      {/* Dynamic top gradient line that lights up on hover */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#3BB48C]/0 to-transparent group-hover:via-[#3BB48C] transition-all duration-500" />

      {/* Shimmer background overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 shimmer-card pointer-events-none transition-opacity duration-700" />

      <div>
        <div className="flex items-center justify-between mb-4 relative z-10">
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
            className={`p-3 rounded-2xl border transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-xs ${colorMap[color]}`}
          >
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        <div className="flex items-baseline justify-between relative z-10">
          <div className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-slate-950 transition-colors">
            {value}
          </div>

          {/* Live soundwave/traffic simulation bars on active cards */}
          {isLive && (
            <div className="flex items-end gap-1 h-5 pb-0.5">
              <span className="w-1 bg-[#3BB48C] rounded-full wave-bar-1 h-4" />
              <span className="w-1 bg-[#3BB48C] rounded-full wave-bar-2 h-5" />
              <span className="w-1 bg-[#3BB48C] rounded-full wave-bar-3 h-3" />
              <span className="w-1 bg-[#3BB48C] rounded-full wave-bar-4 h-4" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 relative z-10">
        {sparkline && sparkline.length > 1 && (
          <div className="mb-2.5 h-6 w-full">
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <path
                d={getSparklinePath(sparkline, 100, 24)}
                fill="none"
                stroke={sparklineStroke}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_2px_4px_rgba(59,180,140,0.25)]"
              />
            </svg>
          </div>
        )}

        {(subtitle || trend) && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {trend && (
              <span className="text-[#1A7456] font-bold bg-[#EBF8F4] px-2 py-0.5 rounded-full border border-[#BCE9DA] transition-transform group-hover:scale-105 shrink-0">
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

