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
  Lock,
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
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const LandingPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [activeTab, setActiveTab] = useState<"deploy" | "drift" | "curl">("deploy");
  const [activeCategory, setActiveCategory] = useState<"all" | "pipeline" | "serving" | "governance">("all");

  // Scroll-reveal observer for animating cards on viewport entry
  const observerRef = useRef<IntersectionObserver | null>(null);
  const revealRefs = useRef<Set<HTMLDivElement>>(new Set());

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up");
            entry.target.classList.remove("opacity-0");
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    revealRefs.current.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [activeCategory]);

  const addRevealRef = (el: HTMLDivElement | null) => {
    if (el) {
      revealRefs.current.add(el);
      observerRef.current?.observe(el);
    }
  };

  const installCmd = "git clone https://github.com/Youssef-Laaroussi/MLOpsLite.git && cd MLOpsLite && docker compose up -d";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    {
      category: "pipeline",
      icon: Database,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
      tag: "SHA-256 Verified",
      title: "Data Versioning & Lineage",
      desc: "Track every dataset evolution with SHA-256 cryptographic hashes and local MinIO S3 sync. Complete reproducibility without cloud storage fees.",
    },
    {
      category: "pipeline",
      icon: Boxes,
      iconColor: "text-teal-600 bg-teal-50 border-teal-200",
      tag: "MLflow 2.15+",
      title: "Native Experiment Tracking",
      desc: "Full MLflow experiment engine tracking metrics, hyperparameter grids, learning curves, and model artifacts directly to PostgreSQL and S3.",
    },
    {
      category: "pipeline",
      icon: ShieldCheck,
      iconColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
      tag: "Stage Promotion",
      title: "Centralized Model Registry",
      desc: "Enforce strict governance across Development, Staging, and Production stages with input/output signature validation and metadata tracking.",
    },
    {
      category: "serving",
      icon: Server,
      iconColor: "text-cyan-600 bg-cyan-50 border-cyan-200",
      tag: "Sub-50ms Latency",
      title: "Isolated Container Serving",
      desc: "Auto-scaffold dedicated Docker serving containers with dynamic port allocation, FastAPI runtime, and sub-second container cold-starts.",
    },
    {
      category: "governance",
      icon: LineChart,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
      tag: "KS-Test p < 0.05",
      title: "Evidently AI Drift Monitoring",
      desc: "Continuous statistical two-sample tests detect covariate shift in feature distributions before model degradation impacts production traffic.",
    },
    {
      category: "governance",
      icon: RotateCcw,
      iconColor: "text-teal-700 bg-teal-50 border-teal-200",
      tag: "Zero Downtime",
      title: "Automated & Instant Rollback",
      desc: "Configurable drift and error spike triggers automatically switch traffic back to the previous healthy model version with zero service interruption.",
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
    <div className="min-h-screen bg-white text-slate-900 selection:bg-[#3BB48C] selection:text-white">
      {/* ── Top Header (Natural, Frameless Logo) ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-18 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 flex items-center justify-center bg-slate-50/90 rounded-2xl border border-slate-200/90 shadow-xs p-2 transition-all group-hover:border-[#3BB48C]/50 group-hover:bg-white group-hover:shadow-sm">
                <img
                  src="/logo.png"
                  alt="MLite Logo"
                  className="w-full h-full object-contain transition-transform group-hover:scale-105 select-none"
                />
              </div>
              <span className="font-black text-slate-900 text-2xl tracking-tight">MLite</span>
            </Link>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
              v1.0.0 GA
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-[#3BB48C] transition">Features</a>
            <a href="#workflow" className="hover:text-[#3BB48C] transition">Workflow</a>
            <a href="#architecture" className="hover:text-[#3BB48C] transition">Architecture</a>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#3BB48C] transition flex items-center gap-1"
            >
              API Docs <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
            <a
              href="https://github.com/Youssef-Laaroussi/MLOpsLite"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#3BB48C] transition flex items-center gap-1"
            >
              GitHub <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
                  <div className="w-6 h-6 rounded-lg bg-[#3BB48C] text-white font-black text-xs flex items-center justify-center">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-slate-800">{user.full_name || user.username}</span>
                </div>
                <Link
                  to="/app"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-xs sm:text-sm transition shadow-md shadow-[#3BB48C]/25 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Dashboard Console <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Link>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/signin"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-[#3BB48C] transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-5 py-2 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-sm transition shadow-md shadow-[#3BB48C]/25 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section (Split 2-Column: Text Left "A GAUCHE" / Terminal Graphic Right) ── */}
      <section className="relative pt-28 sm:pt-36 lg:pt-40 pb-24 lg:pb-32 overflow-hidden bg-gradient-to-b from-[#F0FDF9]/80 via-white to-white border-b border-slate-100">
        {/* Animated ambient glow spheres for vibrancy */}
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-gradient-to-br from-[#3BB48C]/20 to-teal-200/30 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
        <div className="absolute top-24 right-10 w-80 h-80 bg-gradient-to-br from-emerald-100/40 to-[#3BB48C]/15 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* ── Left Column ("A GAUCHE") ── */}
            <div className="lg:col-span-6 space-y-5 text-left">
              {/* High-Impact Headline */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08]">
                Deploy &amp; Monitor ML. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1A7456] via-[#3BB48C] to-[#2FA07B]">
                  Zero Cloud Lock-In.
                </span>
              </h1>

              {/* Punchy, Short Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 max-w-lg leading-relaxed font-normal">
                The lightweight, self-hosted platform for Python. Track models, deploy in sub-50ms Docker containers, and detect drift on your own servers.
              </p>

              {/* Quickstart Command Box */}
              <div className="pt-1">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0D1F2D] text-white shadow-xl font-mono text-xs border border-slate-800">
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    <Terminal className="w-4 h-4 text-[#3BB48C] shrink-0" />
                    <span className="text-[#3BB48C] font-bold">$</span>
                    <span className="truncate text-slate-200">{installCmd}</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="ml-3 shrink-0 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
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

              {/* Dual Action CTAs */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <Link
                  to="/app"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-extrabold text-sm transition shadow-lg shadow-[#3BB48C]/30 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Open Dashboard Console <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Link>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-sm transition shadow-xs flex items-center justify-center gap-2 hover:border-slate-400"
                >
                  <FileCode2 className="w-4 h-4 text-[#3BB48C]" />
                  Interactive API Docs
                </a>
              </div>

              {/* Trust Specs */}
              <div className="pt-2 grid grid-cols-2 gap-3 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3BB48C] shrink-0" />
                  <span>100% Air-Gapped / Self-Hosted</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3BB48C] shrink-0" />
                  <span>Sub-50ms Docker Serving</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3BB48C] shrink-0" />
                  <span>Automated Drift Guardrails</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3BB48C] shrink-0" />
                  <span>Apache 2.0 Open Source</span>
                </div>
              </div>
            </div>

            {/* ── Right Column: macOS Developer Terminal with Glowing Circuit Traces (Reference Image) ── */}
            <div className="lg:col-span-6 relative">
              {/* Decorative Circuit Lines and Nodes matching Image 2 */}
              <div className="absolute -top-6 -right-6 w-32 h-32 pointer-events-none hidden sm:block">
                <svg className="w-full h-full text-[#3BB48C]/40" viewBox="0 0 100 100" fill="none">
                  <path d="M10 80 H60 V30 H90" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
                  <circle cx="90" cy="30" r="4" fill="#3BB48C" />
                  <circle cx="60" cy="80" r="3" fill="#3BB48C" />
                </svg>
              </div>
              <div className="absolute -bottom-8 -left-6 w-32 h-32 pointer-events-none hidden sm:block">
                <svg className="w-full h-full text-[#3BB48C]/40" viewBox="0 0 100 100" fill="none">
                  <path d="M90 20 H40 V70 H10" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
                  <circle cx="10" cy="70" r="4" fill="#3BB48C" />
                  <circle cx="40" cy="20" r="3" fill="#3BB48C" />
                </svg>
              </div>

              {/* Terminal Window Frame */}
              <div className="relative rounded-2xl bg-[#0D1F2D] border border-slate-800 shadow-2xl shadow-[#3BB48C]/15 overflow-hidden">
                {/* macOS Window Title Bar */}
                <div className="h-10 bg-[#081520] px-4 flex items-center justify-between border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#EF4444] inline-block shadow-xs" />
                    <span className="w-3 h-3 rounded-full bg-[#F59E0B] inline-block shadow-xs" />
                    <span className="w-3 h-3 rounded-full bg-[#10B981] inline-block shadow-xs" />
                  </div>
                  <div className="text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#3BB48C]" />
                    mlite — zsh — 80x24
                  </div>
                  <div className="w-12 text-right">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#3BB48C] animate-pulse" />
                  </div>
                </div>

                {/* Interactive Workflow Tab Selector */}
                <div className="bg-[#0A1926] px-4 py-2 border-b border-slate-800/60 flex items-center gap-2 text-xs font-mono">
                  <button
                    onClick={() => setActiveTab("deploy")}
                    className={`px-3 py-1 rounded-md transition cursor-pointer font-bold ${activeTab === "deploy"
                      ? "bg-[#3BB48C]/20 text-[#3BB48C] border border-[#3BB48C]/40"
                      : "text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    1. CLI Deploy
                  </button>
                  <button
                    onClick={() => setActiveTab("drift")}
                    className={`px-3 py-1 rounded-md transition cursor-pointer font-bold ${activeTab === "drift"
                      ? "bg-[#3BB48C]/20 text-[#3BB48C] border border-[#3BB48C]/40"
                      : "text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    2. Drift Detection
                  </button>
                  <button
                    onClick={() => setActiveTab("curl")}
                    className={`px-3 py-1 rounded-md transition cursor-pointer font-bold ${activeTab === "curl"
                      ? "bg-[#3BB48C]/20 text-[#3BB48C] border border-[#3BB48C]/40"
                      : "text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    3. Inference Curl
                  </button>
                </div>

                {/* Terminal Screen Body */}
                <div className="p-5 font-mono text-xs leading-relaxed min-h-[330px] flex flex-col justify-between text-slate-200">
                  {activeTab === "deploy" && (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[#3BB48C] font-bold">&gt; mlops init fraud-detection</span>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          Creating repository structure with DVC and MLflow tracking...
                        </div>
                      </div>

                      <div>
                        <span className="text-[#3BB48C] font-bold">&gt; mlops deploy model --name fraud-detector</span>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          Deploying to container runtime: mlite-serving-fraud-detector
                        </div>
                      </div>

                      <div className="bg-[#07131D] p-3 rounded-lg border border-slate-800/80 space-y-1 text-[11px]">
                        <div className="text-emerald-400 font-semibold">[2026-09-19 19:12:04] Logging deployment started</div>
                        <div className="text-slate-300">[2026-09-19 19:12:05] Node allocation: active (port 8001)</div>
                        <div className="text-emerald-400 font-semibold">[2026-09-19 19:12:05] Model weights: verified SHA-256 (4f8b9e...)</div>
                        <div className="text-slate-300">[2026-09-19 19:12:06] Health check: 200 OK (latency: 18ms)</div>
                        <div className="text-[#3BB48C] font-bold">[2026-09-19 19:12:06] Status: Successfully started &amp; serving</div>
                      </div>
                    </div>
                  )}

                  {activeTab === "drift" && (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[#3BB48C] font-bold">&gt; mlite monitor drift --model fraud-detector</span>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          Running Evidently AI Kolmogorov-Smirnov statistical tests...
                        </div>
                      </div>

                      <div className="bg-[#07131D] p-3 rounded-lg border border-slate-800/80 space-y-1 text-[11px]">
                        <div className="text-emerald-400">[TEST] Feature &#39;amount&#39;: p-val = 0.842 (No Drift)</div>
                        <div className="text-emerald-400">[TEST] Feature &#39;user_score&#39;: p-val = 0.618 (No Drift)</div>
                        <div className="text-amber-400 font-semibold">[DRIFT] Feature &#39;device_trust&#39;: p-val = 0.018 (Drift detected)</div>
                        <div className="text-sky-300 font-semibold mt-1">[ALERT] Webhook dispatched to Slack #ml-alerts</div>
                        <div className="text-[#3BB48C] font-bold">[SAFETY] Automated zero-downtime rollback ready</div>
                      </div>
                    </div>
                  )}

                  {activeTab === "curl" && (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[#3BB48C] font-bold">&gt; curl -X POST http://localhost:8001/predict \</span>
                        <div className="text-slate-400 text-[11px] pl-3">
                          -H &quot;Content-Type: application/json&quot; \<br />
                          -d &#39;&#123;&quot;features&quot;: [0.42, 128.5, 0.9]&#125;&#39;
                        </div>
                      </div>

                      <div className="bg-[#07131D] p-3 rounded-lg border border-slate-800/80 space-y-1 text-[11px]">
                        <div className="text-emerald-400">&#123;</div>
                        <div className="text-slate-300 pl-3">&quot;prediction&quot;: [0.082],</div>
                        <div className="text-slate-300 pl-3">&quot;decision&quot;: &quot;APPROVE&quot;,</div>
                        <div className="text-teal-300 pl-3">&quot;inference_ms&quot;: 14.8,</div>
                        <div className="text-[#3BB48C] pl-3 font-bold">&quot;status&quot;: &quot;HEALTHY&quot;</div>
                        <div className="text-emerald-400">&#125;</div>
                      </div>
                    </div>
                  )}

                  {/* Active prompt indicator */}
                  <div className="flex items-center gap-2 pt-2 text-[#3BB48C] font-bold">
                    <span>$</span>
                    <span className="w-2 h-4 bg-[#3BB48C] animate-pulse inline-block" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lifecycle Strip ── */}
      <section className="py-10 border-b border-slate-100 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
            Autonomous Machine Learning Lifecycle Pipeline
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
            {[
              { title: "Data Lineage", desc: "DVC + MinIO S3", icon: Database },
              { title: "Experimentation", desc: "Native MLflow", icon: Boxes },
              { title: "Model Registry", desc: "Stages & Signatures", icon: ShieldCheck },
              { title: "Docker Serving", desc: "Sub-50ms Runtime", icon: Server },
              { title: "Drift Guard", desc: "Evidently AI", icon: LineChart },
              { title: "Smart Alerts", desc: "Webhooks & Slack", icon: Radio },
              { title: "Auto-Rollback", desc: "Zero Downtime", icon: RotateCcw },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  ref={addRevealRef}
                  className={`p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-[#3BB48C]/50 hover:shadow-md transition-all group opacity-0 delay-${(idx + 1) * 100}`}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <Icon className="w-4 h-4 mx-auto text-[#3BB48C] mb-1.5 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-bold text-slate-800">{item.title}</div>
                  <div className="text-[11px] text-[#1A7456] font-semibold mt-0.5">{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features Grid with Dynamic Hover & Category Filter ── */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold text-[#3BB48C] uppercase tracking-wider bg-[#EBF8F4] px-3.5 py-1 rounded-full border border-[#BCE9DA]">
            Enterprise Capabilities
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Everything You Need to Run Models in Production
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
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
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${activeCategory === tab.id
                  ? "bg-[#3BB48C] text-white shadow-md shadow-[#3BB48C]/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Cards Grid with Scroll-Reveal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredFeatures.map((f, i) => {
            const Icon = f.icon;
            const delayClass = `delay-${(i + 1) * 100}`;
            return (
              <div
                key={`${activeCategory}-${i}`}
                ref={addRevealRef}
                className={`group relative overflow-hidden p-7 rounded-2xl bg-white border border-slate-200 hover:border-[#3BB48C] hover:-translate-y-2 hover:shadow-xl hover:shadow-[#3BB48C]/15 transition-all duration-300 flex flex-col justify-between opacity-0 ${delayClass}`}
              >
                {/* Subtle top indicator bar on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#3BB48C]/0 to-transparent group-hover:via-[#3BB48C] transition-all duration-500" />

                <div>
                  <div className="flex items-center justify-between mb-5">
                    {/* Natural, vibrant icon */}
                    <div
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-xs ${f.iconColor}`}
                    >
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
                      {f.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 mb-2 group-hover:text-slate-950 transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-[#3BB48C] group-hover:translate-x-1 transition-transform">
                  <span>Explore module</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Architecture & Stack Blueprint ── */}
      <section id="architecture" className="py-20 bg-[#F8FAFC] border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#3BB48C] uppercase tracking-wider bg-[#EBF8F4] px-3.5 py-1 rounded-full border border-[#BCE9DA]">
              Production Architecture
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Self-Hosted Stack. Zero Black Boxes.
            </h2>
            <p className="text-slate-600 text-sm">
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
              },
              {
                title: "MinIO S3",
                role: "Object Storage",
                desc: "S3-compatible bucket storage for raw datasets, model weights, and drift baseline distributions.",
                icon: HardDrive,
              },
              {
                title: "Docker Compose",
                role: "Container Orchestrator",
                desc: "Zero-dependency single-command orchestration across VPS, bare-metal, or on-prem servers.",
                icon: Server,
              },
              {
                title: "FastAPI Async",
                role: "High-Speed REST Core",
                desc: "Sub-millisecond routing, OpenAPI/Swagger generation, and built-in security headers.",
                icon: Zap,
              },
            ].map((arch, idx) => {
              const Icon = arch.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-[#3BB48C]/60 hover:shadow-lg transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#EBF8F4] border border-[#BCE9DA] flex items-center justify-center text-[#1A7456] mb-4">
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="text-xs font-mono font-bold text-[#3BB48C] uppercase">{arch.role}</div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5 mb-2">{arch.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{arch.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3-Step Workflow Section ── */}
      <section id="workflow" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#3BB48C] uppercase tracking-wider bg-[#EBF8F4] px-3.5 py-1 rounded-full border border-[#BCE9DA]">
              Developer Workflow
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              From Raw Code to Live Serving in 3 Commands
            </h2>
            <p className="text-slate-600 text-sm">
              Seamlessly integrates into any Python, Scikit-Learn, PyTorch, or XGBoost modeling pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {steps.map((s, idx) => (
              <div
                key={idx}
                className="bg-[#F8FAFC] p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-[#3BB48C] hover:bg-white hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-[#3BB48C] font-mono">{s.step}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step {idx + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{s.title}</h3>
                <div className="p-3 bg-[#0D1F2D] rounded-xl text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800">
                  <span className="text-[#3BB48C] font-bold">$</span> {s.code}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA Banner (Frameless Logo) ── */}
      <section className="py-20 bg-[#F8FAFC] border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-tr from-[#EBF8F4] via-[#F0FDF9] to-white border border-[#BCE9DA] shadow-xl text-center space-y-6 relative overflow-hidden">
            {/* White squircle framed logo */}
            <div className="w-16 h-16 mx-auto bg-slate-50/90 rounded-2xl p-3 shadow-sm border border-slate-200/90 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="MLite"
                className="w-full h-full object-contain select-none"
              />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Ready to Take Full Control of Your MLOps Stack?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
              Launch the interactive web dashboard or run the CLI to register models, spawn serving endpoints, and monitor statistical drift right now.
            </p>
            <div className="pt-2">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-extrabold text-base transition shadow-xl shadow-[#3BB48C]/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                Launch Dashboard Console <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Enterprise Dark Footer with Official Brand Palette & Complete Logo ── */}
      <footer className="bg-slate-900 text-slate-400 pt-16 pb-12 border-t border-slate-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          {/* Main Footer Grid (5 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80">
            {/* Column 1: Brand & Complete Real Logo (Col Span 4) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-3">
                {/* Complete Real Logo in crisp light tile */}
                <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
                  <img src="/logo.png" alt="MLite Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-display font-black text-white text-2xl tracking-tight">MLite</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-[#3BB48C] border border-emerald-800">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pr-6">
                Lightweight, open-source MLOps platform engineered for teams who demand complete data sovereignty,
                sub-50ms Docker serving, and automated drift protection without cloud vendor lock-in.
              </p>
            </div>

            {/* Column 2: Platform Engine (Col Span 2) */}
            <div className="lg:col-span-2 space-y-3 text-xs">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Platform</div>
              <ul className="space-y-2">
                <li><Link to="/app/models" className="hover:text-[#3BB48C] transition">Model Registry</Link></li>
                <li><Link to="/app/deployments" className="hover:text-[#3BB48C] transition">Container Serving</Link></li>
                <li><Link to="/app/monitoring" className="hover:text-[#3BB48C] transition">Drift Monitoring</Link></li>
                <li><Link to="/app/monitoring" className="hover:text-[#3BB48C] transition">Auto-Rollback</Link></li>
                <li><Link to="/app/alerts" className="hover:text-[#3BB48C] transition">Smart Alerting</Link></li>
                <li><Link to="/app/datasets" className="hover:text-[#3BB48C] transition">Dataset Lineage</Link></li>
              </ul>
            </div>

            {/* Column 3: Architecture & Core (Col Span 2) */}
            <div className="lg:col-span-2 space-y-3 text-xs">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Architecture</div>
              <ul className="space-y-2">
                <li><span className="text-slate-300 font-medium">FastAPI</span> Async Core</li>
                <li><span className="text-slate-300 font-medium">PostgreSQL 16</span> Store</li>
                <li><span className="text-slate-300 font-medium">MinIO S3</span> Buckets</li>
                <li><span className="text-slate-300 font-medium">MLflow 2.15</span> Server</li>
                <li><span className="text-slate-300 font-medium">Docker</span> Containers</li>
                <li><span className="text-slate-300 font-medium">Evidently AI</span> Stats</li>
              </ul>
            </div>

            {/* Column 4: Developers & Docs (Col Span 2) */}
            <div className="lg:col-span-2 space-y-3 text-xs">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Developers</div>
              <ul className="space-y-2">
                <li>
                  <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:text-[#3BB48C] transition flex items-center gap-1">
                    Swagger API <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                </li>
                <li>
                  <a href="http://localhost:8000/redoc" target="_blank" rel="noreferrer" className="hover:text-[#3BB48C] transition flex items-center gap-1">
                    ReDoc Spec <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                </li>
                <li>
                  <a href="https://github.com/Youssef-Laaroussi/MLOpsLite" target="_blank" rel="noreferrer" className="hover:text-[#3BB48C] transition flex items-center gap-1">
                    GitHub Repo <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                </li>
                <li>
                  <a href="http://localhost:5000" target="_blank" rel="noreferrer" className="hover:text-[#3BB48C] transition flex items-center gap-1">
                    MLflow UI <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                </li>
                <li>
                  <a href="http://localhost:9001" target="_blank" rel="noreferrer" className="hover:text-[#3BB48C] transition flex items-center gap-1">
                    MinIO Console <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 5: Security & Compliance (Col Span 2) */}
            <div className="lg:col-span-2 space-y-3 text-xs">
              <div className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#3BB48C]" />
                Security
              </div>
              <ul className="space-y-2">
                <li className="text-slate-300">Air-Gapped Ready</li>
                <li className="text-slate-300">RBAC Token Auth</li>
                <li className="text-slate-300">Container Sandbox</li>
                <li className="text-slate-300">SHA-256 Checksums</li>
                <li className="text-slate-300">Security Headers</li>
                <li className="text-slate-300">Audit Trail Active</li>
              </ul>
            </div>
          </div>

          {/* ── Giant Outline Watermark with Complete Real Logo (LangChain Inspired with Brand Colors) ── */}
          <div className="w-full my-10 pt-4 pb-2 flex items-center justify-between gap-6 sm:gap-10 select-none pointer-events-none overflow-hidden">
            {/* Complete Real Logo - clearly visible */}
            <div className="flex items-center gap-4 shrink-0">
              <img
                src="/logo.png"
                alt="MLite Logo"
                className="h-20 sm:h-28 md:h-36 w-auto object-contain select-none drop-shadow-lg"
              />
            </div>

            {/* Giant Outlined Typography Wordmark in Brand Emerald */}
            <span
              className="font-display font-black text-[13vw] leading-none tracking-tighter text-transparent select-none whitespace-nowrap"
              style={{
                WebkitTextStroke: "2px rgba(59, 180, 140, 0.32)",
              }}
            >
              MLite
            </span>
          </div>

          {/* Sub-Footer Bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span>© 2026 MLite Project. Created by Youssef Laaroussi.</span>
              <span>•</span>
              <span className="text-slate-300">Apache 2.0 Open Source License</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://github.com/Youssef-Laaroussi/MLOpsLite/blob/dev/SECURITY.md" target="_blank" rel="noreferrer" className="hover:text-white transition">
                Security Policy
              </a>
              <a href="https://github.com/Youssef-Laaroussi/MLOpsLite" target="_blank" rel="noreferrer" className="hover:text-white transition">
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
