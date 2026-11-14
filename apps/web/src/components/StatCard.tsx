import React from "react";
import { LucideIcon, ChevronRight } from "lucide-react";

import { Link } from "react-router-dom";

interface StatCardProps {
  id?: string;
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
  id,
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

  const tone = color === "rose" ? "text-rose-700"
    : color === "amber" ? "text-amber-700"
    : "text-emerald-700";
  const classes = "group block rounded-2xl border border-slate-200 bg-white px-4 py-3.5";
  const content = (
    <>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        {Icon && <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${tone}`} />}
        <span className="min-w-0 flex-1">{title}</span>
        {isLive && <span className="text-[10px] font-medium text-emerald-700">Live</span>}
      </div>
      <div className={`mt-2 flex items-center gap-1.5 text-2xl font-bold tabular-nums tracking-tight ${tone}`}>
        {value}
        {href && <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />}
      </div>
      {(trend || subtitle) && (
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[11px] text-slate-500">
          {trend && <span className={`font-semibold ${getTrendStyle(trend)}`}>{trend}</span>}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </>
  );

  return href ? (
    <Link id={id} to={href} className={`${classes} transition hover:border-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700`}>
      {content}
    </Link>
  ) : (
    <div id={id} className={classes}>{content}</div>
  );
};
