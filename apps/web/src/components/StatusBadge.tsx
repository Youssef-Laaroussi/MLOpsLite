import React from "react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const upper = status.toUpperCase();

  // Subtle clean enterprise badge:
  // neutral background, fine border, discrete colored dot and crisp dark slate typography
  let style = "bg-white text-slate-700 border-slate-200";
  let dotColor = "bg-slate-400";

  if (["RUNNING", "ACTIVE", "PRODUCTION", "HEALTHY", "READY"].includes(upper)) {
    // Exact vert uni #3BB48C sans dégradé, texte blanc
    style = "bg-[#3BB48C] text-white border-[#329F7B]";
    dotColor = "bg-white";
  } else if (["STAGING", "CANDIDATE", "PENDING", "INITIALIZING"].includes(upper)) {
    style = "bg-amber-100 text-amber-800 border-amber-300";
    dotColor = "bg-amber-600";
  } else if (["FAILED", "ERROR", "STOPPED", "CRITICAL"].includes(upper)) {
    style = "bg-rose-100 text-rose-800 border-rose-300";
    dotColor = "bg-rose-600";
  } else if (["ARCHIVED", "DISABLED"].includes(upper)) {
    style = "bg-slate-100 text-slate-600 border-slate-300";
    dotColor = "bg-slate-400";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap shadow-2xs ${style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{upper}</span>
    </span>
  );
};
