import React from "react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const upper = status.toUpperCase();

  let colors = "bg-[#64748b] text-white border-transparent";
  if (["RUNNING", "ACTIVE", "PRODUCTION", "HEALTHY"].includes(upper)) {
    colors = "bg-[#10b981] text-white border-transparent";
  } else if (["STAGING", "CANDIDATE", "PENDING"].includes(upper)) {
    colors = "bg-[#f59e0b] text-white border-transparent";
  } else if (["FAILED", "ERROR", "STOPPED", "ARCHIVED"].includes(upper)) {
    colors = "bg-[#ef4444] text-white border-transparent";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-xs ${colors}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-white" />
      {upper}
    </span>
  );
};
