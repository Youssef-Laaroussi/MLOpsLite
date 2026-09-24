import React from "react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const upper = status.toUpperCase();

  let colors = "bg-slate-100 text-slate-700 border-slate-200";
  if (["RUNNING", "ACTIVE", "PRODUCTION", "HEALTHY"].includes(upper)) {
    colors = "bg-[#EBF8F4] text-[#1A7456] border-[#BCE9DA]";
  } else if (["STAGING", "CANDIDATE", "PENDING"].includes(upper)) {
    colors = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (["FAILED", "ERROR", "STOPPED", "ARCHIVED"].includes(upper)) {
    colors = "bg-rose-50 text-rose-700 border-rose-200";
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
