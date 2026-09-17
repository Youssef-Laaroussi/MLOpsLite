import React from "react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const upper = status.toUpperCase();

  let colors = "bg-slate-700/60 text-slate-300 border-slate-600";
  if (["RUNNING", "ACTIVE", "PRODUCTION", "HEALTHY"].includes(upper)) {
    colors = "bg-emerald-950/60 text-emerald-400 border-emerald-800/80";
  } else if (["STAGING", "CANDIDATE", "PENDING"].includes(upper)) {
    colors = "bg-amber-950/60 text-amber-400 border-amber-800/80";
  } else if (["FAILED", "ERROR", "STOPPED", "ARCHIVED"].includes(upper)) {
    colors = "bg-rose-950/60 text-rose-400 border-rose-800/80";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-80" />
      {upper}
    </span>
  );
};
