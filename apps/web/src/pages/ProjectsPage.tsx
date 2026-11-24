import githubMark from "../assets/github-invertocat-black.svg";
import { ArrowRight, Building2, ChevronDown, ChevronRight, Clock, Code2, Layers, Rocket } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line as ChartLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ProjectResources } from "../components/ProjectResources";
import { countBy, MetricDistribution } from "../components/charts/MetricDistribution";
import React, { useEffect, useState, useMemo } from "react";
import {
  FolderGit2, Info,
  Plus,
  GitBranch,
  Search,
  RefreshCw,
  Box,
  FlaskConical,
  Database,
  Server,
  Activity,
  ArrowUpRight, Users,
  X,
  LayoutGrid,
  List,
  AlertCircle,
  Archive,
  Pencil,
  Trash2,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { StatCard } from "../components/StatCard";
import {
  fetchProjects, fetchExperiments, fetchDatasets,
  createProject,
  archiveProject,
  updateProject,
  deleteProject,
} from "../api/client";
import { Project, Experiment, Dataset } from "../api/types";
import { Link, useSearchParams } from "react-router-dom";
import { workspaceFeatures } from "../config/workspace";
import { useAuth } from "../context/AuthContext";

function projectUpdatedLabel(timestamp: string) {
  const elapsed = Date.now() - Date.parse(timestamp);
  if (!Number.isFinite(elapsed)) return "Update time unavailable";
  const units = [[86400000, "d"], [3600000, "h"], [60000, "min"]] as const;
  const unit = units.find(([duration]) => elapsed >= duration);
  return unit ? `Last updated ${Math.floor(elapsed / unit[0])} ${unit[1]} ago` : "Updated just now";
}

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [workspace, setWorkspace] = useState("");

  // Portfolio layout
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

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
    if (!name.trim() || (importRepo && !gitUrl.trim())) return;
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

  // Notification banner state
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((current) => (current?.text === text ? null : current));
    }, 4000);
  };

  const handleArchive = async (proj: Project) => {
    setActionLoading(proj.id);
    try {
      const updated = await archiveProject(proj.slug || proj.id);
      setProjects((prev) => prev.map((p) => (p.id === proj.id ? updated : p)));
      showToast("success", `Project "${proj.name}" was successfully archived.`);
    } catch (err: any) {
      showToast("error", `Failed to archive project: ${err.response?.data?.detail || err.message}`);
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
      showToast("success", `Project "${updated.name}" updated successfully.`);
    } catch (err: any) {
      showToast("error", `Failed to update project: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setDeleting(true);
    try {
      await deleteProject(projectToDelete.slug || projectToDelete.id);
      const deletedName = projectToDelete.name;
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
      showToast("success", `Project "${deletedName}" has been permanently deleted.`);
    } catch (err: any) {
      showToast("error", `Failed to delete project: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async (proj: Project) => {
    setActionLoading(proj.id);
    try {
      const updated = await updateProject(proj.slug || proj.id, { status: "active" });
      setProjects((prev) => prev.map((p) => (p.id === proj.id ? updated : p)));
      showToast("success", `Project "${proj.name}" restored to active status.`);
    } catch (err: any) {
      showToast("error", `Failed to restore project: ${err.response?.data?.detail || err.message}`);
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
        return matchesQuery && matchesStatus && (!workspace || p.slug === workspace);
      })
      .sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [projects, searchQuery, statusFilter, workspace]);

  const [experiments, setExperiments] = useState<Experiment[]>([]);
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

  const [datasets, setDatasets] = useState<Dataset[] | null>(null);
  useEffect(() => {
    let active = true;
    fetchDatasets().then(items => { if (active) setDatasets(items); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const projectEvents = filteredProjects.flatMap(project => [
    { key: project.id, project, label: "Project created", date: project.created_at, icon: FolderGit2 },
    ...experiments.filter(item => item.tags?.["mlite.project"] === project.slug && item.created_at)
      .map(item => ({ key: `experiment-${item.experiment_id}`, project, label: "Experiment created", date: item.created_at!, icon: FlaskConical })),
    ...(datasets ?? []).filter(item => item.project_id === project.id && item.updated_at && item.updated_at !== item.created_at)
      .map(item => ({ key: `dataset-${item.id}`, project, label: "Dataset updated", date: item.updated_at!, icon: Database })),
  ]).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const monthlyActivity = Array.from({ length: 30 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - 29 + index);
    const events = projectEvents.filter(event => new Date(event.date).toDateString() === day.toDateString());
    return {
      date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      experiments: events.filter(event => event.label === "Experiment created").length,
      datasets: datasets ? events.filter(event => event.label === "Dataset updated").length : null,
    };
  });

  const [params] = useSearchParams();
  const selected = projects.find(project => project.slug === params.get("project"));

  useEffect(() => {
    let active = true;
    fetchExperiments().then(items => { if (active) setExperiments(items); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const experimentCount = (project: Project) => experiments.filter(item => item.tags?.["mlite.project"] === project.slug).length;
  const distribution = filteredProjects.map(project => ({
    name: project.name, datasets: project.datasets_count ?? 0, models: project.models_count ?? 0, experiments: experimentCount(project),
  }));
  const maxResourceTotal = Math.max(1, ...distribution.map(item => item.datasets + item.models + item.experiments));
  const totals = [
    ["Total Projects", projects.length, FolderGit2],
    ["Connected Datasets", totalDatasets, Database],
    ["Linked Models", totalModels, Box],
    ["Active Experiments", experiments.filter(item => item.lifecycle_stage === "active" && projects.some(project => project.slug === item.tags?.["mlite.project"])).length, FlaskConical],
    ["Deployments", totalDeployments, Layers],
    ["Team Owners", "—", Users],
  ] as const;
  const [importRepo, setImportRepo] = useState(false);

  return (
    <div className="lifecycle-dashboard projects-dashboard" data-collaboration={workspaceFeatures.projectCollaboration}>
      {selected ? <>
        <ProjectResources key={selected.id} project={selected} />
        <div className="project-card-actions">
          <button className="secondary-action" onClick={() => openEditModal(selected)}>Edit Project</button>
          {selected.status.toLowerCase() === "archived" ? <>
            <button className="secondary-action" disabled={actionLoading === selected.id} onClick={() => handleRestore(selected)}>Restore Project</button>
            <button className="secondary-action" onClick={() => setProjectToDelete(selected)}>Delete Project</button>
          </> : <button className="secondary-action" disabled={actionLoading === selected.id} onClick={() => handleArchive(selected)}>Archive Project</button>}
        </div>
        {toastMessage && <p role="status">{toastMessage.text}</p>}
      </> : <>
        <div className="overview-hero projects-hero">
          <div><h1>Projects</h1><p>Organize repositories, datasets, experiments, models, and deployments across your ML workloads.</p></div>
          <div className="projects-art" aria-hidden="true">
            {[Database, Code2, Box, Rocket].map((Icon, index) => (
              <div className="projects-art-step" key={index}>
                <span className="projects-art-base" />
                <Icon className="projects-art-icon" size={49} strokeWidth={1.35} />
                {index < 3 && <ArrowRight className="projects-art-arrow" size={23} />}
              </div>
            ))}
          </div>
        </div>
        <div className="projects-toolbar">
          <label><Search size={16} /><input value={searchQuery} placeholder="Search projects…" aria-label="Search projects" onChange={event => setSearchQuery(event.target.value)} /></label>
          <div className="project-filter">
            <Building2 size={16} aria-hidden="true" />
            <select aria-label="Filter by workspace" value={workspace} onChange={event => setWorkspace(event.target.value)}>
              <option value="">All Workspaces</option>
              {projects.map(project => <option key={project.id} value={project.slug}>{project.name}</option>)}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </div>
          <div className="project-filter">
            <Activity size={17} aria-hidden="true" />
            <select aria-label="Project status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="ALL">All Statuses</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </div>
          <div className="projects-actions">
            <button className="secondary-action" onClick={() => { setImportRepo(true); setShowModal(true); }}><img src={githubMark} width={16} height={16} alt="" />Import Git Repo</button>
            <button className="primary-action" onClick={() => { setImportRepo(false); setShowModal(true); }}><Plus size={16} />New Project</button>
          </div>
        </div>
        {error && <p role="alert">{error} <button onClick={loadProjects}>Retry</button></p>}
        {toastMessage && <p role="status" className="health-pill">{toastMessage.text}</p>}
        <div className="overview-kpis">
          {totals.map(([label, count, Icon], index) => {
            if (label === "Team Owners" && !workspaceFeatures.projectCollaboration) return null;
            const targets = ["#project-portfolio", "datasets", "models", "experiments", "deployments", "#project-ownership"];
            const flourish = [
              "M1 19 C9 9 14 28 23 17 S30 21 38 12 S48 9 55 15 S66 7 77 6",
              "M1 21 C15 22 17 8 30 15 S48 19 56 10 S69 9 77 6",
              "M1 17 C9 9 14 24 25 15 S37 20 49 11 S63 20 77 12",
            ][index % 3];
            return <a className="overview-card kpi" key={label} href={index === 0 || index === 5 ? targets[index] : `/app/${targets[index]}`}>
              <span><Icon size={19} /><strong>{label}</strong></span>
              <b>{loading || error ? "—" : count}<ChevronRight size={16} /></b>
              <svg className="project-kpi-accent" viewBox="0 0 78 28" aria-hidden="true">
                <path d={count === 0 ? "M1 22 H77" : flourish} fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </a>;
          })}
        </div>
        <section className="overview-card" id="project-portfolio">
          <h3>Project Portfolio <Info size={14} />
            <span className="portfolio-view" role="group" aria-label="Portfolio layout">
              <button type="button" aria-label="Grid view" title="Grid view" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")}><LayoutGrid size={15} /></button>
              <button type="button" aria-label="List view" title="List view" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}><List size={16} /></button>
            </span>
            <button className="portfolio-reset" onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); setWorkspace(""); }}>View All Projects ›</button></h3>
          {loading && <p role="status">Loading projects…</p>}
          {!loading && !error && !filteredProjects.length && <p className="activity-empty">No projects match the current filters.</p>}
          <div className={`project-portfolio portfolio-${viewMode}`}>
            {filteredProjects.map(project => {
              const archived = project.status.toLowerCase() === "archived";
              const stats = [
                [Database, project.datasets_count, "Dataset"],
                [FlaskConical, experimentCount(project), "Experiment"],
                [Box, project.models_count, "Model"],
                [Layers, project.deployments_count, "Deployment"],
              ] as const;
              return <article className="overview-card project-tile" key={project.id}>
                <div className="project-tile-body">
                  <div className="project-tile-copy">
                    <div className="project-tile-heading">
                      <Box size={19} aria-hidden="true" />
                      <h2>{project.name}</h2>
                      <span className={archived ? "project-status is-archived" : "project-status"}>
                        {archived ? "Archived" : "Active"}
                      </span>
                    </div>
                    <p>{project.description || "No description"}</p>
                    <div className="project-meta project-repository">
                      <span><img src={githubMark} width={13} height={13} alt="" />{project.git_url?.replace(/^https?:\/\//, "").replace(/\.git$/, "") || "No Git repository"}</span>
                      <span><GitBranch size={13} aria-hidden="true" />{project.default_branch || "—"}</span>
                    </div>
                  </div>
                  {workspaceFeatures.projectCollaboration && <div className="project-owner" title="Project owner unavailable">
                    <span className="project-owner-avatar"><Users size={15} aria-hidden="true" /></span>
                    <span><strong>—</strong><small>Owner</small></span>
                  </div>}
                  <Link className="secondary-action" to={{ search: new URLSearchParams({ project: project.slug }).toString() }}>
                    {archived ? <>View Details <ChevronRight size={13} /></> : <>Open Project <ArrowUpRight size={13} /></>}
                  </Link>
                </div>
                <div className="project-meta project-totals">
                  {stats.map(([Icon, count, label]) => (
                    <span key={label}><Icon size={15} aria-hidden="true" /><span><strong>{count ?? "—"}</strong> {label}{count === 1 ? "" : "s"}</span></span>
                  ))}
                  <time title={new Date(project.updated_at).toLocaleString()} dateTime={project.updated_at}>
                    <Clock size={12} aria-hidden="true" />{projectUpdatedLabel(project.updated_at)}
                  </time>
                </div>
              </article>;
            })}
          </div>
        </section>
        <div className="project-portfolio project-charts">
          <section className="overview-card">
            <h3>Project Activity (30 days) <Info /></h3>
            <div className="project-legend">
              <span style={{ "--legend-color": "#087d3b" } as React.CSSProperties}>New Experiments</span>
              <span style={{ "--legend-color": "#60c771" } as React.CSSProperties}>Dataset Updates{datasets ? "" : " (—)"}</span>
              <span className="unavailable-series" title="Repository history unavailable">Repository Activity (—)</span>
            </div>
            <div className="project-activity-plot">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyActivity} margin={{ top: 6, right: 6, bottom: 0, left: -24 }}>
                  <CartesianGrid vertical={false} stroke="#edf0f2" />
                  <XAxis dataKey="date" minTickGap={16} tick={{ fontSize: 9 }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="datasets" name="Dataset Updates" fill="#60c771" />
                  <ChartLine dataKey="experiments" name="New Experiments" stroke="#087d3b" strokeWidth={2} dot={{ r: 2, fill: "white" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="overview-card">
            <h3>Resource Distribution by Project <Info /></h3>
            <div className="project-legend">
              <span style={{ "--legend-color": "#087d3b" } as React.CSSProperties}>Datasets</span>
              <span style={{ "--legend-color": "#60c771" } as React.CSSProperties}>Experiments</span>
              <span style={{ "--legend-color": "#c4edcf" } as React.CSSProperties}>Models</span>
            </div>
            {distribution.length ? <div className="project-distribution">
              {distribution.map(({ name, datasets, models, experiments }, index) => {
                const total = datasets + models + experiments;
                return <div className="project-distribution-row" key={filteredProjects[index].id}>
                  <strong>{name}</strong>
                  <div className="project-distribution-bar" aria-label={`${datasets} datasets, ${experiments} experiments, ${models} models`}>
                    {[datasets, experiments, models].map((count, segment) => count > 0 && (
                      <span key={segment} className={`distribution-segment segment-${segment}`} style={{ width: `${count / maxResourceTotal * 100}%` }} title={`${count} ${["datasets", "experiments", "models"][segment]}`}>{count}</span>
                    ))}
                  </div>
                  <strong>Total: {total}</strong>
                </div>;
              })}
            </div> : <p className="activity-empty">No project resources to display.</p>}
          </section>
        </div>
        <div className="project-bottom-panels">
          <section className="overview-card">
            <h3>Recent Project Activity <Info />{user?.role === "ADMIN" && <Link to="/admin/audit">View All Activity ›</Link>}</h3>
            <table className="overview-table"><thead><tr><th>Event</th><th>Project</th>{workspaceFeatures.projectCollaboration && <th>Owner</th>}<th>Time</th><th>Status</th></tr></thead><tbody>
              {projectEvents.slice(0, 5).map(({ key, project, label, date, icon: Icon }) => (
                <tr key={key}><td><span className="project-event"><Icon size={13} />{label}</span></td>
                  <td><Link to={{ search: new URLSearchParams({ project: project.slug }).toString() }}>{project.name}</Link></td>
                  {workspaceFeatures.projectCollaboration && <td>—</td>}<td title={new Date(date).toLocaleString()}>{projectUpdatedLabel(date).replace(/^Last updated /, "").replace("Updated just now", "Just now")}</td>
                  <td><span className="health-pill">✓ Recorded</span></td>
                </tr>
              ))}
            </tbody></table>
          </section>
          <section className="overview-card">
            <h3>Repository &amp; Integration Health <Info /></h3>
            <table className="overview-table project-integrations"><thead><tr><th>Project</th><th>Git Remote</th><th>DVC Remote</th><th>MLflow</th><th>CI Checks</th></tr></thead><tbody>
              {filteredProjects.map(project => <tr key={project.id}>
                <td><Link to={{ search: new URLSearchParams({ project: project.slug }).toString() }}>{project.name}</Link></td>
                <td>{project.git_url ? <span className="project-check" title="Git URL configured">✓</span> : "—"}</td>
                <td title="DVC status unavailable">—</td>
                <td>{experimentCount(project) > 0 ? <span className="project-check" title="MLflow experiments linked">✓</span> : "—"}</td>
                <td title="CI status unavailable">—</td>
              </tr>)}
            </tbody></table>
          </section>
          {workspaceFeatures.projectCollaboration && <section className="overview-card" id="project-ownership">
            <h3>Project Ownership &amp; Access <Info /></h3>
            <table className="overview-table"><thead><tr><th>Project</th><th>Owner</th><th>Collaborators</th></tr></thead><tbody>
              {filteredProjects.map(project => <tr key={project.id}><td><Link to={{ search: new URLSearchParams({ project: project.slug }).toString() }}>{project.name}</Link></td><td>—</td><td>—</td></tr>)}
            </tbody></table>
            <p className="chart-caption ownership-note">Ownership information is not available.</p>
          </section>}
        </div>
      </>}
      {/* ── Modal: Create New Project ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div role="dialog" aria-modal="true" aria-labelledby="create-workspace-title" className="creation-dialog">
            <div className="creation-dialog-header">
              <h3 id="create-workspace-title" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-slate-900">
                {importRepo ? "Import Git Repository" : "Create New Project"}
              </h3>
              <button
                type="button"
                aria-label="Close create workspace dialog"
                onClick={() => {
                  setShowModal(false);
                  setCreateError(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="creation-dialog-form">
              <div>
                <label htmlFor="create-workspace-name" className="mb-1.5 block text-xs font-medium uppercase text-slate-600">
                  Project name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  id="create-workspace-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Credit Risk Assessment"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label htmlFor="create-workspace-slug" className="mb-1.5 block text-xs font-medium uppercase text-slate-600">
                  Slug (optional, generated from name)
                </label>
                <input
                  type="text"
                  id="create-workspace-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="credit-risk"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                />
              </div>

              <div>
                <label htmlFor="create-workspace-gitUrl" className="mb-1.5 block text-xs font-medium uppercase text-slate-600">
                  Git repository URL (optional)
                </label>
                <input
                  type="url"
                  id="create-workspace-gitUrl"
                  required={importRepo}
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  placeholder="https://github.com/org/repo.git"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                />
              </div>

              <div>
                <label htmlFor="create-workspace-description" className="mb-1.5 block text-xs font-medium uppercase text-slate-600">
                  Description
                </label>
                <textarea
                  id="create-workspace-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Describe your project goals, data sources, and target metrics..."
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div className="creation-dialog-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setCreateError(null);
                  }}
                  className="secondary-action"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="primary-action disabled:cursor-not-allowed"
                >
                  {creating ? "Creating..." : importRepo ? "Import Repository" : "Create Project"}
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

      {/* ── Modal: Confirm Permanent Deletion ── */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200/90 rounded-md max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Delete Project Workspace?
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {projectToDelete.name} ({projectToDelete.slug})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200/80">
              Are you sure you want to permanently delete this project? This will remove all associated database records and cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setProjectToDelete(null)}
                className="px-3 py-1.5 rounded bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting && <RefreshCw className="w-3 h-3 animate-spin" />}
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

