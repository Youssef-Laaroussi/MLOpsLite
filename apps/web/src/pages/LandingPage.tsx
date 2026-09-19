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
  Boxes,
  Layers,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const installCmd = "git clone https://github.com/Youssef-Laaroussi/MLOpsLite.git && cd MLOpsLite && docker compose up -d";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    {
      icon: Database,
      title: "Data Versioning & Lineage",
      desc: "SHA-256 content verification, local & MinIO S3 object sync with total data sovereignty.",
    },
    {
      icon: Boxes,
      title: "Native MLflow Tracking",
      desc: "Seamless experiment tracking, hyperparameter logging, metric curves, and model artifacts.",
    },
    {
      icon: ShieldCheck,
      title: "Centralized Model Registry",
      desc: "Staging, Production, and Archived lifecycle stages with strict schema and signature checks.",
    },
    {
      icon: Server,
      title: "Containerized Serving",
      desc: "Isolated Docker model serving containers, dynamic port allocation, and sub-50ms latency.",
    },
    {
      icon: LineChart,
      title: "Evidently AI Drift Monitoring",
      desc: "Continuous Kolmogorov-Smirnov statistical tests and delayed ground-truth performance evaluation.",
    },
    {
      icon: RotateCcw,
      title: "Automated & Instant Rollback",
      desc: "Automatic degradation triggers on drift or error spikes, plus 1-command CLI recovery cutover.",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Initialize Project",
      code: "mlite init fraud-detection",
      desc: "Scaffold full project workspace with DVC, MLflow config, and starter templates.",
    },
    {
      step: "02",
      title: "Train & Register",
      code: "python src/train.py && mlite models register",
      desc: "Train models, log parameters and artifacts to MLflow, and catalog in the registry.",
    },
    {
      step: "03",
      title: "Deploy & Monitor",
      code: "mlite deployments create --model fraud-detector --version 1",
      desc: "Spin up dedicated Docker inference container with live health probes and drift guards.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-[#3BB48C] selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-18 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-[#F0FDF9] rounded-xl border border-[#BCE9DA] p-1.5 shadow-sm">
              <img src="/logo.png" alt="MLite Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-xl tracking-tight">MLite</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
                v1.0.0 GA
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-[#3BB48C] transition">Features</a>
            <a href="#workflow" className="hover:text-[#3BB48C] transition">Workflow</a>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:text-[#3BB48C] transition flex items-center gap-1">
              API Docs <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
            <a href="https://github.com/Youssef-Laaroussi/MLOpsLite" target="_blank" rel="noreferrer" className="hover:text-[#3BB48C] transition flex items-center gap-1">
              GitHub <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="px-4 py-2 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-sm transition shadow-md shadow-[#3BB48C]/25 flex items-center gap-2"
            >
              Dashboard Console <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden bg-gradient-to-b from-[#F0FDF9]/50 via-white to-white">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA] shadow-sm">
            <Zap className="w-3.5 h-3.5 text-[#3BB48C]" />
            Lightweight Self-Hosted MLOps Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            MLOps Without Cloud Lock-In. <br />
            <span className="text-[#3BB48C]">
              Without Kubernetes Complexity.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Run your complete machine learning lifecycle on your own VPS or local server with a single Docker Compose stack and a unified CLI: from data versioning to live container serving and automatic rollback.
          </p>

          {/* Quickstart Command Box */}
          <div className="pt-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 text-white shadow-xl font-mono text-xs border border-slate-800">
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                <Terminal className="w-4 h-4 text-[#3BB48C] shrink-0" />
                <span className="text-[#3BB48C] font-bold">$</span>
                <span className="truncate text-slate-200">{installCmd}</span>
              </div>
              <button
                onClick={handleCopy}
                className="ml-3 shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#3BB48C]" />
                    <span className="text-[#3BB48C]">Copied!</span>
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/app"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-extrabold text-sm transition shadow-lg shadow-[#3BB48C]/30 flex items-center justify-center gap-2"
            >
              Open Dashboard Console <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              Interactive Swagger API Docs
            </a>
          </div>
        </div>
      </section>

      {/* Live Lifecycle Strip */}
      <section className="py-12 border-y border-slate-100 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
            End-to-End Autonomous Lifecycle Pipeline
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
            {[
              { title: "Data Lineage", desc: "DVC + MinIO" },
              { title: "Experiment Tracking", desc: "MLflow Server" },
              { title: "Model Registry", desc: "Stages & Versions" },
              { title: "Container Serving", desc: "Docker Isolated" },
              { title: "Drift Detection", desc: "Evidently AI" },
              { title: "Smart Alerting", desc: "Webhooks & Slack" },
              { title: "Auto-Rollback", desc: "Zero Downtime" },
            ].map((item, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-800">{item.title}</div>
                <div className="text-[11px] text-[#3BB48C] font-semibold mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold text-[#3BB48C] uppercase tracking-wider bg-[#EBF8F4] px-3 py-1 rounded-full border border-[#BCE9DA]">
            Core Platform Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything You Need to Run Models in Production
          </h2>
          <p className="text-slate-600 text-sm">
            Replace fragmented, expensive SaaS subscriptions with a single cohesive self-hosted platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="p-7 rounded-2xl bg-white border border-slate-200 hover:border-[#3BB48C]/60 hover:shadow-lg hover:shadow-[#3BB48C]/10 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#EBF8F4] border border-[#BCE9DA] flex items-center justify-center mb-5 text-[#3BB48C] group-hover:bg-[#3BB48C] group-hover:text-white transition-colors shadow-sm">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3-Step Workflow Section */}
      <section id="workflow" className="py-20 bg-[#F8FAFC] border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#3BB48C] uppercase tracking-wider bg-[#EBF8F4] px-3 py-1 rounded-full border border-[#BCE9DA]">
              Developer Experience
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Get From Code to Live Endpoint in Minutes
            </h2>
            <p className="text-slate-600 text-sm">
              Use your preferred Python data stack alongside the fast `mlite` CLI.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {steps.map((s, idx) => (
              <div key={idx} className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-extrabold text-[#3BB48C] font-mono">{s.step}</span>
                  <span className="text-xs font-bold text-slate-400">Step {idx + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{s.title}</h3>
                <div className="p-3 bg-slate-900 rounded-xl text-white font-mono text-xs overflow-x-auto">
                  <span className="text-[#3BB48C]">$</span> {s.code}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-tr from-[#EBF8F4] via-[#F0FDF9] to-white border border-[#BCE9DA] shadow-xl text-center space-y-6">
            <div className="w-14 h-14 mx-auto bg-white rounded-2xl p-2.5 shadow-md border border-[#BCE9DA]">
              <img src="/logo.png" alt="MLite" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Ready to Take Full Control of Your MLOps?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
              Open the interactive dashboard console to manage your models, datasets, and serving containers right now.
            </p>
            <div className="pt-2">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-extrabold text-base transition shadow-xl shadow-[#3BB48C]/30"
              >
                Launch Dashboard Console <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MLite Logo" className="w-5 h-5 object-contain" />
            <span className="font-bold text-slate-900 text-sm">MLite</span>
            <span>• Open Source Apache 2.0 License</span>
          </div>
          <div>
            Self-hosted MLOps platform built with FastAPI, PostgreSQL, MinIO, MLflow & React.
          </div>
        </div>
      </footer>
    </div>
  );
};
