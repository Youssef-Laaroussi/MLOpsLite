import React, { useEffect, useState, useMemo } from "react";
import {
  FolderGit2,
  Plus,
  GitBranch,
  Search,
  RefreshCw,
  Box,
  FlaskConical,
  Database,
  Server,
  Activity,
  ArrowUpRight,
  X,
  LayoutGrid,
  List,
  AlertCircle,
  Archive,
  Pencil,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { StatCard } from "../components/StatCard";
import {
  fetchProjects,
  createProject,
  archiveProject,
  updateProject,
  deleteProject,
} from "../api/client";
import { Project } from "../api/types";
import { Link } from "react-router-dom";

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [sortBy, setSortBy] = useState<"activity" | "name" | "models">("activity");

  // View Mode: Table (default as preferred by user) or Grid
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Create modal state
  const [showModal, setShowModal] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [gitUrl, setGitUrl] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Archive action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Velocity chart hover state
  const [hoveredWeek, setHoveredWeek] = useState<{ week: string; count: number } | null>(null);

  // Project activity chart hover point
  const [hoveredActivity, setHoveredActivity] = useState<{ month: string; value: number } | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(data || []);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to load projects from server";
      setError(msg);
      setProjects([]);
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
    setCreateError(null);
    try {
      const payload: { name: string; slug?: string; description?: string; git_url?: string } = {
        name: name.trim(),
      };
      if (slug.trim()) payload.slug = slug.trim().toLowerCase().replace(/\s+/g, "-");
      if (description.trim()) payload.description = description.trim();
      if (gitUrl.trim()) payload.git_url = gitUrl.trim();

      const created = await createProject(payload);
      setProjects((prev) => [created, ...prev]);
      setShowModal(false);
      setName("");
      setSlug("");
      setDescription("");
      setGitUrl("");
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to create project";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Edit modal state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editGitUrl, setEditGitUrl] = useState<string>("");
  const [editBranch, setEditBranch] = useState<string>("main");
  const [editStatus, setEditStatus] = useState<string>("active");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const handleArchive = async (proj: Project) => {
    if (!window.confirm(`Are you sure you want to archive project "${proj.name}"?`)) return;
    setActionLoading(proj.id);
    try {
      const updated = await archiveProject(proj.slug || proj.id);
      setProjects((prev) => prev.map((p) => (p.id === proj.id ? updated : p)));
    } catch (err: any) {
      alert(`Error archiving project: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openEditModal = (proj: Project) => {
    setEditingProject(proj);
    setEditName(proj.name);
    setEditDescription(proj.description || "");
    setEditGitUrl(proj.git_url || "");
    setEditBranch(proj.default_branch || "main");
    setEditStatus((proj.status || "active").toLowerCase());
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editName.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await updateProject(editingProject.slug || editingProject.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        git_url: editGitUrl.trim() || undefined,
        default_branch: editBranch.trim() || undefined,
        status: editStatus,
      });
      setProjects((prev) => prev.map((p) => (p.id === editingProject.id ? updated : p)));
      setEditingProject(null);
    } catch (err: any) {
      alert(`Error updating project: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (proj: Project) => {
    if (!window.confirm(`Permanently delete project "${proj.name}"? This will delete all associated project records and cannot be undone.`)) return;
    setActionLoading(proj.id);
    try {
      await deleteProject(proj.slug || proj.id);
      setProjects((prev) => prev.filter((p) => p.id !== proj.id));
    } catch (err: any) {
      alert(`Error deleting project: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (proj: Project) => {
    setActionLoading(proj.id);
    try {
      const updated = await updateProject(proj.slug || proj.id, { status: "active" });
      setProjects((prev) => prev.map((p) => (p.id === proj.id ? updated : p)));
    } catch (err: any) {
      alert(`Error restoring project: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter & Sort
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const matchesQuery =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const statusNormalized = (p.status || "").toUpperCase();
        const matchesStatus = statusFilter === "ALL" || statusNormalized === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "models") return (b.models_count || 0) - (a.models_count || 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [projects, searchQuery, statusFilter, sortBy]);

  // Aggregate Real Counts
  const totalModels = useMemo(() => projects.reduce((sum, p) => sum + (p.models_count || 0), 0), [projects]);
  const totalDatasets = useMemo(() => projects.reduce((sum, p) => sum + (p.datasets_count || 0), 0), [projects]);
  const totalDeployments = useMemo(() => projects.reduce((sum, p) => sum + (p.deployments_count || 0), 0), [projects]);

  // Status Breakdown based on real project data
  const statusBreakdown = useMemo(() => {
    const total = projects.length;
    if (total === 0) {
      return {
        active: { count: 0, pct: 0 },
        archived: { count: 0, pct: 0 },
      };
    }
    const active = projects.filter((p) => (p.status || "").toLowerCase() === "active").length;
    const archived = projects.filter((p) => (p.status || "").toLowerCase() === "archived").length;
    return {
      active: { count: active, pct: Math.round((active / total) * 100) },
      archived: { count: archived, pct: Math.round((archived / total) * 100) },
    };
  }, [projects]);

  // Creation Velocity across the last 6 months (Real dates)
  const monthlyActivity = useMemo(() => {
    const now = new Date();
    const months: { month: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString("en-US", { month: "short" });
      const year = d.getFullYear();
      const monthIdx = d.getMonth();

      const count = projects.filter((p) => {
        const created = new Date(p.created_at);
        return created.getFullYear() === year && created.getMonth() === monthIdx;
      }).length;

      months.push({ month: monthName, value: count });
    }
    return months;
  }, [projects]);

  const maxMonthlyVal = Math.max(...monthlyActivity.map((m) => m.value), 1);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight font-sans">
            Workspaces &amp; Projects
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize ML repositories, pipelines, model registries, and datasets
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* ── Backend Error Banner ── */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Failed to fetch projects:</span> {error}
          </div>
          <button
            onClick={loadProjects}
            className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded font-medium text-[11px] transition shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Top 4 KPI StatCards (Real Database Metrics) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Active Workspaces"
          value={loading ? "..." : `${projects.length}`}
          subtitle="Managed ML workspaces"
          icon={FolderGit2}
          color="brand"
        />
        <StatCard
          title="Cataloged Models"
          value={loading ? "..." : `${totalModels}`}
          subtitle="Linked to workspaces"
          icon={Box}
          color="brand"
        />
        <StatCard
          title="Managed Datasets"
          value={loading ? "..." : `${totalDatasets}`}
          subtitle="Linked datasets"
          icon={Database}
          color="emerald"
        />
        <StatCard
          title="Active Deployments"
          value={loading ? "..." : `${totalDeployments}`}
          subtitle="Inference containers"
          icon={Server}
          color="emerald"
          isLive={totalDeployments > 0}
        />
      </div>

      {/* ── Visual Analytics Row: Real Activity Trend & Status Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CHART 1: Project Creation Timeline (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Project Workspace Creation
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Real workspace creation activity over the last 6 months
                </p>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                <span className="flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500" /> New Workspaces
                </span>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                <Activity className="w-6 h-6 mb-1 text-slate-300" />
                <span>No workspace activity recorded yet</span>
              </div>
            ) : (
              <div className="relative h-44 w-full flex items-end justify-between gap-3 px-2 pb-2">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7 border-b border-slate-100">
                  <div className="w-full border-t border-slate-100" />
                  <div className="w-full border-t border-slate-100" />
                  <div className="w-full border-t border-slate-100" />
                </div>

                {monthlyActivity.map((ma, i) => {
                  const barHeight = Math.max((ma.value / maxMonthlyVal) * 100, ma.value > 0 ? 12 : 4);
                  return (
                    <div
                      key={i}
                      className="relative z-10 w-full group h-full flex flex-col justify-end items-center cursor-pointer"
                      onMouseEnter={() => setHoveredWeek({ week: ma.month, count: ma.value })}
                      onMouseLeave={() => setHoveredWeek(null)}
                    >
                      <div className="w-full max-w-[36px] flex items-end justify-center h-full">
                        <div
                          className={`w-full rounded-t-xs transition-colors ${
                            ma.value > 0
                              ? "bg-emerald-500 group-hover:bg-emerald-600"
                              : "bg-slate-200 group-hover:bg-slate-300"
                          }`}
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 mt-2 group-hover:text-slate-800 transition-colors">
                        {ma.month}
                      </div>
                    </div>
                  );
                })}

                {hoveredWeek && (
                  <div className="absolute top-1 right-2 bg-white text-slate-800 text-[11px] font-mono px-3 py-1.5 rounded-md shadow-md border border-slate-200 pointer-events-none">
                    <span className="text-slate-500">{hoveredWeek.week}: </span>
                    <span className="text-emerald-700 font-semibold">{hoveredWeek.count} workspace(s)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Workspace Total: {projects.length}</span>
            <span className="text-emerald-700 font-medium">Database Synchronized</span>
          </div>
        </div>

        {/* CHART 2: Real Projects by Status (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="mb-2 pb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Workspaces by Status
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Lifecycle state governance</p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">{projects.length} Total</span>
            </div>

            {projects.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                <FolderGit2 className="w-6 h-6 mb-1 text-slate-300" />
                <span>No projects recorded</span>
              </div>
            ) : (
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

                    {/* Active Slice */}
                    {statusBreakdown.active.pct > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r="54"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="12"
                        strokeDasharray={`${(statusBreakdown.active.pct / 100) * 339.29} 339.29`}
                        strokeDashoffset="0"
                      />
                    )}

                    {/* Archived Slice */}
                    {statusBreakdown.archived.pct > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r="54"
                        fill="none"
                        stroke="#94A3B8"
                        strokeWidth="12"
                        strokeDasharray={`${(statusBreakdown.archived.pct / 100) * 339.29} 339.29`}
                        strokeDashoffset={`${-((statusBreakdown.active.pct / 100) * 339.29)}`}
                      />
                    )}
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-semibold font-mono text-slate-900">
                      {projects.length}
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

                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-xs bg-slate-400" />
                      <span className="text-slate-700">Archived</span>
                    </div>
                    <span className="font-mono text-slate-500 font-semibold">
                      {statusBreakdown.archived.count} ({statusBreakdown.archived.pct}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Governance</span>
            <span className="text-emerald-700 font-medium">PostgreSQL Live</span>
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
            placeholder="Search workspaces by name, slug, description..."
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

      {/* ── Projects Display ── */}
      {loading ? (
        <div className="py-16 text-center bg-white border border-slate-200/80 rounded-md">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading project workspaces...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200/80 rounded-md">
          <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-xs font-semibold text-slate-800">
            {projects.length === 0 ? "No Project Workspaces Yet" : "No Matching Workspaces Found"}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
            {projects.length === 0
              ? "Create your first ML project workspace to organize models, experiments, and datasets."
              : "No projects match the current search or status filter."}
          </p>
          {projects.length === 0 ? (
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Project
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* ── TABLE VIEW (Default) ── */
        <div className="bg-white border border-slate-200/80 rounded-md overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Workspaces ({filteredProjects.length})
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {totalModels} models • {totalDatasets} datasets • {totalDeployments} deployments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#F8FAFC] border-b border-slate-200/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Workspace</th>
                  <th className="px-3 py-2.5">Branch</th>
                  <th className="px-3 py-2.5">Resources</th>
                  <th className="px-3 py-2.5">Created</th>
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
                            <p className="text-[11px] text-slate-400 truncate max-w-sm mt-0.5">
                              {proj.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Git Branch / URL */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                        <GitBranch className="w-3 h-3 text-slate-400" />
                        <span>{proj.default_branch || "main"}</span>
                      </div>
                    </td>

                    {/* MLOps Resources (Real DB counts) */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
                        <span title="Models" className="text-slate-800 font-semibold">{proj.models_count || 0}m</span>
                        <span className="text-slate-300">•</span>
                        <span title="Datasets">{proj.datasets_count || 0}d</span>
                        <span className="text-slate-300">•</span>
                        <span title="Deployments">{proj.deployments_count || 0}dep</span>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {new Date(proj.created_at).toLocaleDateString()}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <StatusBadge status={(proj.status || "ACTIVE").toUpperCase()} />
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

                        <button
                          onClick={() => openEditModal(proj)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition"
                          title="Edit Project"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {(proj.status || "").toLowerCase() === "active" ? (
                          <button
                            onClick={() => handleArchive(proj)}
                            disabled={actionLoading === proj.id}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition"
                            title="Archive Workspace"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(proj)}
                            disabled={actionLoading === proj.id}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition"
                            title="Restore to Active"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(proj)}
                          disabled={actionLoading === proj.id}
                          className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                          title="Delete Project Permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

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
        /* ── GRID CARDS VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="bg-white border border-slate-200/80 rounded-md p-4 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-2xs group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                  <span className="font-mono text-[11px] text-slate-500 truncate">
                    {proj.slug}
                  </span>
                  <StatusBadge status={(proj.status || "ACTIVE").toUpperCase()} />
                </div>

                <h3 className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors line-clamp-1">
                  {proj.name}
                </h3>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {proj.description || "Workspace for models, experiments, and datasets."}
                </p>

                <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50/70 border border-slate-100 rounded text-center mb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Models</span>
                    <span className="text-xs font-mono font-semibold text-slate-800 mt-0.5 block">
                      {proj.models_count || 0}
                    </span>
                  </div>
                  <div className="border-x border-slate-200/70">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Datasets</span>
                    <span className="text-xs font-mono font-semibold text-slate-800 mt-0.5 block">
                      {proj.datasets_count || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Deploys</span>
                    <span className="text-xs font-mono font-semibold text-slate-800 mt-0.5 block">
                      {proj.deployments_count || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">
                  {new Date(proj.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1.5">
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

                  <button
                    onClick={() => openEditModal(proj)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition"
                    title="Edit Project"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {(proj.status || "").toLowerCase() === "active" ? (
                    <button
                      onClick={() => handleArchive(proj)}
                      disabled={actionLoading === proj.id}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition"
                      title="Archive Workspace"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRestore(proj)}
                      disabled={actionLoading === proj.id}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition"
                      title="Restore to Active"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(proj)}
                    disabled={actionLoading === proj.id}
                    className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                    title="Delete Project Permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <Link
                    to="/app/experiments"
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 text-[11px] font-medium transition"
                  >
                    Workspace
                    <ArrowUpRight className="w-3 h-3 text-slate-400" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Create New Project ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200/90 rounded-md max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-emerald-600" />
                Create New Project Workspace
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setCreateError(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Credit Risk Assessment"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                  Slug (optional — auto-generated from name)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="credit-risk"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                  Git Repository URL (optional)
                </label>
                <input
                  type="url"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  placeholder="https://github.com/org/repo.git"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Describe your project goals, data sources, and target metrics..."
                  className="w-full bg-slate-50/50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setCreateError(null);
                  }}
                  className="px-3 py-1.5 rounded bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Project ── */}
      {editingProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200/90 rounded-md max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-600" />
                Edit Project: {editingProject.name}
              </h3>
              <button
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-slate-600 transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                  Git Repository URL
                </label>
                <input
                  type="url"
                  value={editGitUrl}
                  onChange={(e) => setEditGitUrl(e.target.value)}
                  placeholder="https://github.com/org/repo.git"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                    Default Branch
                  </label>
                  <input
                    type="text"
                    value={editBranch}
                    onChange={(e) => setEditBranch(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  >
                    <option value="active">ACTIVE</option>
                    <option value="archived">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-3 py-1.5 rounded bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editName.trim()}
                  className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
