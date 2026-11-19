import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, Code2, ExternalLink, Info, LayoutGrid, Layers, Plus, Puzzle, RefreshCw, Settings, X } from "lucide-react";
import { fetchSystemServices } from "../api/client";
import type { SubsystemService } from "../api/types";

type Integration = { id: string; name: string; logo: string; description: string; docs: string; appPath: string; match?: RegExp };
const integrations: Integration[] = [
  { id: "mlflow", name: "MLflow", logo: "/logos/mlflow.png", description: "Track experiments, models, and artifacts.", docs: "https://mlflow.org/docs/latest/", appPath: "/app/experiments", match: /MLflow/i },
  { id: "dvc", name: "DVC", logo: "/logos/settings-dvc.svg", description: "Version data and models with Git.", docs: "https://doc.dvc.org/", appPath: "/app/datasets" },
  { id: "github", name: "GitHub", logo: "/logos/settings-github.svg", description: "Source control and CI/CD for training and deployment.", docs: "https://docs.github.com/en/actions", appPath: "/app/projects" },
  { id: "postgresql", name: "PostgreSQL", logo: "/logos/postgresql.svg", description: "Relational database for metadata and results.", docs: "https://www.postgresql.org/docs/", appPath: "/app/services", match: /^PostgreSQL(?:\s|$)/i },
  { id: "minio", name: "MinIO (S3)", logo: "/logos/minio.png", description: "Object storage for datasets, models, and artifacts.", docs: "https://docs.min.io/", appPath: "/app/datasets", match: /MinIO/i },
  { id: "evidently", name: "Evidently", logo: "/logos/evidently.png", description: "Monitor data and model quality: drift and performance.", docs: "https://docs.evidentlyai.com/", appPath: "/app/monitoring" },
  { id: "docker", name: "Docker", logo: "/logos/docker.svg", description: "Build, package, and deploy ML services.", docs: "https://docs.docker.com/", appPath: "/app/deployments", match: /Docker/i },
  { id: "kubernetes", name: "Kubernetes", logo: "/logos/settings-kubernetes.svg", description: "Orchestrate and scale ML workloads.", docs: "https://kubernetes.io/docs/", appPath: "/app/deployments" },
  { id: "slack", name: "Slack", logo: "/logos/slack.png", description: "Get alerts and notifications from MLite.", docs: "https://api.slack.com/messaging/webhooks", appPath: "/app/alerts" },
];
function serviceFor(integration: Integration, services: SubsystemService[]) { return integration.match ? services.find(service => integration.match!.test(service.name)) : undefined; }
function Logo({ integration }: { integration: Integration }) { return <img className="integration-tool-logo" src={integration.logo} alt={`${integration.name} logo`} width={38} height={38}/>; }
function externalMlflowUrl() {
  try { const url = new URL(import.meta.env.VITE_MLFLOW_URL); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}
function IntegrationDialog({ integration, service, checking, onCheck, onClose }: { integration: Integration; service?: SubsystemService; checking: boolean; onCheck: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { const dialog = ref.current; if (dialog && !dialog.open) dialog.showModal(); return () => { if (dialog?.open) dialog.close(); }; }, []);
  return <dialog ref={ref} className="settings-integration-dialog" aria-labelledby={titleId} onCancel={event => {event.preventDefault();onClose();}}>
    <header><Logo integration={integration}/><h2 id={titleId}>{integration.name}</h2><button type="button" aria-label="Close integration details" onClick={onClose}><X size={19}/></button></header>
    <p>{integration.description}</p>
    <dl><div><dt>Connection status</dt><dd>{service ? service.status === "online" ? "Connected" : "Unreachable" : "Not verified"}</dd></div>{service && <div><dt>Last probe latency</dt><dd>{service.latency}</dd></div>}</dl>
    <p>Connections are configured on your workspace server. This page checks existing services; it does not save credentials or change server connections.</p>
    {!integration.match && <p className="integration-dialog-note">Automatic connection checks are not available for {integration.name} yet. Follow the setup documentation to configure it.</p>}
    {integration.id === "postgresql" && !service && <p className="integration-dialog-note">The database probe may represent PostgreSQL or SQLite. It does not confirm a PostgreSQL connection.</p>}
    <footer>{integration.match && <button type="button" disabled={checking} onClick={onCheck}><RefreshCw size={14} className={checking ? "animate-spin" : undefined}/>{checking ? "Checking…" : "Check connection"}</button>}<a href={integration.docs} target="_blank" rel="noreferrer">Setup documentation<ExternalLink size={14}/></a></footer>
  </dialog>;
}
export function IntegrationsSettings() {
  const [selected, setSelected] = useState<Integration | null>(null);
  const services = useQuery({ queryKey: ["settings-integrations-services"], queryFn: fetchSystemServices, staleTime: 30000, retry: false });
  const verifiedServices = services.isError ? [] : services.data ?? [];
  const active = integrations.filter(integration => serviceFor(integration, verifiedServices)?.status === "online");
  const available = integrations.filter(integration => !active.includes(integration));
  return <div className="settings-integrations">
    <p className="integrations-intro">Connect MLite with your favorite tools to extend your MLOps workflow.</p>
    <section className="integrations-banner"><div className="integrations-banner-icon"><Puzzle size={38}/></div><div className="integrations-banner-copy"><h2>Integrations</h2><p>Connect and manage third-party tools for data, training, tracking, and deployment.</p></div><div className="integrations-banner-art" aria-hidden="true"><svg viewBox="0 0 500 120" preserveAspectRatio="none"><path fill="#e4fbea" d="M0 120Q90 20 180 65T350 35T500 0V120Z"/><path fill="#baf1cb" d="M100 120Q220 25 290 65T500 15V120Z"/></svg><span><img src="/logo.png" alt=""/></span></div></section>
    {services.isError && <p role="alert" className="integrations-load-error">Connections could not be verified.<button type="button" onClick={() => void services.refetch()}><RefreshCw size={13}/>Retry</button></p>}
    <section className="profile-card integrations-group"><header className="integrations-section-title"><Layers/><div><h2>Active Integrations ({active.length})</h2><p>Tools with a verified connection to your MLite workspace.</p></div></header>
      {active.length ? <div className="integrations-active-grid">{active.map(integration => {
        const mlflowUrl = integration.id === "mlflow" ? externalMlflowUrl() : null;
        return <article className="integration-active-card" key={integration.id}>
          <div className="integration-active-content"><Logo integration={integration}/><div className="integration-copy"><h3>{integration.name}</h3><p>{integration.description}</p></div><div className="integration-state"><span className="integration-connected"><CheckCircle2 size={12}/>Connected</span><button type="button" role="switch" aria-label={`${integration.name} connection`} aria-checked="true" disabled title="Connection managed by the workspace server" className="integration-switch"><span/></button></div></div>
          <footer>{mlflowUrl ? <a href={mlflowUrl} target="_blank" rel="noreferrer"><ExternalLink size={13}/>Open</a> : <Link to={integration.appPath} title={`Open ${integration.name} in MLite`}><ExternalLink size={13}/>Open</Link>}<button type="button" onClick={() => setSelected(integration)}><Settings size={14}/>Configure</button></footer>
        </article>;
      })}</div> : <p className="integrations-empty">{services.isPending ? "Checking existing connections…" : services.isError ? "No connections verified. Retry the connection checks." : "No active connections verified. Choose a tool below for setup details."}</p>}
    </section>
    <section className="profile-card integrations-group"><header className="integrations-section-title"><LayoutGrid/><div><h2>Available Integrations</h2><p>Add more tools to your workflow.</p></div></header>
      <div className="integrations-available-grid">{available.map(integration => <article className="integration-available-card" key={integration.id}><Logo integration={integration}/><div className="integration-copy"><h3>{integration.name}</h3><p>{integration.description}</p></div><button type="button" aria-label={`Connect ${integration.name}`} onClick={() => setSelected(integration)}><Plus size={15}/>Connect</button></article>)}</div>
    </section>
    <aside className="integrations-api-callout"><Info size={24}/><div><h2>Need another integration?</h2><p>You can integrate tools via APIs or webhooks. Server configuration is required.</p></div><a href="https://github.com/Youssef-Laaroussi/MLOpsLite/blob/main/docs/api/overview.md" target="_blank" rel="noreferrer"><Code2 size={17}/>View API Documentation<ExternalLink size={13}/></a></aside>
    {selected && <IntegrationDialog integration={selected} service={serviceFor(selected,verifiedServices)} checking={services.isFetching} onCheck={() => void services.refetch()} onClose={() => setSelected(null)}/>}
  </div>;
}
