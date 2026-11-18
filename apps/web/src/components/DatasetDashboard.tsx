import { useState, type CSSProperties, type ReactNode } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Award, CalendarDays, Check, ChevronRight, CloudUpload, Copy, Database, FileSpreadsheet, FolderGit2, GitBranch, HardDrive, Info, Layers, Plus, Search, TriangleAlert } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchDatasetVersions, fetchMonitoringSummary } from "../api/client";
import type { Dataset, DatasetColumn, DatasetVersion, Project } from "../api/types";

type Props = {
  datasets: Dataset[];
  projects: Project[];
  loading: boolean;
  formatBytes: (bytes?: number) => string;
  onOpen: (dataset: Dataset, tab?: "versions" | "profiling" | "dvc") => void;
  onCreate: (upload: boolean) => void;
  onDvc?: () => void;
  onCopy: (hash: string) => void;
  copiedHash: string | null;
};

const dayMs = 86400000;
const timestamp = (dataset: Dataset) => dataset.updated_at || dataset.created_at;
const quality = (dataset: Dataset) => dataset.quality_score == null ? null :
  dataset.quality_score <= 1 ? dataset.quality_score * 100 : dataset.quality_score;
const version = (dataset: Dataset) => dataset.version_num || dataset.latest_version?.version_num;
const hashFor = (dataset: Dataset) => dataset.hash_sha256 || dataset.latest_version?.hash_sha256;
const bytesFor = (dataset: Dataset) => dataset.size_bytes ?? dataset.latest_version?.size_bytes ?? 0;
const minio = (dataset: Dataset) => Boolean(dataset.s3_key || dataset.latest_version?.s3_key);
const count = (value?: number) => value?.toLocaleString("en-US") ?? "—";

function age(value: string) {
  const elapsed = Date.now() - Date.parse(value);
  if (!Number.isFinite(elapsed)) return "—";
  if (elapsed >= dayMs) return `${Math.floor(elapsed / dayMs)} d ago`;
  if (elapsed >= 3600000) return `${Math.floor(elapsed / 3600000)} h ago`;
  return elapsed >= 60000 ? `${Math.floor(elapsed / 60000)} min ago` : "Just now";
}

function schemaChanges(versions: DatasetVersion[] | undefined) {
  if (!versions || versions.length < 2) return "—";
  const [latest, previous] = [...versions].sort((a, b) => b.version_num - a.version_num);
  const currentColumns = latest.schema_json?.columns as DatasetColumn[] | undefined;
  const previousColumns = previous.schema_json?.columns as DatasetColumn[] | undefined;
  if (!Array.isArray(currentColumns) || !currentColumns.length ||
      !Array.isArray(previousColumns) || !previousColumns.length) return "—";
  const currentNames = new Set(currentColumns.map(column => column.name));
  const previousNames = new Set(previousColumns.map(column => column.name));
  const added = [...currentNames].filter(name => !previousNames.has(name)).length;
  const removed = [...previousNames].filter(name => !currentNames.has(name)).length;
  return `+${added} / −${removed}`;
}

const validationLabels = { PASS: "Healthy", WARN: "Warning", FAIL: "Failed" } as const;

function Panel({ title, action, children, id }: { title: string; action?: ReactNode; children: ReactNode; id?: string }) {
  return <section className="overview-card dataset-panel" id={id}>
    <h3>{title}<Info aria-hidden="true" />{action}</h3>
    {children}
  </section>;
}

export function DatasetDashboard({ datasets, projects, loading, formatBytes, onOpen, onCreate, onDvc, onCopy, copiedHash }: Props) {
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("");
  const [format, setFormat] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [days, setDays] = useState(30);
  const [allRows, setAllRows] = useState(false);
  const [allSchema, setAllSchema] = useState(false);
  const [allActivity, setAllActivity] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const projectName = (dataset: Dataset) => projects.find(item => item.id === dataset.project_id)?.name ?? "—";
  const formats = [...new Set(datasets.map(item => item.format.toUpperCase()))].sort();
  const filtered = datasets.filter(item => {
    const text = `${item.name} ${item.description ?? ""}`.toLowerCase();
    const score = quality(item);
    return text.includes(query.trim().toLowerCase()) &&
      (!project || item.project_id === project) &&
      (!format || item.format.toUpperCase() === format) &&
      (!qualityFilter || (qualityFilter === "scored" ? score !== null : score === null)) &&
      (!days || Date.now() - Date.parse(timestamp(item)) <= days * dayMs);
  }).sort((a, b) => Date.parse(timestamp(b)) - Date.parse(timestamp(a)));
  const schemaRows = allSchema ? filtered : filtered.slice(0, 4);
  const schemaHistories = useQueries({
    queries: schemaRows.map(item => ({
      queryKey: ["dataset-schema-history", item.id, item.latest_version?.id],
      queryFn: () => fetchDatasetVersions(item.id),
      enabled: (item.versions_count ?? version(item) ?? 0) > 1,
    })),
  });
  const { data: monitoring } = useQuery({
    queryKey: ["monitoring-summary"],
    queryFn: () => fetchMonitoringSummary(),
    enabled: filtered.length > 0,
  });
  const validation = monitoring?.latest_quality;
  const recentActivity = filtered.flatMap(item => {
    const latest = item.latest_version;
    const events = [{
      item, date: timestamp(item), id: `${item.id}-metadata`, icon: Database,
      label: item.updated_at && item.updated_at !== item.created_at ? "Dataset updated" : "Dataset created",
    }];
    if (latest?.created_at) {
      events.push({ item, date: latest.created_at, id: latest.id, icon: CloudUpload,
        label: `Version added (v${latest.version_num})` });
    }
    if (validation?.dataset_id === item.id) {
      events.push({ item, date: validation.created_at, id: validation.id,
        icon: validation.status === "PASS" ? Check : TriangleAlert,
        label: `Quality check ${{ PASS: "passed", WARN: "reported warnings", FAIL: "failed" }[validation.status]}` });
    }
    return events;
  }).filter(event => !days || Date.now() - Date.parse(event.date) <= days * dayMs)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const catalog = allRows ? filtered : filtered.slice(0, 4);
  const allChecked = catalog.length > 0 && catalog.every(item => selected.includes(item.id));
  const scored = filtered.filter(item => quality(item) !== null).sort((a, b) => quality(b)! - quality(a)!);
  const synced = filtered.filter(minio).length;
  const storage = filtered.reduce((total, item) => total + bytesFor(item), 0);
  const largestDatasets = filtered.filter(item => bytesFor(item) > 0)
    .sort((a, b) => bytesFor(b) - bytesFor(a)).slice(0, 4);
  const versions = filtered.reduce((total, item) => total + (item.versions_count ?? version(item) ?? 0), 0);
  const average = scored.length ? scored.reduce((total, item) => total + quality(item)!, 0) / scored.length : null;
  const historyDays = days || 30;
  const history = Array.from({ length: historyDays }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - historyDays + index + 1);
    const key = date.toDateString();
    const added = filtered.filter(item => item.latest_version && new Date(item.latest_version.created_at).toDateString() === key);
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      versions: added.length,
      profiled: added.filter(item => item.latest_version?.schema_json?.columns?.length).length,
    };
  });
  const stats = [
    ["Total Datasets", filtered.length, Database],
    ["Dataset Versions", versions, Layers],
    ["Avg Quality Score", average === null ? "—" : `${average.toFixed(1)}%`, Award],
    ["DVC Tracked", "—", GitBranch],
    ["Synced to MinIO", synced ? `${synced} / ${filtered.length}` : "—", Database],
    ["Storage Used", formatBytes(storage), HardDrive],
  ] as const;
  const empty = <p className="activity-empty">{loading ? "Loading datasets…" : "No recorded data for this selection."}</p>;

  return <>
    <div className="overview-hero projects-hero dataset-hero">
      <div><h1>Datasets</h1><p>Manage dataset versions, lineage, schema integrity, quality checks, and storage across your ML workflows.</p></div>
      <div className="projects-art" aria-hidden="true">
        {[
          <Database className="dataset-art-db" size={49} strokeWidth={1.25} />,
          <span className="dataset-art-stack"><i /><i /><i /><b>v3</b></span>,
          <span className="dataset-art-check"><Check size={27} strokeWidth={3} /></span>,
          <span className="dataset-art-server"><i /><i /></span>,
        ].map((art, index) => <div className="projects-art-step" key={index}>
          <span className="projects-art-base" />{art}
          {index < 3 && <ArrowRight className="projects-art-arrow" size={25} />}
        </div>)}
      </div>
    </div>
    <div className="projects-toolbar dataset-toolbar">
      <label><Search size={16} /><input aria-label="Search datasets" placeholder="Search datasets…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label><FolderGit2 size={15} /><select aria-label="Project" value={project} onChange={event => setProject(event.target.value)}>
        <option value="">All Projects</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label><FileSpreadsheet size={15} /><select aria-label="Format" value={format} onChange={event => setFormat(event.target.value)}>
        <option value="">All Formats</option>{formats.map(item => <option key={item}>{item}</option>)}
      </select></label>
      <label><Award size={15} /><select aria-label="Quality Status" value={qualityFilter} onChange={event => setQualityFilter(event.target.value)}>
        <option value="">Quality Status</option><option value="scored">Scored</option><option value="unscored">Unscored</option>
      </select></label>
      <label><CalendarDays size={15} /><select aria-label="Date range" value={days} onChange={event => setDays(Number(event.target.value))}>
        <option value={30}>Last 30 days</option><option value={7}>Last 7 days</option><option value={0}>All time</option>
      </select></label>
      <div className="projects-actions">
        <button className="secondary-action" onClick={() => onCreate(true)}><CloudUpload size={16} />Upload Dataset</button>
        <button className="primary-action" onClick={() => onCreate(false)}><Plus size={16} />New Dataset</button>
      </div>
    </div>
    <div className="overview-kpis dataset-kpis">{stats.map(([label, value, Icon], index) => (
      <a className="overview-card kpi" key={label} href={index === 3 || index === 4 ? "#dataset-integrations" : index === 2 || index === 5 ? "#dataset-metrics" : "#dataset-catalog"}>
        <span><Icon size={20} /><strong>{label}</strong></span>
        <b>{loading ? "—" : value}{index < 5 && index !== 2 && <ChevronRight size={15} />}</b>
        {index < 5 && <svg className="dataset-kpi-accent" viewBox="0 0 84 25" aria-hidden="true">
          <path d={index % 2 ? "M1 21 C8 21 9 15 15 16 S22 21 28 16 S36 10 42 13 S49 11 54 8 S61 14 67 10 S76 11 83 6" : "M1 21 C8 19 10 22 15 17 S25 20 33 14 S43 15 49 13 S59 11 65 12 S75 5 83 6"} fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>}
        {index === 5 && <span className="dataset-capacity-track" title="Storage capacity unavailable" aria-hidden="true" />}
      </a>
    ))}</div>
    <Panel id="dataset-catalog" title={`Dataset Catalog (${filtered.length})`} action={
      <button className="dataset-panel-action" onClick={() => setAllRows(value => !value)}>{allRows ? "Show Fewer" : "View All Datasets"} <ChevronRight size={13} /></button>
    }>
      {catalog.length ? <div className="dataset-scroll"><table className="overview-table dataset-table dataset-catalog-table">
        <thead><tr><th><input type="checkbox" aria-label="Select visible datasets" checked={allChecked} onChange={() => setSelected(existing => allChecked ? existing.filter(id => !catalog.some(item => item.id === id)) : [...new Set([...existing, ...catalog.map(item => item.id)])])} /></th>
          {["Dataset", "Project", "Latest Version", "Format", "Rows", "Columns", "Quality Score", "Downstream Models", "Updated", "Status", ""].map(label => <th key={label} scope="col">{label}</th>)}
        </tr></thead>
        <tbody>{catalog.map(item => <tr key={item.id} className={selected.includes(item.id) ? "dataset-row-selected" : undefined}>
          <td><input type="checkbox" aria-label={`Select ${item.name}`} checked={selected.includes(item.id)} onChange={() => setSelected(existing => existing.includes(item.id) ? existing.filter(id => id !== item.id) : [...existing, item.id])} /></td>
          <td><div className="dataset-name"><Database size={16} /><div><strong>{item.name}</strong><small>{item.description}</small></div></div></td>
          <td><span className="health-pill">{projectName(item)}</span></td><td>{version(item) ? <span className="health-pill">v{version(item)}</span> : "—"}</td>
          <td><span className="dataset-inline"><FileSpreadsheet size={14} />{({ PARQUET: "Parquet", FEATHER: "Feather" } as Record<string, string>)[item.format.toUpperCase()] ?? item.format}</span></td>
          <td>{count(item.row_count ?? item.latest_version?.row_count)}</td><td>{count(item.column_count ?? item.latest_version?.column_count)}</td>
          <td>{quality(item) === null ? "—" : <span className="health-pill">{quality(item)!.toFixed(1)}%</span>}</td>
          <td>{item.downstream_models ? <span className="dataset-inline"><Layers size={13} />{item.downstream_models.length}</span> : "—"}</td>
          <td title={new Date(timestamp(item)).toLocaleString()}>{age(timestamp(item))}</td>
          <td>
            {minio(item) ? <span className="catalog-status"><CloudUpload size={14} />Synced</span>
              : version(item) ? <span className="catalog-status"><i />Versioned</span>
              : <span className="catalog-status is-pending"><TriangleAlert size={13} />Awaiting upload</span>}
          </td>
          <td><button className="secondary-action" onClick={() => onOpen(item)}>Open Dataset <ArrowUpRight size={12} /></button></td>
        </tr>)}</tbody>
      </table></div> : empty}
    </Panel>
    <div className="dataset-grid dataset-metrics" id="dataset-metrics">
      <Panel title={`Versioning Activity (${historyDays} days)`}>
        <div className="dataset-chart-key"><span>Latest versions added</span><span>Profiled versions</span></div>
        <div className="dataset-plot"><ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={history} margin={{ top: 5, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="dataset-profiled-versions-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bff5c5" /><stop offset="100%" stopColor="#7edf87" />
            </linearGradient></defs>
            <CartesianGrid vertical={false} stroke="#e9eef0" />
            <XAxis dataKey="date" minTickGap={8} height={18} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} width={26} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip />
            <Bar dataKey="profiled" name="Profiled versions" fill="url(#dataset-profiled-versions-fill)" isAnimationActive={false} />
            <Line dataKey="versions" name="Latest versions added" stroke="#087d31" strokeWidth={2} dot={{ r: 2.5, fill: "white" }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer></div>
      </Panel>
      <Panel title="Dataset Quality Scores">
        {scored.length ? <div className="dataset-bars dataset-quality-bars">{scored.slice(0, 4).map(item => {
          const score = quality(item)!;
          return <div key={item.id}><button title={item.name} onClick={() => onOpen(item, "profiling")}>{item.name}</button><span className="dataset-bar"><i style={{ width: `${score}%` }} /></span><strong>{score.toFixed(1)}%</strong></div>;
        })}</div> : empty}
      </Panel>
      <Panel title="Storage Distribution by Dataset">
        {storage ? <div className="dataset-bars dataset-storage-bars">{largestDatasets.map(item => {
          const share = bytesFor(item) / storage * 100;
          const size = formatBytes(bytesFor(item)).replace(/\.0+(?= )/, "");
          const barStyle = { "--storage-share": `${share}%` } as CSSProperties;
          return <div key={item.id}>
            <button title={item.name} onClick={() => onOpen(item)}>{item.name}</button>
            <span className="dataset-storage-bar" style={barStyle} title={size}><b>{size}</b></span>
            <strong>{share.toFixed(1)}%</strong>
          </div>;
        })}</div> : empty}
      </Panel>
      <Panel title="Freshness & Validation Status">
        <div className="dataset-freshness"><div className="dataset-donut" style={{ background: "#e4e8ec" }}><div><strong>{filtered.length}</strong><small>Datasets</small></div></div>
          <dl>
            <div><dt><i className="freshness-dot" />On-time</dt><dd>—</dd></div>
            <div><dt><i className="freshness-dot is-light" />Late</dt><dd>—</dd></div>
            <div><dt><CalendarDays size={13} />Last refresh (avg)</dt><dd>—</dd></div>
            <div><dt><CalendarDays size={13} />Next scheduled refresh</dt><dd>—</dd></div>
          </dl>
        </div>
      </Panel>
      <Panel title="Schema & Null Monitoring" action={<button className="dataset-panel-action" onClick={() => setAllSchema(value => !value)}>{allSchema ? "Show Fewer" : "View Schema Details"} <ChevronRight size={13} /></button>}>
        {filtered.length ? <div className="dataset-scroll"><table className="overview-table dataset-table"><thead><tr><th>Dataset</th><th>Missing %</th><th>Duplicate %</th><th>Schema Changes</th><th>Status</th></tr></thead><tbody>
          {schemaRows.map((item, index) => {
            const rows = item.row_count ?? item.latest_version?.row_count;
            const columns = item.columns ?? item.latest_version?.schema_json?.columns;
            const report = validation?.dataset_id === item.id &&
              Date.parse(validation.created_at) >= Date.parse(item.latest_version?.created_at ?? item.created_at)
              ? validation : null;
            const profiledMissing = rows && Array.isArray(columns) && columns.length && columns.every(column => Number.isFinite(column.null_count))
              ? columns.reduce((total, column) => total + column.null_count, 0) / (rows * columns.length) * 100
              : null;
            const missing = report?.null_percentage ?? profiledMissing;
            const status = report ? validationLabels[report.status] : columns?.length ? "Profiled" : null;
            return <tr key={item.id}><td><button onClick={() => onOpen(item, "profiling")}>{item.name}</button></td>
              <td>{missing == null ? "—" : `${missing.toFixed(2)}%`}</td>
              <td>{report ? `${report.duplicate_percentage.toFixed(2)}%` : "—"}</td>
              <td>{schemaChanges(schemaHistories[index].data)}</td>
              <td>{status ? <span className={report && report.status !== "PASS" ? undefined : "health-pill"}>{status}</span> : "—"}</td>
            </tr>;
          })}
        </tbody></table></div> : empty}
      </Panel>
      <Panel title="Recent Dataset Activity" action={<button className="dataset-panel-action" onClick={() => setAllActivity(value => !value)}>{allActivity ? "Show Fewer" : "View All Activity"} <ChevronRight size={13} /></button>}>
        {recentActivity.length ? <div className="dataset-scroll"><table className="overview-table dataset-table"><thead><tr><th>Time</th><th>Event</th><th>Dataset</th><th>Project</th></tr></thead><tbody>
          {(allActivity ? recentActivity : recentActivity.slice(0, 4)).map(({ item, date, label, icon: Icon, id }) => (
            <tr key={id}>
              <td title={new Date(date).toLocaleString()}>{age(date)}</td>
              <td><span className="dataset-inline"><Icon size={15} />{label}</span></td>
              <td><button onClick={() => onOpen(item)}>{item.name}</button></td>
              <td><span className="health-pill">{projectName(item)}</span></td>
            </tr>
          ))}
        </tbody></table></div> : empty}
      </Panel>
    </div>
    <div className="dataset-grid dataset-health">
      <Panel id="dataset-integrations" title="DVC / MinIO Integration Health" action={onDvc && <button className="dataset-panel-action" onClick={onDvc}>DVC Settings <ChevronRight size={13} /></button>}>
        {filtered.length ? <div className="dataset-scroll"><table className="overview-table dataset-table"><thead><tr><th>Dataset</th><th>Git Tracked</th><th>DVC Hash</th><th>MinIO Sync</th><th>Checksum Validation</th></tr></thead><tbody>
          {filtered.slice(0, 4).map(item => {
            const hash = hashFor(item);
            return <tr key={item.id}>
              <td><button onClick={() => onOpen(item, "dvc")}>{item.name}</button></td>
              <td title="Git tracking status unavailable">—</td>
              <td title="DVC hash unavailable">—</td>
              <td title="MinIO synchronization status unavailable">{minio(item) ? "Key recorded" : "—"}</td>
              <td>{hash && !/^0+$/.test(hash) ? <span className="dataset-inline">
                <button className="dataset-hash dataset-inline" title="Copy recorded SHA-256 checksum" aria-label={`Copy SHA-256 checksum for ${item.name}`} onClick={() => onCopy(hash)}>
                  {copiedHash === hash ? "Copied" : `${hash.slice(0, 8)}…`} <Copy size={11} aria-hidden="true" />
                </button>
                <span title="Artifact checksum validation result unavailable">Unverified</span>
              </span> : "—"}</td>
            </tr>;
          })}
        </tbody></table></div> : empty}
      </Panel>
      <Panel title="Dataset Consumers">
        {filtered.some(item => item.downstream_models?.length) ? <div className="dataset-consumers-list">{filtered.filter(item => item.downstream_models?.length).map(item => (
          <button key={item.id} onClick={() => onOpen(item)}>{item.name}<span>{item.downstream_models!.join(", ")}</span></button>
        ))}</div> : <div className="dataset-consumers-empty"><span><Layers size={29} /></span><strong>Downstream status unavailable</strong><small>Dataset availability for training, experiments, and deployments is unknown.</small></div>}
      </Panel>
    </div>
  </>;
}
