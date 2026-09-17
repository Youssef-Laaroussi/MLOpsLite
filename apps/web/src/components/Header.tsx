import React from "react";
import { Terminal, ExternalLink, Moon, Sun } from "lucide-react";

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-10">
      <h1 className="text-xl font-semibold text-white tracking-tight">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Quick External Links */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
        >
          <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
          API Docs
        </a>

        <a
          href="http://localhost:5000"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
        >
          <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
          MLflow
        </a>

        <a
          href="http://localhost:9001"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
        >
          <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
          MinIO
        </a>
      </div>
    </header>
  );
};
