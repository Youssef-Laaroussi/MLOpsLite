import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Mail,
  MessageSquare,
  Send,
  Heart,
  Star,
  ChevronDown,
  HelpCircle,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [activeTab, setActiveTab] = useState<"deploy" | "drift" | "curl">("deploy");
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [mouseCoord, setMouseCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Contact Us Form State
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTopic, setContactTopic] = useState("feedback");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqItems = [
    {
      q: "What is MLite and how is it different from cloud MLOps platforms?",
      a: "MLite is a 100% self-hosted, open-source MLOps platform. Unlike AWS SageMaker or GCP Vertex AI, MLite has zero vendor lock-in and zero per-model egress fees. You run PostgreSQL, MinIO S3 storage, MLflow tracking, and Docker-based container serving directly on your own hardware with complete data sovereignty.",
    },
    {
      q: "Is MLite completely free and open source?",
      a: "Yes! MLite is licensed under the Apache 2.0 open-source license. The core features—model registry, Docker container serving endpoints, and automated drift detection—are free forever for individual developers, research labs, and enterprise teams.",
    },
    {
      q: "How does Docker model serving work in MLite?",
      a: "When you deploy a model version, MLite packages your artifact into an isolated Docker container with an embedded FastAPI web server, live health probes, and automatic port binding. You achieve sub-50ms inference latency without proprietary vendor runtimes.",
    },
    {
      q: "How does MLite monitor data drift and model degradation?",
      a: "MLite runs statistical drift evaluations (Population Stability Index / PSI, Wasserstein distance, KS-tests) powered by Evidently AI. When feature distributions shift between baseline training and live inference, MLite alerts you and can trigger automatic rollback.",
    },
    {
      q: "Can I integrate MLite into my existing CI/CD or Python pipelines?",
      a: "Yes. MLite offers a unified Python client (import mlite), an intuitive terminal CLI (mlite deployments create ...), and fully documented REST OpenAPI endpoints to plug straight into GitHub Actions, Airflow, or Kubeflow.",
    },
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail.trim() || !contactMessage.trim()) return;
    setContactLoading(true);
    setTimeout(() => {
      setContactLoading(false);
      setContactSubmitted(true);
    }, 600);
  };

  const handleCardMouseMove = (index: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredCard(index);
    setMouseCoord({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };
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
      title: "Data Versioning & Lineage",
      desc: "Track every dataset evolution with cryptographic integrity and local MinIO S3 sync. Complete reproducibility without cloud storage fees.",
      path: "/app/datasets",
    },
    {
      category: "pipeline",
      icon: Boxes,
      iconColor: "text-teal-600 bg-teal-50 border-teal-200",
      title: "Native Experiment Tracking",
      desc: "Full experiment engine tracking metrics, hyperparameter grids, learning curves, and model artifacts directly to PostgreSQL and S3.",
      path: "/app/experiments",
    },
    {
      category: "pipeline",
      icon: ShieldCheck,
      iconColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
      title: "Centralized Model Registry",
      desc: "Enforce strict governance across Development, Staging, and Production stages with input/output signature validation and metadata tracking.",
      path: "/app/models",
    },
    {
      category: "serving",
      icon: Server,
      iconColor: "text-cyan-600 bg-cyan-50 border-cyan-200",
      title: "Isolated Container Serving",
      desc: "Auto-scaffold dedicated Docker serving containers with dynamic port allocation, FastAPI runtime, and sub-second container cold-starts.",
      path: "/app/deployments",
    },
    {
      category: "governance",
      icon: LineChart,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
      title: "Evidently AI Drift Monitoring",
      desc: "Continuous statistical testing detects covariate shift in feature distributions before model degradation impacts production traffic.",
      path: "/app/monitoring",
    },
    {
      category: "governance",
      icon: RotateCcw,
      iconColor: "text-teal-700 bg-teal-50 border-teal-200",
      title: "Automated & Instant Rollback",
      desc: "Configurable drift and error spike triggers automatically switch traffic back to the previous healthy model version with zero service interruption.",
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
            <a href="#faq" className="hover:text-[#3BB48C] transition">FAQ</a>
            <a href="#contact" className="hover:text-[#3BB48C] transition">Contact</a>
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
          </div>
        </div>
      </header>

      {/* ── Hero Section (Sans carrés de grille, vraies couleurs éclatantes et fond image 100% transparent) ── */}
      <section className="relative pt-16 sm:pt-24 lg:pt-28 pb-20 lg:pb-28 overflow-hidden bg-[#F8FAFC] border-b border-slate-100">
        {/* Vraies couleurs éclatantes : Neural Network Plexus supérieur droit sans ternissement */}
        <div className="absolute -top-12 -right-16 w-[38rem] sm:w-[46rem] lg:w-[54rem] pointer-events-none z-0 opacity-100 select-none mix-blend-multiply">
          <img
            src="/neural-plexus.jpg"
            alt=""
            className="w-full h-auto object-contain"
            style={{
              WebkitMaskImage: "radial-gradient(ellipse at 78% 30%, black 60%, transparent 95%)",
              maskImage: "radial-gradient(ellipse at 78% 30%, black 60%, transparent 95%)",
            }}
          />
        </div>

        {/* Vraies couleurs éclatantes : Neural Network Plexus inférieur gauche sans ternissement */}
        <div className="absolute -bottom-16 -left-20 w-[34rem] sm:w-[42rem] lg:w-[48rem] pointer-events-none z-0 opacity-100 select-none mix-blend-multiply transform rotate-180">
          <img
            src="/neural-plexus.jpg"
            alt=""
            className="w-full h-auto object-contain"
            style={{
              WebkitMaskImage: "radial-gradient(ellipse at 70% 35%, black 55%, transparent 95%)",
              maskImage: "radial-gradient(ellipse at 70% 35%, black 55%, transparent 95%)",
            }}
          />
        </div>

        {/* Halo lumineux d'ambiance vif */}
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[40rem] h-[40rem] bg-gradient-to-tr from-[#3BB48C]/20 via-teal-100/30 to-emerald-100/15 rounded-full blur-3xl pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* ── Left Column: Natural, Frameless & Seamless Layout (No Box Border) ── */}
            <div className="lg:col-span-6 flex flex-col items-start gap-6 text-left relative z-20">
              {/* Pill Badge matching Qubly "v3.1 released. Learn more" */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF8F4]/90 backdrop-blur-xs border border-[#BCE9DA] text-[#1A7456] text-xs font-semibold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#3BB48C]" />
                <span>v1.0 Production-Ready</span>
                <span className="text-slate-300">•</span>
                <a href="#features" className="text-[#3BB48C] hover:text-[#1A7456] underline font-bold transition">
                  Learn more
                </a>
              </div>

              {/* Bold High-Contrast Heading */}
              <h1 className="font-sans text-3xl sm:text-4xl lg:text-[2.85rem] font-extrabold text-slate-900 leading-[1.18] tracking-tight">
                Modern MLOps <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1A7456] via-[#3BB48C] to-teal-600">
                  Infrastructure, Self-Hosted
                </span>
              </h1>

              {/* Crystal Clear Subtitle */}
              <p className="text-base text-slate-700 max-w-lg leading-relaxed font-normal">
                Track experiments, deploy low-latency Docker containers in sub-50ms, and detect statistical data drift — on your own servers.
              </p>

              {/* Action Buttons (Qubly Rounded Pill Style) */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  to="/app"
                  className="px-7 py-3.5 rounded-full bg-[#3BB48C] hover:bg-[#2FA07B] text-white font-bold text-sm transition-all shadow-md shadow-[#3BB48C]/25 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                  Start free console <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 hover:border-slate-300 shadow-xs transition flex items-center gap-2"
                >
                  Learn More
                </a>
              </div>

              {/* Minimalist, Clean Quickstart Command Bar */}
              <div className="pt-2 w-full max-w-md">
                <div className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 text-xs font-mono shadow-sm">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Terminal className="w-3.5 h-3.5 text-[#3BB48C] shrink-0" />
                    <span className="text-[#3BB48C] font-bold select-none">$</span>
                    <span className="text-slate-200 select-all truncate">{installCmd}</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="ml-2 pl-2 border-l border-slate-700 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
                    title="Copy command"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Right Column: Seamless 3D Isometric MLOps Illustration (Abaissée légèrement) ── */}
            <div className="lg:col-span-6 relative flex items-center justify-center pt-6 lg:pt-10 translate-y-3 sm:translate-y-5">
              {/* Soft Ambient Glow */}
              <div className="absolute w-[32rem] h-[32rem] bg-gradient-to-tr from-[#3BB48C]/20 via-teal-100/35 to-emerald-200/15 rounded-full blur-3xl pointer-events-none -z-10" />

              {/* Illustration 3D Isométrique totalement fondue, fond blanc supprimé par mix-blend-multiply et masque doux */}
              <div className="relative w-full max-w-xl group transition-transform duration-500 hover:scale-[1.02]">
                <img
                  src="/hero-isometric.jpg"
                  alt="MLite Real-time MLOps Platform Isometric Illustration"
                  className="w-full h-auto object-contain block select-none mix-blend-multiply"
                  style={{
                    WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, black 65%, transparent 92%)",
                    maskImage: "radial-gradient(ellipse at 50% 50%, black 65%, transparent 92%)",
                  }}
                  loading="eager"
                />
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
      <section id="features" className="py-20 max-w-7xl mx-auto px-6 relative">
        {/* Subtle Decorative Geometry in Features background */}
        <div className="absolute top-10 right-4 w-72 h-72 bg-tensor-dots opacity-30 pointer-events-none -z-10 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
        <div className="absolute bottom-10 left-4 w-80 h-40 bg-diagonal-hatch opacity-40 pointer-events-none -z-10" />

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
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
                  e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
                }}
                className={`group relative overflow-hidden p-7 rounded-2xl bg-white border border-slate-200 hover:border-[#3BB48C]/70 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#3BB48C]/15 transition-all duration-300 flex flex-col justify-between opacity-0 ${delayClass}`}
              >
                {/* Interactive cursor spotlight event on hover */}
                <div
                  className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background:
                      "radial-gradient(400px circle at var(--mouse-x, 150px) var(--mouse-y, 150px), rgba(59,180,140,0.09), transparent 70%)",
                  }}
                />

                {/* Subtle top indicator bar on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#3BB48C]/0 to-transparent group-hover:via-[#3BB48C] transition-all duration-500" />

                <div>
                  <div className="mb-5">
                    {/* Natural, vibrant icon */}
                    <div
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-xs ${f.iconColor}`}
                    >
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
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
      <section id="architecture" className="py-20 bg-[#F8FAFC] border-t border-slate-100 relative bg-mlops-grid">
        <div className="max-w-7xl mx-auto px-6 relative">
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
      <section id="workflow" className="py-20 bg-white border-t border-slate-100 relative">
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-tensor-dots opacity-25 pointer-events-none -z-10 [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]" />

        <div className="max-w-7xl mx-auto px-6 relative">
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

      {/* ── FAQ Section (Interactive Accordion + Updated Male Engineer Illustration) ── */}
      <section id="faq" className="py-24 bg-[#F8FAFC] border-t border-slate-100 relative overflow-hidden bg-mlops-grid">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* Section Heading */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF8F4] border border-[#BCE9DA] text-[#1A7456] text-xs font-bold tracking-wide uppercase">
              <HelpCircle className="w-3.5 h-3.5 text-[#3BB48C]" />
              Frequently Asked Questions
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Got Questions? <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3BB48C] to-[#1E6B52]">We Have Answers</span>
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Everything you need to know about self-hosting, Docker serving, and our 100% open-source MLOps architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left: Illustration with MLOps Tech Context */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-md rounded-3xl overflow-hidden border border-emerald-100/80 shadow-xl bg-white p-3 group transition-transform duration-500 hover:scale-[1.01]">
                {/* Glow backdrop */}
                <div className="absolute -inset-1 bg-gradient-to-tr from-[#3BB48C]/20 to-teal-100/30 rounded-3xl blur-xl pointer-events-none -z-10" />
                <img
                  src="/faq-illustration.jpg"
                  alt="MLite FAQ and Open Source Technical Support"
                  className="w-full h-auto object-contain rounded-2xl select-none"
                />
              </div>
              <div className="mt-6 text-center max-w-sm">
                <p className="text-xs text-slate-500">
                  Still have questions? Check our{" "}
                  <a
                    href="http://localhost:8000/docs"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#3BB48C] font-semibold hover:underline"
                  >
                    API Documentation
                  </a>{" "}
                  or send us a message in the contact form below.
                </p>
              </div>
            </div>

            {/* Right: Expandable Accordion */}
            <div className="lg:col-span-7 space-y-4">
              {faqItems.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                      isOpen
                        ? "bg-white border-[#3BB48C] shadow-lg shadow-[#3BB48C]/5"
                        : "bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full py-5 px-6 flex items-center justify-between text-left gap-4 cursor-pointer select-none"
                    >
                      <span className={`text-base font-bold transition-colors ${isOpen ? "text-slate-900" : "text-slate-700"}`}>
                        {item.q}
                      </span>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isOpen ? "bg-[#EBF8F4] text-[#3BB48C]" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-300 ${
                            isOpen ? "rotate-180 text-[#3BB48C]" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100/80 animate-fadeIn">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact Us & Open-Source Community Section (Split Premium Layout) ── */}
      <section id="contact" className="py-24 bg-white relative overflow-hidden border-t border-slate-100">
        {/* Subtle background ambient gradients */}
        <div className="absolute top-12 left-10 w-96 h-96 bg-[#EBF8F4]/70 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-50/80 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* Section Heading */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF8F4] border border-[#BCE9DA] text-[#1A7456] text-xs font-bold tracking-wide uppercase">
              <Heart className="w-3.5 h-3.5 text-[#3BB48C] fill-[#3BB48C]" />
              Open Source Community & Support
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Get in Touch with the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3BB48C] to-[#1E6B52]">MLite Community</span>
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Have questions about self-hosting, encountered an issue with Docker model serving, or want to contribute to the open-source platform? We're here to help.
            </p>
          </div>

          {/* Premium Split Card (Inspired by reference design: Left Illustration + Right Dark Form) */}
          <div className="relative rounded-3xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-200/60 overflow-hidden">
            {/* Corner organic decorative circular accents matching brand colors */}
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-[#3BB48C]/15 pointer-events-none z-0" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-teal-100/50 pointer-events-none z-0" />

            <div className="grid grid-cols-1 lg:grid-cols-12 relative z-10">
              {/* ── Left Side: Light & Friendly with MLOps Character Illustration ── */}
              <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 bg-gradient-to-br from-white via-[#F8FCFA] to-[#EFFBF6] flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3BB48C] animate-pulse" />
                    <span className="text-xs font-bold font-mono text-[#1A7456] uppercase tracking-wider">
                      Community Driven & 100% Free
                    </span>
                  </div>
                  <h3 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    Contact Us
                  </h3>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    MLite is built for data scientists and engineers who demand sovereignty over their MLOps stack. Share your feedback, report a bug, or ask for architecture advice.
                  </p>
                </div>

                {/* Character Illustration with MLOps Tablet, Exclamation & Question Marks, and Star Rating */}
                <div className="my-8 relative group flex items-center justify-center">
                  <div className="relative max-w-md w-full rounded-2xl overflow-hidden border border-emerald-100/60 shadow-md bg-white p-2">
                    <img
                      src="/contact-illustration.jpg"
                      alt="MLite Open Source Support and Community"
                      className="w-full h-auto object-contain rounded-xl select-none transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </div>
                </div>

                {/* Open Source Channels & Badges */}
                <div className="pt-4 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4 text-slate-700" />
                    <span className="font-semibold text-slate-700">Youssef-Laaroussi/MLOpsLite</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href="https://github.com/Youssef-Laaroussi/MLOpsLite/issues"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#3BB48C] hover:text-[#2E8B6D] font-bold inline-flex items-center gap-1 hover:underline"
                    >
                      GitHub Issues <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-slate-300">•</span>
                    <a
                      href="https://github.com/Youssef-Laaroussi/MLOpsLite"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#3BB48C] hover:text-[#2E8B6D] font-bold inline-flex items-center gap-1 hover:underline"
                    >
                      Star Repo <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* ── Right Side: Dark Rich Panel with High-Contrast Form ── */}
              <div className="lg:col-span-6 bg-[#0F172A] p-8 sm:p-12 lg:p-14 text-white flex flex-col justify-center relative overflow-hidden">
                {/* Decorative dark elements matching the style */}
                <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-[#3BB48C]/10 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-emerald-500/10 pointer-events-none" />
                <div className="absolute top-8 right-8 w-20 h-20 rounded-full bg-slate-800/60 pointer-events-none" />

                <div className="relative z-10 max-w-lg mx-auto w-full">
                  <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[#3BB48C] text-xs font-mono font-medium mb-3">
                      <Mail className="w-3.5 h-3.5" />
                      Direct Maintainer Inbox
                    </div>
                    <h4 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      Send a Message
                    </h4>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                      Fill out the form below. For code patches, PRs or issue tracking, feel free to link your GitHub username.
                    </p>
                  </div>

                  {contactSubmitted ? (
                    <div className="p-8 rounded-2xl bg-slate-800/90 border border-[#3BB48C]/40 text-center space-y-4 animate-fadeIn">
                      <div className="w-14 h-14 mx-auto rounded-full bg-[#3BB48C]/20 border border-[#3BB48C] flex items-center justify-center text-[#3BB48C]">
                        <Check className="w-7 h-7 stroke-[3]" />
                      </div>
                      <h5 className="font-display text-xl font-bold text-white">Message Received!</h5>
                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                        Thank you for reaching out to the MLite open-source maintainers. We appreciate your feedback and will reply to <span className="text-[#3BB48C] font-mono font-semibold">{contactEmail}</span> shortly.
                      </p>
                      <button
                        onClick={() => {
                          setContactSubmitted(false);
                          setContactName("");
                          setContactEmail("");
                          setContactMessage("");
                        }}
                        className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Name
                        </label>
                        <input
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Your Name (or GitHub Handle)"
                          className="w-full px-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/20 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="name@organization.org"
                          className="w-full px-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/20 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Topic / Category
                        </label>
                        <select
                          value={contactTopic}
                          onChange={(e) => setContactTopic(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/20 transition cursor-pointer"
                        >
                          <option value="feedback">Open Source Feedback & Ideas</option>
                          <option value="selfhosted">Self-Hosted Setup & Docker Serving</option>
                          <option value="bug">Bug Report / Anomaly</option>
                          <option value="contribute">Contributing Code / Feature PR</option>
                          <option value="enterprise">Self-Hosted Enterprise Advisory</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Message
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          placeholder="Tell us what you are working on, any questions about MLite, or details about your deployment setup..."
                          className="w-full px-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/20 transition resize-none"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={contactLoading}
                          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] active:bg-[#288365] text-white font-bold text-sm transition shadow-lg shadow-[#3BB48C]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {contactLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <span>Submit Message</span>
                              <Send className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA Banner (Frameless Logo + Plexus Mesh Art) ── */}
      <section className="py-24 bg-[#F8FAFC] border-t border-slate-100 relative bg-mlops-grid overflow-hidden">
        {/* Full-vibrancy Neural Network Plexus on Right (True vibrant colors, unhidden) */}
        <div className="absolute -top-12 -right-10 w-[42rem] sm:w-[48rem] lg:w-[54rem] pointer-events-none z-0 opacity-100 mix-blend-multiply select-none">
          <img
            src="/neural-plexus.jpg"
            alt=""
            className="w-full h-auto object-contain"
            style={{
              WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, black 70%, transparent 98%)",
              maskImage: "radial-gradient(ellipse at 50% 50%, black 70%, transparent 98%)",
            }}
          />
        </div>

        {/* Full-vibrancy Neural Network Plexus on Left (True vibrant colors, unhidden) */}
        <div className="absolute -bottom-14 -left-12 w-[38rem] sm:w-[44rem] lg:w-[50rem] pointer-events-none z-0 opacity-100 mix-blend-multiply select-none transform rotate-180">
          <img
            src="/neural-plexus.jpg"
            alt=""
            className="w-full h-auto object-contain"
            style={{
              WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, black 70%, transparent 98%)",
              maskImage: "radial-gradient(ellipse at 50% 50%, black 70%, transparent 98%)",
            }}
          />
        </div>

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-tr from-[#EBF8F4] via-[#F0FDF9] to-white border border-[#BCE9DA] shadow-xl text-center space-y-6 relative overflow-hidden">
            {/* Ambient vector decorations inside the CTA banner */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-tensor-dots opacity-40 pointer-events-none -z-10" />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-diagonal-hatch opacity-50 pointer-events-none -z-10" />
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
      <footer className="relative bg-slate-900 text-slate-400 pt-16 pb-12 border-t border-slate-800 overflow-hidden">
        {/* Glowing Neural Plexus Watermark in Dark Footer */}
        <div className="absolute top-0 right-0 w-[42rem] h-full pointer-events-none z-0 opacity-15 mix-blend-screen select-none">
          <img
            src="/neural-plexus.jpg"
            alt=""
            className="w-full h-full object-cover object-center invert brightness-125"
            style={{
              WebkitMaskImage: "radial-gradient(ellipse at 80% 20%, black 40%, transparent 90%)",
              maskImage: "radial-gradient(ellipse at 80% 20%, black 40%, transparent 90%)",
            }}
          />
        </div>
        <div className="absolute bottom-0 left-0 w-[36rem] h-full pointer-events-none z-0 opacity-10 mix-blend-screen select-none transform rotate-180">
          <img
            src="/neural-plexus.jpg"
            alt=""
            className="w-full h-full object-cover object-center invert brightness-125"
            style={{
              WebkitMaskImage: "radial-gradient(ellipse at 20% 80%, black 40%, transparent 85%)",
              maskImage: "radial-gradient(ellipse at 20% 80%, black 40%, transparent 85%)",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* Main Footer: Simple & Clean (No multiple columns) */}
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 pb-12 border-b border-slate-800/80">
            {/* Brand & Description */}
            <div className="max-w-md space-y-4">
              <div className="flex items-center gap-3">
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

            {/* Liens simples et clairs */}
            <div className="flex flex-wrap gap-12 sm:gap-16 text-xs">
              {/* Platform */}
              <div className="space-y-3">
                <div className="font-bold text-white uppercase tracking-wider text-[11px]">Platform</div>
                <ul className="space-y-2">
                  <li><Link to="/app/models" className="hover:text-[#3BB48C] transition">Model Registry</Link></li>
                  <li><Link to="/app/deployments" className="hover:text-[#3BB48C] transition">Container Serving</Link></li>
                  <li><Link to="/app/monitoring" className="hover:text-[#3BB48C] transition">Drift Monitoring</Link></li>
                  <li><Link to="/app/alerts" className="hover:text-[#3BB48C] transition">Smart Alerting</Link></li>
                </ul>
              </div>

              {/* Navigation rapide */}
              <div className="space-y-3">
                <div className="font-bold text-white uppercase tracking-wider text-[11px]">Navigation</div>
                <ul className="space-y-2">
                  <li><a href="#features" className="hover:text-[#3BB48C] transition">Features</a></li>
                  <li><a href="#workflow" className="hover:text-[#3BB48C] transition">Workflow</a></li>
                  <li><a href="#architecture" className="hover:text-[#3BB48C] transition">Architecture</a></li>
                  <li><a href="#faq" className="hover:text-[#3BB48C] transition">FAQ / Support</a></li>
                  <li><a href="#contact" className="hover:text-[#3BB48C] transition">Contact & Community</a></li>
                  <li>
                    <a href="https://github.com/Youssef-Laaroussi/MLOpsLite" target="_blank" rel="noreferrer" className="hover:text-[#3BB48C] transition flex items-center gap-1">
                      GitHub Repo <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  </li>
                </ul>
              </div>
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
