import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Box, Database, FlaskConical, GitBranch, Server } from "lucide-react";
import { api, fetchDatasets, fetchModels, fetchDeployments, fetchExperiments, fetchExperimentRuns } from "../api/client";
import { Project, Dataset, RegisteredModel, Deployment, ExperimentRun } from "../api/types";

type Lineage = { run_id?: string; git_commit?: string; dataset_sha256?: string; matching_datasets: {name: string; version: number}[]; metrics: Record<string, number> };
export function ProjectResources({ project }: { project: Project }) {
  const [tab, setTab] = useState("Datasets");
  const [data, setData] = useState<{datasets: Dataset[]; models: RegisteredModel[]; deployments: Deployment[]; runs: ExperimentRun[]} | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [model, setModel] = useState<RegisteredModel | null>(null);
  const [lineage, setLineage] = useState<Lineage | null>(null);
  const [lineageError, setLineageError] = useState("");
  useEffect(() => {
    let active = true;
    setData(null); setError("");
    Promise.all([fetchDatasets(), fetchModels(project.slug), fetchDeployments(), fetchExperiments(project.slug)]).then(async ([datasets, models, deployments, experiments]) => {
      const relevant = experiments.filter(exp => exp.tags?.["mlite.project"] === project.slug);
      const runs = (await Promise.all(relevant.map(exp => fetchExperimentRuns(exp.experiment_id)))).flat();
      if (active) setData({datasets: datasets.filter(item => item.project_id === project.id), models, deployments: deployments.filter(item => models.some(m => m.name === item.model_name)), runs});
    }).catch(() => { if (active) setError("Could not load project resources. Please retry."); });
    return () => { active = false; };
  }, [project.id, project.slug, retry]);
  useEffect(() => {
    let active = true;
    setLineage(null); setLineageError("");
    if (model) api.get<Lineage>(`/models/${encodeURIComponent(model.name)}/versions/${model.version}/lineage`).then(response => { if (active) setLineage(response.data); }).catch(() => { if (active) setLineageError("Could not load model lineage."); });
    return () => { active = false; };
  }, [model]);
  const tabs = [["Datasets", Database, data?.datasets.length], ["Runs", FlaskConical, data?.runs.length], ["Models", Box, data?.models.length], ["Deployments", Server, data?.deployments.length]] as const;
  return <>
    <Link className="project-back" to={{search: ""}}><ArrowLeft size={16}/> All projects</Link>
    <div className="project-detail-hero overview-card"><div><span className="health-pill">{project.status}</span><h1>{project.name}</h1><p>{project.description || "Project workspace"}</p><div className="project-meta"><GitBranch size={14}/>{project.git_url || "No repository connected"}<span>{project.default_branch || "—"}</span></div></div><Box size={64} strokeWidth={1}/></div>
    <div className="project-tabs" role="tablist" aria-label="Project resources">{tabs.map(([name, Icon, count]) => <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}><Icon size={17}/>{name}<span>{count ?? "—"}</span></button>)}</div>
    <section className="overview-card project-resource-panel" role="tabpanel" aria-label={tab}><h3>{tab}</h3>
      {error ? <p role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Retry</button></p> : !data ? <p role="status">Loading project resources…</p> : <>
        {tab === "Datasets" && (data.datasets.length ? data.datasets.map(item => <div className="resource-row" key={item.id}><Database/><div><strong>{item.name}</strong><small>{item.format} · Version {item.latest_version?.version_num ?? item.version_num ?? "—"}</small></div><span>{item.row_count?.toLocaleString() ?? "—"} rows</span></div>) : <p className="activity-empty">No datasets linked to this project.</p>)}
        {tab === "Runs" && (data.runs.length ? data.runs.map(item => <details className="resource-row-details" key={item.run_id}><summary>{item.run_name || item.run_id}<span className="health-pill">{item.status}</span></summary><p>Run: {item.run_id}</p><p>Metrics: {Object.entries(item.metrics).map(([key,value]) => `${key}: ${value}`).join(" · ") || "Not recorded"}</p><p>Parameters: {Object.entries(item.params).map(([key,value]) => `${key}: ${value}`).join(" · ") || "Not recorded"}</p></details>) : <p className="activity-empty">No runs recorded for this project.</p>)}
        {tab === "Models" && (data.models.length ? data.models.map(item => <button className="resource-row model-resource" key={`${item.name}-${item.version}`} onClick={() => setModel(item)}><Box/><div><strong>{item.name}</strong><small>Version {item.version} · {item.stage}</small></div><span>View lineage ↗</span></button>) : <p className="activity-empty">No registered models linked to this project.</p>)}
        {tab === "Deployments" && (data.deployments.length ? data.deployments.map(item => <div className="resource-row" key={item.id}><Server/><div><strong>{item.model_name} · v{item.model_version}</strong><small>{item.endpoint_url}</small></div><span className="health-pill">{item.status}</span></div>) : <p className="activity-empty">No deployments for this project's models.</p>)}
      </>}
    </section>
    {model && <div className="project-modal-backdrop"><section className="overview-card lineage-dialog" role="dialog" aria-modal="true" aria-labelledby="lineage-title"><button className="secondary-action" onClick={() => setModel(null)}>Close</button><h2 id="lineage-title">{model.name} <span>v{model.version}</span></h2><p>Training provenance</p>{lineageError ? <p role="alert">{lineageError}</p> : !lineage ? <p role="status">Loading lineage…</p> : <dl>{[["MLflow run", lineage.run_id], ["Git commit", lineage.git_commit], ["Dataset SHA-256", lineage.dataset_sha256], ["Matching dataset versions", lineage.matching_datasets.map(item => `${item.name} v${item.version}`).join(", ")], ["Recorded metrics", Object.entries(lineage.metrics).map(([key,value]) => `${key}: ${value}`).join(" · ")]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not recorded"}</dd></div>)}</dl>}</section></div>}
  </>;
}
