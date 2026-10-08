import React, { useState, useEffect, useRef } from "react";
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
  Cpu,
  Activity,
  HardDrive,
  GitBranch,
  Radio,
  FileCode2,
  Sparkles,
  Linkedin,
  Twitter,
  Github,
  Play,
  Flame,
  CheckCircle,
  AlertTriangle,
  Code2,
  Gauge,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const LandingPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"deploy" | "drift" | "curl">("deploy");
  const [activeCategory, setActiveCategory] = useState<"all" | "pipeline" | "serving" | "governance">("all");
  
  // 3D Tilt for Terminal
  const [terminalTilt, setTerminalTilt] = useState({ rotateX: 0, rotateY: 0 });

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTerminalTilt({
      rotateX: -(y / rect.height) * 10,
      rotateY: (x / rect.width) * 10,
    });
  };

  const handleHeroMouseLeave = () => {
    setTerminalTilt({ rotateX: 0, rotateY: 0 });
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  const installCmd = "git clone https://github.com/Youssef-Laaroussi/MLOpsLite.git && cd MLOpsLite && docker compose up -d";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = (code: string, stepIdx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedStep(stepIdx);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const features = [
    {
      category: "pipeline",
      icon: Database,
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      title: "Data Versioning & Lineage",
      desc: "Track every dataset evolution with cryptographic integrity and local MinIO S3 sync. Complete reproducibility without cloud storage fees.",
      badge: "SHA-256 Checksum",
      path: "/app/datasets",
    },
    {
      category: "pipeline",
      icon: Boxes,
      iconColor: "text-teal-400 bg-teal-500/10 border-teal-500/30",
      title: "Native Experiment Tracking",
      desc: "Full experiment engine tracking metrics, hyperparameter grids, learning curves, and model artifacts directly to PostgreSQL and S3.",
      badge: "Postgres + S3",
      path: "/app/experiments",
    },
    {
      category: "pipeline",
      icon: ShieldCheck,
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      title: "Centralized Model Registry",
      desc: "Enforce strict governance across Development, Staging, and Production stages with input/output signature validation and metadata tracking.",
      badge: "Signature Enforced",
      path: "/app/models",
    },
    {
      category: "serving",
      icon: Server,
      iconColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
      title: "Isolated Container Serving",
      desc: "Auto-scaffold dedicated Docker serving containers with dynamic port allocation, FastAPI runtime, and sub-second container cold-starts.",
      badge: "< 50ms Cold Starts",
      path: "/app/deployments",
    },
    {
      category: "governance",
      icon: LineChart,
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      title: "Evidently AI Drift Monitoring",
      desc: "Continuous statistical testing detects covariate shift in feature distributions before model degradation impacts production traffic.",
      badge: "Kolmogorov-Smirnov",
      path: "/app/monitoring",
    },
    {
      category: "governance",
      icon: RotateCcw,
      iconColor: "text-teal-400 bg-teal-500/10 border-teal-500/30",
      title: "Automated & Instant Rollback",
      desc: "Configurable drift and error spike triggers automatically switch traffic back to the previous healthy model version with zero service interruption.",
      badge: "Zero Downtime",
      path: "/app/alerts",
    },
  ];

  const filteredFeatures =
    activeCategory === "all"
      ? features
      : features.filter((f) => f.category === activeCategory);

  const steps = [
    {
      step: "01",
      title: "Initialize & Track",
      code: "mlite init fraud-detection && mlite data add ./train.csv",
      desc: "Scaffold a production-grade workspace, configure Git tracking, and register baseline data with SHA-256 verification.",
    },
    {
      step: "02",
      title: "Train & Catalog",
      code: "python src/train.py && mlite models register --version 1",
      desc: "Log metrics, parameters, and model artifacts to local MLflow, then catalog the model in the centralized registry.",
    },
    {
      step: "03",
      title: "Deploy & Guard",
      code: "mlite deployments create --model fraud-detection --port 8001",
      desc: "Spawn an isolated Docker container endpoint with live health checks and Evidently AI drift guardrails.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 selection:bg-[#3BB48C] selection:text-white font-sans overflow-x-hidden">
      {/* ── Background Ambience Grid & Spotlights ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-tech-grid opacity-20 [mask-image:radial-gradient(ellipse_75%_65%_at_50%_0%,#000_65%,transparent_100%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[580px] bg-[radial-gradient(circle_at_50%_0%,rgba(59,180,140,0.18),transparent_70%)] blur-[110px]" />
        <div className="absolute top-[850px] -left-48 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(20,184,166,0.12),transparent_70%)] blur-[120px]" />
        <div className="absolute top-[1700px] -right-48 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(59,180,140,0.1),transparent_70%)] blur-[120px]" />
      </div>

      {/* ── Top Header (Natural, Frameless Logo) ── */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10 backdrop-blur-xl shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-18 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 p-2 transition-all group-hover:border-[#3BB48C]/60 group-hover:bg-white/10 group-hover:shadow-[0_0_20px_rgba(59,180,140,0.3)]">
                <img
                  src="/logo.png"
                  alt="MLite Logo"
                  className="w-full h-full object-contain transition-transform group-hover:scale-105 select-none"
                />
              </div>
              <span className="font-display font-black text-white text-2xl tracking-tight">MLite</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-[#3BB48C] transition-colors">Features</a>
            <a href="#workflow" className="hover:text-[#3BB48C] transition-colors">Workflow</a>
            <a href="#architecture" className="hover:text-[#3BB48C] transition-colors">Architecture</a>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#3BB48C] transition-colors flex items-center gap-1"
            >
              API Docs <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
            <a
              href="https://github.com/Youssef-Laaroussi/MLOpsLite"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#3BB48C] transition-colors flex items-center gap-1"
            >
              GitHub <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <Link
                to="/signin"
                className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-5 py-2 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-sm transition shadow-lg shadow-[#3BB48C]/25 hover:-translate-y-0.5 active:translate-y-0"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Premium Hero Section (Dark Theme, 3D Parallax Terminal, Blur Reveal) ── */}
      <section 
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
        className="relative pt-24 sm:pt-32 lg:pt-36 pb-28 overflow-hidden border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            {/* ── Left Column ── */}
            <div className="lg:col-span-6 space-y-8 text-left">
              {/* High-Impact Blur Reveal Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="font-display text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05]"
              >
                Deploy &amp; Monitor ML.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-[#3BB48C] to-teal-400 drop-shadow-[0_0_25px_rgba(59,180,140,0.35)]">
                  Zero Cloud Lock-In.
                </span>
              </motion.h1>

              {/* Punchy Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="text-lg text-slate-400 max-w-lg leading-relaxed font-light"
              >
                The lightweight, self-hosted platform for Python. Track models, deploy in sub-50ms Docker containers, and detect drift on your own servers.
              </motion.p>

              {/* One-Line Install Command with Animated Copy feedback */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.25 }}
                className="relative"
              >
                <div className="p-3 bg-slate-950/90 rounded-2xl border border-white/10 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md">
                  <div className="flex items-center gap-2.5 font-mono text-xs overflow-hidden">
                    <span className="text-[#3BB48C] font-bold select-none">$</span>
                    <span className="text-slate-300 truncate select-all">{installCmd}</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5 shrink-0 border border-white/10 active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Dual Action CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.35 }}
                className="flex flex-col sm:flex-row items-center gap-4 pt-1"
              >
                <Link
                  to="/app"
                  className="group relative w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#3BB48C] to-teal-500 hover:from-[#329F7B] hover:to-teal-600 text-white font-extrabold text-sm transition-all shadow-[0_0_25px_rgba(59,180,140,0.4)] hover:shadow-[0_0_35px_rgba(59,180,140,0.6)] hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <span>Open Dashboard Console</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-sm transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                >
                  <span>Interactive API Docs</span>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </a>
              </motion.div>

              {/* 4 Hero Feature Pills with Animated Glow */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.45 }}
                className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs"
              >
                {[
                  { label: "100% Air-Gapped / Self-Hosted", icon: Database },
                  { label: "Sub-50ms Docker Serving", icon: Zap },
                  { label: "Automated Drift Guardrails", icon: LineChart },
                  { label: "Apache 2.0 Open Source", icon: ShieldCheck },
                ].map((pill, idx) => {
                  const Icon = pill.icon;
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#3BB48C]/40 hover:bg-white/[0.06] transition-all flex items-center gap-2 text-slate-300"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#3BB48C] shrink-0" />
                      <span className="truncate">{pill.label}</span>
                    </div>
                  );
                })}
              </motion.div>
            </div>

            {/* ── Right Column: 3D-like Floating Interactive Terminal ── */}
            <motion.div
              style={{
                perspective: 1200,
                transform: `rotateX(${terminalTilt.rotateX}deg) rotateY(${terminalTilt.rotateY}deg)`,
                transition: "transform 0.15s ease-out",
              }}
              className="lg:col-span-6 relative z-20"
            >
              {/* Premium Glow behind terminal */}
              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/25 to-teal-500/25 blur-3xl opacity-60 rounded-3xl" />

              {/* Terminal Window Frame */}
              <div className="relative rounded-2xl bg-[#080d19]/95 backdrop-blur-2xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden">
                {/* macOS Window Title Bar */}
                <div className="h-10 bg-white/[0.04] px-4 flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#EF4444] inline-block shadow-[0_0_8px_#EF4444]" />
                    <span className="w-3 h-3 rounded-full bg-[#F59E0B] inline-block shadow-[0_0_8px_#F59E0B]" />
                    <span className="w-3 h-3 rounded-full bg-[#10B981] inline-block shadow-[0_0_8px_#10B981]" />
                  </div>
                  <div className="text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#3BB48C]" />
                    mlite — zsh — 80x24
                  </div>
                  <div className="w-12 text-right">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#3BB48C] animate-pulse shadow-[0_0_8px_#3BB48C]" />
                  </div>
                </div>

                {/* Interactive Workflow Tab Selector */}
                <div className="bg-white/[0.02] px-4 py-2 border-b border-white/10 flex items-center gap-2 text-xs font-mono">
                  <button
                    onClick={() => setActiveTab("deploy")}
                    className={`px-3 py-1 rounded-md transition cursor-pointer font-bold ${
                      activeTab === "deploy"
                        ? "bg-[#3BB48C]/25 text-[#3BB48C] border border-[#3BB48C]/40"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    1. CLI Deploy
                  </button>
                  <button
                    onClick={() => setActiveTab("drift")}
                    className={`px-3 py-1 rounded-md transition cursor-pointer font-bold ${
                      activeTab === "drift"
                        ? "bg-[#3BB48C]/25 text-[#3BB48C] border border-[#3BB48C]/40"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    2. Drift Detection
                  </button>
                  <button
                    onClick={() => setActiveTab("curl")}
                    className={`px-3 py-1 rounded-md transition cursor-pointer font-bold ${
                      activeTab === "curl"
                        ? "bg-[#3BB48C]/25 text-[#3BB48C] border border-[#3BB48C]/40"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    3. Inference Curl
                  </button>
                </div>

                {/* Terminal Screen Body with Animated Transitions */}
                <div className="p-5 font-mono text-[11px] sm:text-xs leading-relaxed min-h-[350px] flex flex-col justify-between text-slate-300">
                  <AnimatePresence mode="wait">
                    {activeTab === "deploy" && (
                      <motion.div
                        key="deploy"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        <div>
                          <span className="text-emerald-400 font-bold">&gt; mlops init fraud-detection</span>
                          <div className="text-slate-400 mt-0.5">Creating repository structure with DVC and MLflow tracking...</div>
                        </div>
                        <div>
                          <span className="text-emerald-400 font-bold">&gt; mlops deploy model --name fraud-detector</span>
                          <div className="text-slate-400 mt-0.5">Deploying to container runtime: mlite-serving-fraud-detector</div>
                        </div>
                        <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5 space-y-1">
                          <div className="text-emerald-400">[2026-09-19 19:12:04] Logging deployment started</div>
                          <div className="text-slate-300">[2026-09-19 19:12:05] Node allocation: active (port 8001)</div>
                          <div className="text-emerald-400">[2026-09-19 19:12:05] Model weights: verified SHA-256 (4f8b9e...)</div>
                          <div className="text-teal-400 font-bold">[2026-09-19 19:12:06] Health check: 200 OK (latency: 18ms)</div>
                          <div className="text-[#3BB48C] font-bold">[2026-09-19 19:12:06] Status: Successfully started &amp; serving</div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "drift" && (
                      <motion.div
                        key="drift"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        <div>
                          <span className="text-emerald-400 font-bold">&gt; mlite monitor drift --model fraud-detector</span>
                          <div className="text-slate-400 mt-0.5">Running Evidently AI Kolmogorov-Smirnov statistical tests...</div>
                        </div>
                        <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5 space-y-1">
                          <div className="text-emerald-400">[TEST] Feature &#39;amount&#39;: p-val = 0.842 (No Drift)</div>
                          <div className="text-amber-400 font-bold">[DRIFT] Feature &#39;device_trust&#39;: p-val = 0.018</div>
                          <div className="text-sky-400 mt-1">[ALERT] Webhook dispatched to Slack #ml-alerts</div>
                          <div className="text-teal-400 font-bold">[SAFETY] Automated zero-downtime rollback ready</div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "curl" && (
                      <motion.div
                        key="curl"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        <div>
                          <span className="text-emerald-400 font-bold">&gt; curl -X POST http://localhost:8001/predict \</span>
                          <div className="text-slate-400 pl-3">
                            -H &quot;Content-Type: application/json&quot; \<br />
                            -d &#39;&#123;&quot;features&quot;: [0.42, 128.5, 0.9]&#125;&#39;
                          </div>
                        </div>
                        <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5 space-y-1">
                          <div className="text-emerald-400">&#123;</div>
                          <div className="text-slate-300 pl-3">&quot;prediction&quot;: [0.082],</div>
                          <div className="text-slate-300 pl-3">&quot;decision&quot;: &quot;APPROVE&quot;,</div>
                          <div className="text-teal-400 pl-3 font-bold">&quot;status&quot;: &quot;HEALTHY&quot;</div>
                          <div className="text-emerald-400">&#125;</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Active prompt indicator */}
                  <div className="flex items-center gap-2 pt-2 text-[#3BB48C] font-bold">
                    <span>$</span>
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-2 h-4 bg-[#3BB48C] inline-block"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Lifecycle Strip: Animated Continuous Pipeline ── */}
      <section className="py-12 border-b border-white/10 bg-[#050811] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <p className="text-center text-xs font-mono font-bold text-[#3BB48C] uppercase tracking-widest mb-8">
            Autonomous Machine Learning Lifecycle Pipeline
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
            {[
              { title: "Data Lineage", desc: "DVC + MinIO S3", icon: Database, step: "01" },
              { title: "Experimentation", desc: "Native MLflow", icon: Boxes, step: "02" },
              { title: "Model Registry", desc: "Stages & Signatures", icon: ShieldCheck, step: "03" },
              { title: "Docker Serving", desc: "Sub-50ms Runtime", icon: Server, step: "04" },
              { title: "Drift Guard", desc: "Evidently AI", icon: LineChart, step: "05" },
              { title: "Smart Alerts", desc: "Webhooks & Slack", icon: Radio, step: "06" },
              { title: "Auto-Rollback", desc: "Zero Downtime", icon: RotateCcw, step: "07" },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  key={idx}
                  className="p-4 bg-white/[0.03] rounded-2xl border border-white/10 hover:border-[#3BB48C]/60 hover:bg-white/[0.06] hover:shadow-[0_0_25px_rgba(59,180,140,0.2)] hover:-translate-y-1.5 transition-all duration-300 group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-500 font-bold">{item.step}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3BB48C] opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all" />
                  </div>
                  <Icon className="w-5 h-5 mx-auto text-[#3BB48C] mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-bold text-white group-hover:text-[#3BB48C] transition-colors">{item.title}</div>
                  <div className="text-[11px] text-emerald-400/90 font-mono mt-1">{item.desc}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features Grid with Dynamic Spotlight Hover & Category Filter ── */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6 relative">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-mono font-bold text-[#3BB48C] uppercase tracking-wider bg-[#3BB48C]/10 px-3.5 py-1 rounded-full border border-[#3BB48C]/30">
            Enterprise Capabilities
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Everything You Need to Run Models in Production
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Replace complex multi-cloud tools with a unified self-hosted platform built for velocity.
          </p>

          {/* Interactive Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            {[
              { id: "all", label: "All Capabilities" },
              { id: "pipeline", label: "Data & MLflow" },
              { id: "serving", label: "Docker Serving" },
              { id: "governance", label: "Drift & Governance" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`relative px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeCategory === tab.id
                    ? "bg-[#3BB48C] text-white shadow-lg shadow-[#3BB48C]/30"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Cards Grid with Spotlight Effect */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredFeatures.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                key={`${activeCategory}-${i}`}
                onMouseMove={handleCardMouseMove}
                className="group relative overflow-hidden p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-[#3BB48C]/60 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] transition-all duration-300 flex flex-col justify-between"
              >
                {/* Raycast / Aceternity Style Spotlight Cursor Glow */}
                <div
                  className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background:
                      "radial-gradient(450px circle at var(--mouse-x, 150px) var(--mouse-y, 150px), rgba(59,180,140,0.14), transparent 70%)",
                  }}
                />

                {/* Subtle top indicator bar on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-[#3BB48C] transition-all duration-500" />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg ${f.iconColor}`}
                    >
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                      {f.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2.5 group-hover:text-emerald-400 transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-light">{f.desc}</p>
                </div>

                <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between text-xs font-mono font-bold text-[#3BB48C]">
                  <Link to={f.path} className="flex items-center group-hover:translate-x-1 transition-transform">
                    <span>Explore module</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                  <span className="text-slate-500 text-[10px]">Ready</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Architecture & Stack Blueprint: Interactive Connected Topology ── */}
      <section id="architecture" className="py-24 bg-[#050811] border-y border-white/10 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-mono font-bold text-[#3BB48C] uppercase tracking-wider bg-[#3BB48C]/10 px-3.5 py-1 rounded-full border border-[#3BB48C]/30">
              Production Architecture
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Self-Hosted Stack. Zero Black Boxes.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Engineered with proven open-source industry standards for maximum performance and predictability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "PostgreSQL 16",
                role: "Metadata Engine",
                desc: "ACID transactions for model registry, deployment statuses, audit logs, and metrics tracking.",
                icon: Database,
                stat: "ACID Latency <1ms",
              },
              {
                title: "MinIO S3",
                role: "Object Storage",
                desc: "S3-compatible bucket storage for raw datasets, model weights, and drift baseline distributions.",
                icon: HardDrive,
                stat: "S3 API Compatible",
              },
              {
                title: "Docker Compose",
                role: "Container Orchestrator",
                desc: "Zero-dependency single-command orchestration across VPS, bare-metal, or on-prem servers.",
                icon: Server,
                stat: "Single Command Up",
              },
              {
                title: "FastAPI Async",
                role: "High-Speed REST Core",
                desc: "Sub-millisecond routing, OpenAPI/Swagger generation, and built-in security headers.",
                icon: Zap,
                stat: "Sub-50ms Cold Starts",
              },
            ].map((arch, idx) => {
              const Icon = arch.icon;
              return (
                <div
                  key={idx}
                  onMouseMove={handleCardMouseMove}
                  className="group relative bg-white/[0.03] p-7 rounded-3xl border border-white/10 hover:border-[#3BB48C]/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg"
                >
                  {/* Spotlight */}
                  <div
                    className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "radial-gradient(350px circle at var(--mouse-x, 150px) var(--mouse-y, 150px), rgba(59,180,140,0.12), transparent 70%)",
                    }}
                  />

                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-[#3BB48C]/15 border border-[#3BB48C]/30 flex items-center justify-center text-[#3BB48C] mb-5 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div className="text-xs font-mono font-bold text-[#3BB48C] uppercase tracking-wide">{arch.role}</div>
                    <h3 className="text-xl font-bold text-white mt-1 mb-2.5">{arch.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">{arch.desc}</p>
                  </div>

                  <div className="pt-5 mt-6 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Performance:</span>
                    <span className="text-emerald-400 font-bold">{arch.stat}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3-Step Workflow Section: Animated Developer Pipeline ── */}
      <section id="workflow" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-mono font-bold text-[#3BB48C] uppercase tracking-wider bg-[#3BB48C]/10 px-3.5 py-1 rounded-full border border-[#3BB48C]/30">
              Developer Workflow
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              From Raw Code to Live Serving in 3 Commands
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Seamlessly integrates into any Python, Scikit-Learn, PyTorch, or XGBoost modeling pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {steps.map((s, idx) => (
              <div
                key={idx}
                className="bg-white/[0.03] p-8 rounded-3xl border border-white/10 space-y-5 hover:border-[#3BB48C]/60 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] transition-all duration-300 relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl font-black text-[#3BB48C] font-mono tracking-tight">{s.step}</span>
                    <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Step {idx + 1}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">{s.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-light">{s.desc}</p>
                </div>

                <div className="relative">
                  <div className="p-3.5 bg-slate-950/90 rounded-2xl text-slate-200 font-mono text-xs overflow-x-auto border border-white/10 flex items-center justify-between gap-3 shadow-inner">
                    <div className="truncate">
                      <span className="text-[#3BB48C] font-bold select-none">$</span> {s.code}
                    </div>
                    <button
                      onClick={() => handleCopyCode(s.code, idx)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition shrink-0 border border-white/5 active:scale-90"
                    >
                      {copiedStep === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA Banner (Frameless Logo) ── */}
      <section className="py-24 bg-[#050811] border-t border-white/10 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent border border-[#3BB48C]/30 shadow-[0_0_60px_rgba(59,180,140,0.15)] text-center space-y-6 relative overflow-hidden">
            {/* Animated Glow in background */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#3BB48C]/20 rounded-full blur-[90px] pointer-events-none" />

            {/* Frameless Logo Squircle */}
            <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl p-2.5 shadow-lg border border-white/15 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="MLite"
                className="w-full h-full object-contain select-none"
              />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Ready to Take Full Control of Your MLOps Stack?
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed">
              Launch the interactive web dashboard or run the CLI to register models, spawn serving endpoints, and monitor statistical drift right now.
            </p>
            <div className="pt-2">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#3BB48C] to-teal-500 hover:from-[#329F7B] hover:to-teal-600 text-white font-extrabold text-base transition shadow-xl shadow-[#3BB48C]/35 hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Launch Dashboard Console</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Enterprise Dark Footer with Complete Watermark & Branding ── */}
      <footer className="bg-[#02050e] text-slate-400 pt-16 pb-12 border-t border-white/10 overflow-hidden text-xs">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 pb-12 border-b border-white/10">
            {/* Brand & Description */}
            <div className="max-w-md space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 p-1.5 shadow-sm">
                  <img src="/logo.png" alt="MLite Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-display font-black text-white text-2xl tracking-tight">MLite</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#3BB48C]/15 text-[#3BB48C] border border-[#3BB48C]/30">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pr-6 font-light">
                Lightweight, open-source MLOps platform engineered for teams who demand complete data sovereignty,
                sub-50ms Docker serving, and automated drift protection without cloud vendor lock-in.
              </p>
            </div>

            {/* Links Columns */}
            <div className="flex flex-wrap gap-12 sm:gap-16 text-xs font-mono">
              {/* Platform */}
              <div className="space-y-3">
                <div className="font-bold text-white uppercase tracking-wider text-[11px]">Platform</div>
                <ul className="space-y-2 text-slate-400">
                  <li><Link to="/app/models" className="hover:text-[#3BB48C] transition">Model Registry</Link></li>
                  <li><Link to="/app/deployments" className="hover:text-[#3BB48C] transition">Container Serving</Link></li>
                  <li><Link to="/app/monitoring" className="hover:text-[#3BB48C] transition">Drift Monitoring</Link></li>
                  <li><Link to="/app/alerts" className="hover:text-[#3BB48C] transition">Smart Alerting</Link></li>
                </ul>
              </div>

              {/* Navigation */}
              <div className="space-y-3">
                <div className="font-bold text-white uppercase tracking-wider text-[11px]">Navigation</div>
                <ul className="space-y-2 text-slate-400">
                  <li><a href="#features" className="hover:text-[#3BB48C] transition">Features</a></li>
                  <li><a href="#workflow" className="hover:text-[#3BB48C] transition">Workflow</a></li>
                  <li><a href="#architecture" className="hover:text-[#3BB48C] transition">Architecture</a></li>
                  <li>
                    <a
                      href="https://github.com/Youssef-Laaroussi/MLOpsLite"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[#3BB48C] transition flex items-center gap-1"
                    >
                      GitHub Repo <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* ── Giant Outline Watermark with Complete Real Logo ── */}
          <div className="w-full my-10 pt-4 pb-2 flex items-center justify-between gap-6 sm:gap-10 select-none pointer-events-none overflow-hidden opacity-30">
            <div className="flex items-center gap-4 shrink-0">
              <img
                src="/logo.png"
                alt="MLite Logo"
                className="h-20 sm:h-28 md:h-36 w-auto object-contain select-none drop-shadow-lg"
              />
            </div>

            <span
              className="font-display font-black text-[13vw] leading-none tracking-tighter text-transparent select-none whitespace-nowrap"
              style={{
                WebkitTextStroke: "2px rgba(59, 180, 140, 0.4)",
              }}
            >
              MLite
            </span>
          </div>

          {/* Sub-Footer Bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono border-t border-white/10">
            <div className="flex items-center gap-2">
              <span>© 2026 MLite Project. Created by Youssef Laaroussi.</span>
              <span>•</span>
              <span className="text-slate-400">Apache 2.0 Open Source License</span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/Youssef-Laaroussi/MLOpsLite/blob/dev/SECURITY.md"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition"
              >
                Security Policy
              </a>
              <a
                href="https://github.com/Youssef-Laaroussi/MLOpsLite"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition"
              >
                GitHub Repository
              </a>
              <Link to="/app" className="text-[#3BB48C] font-semibold hover:underline">
                Open Console →
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
