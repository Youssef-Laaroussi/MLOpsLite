import React from "react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const upper = status.toUpperCase();

  // Snowflake / Databricks subtle clean badge:
  // soft background, fine border, discrete colored dot and crisp typography
  let style = "bg-slate-50 text-slate-600 border-slate-200";
  let dotColor = "bg-slate-400";

  if (["RUNNING", "ACTIVE", "PRODUCTION", "HEALTHY", "READY"].includes(upper)) {
    style = "bg-emerald-50/70 text-emerald-800 border-emerald-200/80";
    dotColor = "bg-emerald-500";
  } else if (["STAGING", "CANDIDATE", "PENDING", "INITIALIZING"].includes(upper)) {
    style = "bg-amber-50/70 text-amber-800 border-amber-200/80";
    dotColor = "bg-amber-500";
  } else if (["FAILED", "ERROR", "STOPPED", "CRITICAL"].includes(upper)) {
    style = "bg-rose-50/70 text-rose-800 border-rose-200/80";
    dotColor = "bg-rose-500";
  } else if (["ARCHIVED", "DISABLED"].includes(upper)) {
    style = "bg-slate-100/70 text-slate-500 border-slate-200";
    dotColor = "bg-slate-400";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap ${style}`}
    >
      <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${dotColor}`} />
      {upper}
    </span>
  );
};
