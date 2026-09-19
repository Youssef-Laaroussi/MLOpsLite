import React from "react";
import { ExternalLink } from "lucide-react";

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="h-16 border-b border-[#19364C] bg-[#0D1F2D]/90 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-10">
      <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#3BB48C]"></span>
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {/* Quick External Links */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#071018] hover:text-[#3BB48C] hover:border-[#3BB48C]/50 rounded-lg border border-[#19364C] transition shadow-sm"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#3BB48C]" />
          API Docs
        </a>

        <a
          href="http://localhost:5000"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#071018] hover:text-[#3BB48C] hover:border-[#3BB48C]/50 rounded-lg border border-[#19364C] transition shadow-sm"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#3BB48C]" />
          MLflow
        </a>

        <a
          href="http://localhost:9001"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#071018] hover:text-[#3BB48C] hover:border-[#3BB48C]/50 rounded-lg border border-[#19364C] transition shadow-sm"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#3BB48C]" />
          MinIO
        </a>
      </div>
    </header>
  );
};
