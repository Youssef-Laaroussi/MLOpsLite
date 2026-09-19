import React from "react";
import { ExternalLink } from "lucide-react";

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#3BB48C]"></span>
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {/* Quick External Links */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-[#F8FAFC] hover:text-[#3BB48C] hover:border-[#3BB48C] rounded-lg border border-slate-200 transition shadow-sm"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#3BB48C]" />
          API Docs
        </a>

        <a
          href="http://localhost:5000"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-[#F8FAFC] hover:text-[#3BB48C] hover:border-[#3BB48C] rounded-lg border border-slate-200 transition shadow-sm"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#3BB48C]" />
          MLflow
        </a>

        <a
          href="http://localhost:9001"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-[#F8FAFC] hover:text-[#3BB48C] hover:border-[#3BB48C] rounded-lg border border-slate-200 transition shadow-sm"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#3BB48C]" />
          MinIO
        </a>
      </div>
    </header>
  );
};
