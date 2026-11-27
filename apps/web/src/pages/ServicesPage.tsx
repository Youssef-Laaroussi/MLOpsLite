import { useEffect, useId, useState, type ReactNode } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity, AlertTriangle, ArrowDown, ArrowLeftRight, ArrowRight, ArrowUp, ArrowUpRight, Box, Boxes, CheckCircle2, ChevronRight, CircleX, Code2, Cpu,
  Database, EllipsisVertical, FolderGit2, Info, Layers, LayoutGrid, MapPin, MemoryStick, Monitor, Network, Plus, RefreshCw, RotateCcw,
  Rocket, Search, Server, Settings, ShieldCheck, Timer, X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, fetchDeployments, fetchProjects, fetchSystemServices, fetchSystemStats, pingDeployment } from "../api/client";
import "./ServicesPage.css";

const statuses = { Healthy: "#13a52e", Degraded: "var(--services-degraded-accent)", Down: "#e33336", Stopped: "#6a788d", Unknown: "#aab5c3" };
const chartColors = { ...statuses, Healthy: "#1ba20c", Degraded: "#ffb515", Down: "#ff3023" };
type ServiceStatus = keyof typeof statuses;
const eventKinds = {
  Healthy: { Icon: CheckCircle2, label: "Health check passed" },
  Degraded: { Icon: AlertTriangle, label: "Degraded service detected" },
  Down: { Icon: CircleX, label: "Unavailable service detected" },
  Stopped: { Icon: Info, label: "Stopped service detected" },
  Unknown: { Icon: Info, label: "Health check recorded" },
} satisfies Record<ServiceStatus, { Icon: typeof Info; label: string }>;
const infrastructureItems = [
  [Server, "Deployment Environment"], [Boxes, "Orchestration"], [Monitor, "Host"], [MapPin, "Region"], [Network, "Network"],
] as const;
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
  PostgreSQL: ["PostgreSQL", "Database"], SQLite: ["SQLite", "Database"],
  Database: ["Database", "Database"], MLflow: ["MLflow", "Experiment"],
  MinIO: ["MinIO", "Storage"], Model: ["Docker", "Runtime"],
};
const breakdownColors = {
  "ML & Experiment": ["#57c345", "#149c0d"],
  Infrastructure: ["#a9eeaa", "#7cd87c"],
  Storage: ["#ffb711", "#ffd773"],
  Utility: ["#c4cbd4", "#e6eaee"],
} as const;
const clock = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const chartDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const eventAge = new Intl.RelativeTimeFormat("en-US", { style: "short" });
const formatValue = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;

function formatEventAge(observedAt: number, now: number) {
  const minutes = Math.floor((now - observedAt) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return eventAge.format(-minutes, "minute");
  if (minutes < 1_440) return eventAge.format(-Math.floor(minutes / 60), "hour");
  return eventAge.format(-Math.floor(minutes / 1_440), "day");
}

function Panel({ title, children, action, showInfo = true }: { title: string; children: ReactNode; action?: ReactNode; showInfo?: boolean }) {
  return <section className="overview-card services-panel">
    <h2>{title}{showInfo && <Info size={14} aria-hidden="true" />}{action}</h2>{children}
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
  const chartGradientId = useId();
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [showEvents, setShowEvents] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [selectedId, setSelectedId] = useState<string>();
  const [checkedServices, setCheckedServices] = useState<Set<string>>(() => new Set());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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
  const visibleCheckedCount = services.filter(service => checkedServices.has(service.id)).length;
  const allVisibleChecked = services.length > 0 && visibleCheckedCount === services.length;

  function setServicesChecked(ids: string[], checked: boolean) {
    setCheckedServices(previous => {
      const next = new Set(previous);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }
  const dailySnapshots = new Map(history.map(snapshot => [new Date(snapshot.observedAt).toDateString(), snapshot]));
  const timeline = Array.from(dailySnapshots.values()).slice(-8).map(snapshot => ({
    observedAt: snapshot.observedAt,
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
  const categories = Object.entries(breakdownColors).map(([label, [startColor, endColor]]) => ({
    label, startColor, endColor, count: services.filter(service => serviceKinds[service.type].category === label).length,
  }));
  let offset = 0;
  const slices = categories.filter(item => item.count).map(item => {
    const start = offset;
    offset += item.count / services.length * 100;
    return `${item.startColor} ${start}%, ${item.endColor} ${offset}%`;
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
      <div><h1>Services</h1><p>Manage and monitor the core services of your MLOps platform, including the API, MLflow, storage, and databases.</p></div>
      <div className="services-lifecycle" aria-hidden="true">
        {([[Boxes, "Build"], [Box, "Run"], [Monitor, "Monitor"], [ShieldCheck, "Keep Healthy"]] as const).map(([Icon, label], index) =>
          <div key={label}><span className="services-stage-icon">
            <Icon size={42} strokeWidth={1.5} />
            {label === "Monitor" && <Activity className="services-screen-trend" size={23} strokeWidth={1.8} />}
          </span><strong>{label}</strong>{index < 3 && <ArrowRight className="services-stage-arrow" size={23} />}</div>)}
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
        ["Degraded", "Degraded", AlertTriangle, statuses.Degraded],
        ["Down", "Down", CircleX, statuses.Down],
        ["Platform Uptime", null, Timer, "#087c27"],
      ] as const).map(([label, key, Icon, color]) => {
        const count = (items: Service[]) => key === "total" ? items.length : items.filter(service => service.status === key).length;
        const readings = key === null ? [] : history.slice(-8).map(snapshot => count(snapshot.services.filter(matches)));
        const previous = readings[readings.length - 2];
        const latest = readings[readings.length - 1];
        const delta = previous > 0 ? Math.round((latest - previous) / previous * 100) : null;
        return <div className="overview-card services-kpi" key={label}>
          <Icon size={28} style={{ color }} aria-hidden="true" /><div><strong>{label}</strong>
            <b style={{ color: key === "Degraded" ? "var(--services-degraded-value)" : color }} title={key === null ? "Historical uptime unavailable" : undefined}>{hasInventory && key !== null ? count(services) : "—"}
              {delta !== null && <small data-direction={delta < 0 ? "down" : "up"} title="Change since the previous check">
                {delta < 0 ? <ArrowDown size={11} aria-hidden="true" /> : delta > 0 ? <ArrowUp size={11} aria-hidden="true" /> : null}
                {delta > 0 ? "+" : ""}{delta}%
              </small>}
            </b></div>
          <ServiceTrend color={color} values={readings} />
        </div>;
      })}
    </div>

    <div className="services-charts">
      <Panel title="Service Health Over Time">
        <div className="services-chart-key">{Object.entries(chartColors).filter(([label]) =>
          ["Healthy", "Degraded", "Down"].includes(label) || history.some(snapshot => snapshot.services.some(service => service.status === label && matches(service))))
          .map(([label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>
        {timeline.length > 0 ?
          <div className="services-chart" role="group" aria-label="Latest health check per day, collected while this page is open"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeline} barCategoryGap="15%" margin={{ top: 7, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={chartGradientId} x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#4bbb3c" />
                  <stop offset="100%" stopColor={chartColors.Healthy} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#edf0f3" />
              <XAxis dataKey="observedAt" tickFormatter={timestamp => chartDate.format(timestamp)} minTickGap={8} tick={{ fill: "#182031", fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} height={23} />
              <YAxis allowDecimals={false} domain={[0, (max: number) => max + 1]} tickCount={7} tick={{ fill: "#182031", fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} interval={0} width={33} />
              <Tooltip labelFormatter={(_, items) => items[0] ? clock.format(items[0].payload.observedAt) : ""} itemStyle={{ color: "#121b31" }} cursor={{ fill: "#edf7ef" }} />
              {Object.entries(chartColors).map(([label, color]) => <Bar key={label} dataKey={label} stackId="services" fill={label === "Healthy" ? `url(#${chartGradientId})` : color} maxBarSize={50} isAnimationActive={false} />)}
            </BarChart>
          </ResponsiveContainer></div>
        : <p className="services-empty">{loading ? "Checking service health…" : "No health checks available."}</p>}
      </Panel>

      <Panel title="Resource Utilization (All Services)">
        <div className="services-gauges">{resourceItems.map(({ label, value }) => <Ring key={label} background={value === null ? undefined : `conic-gradient(#36b833, #078c0a ${value}%, #e6e9ec 0)`}>
          {label === "Storage" ? <Database size={25} aria-hidden="true" /> : <Cpu size={25} aria-hidden="true" />}
          <strong>{value === null ? "—" : `${Math.round(value)}%`}</strong><span>{label}</span>
        </Ring>)}</div>
      </Panel>

      <Panel title="Service Distribution">
        <div className="services-distribution">
          <Ring background={slices.length ? `conic-gradient(${slices.join(", ")})` : undefined}>
            <strong>{hasInventory ? services.length : "—"}</strong><span>Services</span>
          </Ring>
          <dl>{categories.map(item => <div key={item.label}>
            <dt><i aria-hidden="true" style={{ background: `linear-gradient(${item.startColor}, ${item.endColor})` }} /><span>{item.label}{services.length > 0 && ` (${Math.round(item.count / services.length * 100)}%)`}</span></dt>
            <dd>{hasInventory ? item.count : "—"}</dd>
          </div>)}</dl>
        </div>
      </Panel>
    </div>

    <div className="services-management">
      <Panel title="Registered Services" showInfo={false} action={visibleCheckedCount > 0 && <small className="services-selected-count" role="status">{visibleCheckedCount} selected</small>}>
        <div className="services-scroll"><table className="overview-table services-table">
          <thead><tr><th scope="col"><input type="checkbox" aria-label="Select all visible services" checked={allVisibleChecked}
            disabled={!hasInventory || services.length === 0} ref={input => { if (input) input.indeterminate = visibleCheckedCount > 0 && !allVisibleChecked; }}
            onChange={event => setServicesChecked(services.map(service => service.id), event.target.checked)} /></th>
            {["Service", "Type", "Project", "Version", "Status", "Uptime", "Resources", "Action"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{hasInventory && services.map(service => {
            const Icon = serviceKinds[service.type].Icon;
            const checked = checkedServices.has(service.id);
            return <tr key={service.id} data-checked={checked}>
              <td><input type="checkbox" aria-label={`Select ${service.name}`} checked={checked} onChange={event => setServicesChecked([service.id], event.target.checked)} /></td>
              <td><span className="services-inline" data-type={service.type}><Icon size={19} aria-hidden="true" /><strong>{service.name}</strong></span></td>
              <td><span className="services-tag">{service.type}</span></td><td>{projectLabel(service)}</td>
              <td>{service.version ?? "—"}</td><td><span className="services-status" data-status={service.status}>{service.status}</span></td>
              <td title="Historical uptime unavailable">—</td><td title="Per-service resource metrics unavailable">—</td>
              <td><div className="services-row-actions">
                <button className="services-open" type="button" aria-label={`Open ${service.name}`} onClick={() => setSelectedId(service.id)}>Open <ArrowUpRight size={12} aria-hidden="true" /></button>
                <details><summary aria-label={`More actions for ${service.name}`}><EllipsisVertical size={16} aria-hidden="true" /></summary>
                  {service.type === "Inference" ? <Link to="/app/deployments">Manage deployment</Link> : <Link to="/app/settings">Service settings</Link>}
                </details>
              </div></td>
            </tr>;
          })}{(!hasInventory || !services.length) && <tr><td colSpan={9} className="services-empty">{loading ? "Loading services…" : hasInventory ? "No services match these filters." : "Service inventory unavailable."}</td></tr>}</tbody>
        </table></div>
      </Panel>

      <Panel title="Quick Actions" showInfo={false}>
        <div className="services-quick">
          <Link to="/app/deployments"><Box size={32} aria-hidden="true" /><span><strong>Add Service</strong><small>Register a new service</small></span></Link>
          <button type="button" disabled><RotateCcw size={32} aria-hidden="true" /><span><strong>Restart Service</strong><small>Restart unavailable</small></span></button>
          <Link to="/app/models"><Boxes size={32} aria-hidden="true" /><span><strong>Update Service</strong><small>Deploy a new model version</small></span></Link>
          <Link to="/app/settings"><Settings size={32} aria-hidden="true" /><span><strong>Service Settings</strong><small>Open platform settings</small></span></Link>
        </div>
      </Panel>
    </div>

    <div className="services-lower">
      <Panel title="Infrastructure Overview">
        <div className="services-infrastructure">
          <dl className="services-infrastructure-details">
            {infrastructureItems.map(([Icon, label]) => <div key={label}>
              <dt className="services-inline"><Icon size={15} aria-hidden="true" />{label}</dt>
              <dd title={`${label} unavailable`}>—</dd>
            </div>)}
          </dl>
          <div className="services-cluster"><h3>Resources (Cluster)</h3>{resourceItems.map(({ label, value, Icon }) => <div className="services-resource" key={label}>
            <span className="services-inline"><Icon size={14} aria-hidden="true" />{label}</span>
            <span className="services-track" aria-hidden="true">{value !== null && <i style={{ width: `${value}%` }} />}</span>
            <b>{value === null ? "—" : `${Math.round(value)}%`}</b>
          </div>)}
            <div className="services-resource services-network-io">
              <span className="services-inline"><ArrowLeftRight size={14} aria-hidden="true" />Network (I/O)</span>
              <b title="Network throughput unavailable">—</b>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Recent Service Events" action={events.length > 5 && <button type="button" aria-expanded={showEvents} onClick={() => setShowEvents(expanded => !expanded)}>
        {showEvents ? "Show Less" : "View All Events"}<ChevronRight size={14} aria-hidden="true" />
      </button>}>
        {events.length ? <ul className="services-events">{(showEvents ? events : events.slice(0, 5)).map(event => {
          const { service, observedAt, previous } = event;
          const { Icon, label } = eventKinds[service.status];
          return <li key={`${service.id}-${observedAt}`} data-status={service.status}>
            <Icon size={16} aria-hidden="true" />
            <span><strong>{previous ? `Service status changed to ${service.status.toLowerCase()}` : label}</strong> — {service.name}{service.version && ` (${service.version})`}</span>
            <time dateTime={new Date(observedAt).toISOString()} title={clock.format(observedAt)}>{formatEventAge(observedAt, now)}</time>
          </li>;
        })}</ul> : <p className="services-empty">No service events observed yet.</p>}
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
