import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Server,
  Database,
  LineChart,
  RotateCcw,
  ShieldCheck,
  Zap,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Cpu,
  Boxes,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const command = "git clone https://github.com/Youssef-Laaroussi/MLOpsLite.git && docker compose up -d";

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    {
      icon: Database,
      title: "Data Versioning & Lineage",
      desc: "Content-addressed SHA-256 integrity, local and MinIO S3 sync with zero vendor lock-in.",
    },
    {
      icon: Boxes,
      title: "Native MLflow Tracking",
      desc: "Automatic experiment logging, hyperparameter tracking, metric curves, and model artifacts.",
    },
    {
      icon: ShieldCheck,
      title: "Centralized Model Registry",
      desc: "Formal lifecycle stages (Development, Staging, Production) with strict schema enforcement.",
    },
    {
      icon: Server,
      title: "Containerized Serving",
      desc: "Sub-50ms inference latency, isolated Docker containers, dynamic ports, and health probes.",
    },
    {
      icon: LineChart,
      title: "Evidently AI Drift Monitoring",
      desc: "Kolmogorov-Smirnov feature drift detection and delayed ground-truth feedback evaluation.",
    },
    {
      icon: RotateCcw,
      title: "Zero-Downtime Rollback",
      desc: "Automated degradation triggers and instant 1-command CLI cutover back to stable models.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#071018] text-slate-100 selection:bg-[#3BB48C] selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-[#19364C] bg-[#0D1F2D]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-[#071018] rounded-xl border border-[#19364C] p-1.5 shadow-md">
              <img src="/logo.png" alt="MLite Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-extrabold text-white text-xl tracking-tight">MLite</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded font-mono font-bold bg-[#0D3326] text-[#3BB48C] border border-[#1A7456]">
                v1.0.0 GA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Youssef-Laaroussi/MLOpsLite"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5"
            >
              GitHub <ExternalLink className="w-3 h-3 text-[#3BB48C]" />
            </a>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5"
            >
              API Docs <ExternalLink className="w-3 h-3 text-[#3BB48C]" />
            </a>
            <Link
              to="/"
              className="px-4 py-2 rounded-lg bg-[#3BB48C] hover:bg-[#34A47F] text-[#071018] font-bold text-xs transition shadow-md shadow-[#3BB48C]/20 flex items-center gap-1.5"
            >
              Open Console <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-[#19364C]/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(59,180,140,0.15),rgba(255,255,255,0))]"></div>
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#0D3326] text-[#3BB48C] border border-[#1A7456] shadow-sm">
            <Zap className="w-3.5 h-3.5 text-[#3BB48C]" />
            Self-Hosted MLOps Without the Kubernetes Tax
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Production Machine Learning <br />
            <span className="bg-gradient-to-r from-[#3BB48C] via-[#6EE7B7] to-[#3BB48C] bg-clip-text text-transparent">
              Without the Complexity
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            MLite is a complete, self-hosted platform delivering experiment tracking, model registry, containerized serving, drift monitoring, and automated rollback with a single Docker Compose command.
          </p>

          {/* Quickstart Command Box */}
          <div className="pt-4 max-w-xl mx-auto">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D1F2D] border border-[#19364C] shadow-2xl font-mono text-xs text-slate-200">
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                <Terminal className="w-4 h-4 text-[#3BB48C] shrink-0" />
                <span className="text-[#3BB48C]">$</span>
                <span className="truncate">{command}</span>
              </div>
              <button
                onClick={handleCopy}
                className="ml-3 shrink-0 px-3 py-1.5 rounded-lg bg-[#071018] hover:bg-[#112738] text-slate-300 border border-[#19364C] transition flex items-center gap-1.5 text-[11px]"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#3BB48C]" />
                    <span className="text-[#3BB48C]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              to="/"
              className="px-6 py-3 rounded-xl bg-[#3BB48C] hover:bg-[#34A47F] text-[#071018] font-extrabold text-sm transition shadow-lg shadow-[#3BB48C]/30 flex items-center gap-2"
            >
              Launch Dashboard Console <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-xl bg-[#0D1F2D] hover:bg-[#112738] text-white border border-[#19364C] font-semibold text-sm transition flex items-center gap-2"
            >
              Interactive API Docs
            </a>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            The Complete ML Lifecycle in One Platform
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Engineered for AI startups, small labs, and enterprise teams seeking total infrastructure ownership.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[#0D1F2D] border border-[#19364C] hover:border-[#3BB48C]/40 transition-all shadow-md group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#071018] border border-[#19364C] flex items-center justify-center mb-4 group-hover:border-[#3BB48C]/50 transition">
                  <Icon className="w-6 h-6 text-[#3BB48C]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#19364C] bg-[#0D1F2D] py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MLite Logo" className="w-5 h-5 object-contain" />
            <span className="font-bold text-white text-sm">MLite</span>
            <span>• Open Source Apache 2.0</span>
          </div>
          <div>
            Built with FastAPI, PostgreSQL, MinIO, MLflow, Evidently AI & React.
          </div>
        </div>
      </footer>
    </div>
  );
};
