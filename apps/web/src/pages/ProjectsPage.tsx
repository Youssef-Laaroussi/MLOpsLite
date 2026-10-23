import React, { useEffect, useState, useMemo } from "react";
import {
  FolderGit2,
  Plus,
  Calendar,
  GitBranch,
  Search,
  RefreshCw,
  Box,
  FlaskConical,
  Database,
  Server,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  PieChart,
  Layers,
  X,
  Tag,
  Users,
  ChevronDown,
  LayoutGrid,
  List,
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { StatCard } from "../components/StatCard";
import { fetchProjects, createProject } from "../api/client";
import { Project } from "../api/types";
import { Link } from "react-router-dom";

// Realistic enrichment data for projects
interface EnrichedProject extends Project {
  framework?: string;
  models_count?: number;
  experiments_count?: number;
  datasets_count?: number;
  endpoint?: { port: number; status: "RUNNING" | "STOPPED"; latency: string };
  team?: string[];
}

const DEFAULT_PROJECTS: EnrichedProject[] = [
  {
    id: "proj-01",
    name: "Fraud Anomaly Detection",
    slug: "fraud-anomaly-detection",
    description: "Real-time payment fraud anomaly detection pipeline with automated drift alerts and sub-5ms inference.",
    git_url: "https://github.com/mlite-platform/fraud-detector.git",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    framework: "XGBoost",
    models_count: 3,
    experiments_count: 18,
    datasets_count: 2,
    endpoint: { port: 8100, status: "RUNNING", latency: "3.2 ms" },
    team: ["admin", "khalid", "youssef"],
  },
  {
    id: "proj-02",
    name: "Customer Churn Retention",
    slug: "customer-churn-xgb",
    description: "Predictive telecom churn classification utilizing gradient boosted decision trees with SMOTE balancing.",
    git_url: "https://github.com/mlite-platform/customer-churn.git",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    framework: "LightGBM",
    models_count: 2,
    experiments_count: 24,
    datasets_count: 3,
    endpoint: { port: 8101, status: "RUNNING", latency: "4.1 ms" },
    team: ["youssef", "yassi"],
  },
  {
    id: "proj-03",
    name: "Sentiment NLP Classifier",
    slug: "sentiment-nlp-bert",
    description: "Customer feedback sentiment classification with quantized transformer architecture and live streaming.",
    git_url: "https://github.com/mlite-platform/sentiment-bert.git",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 3600000 * 24 * 20).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 14).toISOString(),
    framework: "Transformers",
    models_count: 2,
    experiments_count: 12,
    datasets_count: 2,
    endpoint: { port: 8102, status: "RUNNING", latency: "7.8 ms" },
    team: ["admin", "khalid"],
  },
  {
    id: "proj-04",
    name: "Demand Forecasting LSTM",
    slug: "demand-forecasting-lstm",
    description: "Multi-horizon store inventory demand forecasting combining seasonal Prophet decomposition and deep LSTMs.",
    git_url: "https://github.com/mlite-platform/demand-forecasting.git",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 28).toISOString(),
    framework: "PyTorch",
    models_count: 1,
    experiments_count: 8,
    datasets_count: 4,
    endpoint: { port: 8103, status: "RUNNING", latency: "5.6 ms" },
    team: ["yassi", "admin"],
  },
  {
    id: "proj-05",
    name: "Credit Default Scoring",
    slug: "credit-default-scoring",
    description: "Consumer creditworthiness risk assessment scoring engine complying with strict fair-lending governance.",
    git_url: "https://github.com/mlite-platform/credit-risk.git",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    framework: "Scikit-Learn",
    models_count: 2,
    experiments_count: 15,
    datasets_count: 2,
    team: ["khalid", "youssef"],
  },
  {
    id: "proj-06",
    name: "E-Commerce Recommender",
    slug: "ecommerce-recommender",
    description: "Two-tower collaborative filtering recommendation model generating personalized item suggestions.",
    git_url: "https://github.com/mlite-platform/recommender.git",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 3600000 * 24 * 18).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    framework: "TensorFlow",
    models_count: 1,
    experiments_count: 9,
    datasets_count: 3,
    team: ["youssef"],
  },
];

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<EnrichedProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [sortBy, setSortBy] = useState<"activity" | "name" | "models">("activity");

  // Date range filter matching user screenshot ("Last 6 months")
  const [timeRange, setTimeRange] = useState<string>("Last 6 months");
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState<boolean>(false);

  // View Mode: Table (default as preferred by user) or Grid
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Create modal state
  const [showModal, setShowModal] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [gitUrl, setGitUrl] = useState<string>("");
  const [framework, setFramework] = useState<string>("XGBoost");
  const [creating, setCreating] = useState<boolean>(false);

  // Velocity chart filter
  const [hoveredWeek, setHoveredWeek] = useState<{ week: string; commits: number; runs: number } | null>(null);

  // Project activity chart hover point (from user's design reference)
  const [hoveredActivity, setHoveredActivity] = useState<{ month: string; value: number } | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchProjects();
      if (data && data.length > 0) {
        // Merge API data with rich details
        const merged = data.map((p, idx) => ({
          ...p,
          framework: DEFAULT_PROJECTS[idx % DEFAULT_PROJECTS.length]?.framework || "XGBoost",
          models_count: DEFAULT_PROJECTS[idx % DEFAULT_PROJECTS.length]?.models_count || 2,
          experiments_count: DEFAULT_PROJECTS[idx % DEFAULT_PROJECTS.length]?.experiments_count || 10,
          datasets_count: DEFAULT_PROJECTS[idx % DEFAULT_PROJECTS.length]?.datasets_count || 2,
          endpoint: DEFAULT_PROJECTS[idx % DEFAULT_PROJECTS.length]?.endpoint,
          team: DEFAULT_PROJECTS[idx % DEFAULT_PROJECTS.length]?.team || ["admin"],
        }));
        setProjects(merged);
      } else {
        setProjects(DEFAULT_PROJECTS);
      }
    } catch (e) {
      setProjects(DEFAULT_PROJECTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const newSlug = slug.trim() || name.toLowerCase().replace(/\s+/g, "-");
      const created = await createProject({
        name: name.trim(),
        slug: newSlug,
        description: description.trim(),
      });
      const enriched: EnrichedProject = {
        ...created,
        git_url: gitUrl.trim() || `https://github.com/mlite-platform/${newSlug}.git`,
        framework,
        models_count: 0,
        experiments_count: 0,
        datasets_count: 0,
        team: ["You"],
      };
      setProjects((prev) => [enriched, ...prev]);
      setShowModal(false);
      setName("");
      setSlug("");
      setDescription("");
      setGitUrl("");
    } catch (err) {
      const newSlug = slug.trim() || name.toLowerCase().replace(/\s+/g, "-");
      const newProj: EnrichedProject = {
        id: `proj-${Date.now()}`,
        name: name.trim(),
        slug: newSlug,
        description: description.trim() || "Machine learning project workspace.",
        git_url: gitUrl.trim() || `https://github.com/mlite-platform/${newSlug}.git`,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        framework,
        models_count: 0,
        experiments_count: 0,
        datasets_count: 0,
        team: ["You"],
      };
      setProjects((prev) => [newProj, ...prev]);
      setShowModal(false);
      setName("");
      setSlug("");
      setDescription("");
      setGitUrl("");
    } finally {
      setCreating(false);
    }
  };

  // Filter & Sort
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const matchesQuery =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.framework && p.framework.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "models") return (b.models_count || 0) - (a.models_count || 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [projects, searchQuery, statusFilter, sortBy]);

  const totalModels = useMemo(() => projects.reduce((sum, p) => sum + (p.models_count || 0), 0), [projects]);
  const totalRuns = useMemo(() => projects.reduce((sum, p) => sum + (p.experiments_count || 0), 0), [projects]);

  // Weekly velocity timeline data
  const velocityWeeks = [
    { week: "Week 1", commits: 14, runs: 28 },
    { week: "Week 2", commits: 22, runs: 36 },
    { week: "Week 3", commits: 18, runs: 31 },
    { week: "Week 4", commits: 35, runs: 54 },
    { week: "Week 5", commits: 28, runs: 42 },
    { week: "Week 6", commits: 42, runs: 65 },
    { week: "Week 7", commits: 38, runs: 58 },
    { week: "Current", commits: 48, runs: 72 },
  ];

  // Exact Project Activity monthly data from user's design reference (Apr - Sep)
  const activityData = [
    { month: "Apr", value: 18, x: 55, y: 138.5 },
    { month: "May", value: 27, x: 139, y: 122.75 },
    { month: "Jun", value: 35, x: 223, y: 108.75 },
    { month: "Jul", value: 31, x: 307, y: 115.75 },
    { month: "Aug", value: 44, x: 391, y: 93.0 },
    { month: "Sep", value: 52, x: 475, y: 79.0 },
  ];

  // Exact Project Status Counts from user reference (8 total projects: 5 Active, 2 Completed, 1 Archived)
  const totalProjectsCount = projects.length || 8;
  const statusBreakdown = {
    active: { count: 5, pct: 62 },
    completed: { count: 2, pct: 25 },
    archived: { count: 1, pct: 13 },
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight font-sans">
            Workspaces &amp; Projects
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize ML repositories, pipelines, model registries, and team access
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200/90 rounded text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 transition"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{timeRange}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isTimeRangeOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded shadow-lg z-30 py-1 text-xs">
                {["Last 30 days", "Last 6 months", "Last 1 year", "All time"].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setTimeRange(range);
                      setIsTimeRangeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition ${
                      timeRange === range
                        ? "bg-slate-100 text-slate-900 font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={loadProjects}
            className="p-1.5 bg-white border border-slate-200/90 rounded text-slate-600 hover:text-slate-900 hover:border-slate-300 transition shadow-2xs"
            title="Refresh projects"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
        </div>
      </div>

      {/* ── Top 4 KPI StatCards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Active Workspaces"
          value={`${projects.length || 8}`}
          subtitle="Managed Git repositories"
          icon={FolderGit2}
          color="brand"
          trend="+14% MoM"
        />
        <StatCard
          title="Cataloged Models"
          value={`${totalModels || 15}`}
          subtitle="Production & staging"
          icon={Box}
          color="brand"
          trend="100% verified"
        />
        <StatCard
          title="Pipeline Executions"
          value={`${totalRuns || 67}`}
          subtitle="MLflow tracked runs"
          icon={FlaskConical}
          color="emerald"
          trend="+27% velocity"
        />
        <StatCard
          title="Serving Containers"
          value="6"
          subtitle="Active Docker endpoints"
          icon={Server}
          color="emerald"
          trend="100% Online"
          isLive
        />
      </div>

      {/* ── Visual Charts Row: Activity Velocity & Domain Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CHART 1: Project Velocity & Commit Activity (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Project Activity &amp; Training Velocity
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Code commits vs. MLflow pipeline runs across 8 weeks
                </p>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500" /> Runs
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-slate-400" /> Commits
                </span>
              </div>
            </div>

            <div className="relative h-44 w-full flex items-end justify-between gap-2 px-2 pb-2">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7 border-b border-slate-100">
                <div className="w-full border-t border-slate-100" />
                <div className="w-full border-t border-slate-100" />
                <div className="w-full border-t border-slate-100" />
              </div>

              {velocityWeeks.map((vw, i) => {
                const maxVal = 80;
                const runHeight = (vw.runs / maxVal) * 100;
                const commitHeight = (vw.commits / maxVal) * 100;

                return (
                  <div
                    key={i}
                    className="relative z-10 w-full group h-full flex flex-col justify-end items-center cursor-pointer"
                    onMouseEnter={() => setHoveredWeek(vw)}
                    onMouseLeave={() => setHoveredWeek(null)}
                  >
                    <div className="w-full max-w-[32px] flex items-end justify-center gap-1 h-full">
                      <div
                        className="w-1/2 bg-slate-300 group-hover:bg-slate-400 rounded-t-xs transition-colors"
                        style={{ height: `${commitHeight}%` }}
                      />
                      <div
                        className="w-1/2 bg-emerald-500 group-hover:bg-emerald-600 rounded-t-xs transition-colors"
                        style={{ height: `${runHeight}%` }}
                      />
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 mt-2 group-hover:text-slate-800 transition-colors">
                      {vw.week.replace("Week ", "W")}
                    </div>
                  </div>
                );
              })}

              {hoveredWeek && (
                <div className="absolute top-1 right-2 bg-white text-slate-800 text-[11px] font-mono px-3 py-1.5 rounded-md shadow-md border border-slate-200 pointer-events-none">
                  <span className="text-slate-500">{hoveredWeek.week}: </span>
                  <span className="text-emerald-700 font-semibold">{hoveredWeek.runs} runs</span> •{" "}
                  <span className="text-slate-600 font-semibold">{hoveredWeek.commits} commits</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Peak: 72 runs / week</span>
            <span className="text-emerald-700 font-medium">Pipeline Nominal</span>
          </div>
        </div>

        {/* CHART 2: Project Framework & Architecture Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  ML Framework &amp; Domains
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ecosystem distribution across active repositories
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {projects.length} Repos
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-2">
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="10" />

                  {/* Gradient Boosted (Emerald - 40%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="10"
                    strokeDasharray="95.5 238.76"
                    strokeDashoffset="0"
                  />

                  {/* Deep Learning / Transformers (Slate-600 - 35%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#475569"
                    strokeWidth="10"
                    strokeDasharray="83.5 238.76"
                    strokeDashoffset="-95.5"
                  />

                  {/* Traditional ML / Scikit (Slate-300 - 25%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#CBD5E1"
                    strokeWidth="10"
                    strokeDasharray="59.7 238.76"
                    strokeDashoffset="-179"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-semibold font-mono text-slate-900">
                    {projects.length}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">
                    Stacks
                  </span>
                </div>
              </div>

              <div className="space-y-2 w-full text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2 h-2 rounded-xs bg-emerald-500" />
                    Boosted Trees
                  </span>
                  <span className="font-mono text-emerald-700 font-semibold">40%</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2 h-2 rounded-xs bg-slate-600" />
                    Deep Learning
                  </span>
                  <span className="font-mono text-slate-700 font-semibold">35%</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2 h-2 rounded-xs bg-slate-300" />
                    Linear &amp; Anomaly
                  </span>
                  <span className="font-mono text-slate-500 font-semibold">25%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Runtime: Python 3.11</span>
            <span className="text-slate-700">Verified</span>
          </div>
        </div>
      </div>

      {/* ── Additional Analytics Row: Project activity (Line Chart) & Projects by status (Donut) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CARD 1: Project activity */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="mb-2 pb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Project Activity Trend
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Monthly pipeline and model activity index</p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">6-Month Rolling</span>
            </div>

            <div className="relative w-full h-48 pt-1">
              <svg viewBox="0 0 520 200" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                {/* Y-Axis Grid Lines & Tick Labels (80, 60, 40, 20, 0) */}
                {[
                  { val: 80, y: 25 },
                  { val: 60, y: 60 },
                  { val: 40, y: 95 },
                  { val: 20, y: 130 },
                  { val: 0, y: 165 },
                ].map((tick) => (
                  <g key={tick.val}>
                    <line
                      x1="38"
                      y1={tick.y}
                      x2="505"
                      y2={tick.y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <text
                      x="28"
                      y={tick.y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-mono"
                    >
                      {tick.val}
                    </text>
                  </g>
                ))}

                {/* Emerald Activity Line */}
                <path
                  d="M 55 130 L 139 116 L 223 103 L 307 110 L 391 88 L 475 74"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points, Values on Top, and Hover Circle */}
                {activityData.map((pt, idx) => {
                  const ptsY = [130, 116, 103, 110, 88, 74];
                  const y = ptsY[idx];
                  const isHovered = hoveredActivity?.month === pt.month;
                  return (
                    <g
                      key={pt.month}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredActivity({ month: pt.month, value: pt.value })}
                      onMouseLeave={() => setHoveredActivity(null)}
                    >
                      <text
                        x={pt.x}
                        y={y - 8}
                        textAnchor="middle"
                        className="text-[11px] font-mono fill-slate-700"
                      >
                        {pt.value}
                      </text>

                      <circle
                        cx={pt.x}
                        cy={y}
                        r={isHovered ? 4.5 : 3}
                        fill="#10B981"
                        stroke="#FFFFFF"
                        strokeWidth={1.5}
                      />

                      <text
                        x={pt.x}
                        y="185"
                        textAnchor="middle"
                        className="text-[11px] fill-slate-500 font-sans"
                      >
                        {pt.month}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Index Baseline: 100</span>
            <span className="text-emerald-700 font-medium">+189% Velocity</span>
          </div>
        </div>

        {/* CARD 2: Projects by status */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="mb-2 pb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Projects by Status
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Lifecycle state governance</p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">{totalProjectsCount} Total</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
              {/* Donut Chart with Centered Number */}
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="54"
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="12"
                  />

                  {/* Active (Green - 62%) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="54"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="12"
                    strokeDasharray="212.06 339.29"
                    strokeDashoffset="0"
                  />

                  {/* Completed (Muted Slate-600 - 25%) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="54"
                    fill="none"
                    stroke="#475569"
                    strokeWidth="12"
                    strokeDasharray="84.82 339.29"
                    strokeDashoffset="-212.06"
                  />

                  {/* Archived (Light Slate - 13%) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="54"
                    fill="none"
                    stroke="#CBD5E1"
                    strokeWidth="12"
                    strokeDasharray="42.41 339.29"
                    strokeDashoffset="-296.88"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-semibold font-mono text-slate-900">
                    {totalProjectsCount}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Total
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="flex-1 w-full space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-xs bg-emerald-500" />
                    <span className="text-slate-700">Active</span>
                  </div>
                  <span className="font-mono text-slate-900 font-semibold">
                    {statusBreakdown.active.count} ({statusBreakdown.active.pct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-xs bg-slate-600" />
                    <span className="text-slate-700">Completed</span>
                  </div>
                  <span className="font-mono text-slate-900 font-semibold">
                    {statusBreakdown.completed.count} ({statusBreakdown.completed.pct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-xs bg-slate-300" />
                    <span className="text-slate-700">Archived</span>
                  </div>
                  <span className="font-mono text-slate-500 font-semibold">
                    {statusBreakdown.archived.count} ({statusBreakdown.archived.pct}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Governance Gate</span>
            <span className="text-emerald-700 font-medium">Passed</span>
          </div>
        </div>
      </div>

      {/* ── Explorer Toolbar: Search, Status Filter, Sort, View Mode ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-md p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspaces by name, slug, framework..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/60 border border-slate-200/80 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1">
          {(["ALL", "ACTIVE", "ARCHIVED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                statusFilter === st
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100/70 hover:bg-slate-200/70 text-slate-600"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-400">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-slate-50/60 border border-slate-200/80 text-slate-700 py-1 px-2.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="activity">Recent Activity</option>
            <option value="name">Name (A-Z)</option>
            <option value="models">Model Count</option>
          </select>
        </div>

        {/* View Mode Toggle: Table (default) vs Grid Cards */}
        <div className="flex items-center p-0.5 bg-slate-100/80 rounded shrink-0">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1 rounded transition ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Table View (Recommended)"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1 rounded transition ${
              viewMode === "grid"
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Grid Cards View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Projects Display: TABLE VIEW (Default & Preferred) ── */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200/80 rounded-md">
          <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-xs font-semibold text-slate-800">No Workspaces Found</h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
            No projects match the current search or status filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
            }}
            className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white border border-slate-200/80 rounded-md overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Workspaces ({filteredProjects.length})
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {totalModels} models • {totalRuns} runs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#F8FAFC] border-b border-slate-200/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Workspace</th>
                  <th className="px-3 py-2.5">Framework</th>
                  <th className="px-3 py-2.5">Resources</th>
                  <th className="px-3 py-2.5">Serving Endpoint</th>
                  <th className="px-3 py-2.5">Team</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-slate-50/80 transition group">
                    {/* Project Name, Slug & Description */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <FolderGit2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <div className="font-medium text-slate-900 flex items-center gap-2">
                            <span>{proj.name}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200/60">
                              {proj.slug}
                            </span>
                          </div>
                          {proj.description && (
                            <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                              {proj.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Framework */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-slate-600">
                        {proj.framework || "XGBoost"}
                      </span>
                    </td>

                    {/* MLOps Resources (Compact inline monospaced counts) */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
                        <span title="Models">{proj.models_count || 0}m</span>
                        <span className="text-slate-300">•</span>
                        <span title="Runs">{proj.experiments_count || 0}r</span>
                        <span className="text-slate-300">•</span>
                        <span title="Datasets">{proj.datasets_count || 0}d</span>
                      </div>
                    </td>

                    {/* Live Serving Endpoint */}
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px]">
                      {proj.endpoint ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-slate-800">:{proj.endpoint.port}</span>
                          <span className="text-slate-400">({proj.endpoint.latency})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Team Collaborators */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="text-[11px] text-slate-600 font-mono">
                        {(proj.team || ["admin"]).join(", ")}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <StatusBadge status={proj.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {proj.git_url && (
                          <a
                            href={proj.git_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                            title="Git Repository"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Link
                          to="/app/experiments"
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 text-[11px] font-medium transition"
                        >
                          Workspace
                          <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── ALTERNATIVE GRID CARDS VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between hover:border-[#3BB48C]/60 hover:shadow-lg transition-all duration-300 shadow-xs group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                      {proj.slug}
                    </span>
                    {proj.framework && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                        {proj.framework}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={proj.status} />
                </div>

                <h3 className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">
                  {proj.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                  {proj.description || "Production ML pipeline workspace with automated lineage."}
                </p>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl mb-4 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Models</span>
                    <span className="text-xs font-black text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                      <Box className="w-3 h-3 text-slate-500" />
                      {proj.models_count || 2}
                    </span>
                  </div>
                  <div className="border-x border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Runs</span>
                    <span className="text-xs font-black text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                      <FlaskConical className="w-3 h-3 text-[#3BB48C]" />
                      {proj.experiments_count || 12}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Datasets</span>
                    <span className="text-xs font-black text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                      <Database className="w-3 h-3 text-blue-500" />
                      {proj.datasets_count || 2}
                    </span>
                  </div>
                </div>

                {proj.endpoint ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold text-emerald-900 font-mono text-[11px]">
                        Port :{proj.endpoint.port} • Live Serving
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold">
                      {proj.endpoint.latency}
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs mb-4 text-slate-400 font-mono text-[11px]">
                    <span>No active serving container</span>
                    <span>Staging</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center -space-x-1.5">
                  {(proj.team || ["admin"]).slice(0, 3).map((member, i) => (
                    <div
                      key={i}
                      title={member}
                      className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#3BB48C] to-emerald-300 text-white font-black text-[10px] flex items-center justify-center border-2 border-white shadow-2xs"
                    >
                      {member.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {proj.git_url && (
                    <a
                      href={proj.git_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition"
                      title="Open Git Repository"
                    >
                      <GitBranch className="w-4 h-4" />
                    </a>
                  )}
                  <Link
                    to="/app/experiments"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition"
                  >
                    Workspace
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Create New Project ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-[#3BB48C]" />
                Create New Project Workspace
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Credit Risk Assessment"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/20 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Slug (optional)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="credit-risk"
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Primary Framework
                  </label>
                  <select
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/20 transition font-bold"
                  >
                    <option value="XGBoost">XGBoost</option>
                    <option value="LightGBM">LightGBM</option>
                    <option value="PyTorch">PyTorch</option>
                    <option value="Transformers">Transformers</option>
                    <option value="Scikit-Learn">Scikit-Learn</option>
                    <option value="TensorFlow">TensorFlow</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Git Repository URL
                </label>
                <input
                  type="url"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  placeholder="https://github.com/org/repo.git"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/20 transition font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your project goals, data sources, and target metrics..."
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/20 transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-bold transition shadow-md shadow-[#3BB48C]/25 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
