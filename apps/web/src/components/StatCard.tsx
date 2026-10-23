import React from "react";
import { LucideIcon, ArrowUpRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  color?: "brand" | "emerald" | "amber" | "rose" | "blue";
  isLive?: boolean;
  href?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "brand",
  isLive = false,
  href,
}) => {
  const getTrendStyle = (t: string) => {
    if (t.startsWith("-") || t.toLowerCase().includes("down") || t.toLowerCase().includes("action needed")) {
      return "text-rose-600";
    }
    if (t.toLowerCase().includes("shift")) {
      return "text-amber-600";
    }
    return "text-emerald-700";
  };

  const CardWrapper = href ? "a" : "div";

  return (
    <CardWrapper
      {...(href ? { href } : {})}
      className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all group flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-1.5 rounded-lg border bg-slate-100 border-slate-200/60 text-slate-700 shrink-0">
              <Icon className="w-4 h-4 stroke-[2]" />
            </div>
          )}
          <span className="text-xs font-semibold text-slate-700 flex-1 truncate">
            {title}
          </span>
          {isLive ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0" />
          )}
        </div>

        <div className="text-xl font-bold font-sans text-slate-900 mt-2.5 mb-1 tracking-tight">
          {value}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] font-semibold">
        {trend && (
          <span className={getTrendStyle(trend)}>
            {trend}
          </span>
        )}
        {subtitle && (
          <span className="text-slate-400 font-normal truncate">
            {trend ? `• ${subtitle}` : subtitle}
          </span>
        )}
        {!subtitle && trend && (
          <span className="text-slate-400 font-normal">vs prev. period</span>
        )}
      </div>
    </CardWrapper>
  );
};
