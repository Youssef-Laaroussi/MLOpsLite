import { useEffect, useState, type ReactNode } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity, AlertTriangle, ArrowRight, Box, Boxes, CheckCircle2, ChevronRight, CircleX, Code2, Cpu,
  Database, FolderGit2, Info, Layers, LayoutGrid, MemoryStick, Monitor, Plus, RefreshCw,
  Rocket, Search, Server, Settings, ShieldCheck, Timer, X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, fetchDeployments, fetchProjects, fetchSystemServices, fetchSystemStats, pingDeployment } from "../api/client";
import "./ServicesPage.css";

const statuses = { Healthy: "#13a52e", Degraded: "#f6a613", Down: "#e33336", Stopped: "#6a788d", Unknown: "#aab5c3" };
type ServiceStatus = keyof typeof statuses;
const serviceKinds = {
  API: { category: "Infrastructure", Icon: Code2 },
  Experiment: { category: "ML & Experiment", Icon: Activity },
  Database: { category: "Infrastructure", Icon: Database },
  Storage: { category: "Storage", Icon: Database },
  Runtime: { category: "Utility", Icon: Boxes },
  Inference: { category: "ML & Experiment", Icon: Rocket },
  Service: { category: "Utility", Icon: Server },
} as const;
type ServiceType = keyof typeof serviceKinds;
type Service = {
  id: string; name: string; type: ServiceType; status: ServiceStatus;
  project?: string | null; latency?: string; version?: string; probeName?: string;
};
type Snapshot = { observedAt: number; services: Service[] };
const platformServices: Record<string, [string, ServiceType]> = {
  Database: ["Database", "Database"], MLflow: ["MLflow", "Experiment"],
  MinIO: ["MinIO", "Storage"], Model: ["Docker", "Runtime"],
};
const breakdownColors = {
  "ML & Experiment": "#16a832", Infrastructure: "#9ade97", Storage: "#ffc044", Utility: "#bbc4d1",
};
const clock = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const formatValue = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;

function Panel({ title, children, action, id }: { title: string; children: ReactNode; action?: ReactNode; id?: string }) {
  return <section className="overview-card services-panel" id={id}>
    <h2>{title}<Info size={14} aria-hidden="true" />{action}</h2>{children}
  </section>;
}

function Ring({ background, children }: { background?: string; children: ReactNode }) {
  return <div className="services-ring" style={{ backgroundImage: background }}><div>{children}</div></div>;
}

function ServiceTrend({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const range = Math.max(1, Math.max(...values) - min);
  const points = values.map((value, index) => `${index * 69 / (values.length - 1)},${19 - (value - min) * 17 / range}`).join(" ");
  return <svg className="services-sparkline" viewBox="0 0 70 21" aria-hidden="true">
    <polyline points={points} fill="none" stroke={color} strokeWidth={1.6} />
  </svg>;
}

export function ServicesPage() {
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [showEvents, setShowEvents] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [syncing, setSyncing] = useState(false);

  const subsystems = useQuery({ queryKey: ["services-subsystems"], queryFn: fetchSystemServices });
  const platform = useQuery({
    queryKey: ["services-api-health"],
    queryFn: async () => {
      const started = performance.now();
      const { data } = await api.get<{ status: string; version?: string }>("/health");
      return { ...data, latency: `${Math.round(performance.now() - started)} ms` };
    },
    retry: false,
  });
  const stats = useQuery({ queryKey: ["services-infrastructure"], queryFn: () => fetchSystemStats() });
  const deployments = useQuery({ queryKey: ["services-deployments"], queryFn: fetchDeployments });
  const projects = useQuery({ queryKey: ["services-projects"], queryFn: fetchProjects });
  const running = (deployments.data ?? []).filter(deployment => deployment.status === "RUNNING");
  const probes = useQueries({ queries: running.map(deployment => ({
    queryKey: ["services-deployment-probe", deployment.id],
    queryFn: () => pingDeployment(deployment.id),
    retry: false,
  })) });
  const probeById = new Map(running.map((deployment, index) => [deployment.id, probes[index]]));
  const loading = subsystems.isPending || platform.isPending || deployments.isPending || probes.some(probe => probe.isPending);
  const hasInventory = Boolean(subsystems.data || platform.data || deployments.data);
  const inventory: Service[] = [
    {
      id: "api", name: "MLite API", type: "API",
      status: platform.data?.status === "healthy" ? "Healthy" : platform.data ? "Degraded" : "Unknown",
      latency: platform.data?.latency, version: platform.data?.version,
    },
    ...(subsystems.data ?? []).map((service): Service => {
      const [name, type] = platformServices[service.name.split(" ")[0]] ?? [service.name, "Service"];
      return { id: service.name, name, type, probeName: service.name, status: service.status === "online" ? "Healthy" : "Down",
        latency: service.status === "online" ? service.latency.replace(/\s*ms$/, " ms") : undefined };
    }),
    ...(deployments.data ?? []).map((deployment): Service => {
      const probe = probeById.get(deployment.id)?.data;
      const status = deployment.status === "STOPPED" ? "Stopped" : deployment.status === "FAILED" ? "Down"
        : probe?.prediction?.healthy === true ? "Healthy" : probe?.prediction?.status === "degraded" ? "Degraded"
          : probe?.prediction?.healthy === false ? "Down" : "Unknown";
      return { id: deployment.id, name: deployment.model_name, type: "Inference", status, project: deployment.project_id,
        version: String(deployment.model_version), latency: probe ? `${probe.latency_ms} ms` : undefined };
    }),
  ];
  const settledAt = Math.max(subsystems.dataUpdatedAt, platform.dataUpdatedAt, deployments.dataUpdatedAt,
    ...probes.map(probe => Math.max(probe.dataUpdatedAt, probe.errorUpdatedAt)));
  useEffect(() => {
    if (loading || syncing || !hasInventory || !settledAt) return;
    setHistory(previous => previous[previous.length - 1]?.observedAt === settledAt ? previous
      : [...previous, { observedAt: settledAt, services: inventory }].slice(-20));
  }, [loading, syncing, hasInventory, settledAt]);

  const projectNames = new Map(projects.data?.map(item => [item.id, item.name]));
  const projectLabel = (service: Service) => service.project ? projectNames.get(service.project) ?? service.project
    : service.type === "Inference" ? "—" : "Platform";
  const query = search.trim().toLowerCase();
  const matches = (service: Service) => (!project || (project === "platform" ? service.type !== "Inference" : service.project === project))
    && (!status || service.status === status) && (!type || service.type === type)
    && (!query || [service.name, service.type, projectLabel(service), service.probeName].some(value => value?.toLowerCase().includes(query)));
  const services = inventory.filter(matches);
  const timeline = history.slice(-8).map((snapshot, index) => ({
    sample: index + 1, time: clock.format(snapshot.observedAt),
    ...Object.fromEntries(Object.keys(statuses).map(label => [
      label, snapshot.services.filter(service => service.status === label && matches(service)).length,
    ])),
  }));
  const events = history.flatMap((snapshot, index) => {
    const previous = new Map(history[index - 1]?.services.map(service => [service.id, service.status]));
    return snapshot.services.filter(service => matches(service) && service.status !== "Unknown" && previous.get(service.id) !== service.status)
      .map(service => ({ service, observedAt: snapshot.observedAt, previous: previous.get(service.id) }));
  }).reverse();
  const selected = inventory.find(service => service.id === selectedId);
  const resourceItems = ([
    ["CPU", "cpu", Cpu], ["Memory", "memory", MemoryStick], ["Storage", "storage", Database],
  ] as const).map(([label, key, Icon]) => ({
    label, Icon, value: formatValue(stats.data?.infrastructure?.[key]),
  }));
  const categories = Object.entries(breakdownColors).map(([label, color]) => ({
    label, color, count: services.filter(service => serviceKinds[service.type].category === label).length,
  }));
  let offset = 0;
  const slices = categories.filter(item => item.count).map(item => {
    const start = offset;
    offset += item.count / services.length * 100;
    return `${item.color} ${start}% ${offset}%`;
  });

  async function sync() {
    setSyncing(true);
    try {
      await Promise.all([subsystems.refetch(), platform.refetch(), stats.refetch(), deployments.refetch(), projects.refetch(),
        ...probes.map(probe => probe.refetch())]);
    } finally {
      setSyncing(false);
    }
  }

  return <div className="services-dashboard">
    <header className="overview-hero services-hero">
      <div><h1>Services</h1><p>Manage and monitor the core services of your MLOps platform.</p></div>
      <div className="services-lifecycle" aria-hidden="true">
        {([[Boxes, "Build"], [Box, "Run"], [Monitor, "Monitor"], [ShieldCheck, "Keep Healthy"]] as const).map(([Icon, label], index) =>
          <div key={label}><Icon size={39} strokeWidth={1.5} /><strong>{label}</strong>{index < 3 && <ArrowRight className="services-stage-arrow" size={21} />}</div>)}
      </div>
    </header>

    <div className="services-toolbar" role="group" aria-label="Service filters">
      <label><Search size={15} /><input aria-label="Search services" placeholder="Search services (e.g., mlflow, api, postgres)…" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <label><FolderGit2 size={15} /><select aria-label="Project" value={project} onChange={event => setProject(event.target.value)}>
        <option value="">All Projects</option><option value="platform">Platform</option>
        {projects.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label><Layers size={15} /><select aria-label="Status" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All Statuses</option>{Object.keys(statuses).map(label => <option key={label}>{label}</option>)}
      </select></label>
      <label><LayoutGrid size={15} /><select aria-label="Type" value={type} onChange={event => setType(event.target.value)}>
        <option value="">All Types</option>{Object.keys(serviceKinds).map(label => <option key={label}>{label}</option>)}
      </select></label>
      <button className="secondary-action" type="button" disabled={syncing || loading} onClick={() => void sync()}><RefreshCw size={15} />{syncing ? "Syncing…" : "Sync Status"}</button>
      <Link className="primary-action" to="/app/deployments" title="Add an inference service through Deployments"><Plus size={16} />Add Service</Link>
    </div>
    {(subsystems.isError || deployments.isError || platform.isError) && <p className="services-notice" role="status">Some service checks are unavailable.</p>}

    <div className="overview-kpis services-kpis">
      {([
        ["Total Services", "total", Layers, "#087c27"],
        ["Healthy", "Healthy", CheckCircle2, statuses.Healthy],
        ["Degraded", "Degraded", AlertTriangle, "#ae6400"],
        ["Down", "Down", CircleX, statuses.Down],
        ["Platform Uptime", null, Timer, "#087c27"],
      ] as const).map(([label, key, Icon, color]) => {
        const count = (items: Service[]) => key === "total" ? items.length : items.filter(service => service.status === key).length;
        return <div className="overview-card services-kpi" key={label}>
          <Icon size={24} style={{ color }} aria-hidden="true" /><div><strong>{label}</strong>
            <b style={{ color }} title={key === null ? "Historical uptime unavailable" : undefined}>{hasInventory && key !== null ? count(services) : "—"}</b></div>
          {key !== null && <ServiceTrend color={color} values={history.slice(-8).map(snapshot => count(snapshot.services.filter(matches)))} />}
        </div>;
      })}
    </div>

    <div className="services-charts">
      <Panel title="Service Health Over Time">
        <div className="services-chart-key">{Object.entries(statuses).filter(([label]) =>
          ["Healthy", "Degraded", "Down"].includes(label) || history.some(snapshot => snapshot.services.some(service => service.status === label && matches(service))))
          .map(([label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>
        {timeline.length > 0 ? <>
          <div className="services-chart"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeline} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#edf0f3" /><XAxis dataKey="sample" tickFormatter={sample => timeline[Number(sample) - 1]?.time ?? ""} minTickGap={12} tick={{ fontSize: 10 }} tickLine={false} height={20} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} width={30} />
              <Tooltip labelFormatter={(_, items) => items[0]?.payload?.time ?? ""} cursor={{ fill: "#edf7ef" }} />
              {Object.entries(statuses).map(([label, color]) => <Bar key={label} dataKey={label} stackId="services" fill={color} maxBarSize={40} isAnimationActive={false} />)}
            </BarChart>
          </ResponsiveContainer></div>
          <p className="services-caption">Checks collected while this page is open.</p>
        </> : <p className="services-empty">{loading ? "Checking service health…" : "No health checks available."}</p>}
      </Panel>

      <Panel title="Resource Utilization (All Services)">
        <div className="services-gauges">{resourceItems.map(({ label, value, Icon }) => <Ring key={label} background={value === null ? undefined : `conic-gradient(#12a62b ${value}%, #e5e9ed 0)`}>
          <Icon size={20} aria-hidden="true" /><strong>{value === null ? "—" : `${Math.round(value)}%`}</strong><span>{label}</span>
        </Ring>)}</div>
        <p className="services-caption">Platform resource readings.</p>
      </Panel>

      <Panel title="Service Distribution">
        <div className="services-distribution">
          <Ring background={slices.length ? `conic-gradient(${slices.join(", ")})` : undefined}>
            <strong>{hasInventory ? services.length : "—"}</strong><span>Services</span>
          </Ring>
          <dl>{categories.map(item => <div key={item.label}>
            <dt><i style={{ background: item.color }} />{item.label}{services.length > 0 && ` (${Math.round(item.count / services.length * 100)}%)`}</dt>
            <dd>{hasInventory ? item.count : "—"}</dd>
          </div>)}</dl>
        </div>
      </Panel>
    </div>

    <div className="services-management">
      <Panel title="Registered Services">
        <div className="services-scroll"><table className="overview-table services-table">
          <thead><tr>{["Service", "Type", "Project", "Version", "Status", "Uptime", "Probe", "Action"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{hasInventory && services.map(service => {
            const Icon = serviceKinds[service.type].Icon;
            return <tr key={service.id}>
              <td><span className="services-inline"><Icon size={16} aria-hidden="true" /><strong>{service.name}</strong></span></td>
              <td><span className="services-tag">{service.type}</span></td><td>{projectLabel(service)}</td>
              <td>{service.version ?? "—"}</td><td><span className="services-status" data-status={service.status}>{service.status}</span></td>
              <td>—</td><td>{service.latency ?? "—"}</td>
              <td><button className="services-open" type="button" onClick={() => setSelectedId(service.id)}>Open <ArrowRight size={12} /></button></td>
            </tr>;
          })}{(!hasInventory || !services.length) && <tr><td colSpan={8} className="services-empty">{loading ? "Loading services…" : hasInventory ? "No services match these filters." : "Service inventory unavailable."}</td></tr>}</tbody>
        </table></div>
      </Panel>

      <Panel title="Quick Actions">
        <div className="services-quick">{([
          [Box, "Add Service", "Deploy an inference service", "/app/deployments"],
          [RefreshCw, "Manage Deployments", "Open deployment controls", "/app/deployments"],
          [Boxes, "Model Versions", "Open the model registry", "/app/models"],
          [Settings, "Service Settings", "Open platform settings", "/app/settings"],
        ] as const).map(([Icon, title, detail, href]) => <Link key={title} to={href}>
          <Icon size={23} aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span>
        </Link>)}</div>
      </Panel>
    </div>

    <div className="services-lower">
      <Panel title="Infrastructure Overview">
        <div className="services-infrastructure">
          <dl>
            <div><dt>API Version</dt><dd>{platform.data?.version ?? "—"}</dd></div>
            <div><dt>Active Deployments</dt><dd>{stats.data && !stats.data.error ? stats.data.active_deployments : "—"}</dd></div>
            <div><dt>Workspace Projects</dt><dd>{stats.data && !stats.data.error ? stats.data.projects_count : "—"}</dd></div>
          </dl>
          <div><h3>Platform Resources</h3>{resourceItems.map(({ label, value, Icon }) => <div className="services-resource" key={label}>
            <span className="services-inline"><Icon size={14} aria-hidden="true" />{label}</span>
            <span className="services-track" aria-hidden="true">{value !== null && <i style={{ width: `${value}%` }} />}</span>
            <b>{value === null ? "—" : `${Math.round(value)}%`}</b>
          </div>)}</div>
        </div>
      </Panel>

      <Panel title="Recent Service Events" action={events.length > 5 && <button type="button" aria-expanded={showEvents} onClick={() => setShowEvents(expanded => !expanded)}>
        {showEvents ? "Show Less" : "View All Events"}<ChevronRight size={14} aria-hidden="true" />
      </button>}>
        {events.length ? <ul className="services-events">{(showEvents ? events : events.slice(0, 5)).map(event => <li key={`${event.service.id}-${event.observedAt}`}>
          <i style={{ background: statuses[event.service.status] }} aria-hidden="true" />
          <span><strong>{event.previous ? "Service status changed" : "Health check recorded"}</strong> — {event.service.name} ({event.service.status})</span>
          <time dateTime={new Date(event.observedAt).toISOString()}>{clock.format(event.observedAt)}</time>
        </li>)}</ul> : <p className="services-empty">No service events observed yet.</p>}
      </Panel>
    </div>

    {selected && <div className="services-overlay"><section className="overview-card services-dialog" role="dialog" aria-modal="true" aria-labelledby="service-details"
      onKeyDown={event => { if (event.key === "Escape") setSelectedId(undefined); }}>
      <header><h2 id="service-details">{selected.name}</h2><button type="button" autoFocus aria-label="Close service details" onClick={() => setSelectedId(undefined)}><X size={18} /></button></header>
      <dl>
        <div><dt>Type</dt><dd>{selected.type}</dd></div><div><dt>Status</dt><dd>{selected.status}</dd></div>
        <div><dt>Project</dt><dd>{projectLabel(selected)}</dd></div><div><dt>Version</dt><dd>{selected.version ?? "—"}</dd></div>
        <div><dt>Latest Probe</dt><dd>{selected.latency ?? "—"}</dd></div>
      </dl>
      {selected.type === "Inference" && <Link className="primary-action" to="/app/deployments">Open Deployments <ArrowRight size={13} /></Link>}
    </section></div>}
  </div>;
}
