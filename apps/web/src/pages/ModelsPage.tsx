import { useActionFeedback } from "../components/ActionFeedback";
import React, { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Box,
  ArrowUpCircle,
  ShieldCheck,
  Sparkles,
  Lock,
  ExternalLink,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Activity,
  Layers,
  Zap,
  Cpu,
  HardDrive,
  ArrowRight,
  Sliders,
  Filter,
  Clock,
  Inbox,
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { StatCard } from "../components/StatCard";
import { api, fetchModels, promoteModelVersion, syncModelMetrics } from "../api/client";
import { RegisteredModel } from "../api/types";
import { useAuth } from "../context/AuthContext";
import {
  AreaChart,
  Area,
  ComposedChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { AXIS_TICK, GRID_PROPS, BiTooltip, PALETTE } from "../components/charts/ChartKit";

export const ModelsPage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess } = useActionFeedback();
  const [searchParams] = useSearchParams();
  const project = searchParams.get("project") || undefined;
  const [models, setModels] = useState<RegisteredModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<RegisteredModel | null>(null);
  const [targetStage, setTargetStage] = useState("PRODUCTION");
  const [loading, setLoading] = useState(true);

  // Top header date filter ("Last 6 months" default)

  // Search & Stage Filter
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("search") || "");
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const [loadError, setLoadError] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [promoting, setPromoting] = useState(false);

  const loadModels = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setModels(await fetchModels(project));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadModels();
  }, [project]);

  const handlePromote = async () => {
    if (!selectedModel || promoting) return;
    setPromoting(true);
    setPromotionError(null);
    try {
      await promoteModelVersion(selectedModel.name, selectedModel.version, targetStage);
      showSuccess(`Model stage updated to ${targetStage}.`);
      setSelectedModel(null);
      await loadModels();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setPromotionError(typeof detail === "string" ? detail : error instanceof Error ? error.message : "The model stage could not be changed.");
    } finally {
      setPromoting(false);
    }
  };

  const [validatingModel, setValidatingModel] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const validateModel = async (model: RegisteredModel) => {
    setValidatingModel(true);
    setValidationMessage(null);
    try {
      const { data } = await api.get(`/models/${encodeURIComponent(model.name)}/versions/${model.version}/validation`);
      setValidationMessage(`${model.name} v${model.version}: artifact found, ${data.signature ? "input signature available" : "input signature missing"}.`);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setValidationMessage(typeof detail === "string" ? detail : "Could not validate the model artifact.");
    } finally {
      setValidatingModel(false);
    }
  };

  const [lineage, setLineage] = useState<{
    run_id: string | null;
    metrics: Record<string, number>;
    git_commit: string | null;
    dataset_sha256: string | null;
    matching_datasets: { name: string; version: number }[];
    model_artifact_present: boolean | null;
    dependency_files: string[];
    tracking_available: boolean;
  } | null>(null);
  const [lineageError, setLineageError] = useState(false);
  const [lineageLoading, setLineageLoading] = useState(false);

  const inspectLineage = async (model: RegisteredModel) => {
    setLineage(null);
    setLineageError(false);
    setLineageLoading(true);
    try {
      const result = await api.get(`/models/${encodeURIComponent(model.name)}/versions/${model.version}/lineage`);
      setLineage(result.data);
    } catch {
      setLineageError(true);
    } finally {
      setLineageLoading(false);
    }
  };

  const [syncingMetrics, setSyncingMetrics] = useState(false);

  const syncMetrics = async () => {
    setSyncingMetrics(true);
    try {
      const results = await Promise.allSettled(models.filter((model) => model.mlflow_run_id)
        .map((model) => syncModelMetrics(model.name, model.version)));
      await loadModels();
      const synced = results.filter((result) => result.status === "fulfilled").length;
      showSuccess(`Synced metrics for ${synced} of ${results.length} model versions.`);
    } finally {
      setSyncingMetrics(false);
    }
  };

  const canPromote = user?.role === "USER" || user?.role === "MAINTAINER" || user?.role === "ADMIN";
  const canViewAudit = user?.role === "MAINTAINER" || user?.role === "ADMIN";

  // Stage breakdown counts
  const productionCount = useMemo(() => models.filter((m) => m.stage === "PRODUCTION").length, [models]);
  const stagingCount = useMemo(() => models.filter((m) => m.stage === "STAGING").length, [models]);
  const candidateCount = useMemo(() => models.filter((m) => m.stage === "CANDIDATE").length, [models]);
  const devCount = useMemo(() => models.filter((m) => m.stage === "DEVELOPMENT" || !m.stage).length, [models]);

  // Sorting state for models table
  const [sortField, setSortField] = useState<"name" | "version" | "stage" | "framework" | "latency">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: "name" | "version" | "stage" | "framework" | "latency") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtered & sorted models for table
  const filteredModels = useMemo(() => {
    const list = models.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.mlflow_run_id && m.mlflow_run_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.framework && m.framework.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStage = stageFilter === "ALL" || (m.stage || "DEVELOPMENT") === stageFilter;
      return matchesSearch && matchesStage;
    });

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "version") {
        comparison = a.version - b.version;
      } else if (sortField === "stage") {
        comparison = (a.stage || "").localeCompare(b.stage || "");
      } else if (sortField === "framework") {
        comparison = (a.framework || "").localeCompare(b.framework || "");
      } else if (sortField === "latency") {
        comparison = (a.metrics?.p95_latency_ms || 0) - (b.metrics?.p95_latency_ms || 0);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [models, searchQuery, stageFilter, sortField, sortDirection]);

  const footprint = models.flatMap(({ name, version, metrics }) => {
    const lat = metrics?.p95_latency_ms;
    const size = metrics?.size_mb;
    return lat == null && size == null ? [] : [{ name: `${name} v${version}`, lat, size }];
  });
  const challengers = models.flatMap(({ name, version, metrics, stage }) => {
    const acc = metrics?.accuracy;
    const lat = metrics?.p95_latency_ms;
    const mb = metrics?.size_mb;
    if (acc == null || lat == null || mb == null) return [];
    return [{ name: `${name} v${version}`, acc, lat, mb, fill: stage === "PRODUCTION" ? "#3BB48C" : "#64748B" }];
  });
  const registrations = new Map<string, number>();
  for (const { created_at } of models) {
    const date = new Date(created_at);
    if (Number.isNaN(date.getTime())) continue;
    const month = date.toISOString().slice(0, 7);
    registrations.set(month, (registrations.get(month) ?? 0) + 1);
  }
  const registryGrowth = [...registrations].sort(([a], [b]) => a.localeCompare(b))
    .map(([month, registered]) => ({ month, registered }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
            Model Registry &amp; Governance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized version management, input/output signatures, and formal stage promotions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role !== "VIEWER" && models.some((model) => model.mlflow_run_id) && (
            <button type="button" disabled={syncingMetrics} onClick={() => void syncMetrics()}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-50">
              {syncingMetrics ? "Syncing…" : "Sync Run Metrics"}
            </button>
          )}
          <button
            onClick={loadModels}
            className="p-1.5 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900 hover:border-slate-300 transition shadow-2xs"
            title="Refresh models"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#3BB48C]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Top 4 KPI StatCards (Clean Snowflake Style) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          title="Active In Production"
          value={`${productionCount} Models`}
          subtitle="Single active prod rule enforced"
          icon={ShieldCheck}
          color="brand"
          trend={productionCount ? "Production" : "None"}
        />
        <StatCard
          title="Staging & Candidates"
          value={`${stagingCount + candidateCount} Validating`}
          subtitle="Pre-release shadow validation"
          icon={Sparkles}
          color="brand"
          trend="Ready to Promote"
        />
        <StatCard
          title="Cataloged Versions"
          value={`${models.length} Models`}
          subtitle="Tracked in MLflow registry"
          icon={Box}
          color="brand"
          trend={models.length ? "Tracked" : "None"}
        />
      </div>

      {/* ── Model Promotion Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CHART 1: Model Promotion Pipeline (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Model Promotion Pipeline
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Distribution across lifecycle stages
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Single-Active Rule
              </span>
            </div>

            {(() => {
              const stageData = [
                { stage: "Development", count: devCount, stageKey: "DEVELOPMENT", fill: "#94A3B8" },
                { stage: "Candidate", count: candidateCount, stageKey: "CANDIDATE", fill: "#64748B" },
                { stage: "Staging", count: stagingCount, stageKey: "STAGING", fill: "#475569" },
                { stage: "Production", count: productionCount, stageKey: "PRODUCTION", fill: "#3BB48C" },
              ];
              const total = models.length || 1;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 mt-1">
                  <div className="h-52 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <BiTooltip
                                active
                                label={d.stage}
                                payload={[
                                  { name: "Active Models", value: d.count, color: d.fill },
                                  { name: "Share", value: `${Math.round((d.count / total) * 100)}%`, color: "#64748B" },
                                ]}
                              />
                            );
                          }}
                        />
                        <Pie
                          data={stageData}
                          dataKey="count"
                          nameKey="stage"
                          innerRadius="65%"
                          outerRadius="90%"
                          paddingAngle={2}
                          stroke="none"
                          onClick={(entry) => setStageFilter(stageFilter === entry.stageKey ? "ALL" : entry.stageKey)}
                          className="cursor-pointer"
                        >
                          {stageData.map((s) => (
                            <Cell key={s.stageKey} fill={s.fill} fillOpacity={stageFilter === "ALL" || stageFilter === s.stageKey ? 1 : 0.35} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold font-mono text-slate-900">{models.length}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Versions</span>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {stageData.map((s) => (
                      <li key={s.stageKey}>
                        <button
                          onClick={() => setStageFilter(stageFilter === s.stageKey ? "ALL" : s.stageKey)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded border text-xs transition ${
                            stageFilter === s.stageKey ? "border-[#3BB48C] bg-slate-50" : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex items-center gap-2 font-medium text-slate-700">
                            <span className="w-2 h-2 rounded-full" style={{ background: s.fill }} />
                            {s.stage}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            <strong className="text-slate-900">{s.count}</strong> · {Math.round((s.count / total) * 100)}%
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
            <span>Promotion Gate: Cryptographic Hash Locked</span>
            <span>Audit Trail Enabled</span>
          </div>
        </div>

        {/* CHART 2: Model Latency & Memory Footprint (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Model Footprint vs. Speed
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Serving p95 latency (ms) and artifact size (MB)
                </p>
              </div>
            </div>

            <div className="h-52 w-full">
              {footprint.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={footprint}
                  margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                >
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="name" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}ms`} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}MB`} />
                  <RechartsTooltip content={<BiTooltip valueFormatter={(v) => (typeof v === "number" ? v.toFixed(1) : v)} />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar yAxisId="left" dataKey="lat" name="Latency (ms)" fill="#3BB48C" radius={[3, 3, 0, 0]} barSize={28} />
                  <Line yAxisId="right" type="monotone" dataKey="size" name="Size (MB)" stroke="#334155" strokeWidth={1.8} dot={{ r: 3, fill: "#fff", strokeWidth: 1.5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-xs text-slate-500">No latency or footprint metrics recorded.</div>
            )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-100 text-xs font-mono text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#3BB48C]" />
              Latency (ms)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-[2px] bg-[#334155]" />
              Footprint (MB)
            </span>
          </div>
        </div>
      </div>

      {/* ── Row 2: Registry Growth & Governance Scorecard (Snowflake Clean Look) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5 shadow-2xs">
          <div className="mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Registry Growth
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Registered versions by month</p>
          </div>
          <div className="h-56">
            {registryGrowth.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={registryGrowth}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="month" tick={AXIS_TICK} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} />
                  <RechartsTooltip content={<BiTooltip />} />
                  <Area type="monotone" dataKey="registered" name="Registered versions" stroke="#329F7B" fill="#D1FAE5" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-xs text-slate-500">No dated model versions recorded.</div>
            )}
          </div>
        </div>
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 shadow-2xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Governance Scorecard</h3>
          <div className="grid h-56 place-items-center text-xs text-slate-500">
            No governance coverage data available.
          </div>
        </div>
      </div>

      {/* ── Row 3: Champion vs Challenger ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-12 bg-white border border-slate-200 rounded-md p-5 shadow-2xs">
          <div className="mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Champion vs. Challenger
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Accuracy vs. p95 latency — bubble size = model footprint (MB)</p>
          </div>
          <div className="h-56">
            {challengers.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis type="number" dataKey="lat" name="Latency" domain={[0, "auto"]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}ms`} />
                  <YAxis type="number" dataKey="acc" name="Accuracy" domain={[0, 1]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <ZAxis type="number" dataKey="mb" range={[90, 420]} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload;
                      return (
                        <BiTooltip
                          active
                          label={p.name}
                          payload={[
                            { name: "Accuracy", value: `${(p.acc * 100).toFixed(1)}%`, color: p.fill },
                            { name: "p95 Latency", value: `${p.lat} ms`, color: "#475569" },
                            { name: "Footprint", value: `${p.mb} MB`, color: "#475569" },
                          ]}
                        />
                      );
                    }}
                  />
                  <Scatter data={challengers}>
                    {challengers.map((c) => (
                      <Cell key={c.name} fill={c.fill} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Inbox className="w-8 h-8 mb-2 stroke-1 text-slate-300" />
                <p className="font-semibold text-slate-600">No Evaluated Models</p>
                <p className="text-[11px] text-slate-400 mt-1">Register and evaluate model versions to view the matrix.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {canViewAudit && (
        <Link to="/app/audit" className="inline-block text-xs font-medium text-emerald-700 underline">
          View stage transitions in Audit Logs
        </Link>
      )}

      {loadError && (
        <p role="alert" className="text-xs text-rose-700">Could not load the model registry.</p>
      )}

      {validationMessage && <p role="status" className="rounded-md border border-slate-200 bg-white p-3 text-sm">{validationMessage}</p>}

      {(lineageLoading || lineageError || lineage) && (
        <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div className="flex justify-between">
            <h3 className="font-semibold">Model Lineage</h3>
            {!lineageLoading && <button type="button" onClick={() => { setLineage(null); setLineageError(false); }}>Close</button>}
          </div>
          {lineageLoading && <p role="status">Loading lineage…</p>}
          {lineageError && <p role="alert">Could not load model lineage.</p>}
          {lineage && (
            <dl className="grid gap-2 text-xs">
              <div><dt className="font-semibold">MLflow run</dt><dd>{lineage.run_id ?? "Unavailable"}</dd></div>
              <div><dt className="font-semibold">Dataset SHA-256</dt><dd className="break-all">{lineage.dataset_sha256 ?? "Unavailable"}</dd></div>
              <div><dt className="font-semibold">Uploaded versions matching the checksum</dt><dd>{lineage.matching_datasets.map((dataset) => `${dataset.name} v${dataset.version}`).join(", ") || "None found"}</dd></div>
              <div><dt className="font-semibold">Git commit</dt><dd className="break-all">{lineage.git_commit ?? "Unavailable"}</dd></div>
              <div><dt className="font-semibold">MLflow model artifact</dt><dd>{lineage.model_artifact_present == null ? "Unavailable" : lineage.model_artifact_present ? "Found" : "Missing"}</dd></div>
              <div><dt className="font-semibold">Dependency manifests</dt><dd>{lineage.dependency_files.join(", ") || "Unavailable"}</dd></div>
              <div><dt className="font-semibold">Recorded metrics</dt><dd>{Object.entries(lineage.metrics).map(([name, value]) => `${name}: ${value}`).join(", ") || "Unavailable"}</dd></div>
            </dl>
          )}
        </section>
      )}

      {/* ── Explorer Toolbar: Search & Stage Filter (Snowflake Clean Style) ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models by name, framework, or MLflow run ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] transition font-sans"
          />
        </div>

        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          {["ALL", "PRODUCTION", "STAGING", "CANDIDATE", "DEVELOPMENT"].map((st) => (
            <button
              key={st}
              onClick={() => setStageFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                stageFilter === st
                  ? "bg-[#3BB48C] text-white shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {st === "ALL" ? "All Stages" : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Models Registry Dense Table (Snowflake Enterprise Look) ── */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-2xs">
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Registered Models ({filteredModels.length})
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {productionCount} active production • {stagingCount} staging
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
              <tr>
                <th
                  onClick={() => handleSort("name")}
                  className="px-4 py-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Model Name</span>
                    {sortField === "name" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("version")}
                  className="px-3 py-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Version</span>
                    {sortField === "version" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("stage")}
                  className="px-3 py-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Lifecycle Stage</span>
                    {sortField === "stage" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("framework")}
                  className="px-3 py-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Framework</span>
                    {sortField === "framework" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("latency")}
                  className="px-3 py-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Latency</span>
                    {sortField === "latency" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th className="px-3 py-2.5 whitespace-nowrap">
                  <span>MLflow Run</span>
                </th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredModels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No models match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredModels.map((m, idx) => {
                  const stage = (m.stage || "DEVELOPMENT").toUpperCase();
                  return (
                    <tr key={idx} className="h-11 hover:bg-slate-50 transition-colors group">
                      {/* Model Name */}
                      <td className="px-4 py-2">
                        <span className="font-semibold text-slate-900 group-hover:text-[#3BB48C] transition-colors">
                          {m.name}
                        </span>
                      </td>

                      {/* Version */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-slate-600">
                          v{m.version}
                        </span>
                      </td>

                      {/* Stage - Inline Status indicator without bulky badge */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              stage === "PRODUCTION"
                                ? "bg-[#3BB48C]"
                                : stage === "STAGING"
                                ? "bg-amber-500"
                                : stage === "CANDIDATE"
                                ? "bg-slate-600"
                                : "bg-slate-400"
                            }`}
                          />
                          <span className="capitalize">{stage.toLowerCase()}</span>
                        </span>
                      </td>

                      {/* Framework */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-slate-600">
                          {m.framework || "—"}
                        </span>
                      </td>

                      {/* Latency */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-slate-700">
                          {m.metrics?.p95_latency_ms != null ? `${m.metrics?.p95_latency_ms} ms` : "—"}
                        </span>
                      </td>

                      {/* MLflow Run ID */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        {m.mlflow_run_id ? (
                          <span
                            className="font-mono text-[11px] text-slate-500 hover:text-slate-900 cursor-pointer"
                            title={`Full MLflow Run ID: ${m.mlflow_run_id}`}
                          >
                            #{m.mlflow_run_id.slice(0, 10)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button type="button" disabled={validatingModel} onClick={() => void validateModel(m)}
                          className="mr-2 text-xs text-emerald-700 underline disabled:opacity-50">
                          Validate
                        </button>
                        <button type="button" disabled={lineageLoading} onClick={() => void inspectLineage(m)}
                          className="mr-2 text-xs text-emerald-700 underline disabled:opacity-50">
                          Lineage
                        </button>
                        <button
                          onClick={() => { setPromotionError(null); setSelectedModel(m); }}
                          disabled={!canPromote}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition shadow-2xs ${
                            canPromote
                              ? "bg-[#3BB48C] hover:bg-[#329F7B] text-white border border-[#329F7B] cursor-pointer"
                              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                          }`}
                          title={canPromote ? "Promote model stage" : "Your role cannot promote models"}
                        >
                          <ArrowUpCircle className="w-3 h-3" />
                          <span>Promote</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Stage Promotion Modal (Snowflake Clean Look) ── */}
      {selectedModel && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-md max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Promote Model Stage
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target: <strong className="text-slate-800">{selectedModel.name}</strong> (v{selectedModel.version})
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Select Target Stage
                </label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] font-sans"
                >
                  <option value="DEVELOPMENT">DEVELOPMENT (Training Sandbox)</option>
                  <option value="CANDIDATE">CANDIDATE (Validation Pending)</option>
                  <option value="STAGING">STAGING (Pre-release Testing)</option>
                  <option value="PRODUCTION">PRODUCTION (Live Serving)</option>
                  <option value="ARCHIVED">ARCHIVED (Decommissioned)</option>
                </select>
              </div>

              {targetStage === "PRODUCTION" && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 font-mono">
                  <strong className="text-slate-900">Single-Active Rule</strong>: Promoting to Production automatically demotes any current production model of this group to Staging.
                </div>
              )}

              {promotionError && <p role="alert" className="text-xs text-rose-700">{promotionError}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={promoting}
                  onClick={() => setSelectedModel(null)}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  disabled={promoting}
                  onClick={handlePromote}
                  className="px-3 py-1 rounded bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-semibold border border-[#329F7B] shadow-2xs transition"
                >
                  {promoting ? "Saving…" : "Confirm Stage Transition"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
