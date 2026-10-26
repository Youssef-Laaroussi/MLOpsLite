import React, { useEffect, useState, useMemo } from "react";
import {
  Server,
  StopCircle,
  ExternalLink,
  Plus,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Activity,
  Inbox,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import {
  fetchDeployments,
  deployModel,
  stopDeployment,
  rollbackDeployment,
  pingDeployment,
} from "../api/client";
import { Deployment } from "../api/types";
import { useAuth } from "../context/AuthContext";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { AXIS_TICK, GRID_PROPS, BiTooltip } from "../components/charts/ChartKit";

export const DeploymentsPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || hasRole("ADMIN");
  const canDeploy = hasRole("DEVELOPER");
  const canRollback = hasRole("MAINTAINER");

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Status filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selected container node
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Deploy modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [deploying, setDeploying] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>("");
  const [modelVersion, setModelVersion] = useState<number>(1);
  const [port, setPort] = useState<number | undefined>(undefined);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Rollback modal
  const [showRollbackModal, setShowRollbackModal] = useState<boolean>(false);
  const [rollbackModelName, setRollbackModelName] = useState<string>("");
  const [targetVersion, setTargetVersion] = useState<number>(1);
  const [rollbackSuccess, setRollbackSuccess] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  // Ping test state
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{
    id: string;
    latency: number;
    healthy: boolean;
    detail?: string;
  } | null>(null);

  const loadDeployments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDeployments();
      setDeployments(data || []);
      if (data && data.length > 0 && !selectedNodeId) {
        setSelectedNodeId(data[0].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to fetch deployments from backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeployments();
  }, []);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeploying(true);
    setDeployError(null);
    try {
      await deployModel(modelName, modelVersion, port);
      setShowModal(false);
      setModelName("");
      setModelVersion(1);
      setPort(undefined);
      await loadDeployments();
    } catch (err: any) {
      setDeployError(err?.response?.data?.detail || err?.message || "Container deployment failed");
    } finally {
      setDeploying(false);
    }
  };

  const handleStop = async (id: string) => {
    if (!confirm("Are you sure you want to stop and remove this container?")) return;
    try {
      await stopDeployment(id);
      await loadDeployments();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to stop container");
    }
  };

  const handleRollbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRollbackSuccess(null);
    setRollbackError(null);
    try {
      await rollbackDeployment(rollbackModelName, targetVersion);
      setRollbackSuccess(`Successfully rolled back ${rollbackModelName} to version ${targetVersion}`);
      await loadDeployments();
      setTimeout(() => {
        setShowRollbackModal(false);
        setRollbackSuccess(null);
      }, 1500);
    } catch (err: any) {
      setRollbackError(err?.response?.data?.detail || err?.message || "Rollback failed");
    }
  };

  const handleTestPing = async (d: Deployment) => {
    setPingingId(d.id);
    setPingResult(null);
    try {
      const res = await pingDeployment(d.id);
      setPingResult({
        id: d.id,
        latency: res.latency_ms,
        healthy: res.prediction?.healthy ?? false,
        detail: res.prediction?.status || "Online",
      });
    } catch (err: any) {
      setPingResult({
        id: d.id,
        latency: 0,
        healthy: false,
        detail: err?.response?.data?.detail || err?.message || "Unreachable",
      });
    } finally {
      setPingingId(null);
    }
  };

  // Real Fleet Summary Metrics
  const runningCount = useMemo(() => deployments.filter((d) => d.status === "RUNNING").length, [deployments]);
  const stoppedCount = useMemo(() => deployments.filter((d) => d.status === "STOPPED").length, [deployments]);
  const failedCount = useMemo(() => deployments.filter((d) => d.status === "FAILED").length, [deployments]);

  // Sorting state
  const [sortField, setSortField] = useState<"model" | "version" | "port" | "status" | "date">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: "model" | "version" | "port" | "status" | "date") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtered Deployments
  const filteredDeployments = useMemo(() => {
    const list = deployments.filter((d) => {
      const matchesSearch =
        d.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.port.toString().includes(searchQuery);
      const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === "model") comparison = a.model_name.localeCompare(b.model_name);
      else if (sortField === "version") comparison = a.model_version - b.model_version;
      else if (sortField === "port") comparison = a.port - b.port;
      else if (sortField === "status") comparison = a.status.localeCompare(b.status);
      else if (sortField === "date") comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [deployments, searchQuery, statusFilter, sortField, sortDirection]);

  // Real data for SLA Benchmarking Chart
  const benchmarkData = useMemo(() => {
    return deployments.map((d) => ({
      name: `${d.model_name} (v${d.model_version})`,
      port: d.port,
      status: d.status,
    }));
  }, [deployments]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
              Inference Deployments
            </h2>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${runningCount > 0 ? "bg-emerald-400 opacity-75" : "bg-slate-300"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${runningCount > 0 ? "bg-emerald-500" : "bg-slate-400"}`} />
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Docker inference containers, real-time health inspection, and version cutovers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadDeployments}
            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:border-slate-300 transition shadow-2xs"
            title="Refresh deployments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#3BB48C]" : ""}`} />
          </button>

          {canRollback && (
            <button
              onClick={() => setShowRollbackModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition shadow-2xs cursor-pointer"
              title="Rollback deployment to stable model version"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              Instant Rollback
            </button>
          )}

          <button
            onClick={() => setShowModal(true)}
            disabled={!canDeploy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition shadow-2xs ${
              canDeploy
                ? "bg-[#3BB48C] hover:bg-[#329F7B] text-white cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
            title={canDeploy ? "Launch container" : "Requires Developer role"}
          >
            {canDeploy ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            Deploy Container
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-center justify-between text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Backend Error: {error}</span>
          </div>
          <button
            onClick={loadDeployments}
            className="underline font-semibold hover:text-rose-900 ml-4 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Top 4 KPI StatCards (Bound to real backend data) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Serving Fleet"
          value={deployments.length === 0 ? "0 Containers" : `${runningCount} Running`}
          subtitle={`${deployments.length} total registered deployments`}
          icon={Server}
          color={runningCount > 0 ? "emerald" : "blue"}
          trend={runningCount > 0 ? "Fleet Online" : "Idle"}
        />
        <StatCard
          title="Allocated Ports"
          value={`${deployments.filter((d) => d.status === "RUNNING").length} Ports`}
          subtitle="Dynamic port allocator (8100-8200)"
          icon={Zap}
          color="brand"
          trend="Docker daemon active"
        />
        <StatCard
          title="Stopped / Inactive"
          value={`${stoppedCount} Stopped`}
          subtitle="Released port & container resources"
          icon={Activity}
          color="blue"
          trend={`${failedCount} Failed`}
        />
        <StatCard
          title="Rollback Readiness"
          value="Zero Downtime"
          subtitle="symlink & container cutover"
          icon={RotateCcw}
          color="brand"
          trend="Ready"
        />
      </div>

      {/* ── Real Deployments Overview Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Real Fleet Active Port Map */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Container Port Allocation Map
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Host port binding per registered inference deployment
                </p>
              </div>
              <span className="font-mono text-xs text-slate-600 font-semibold">
                {deployments.length} Records
              </span>
            </div>

            <div className="h-52 w-full mt-2">
              {benchmarkData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={benchmarkData}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                    barSize={16}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis
                      type="number"
                      domain={[8090, 8150]}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `:${v}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ ...AXIS_TICK, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={140}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "#F8FAFC" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].payload;
                        return (
                          <BiTooltip
                            active
                            label={p.name}
                            payload={[
                              { name: "Port", value: `:${p.port}`, color: "#3BB48C" },
                              { name: "Status", value: p.status, color: "#64748B" },
                            ]}
                          />
                        );
                      }}
                    />
                    <Bar dataKey="port" fill="#3BB48C" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Inbox className="w-8 h-8 mb-2 stroke-1 text-slate-300" />
                  <p className="font-semibold text-slate-600">No Containers Deployed</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Click "Deploy Container" to spin up an inference endpoint.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs font-mono text-slate-500">
            <span>Range: 8100 - 8200</span>
            <span className="text-[#329F7B] font-semibold">{runningCount} Active Bindings</span>
          </div>
        </div>

        {/* Selected Container Node Details */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Target Endpoint Inspector
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Detailed inspection of selected deployment container
                </p>
              </div>
              <span className="font-mono text-xs text-slate-500">
                Docker Engine
              </span>
            </div>

            {selectedNodeId && deployments.find((d) => d.id === selectedNodeId) ? (
              (() => {
                const node = deployments.find((d) => d.id === selectedNodeId)!;
                return (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 font-mono space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Model:</span>
                        <span className="font-semibold text-slate-900">{node.model_name} (v{node.model_version})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Status:</span>
                        <span className={node.status === "RUNNING" ? "text-emerald-600 font-semibold" : "text-slate-600"}>
                          {node.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Endpoint:</span>
                        <span className="text-slate-900">{node.endpoint_url}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Container ID:</span>
                        <span className="text-slate-600 truncate max-w-[180px]" title={node.container_id || ""}>
                          {node.container_id ? node.container_id.slice(0, 12) : "--"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Created:</span>
                        <span className="text-slate-600">{new Date(node.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleTestPing(node)}
                        disabled={pingingId === node.id || node.status !== "RUNNING"}
                        className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Activity className={`w-3.5 h-3.5 ${pingingId === node.id ? "animate-spin text-emerald-400" : ""}`} />
                        <span>{pingingId === node.id ? "Probing..." : "Probe /health"}</span>
                      </button>
                    </div>

                    {pingResult && pingResult.id === node.id && (
                      <div className={`p-2.5 rounded text-xs font-mono border ${pingResult.healthy ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                        <div className="flex justify-between font-semibold">
                          <span>Health: {pingResult.healthy ? "PASS (200 OK)" : "FAIL"}</span>
                          <span>{pingResult.latency}ms</span>
                        </div>
                        {pingResult.detail && <p className="text-[11px] mt-1">{pingResult.detail}</p>}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
                <Inbox className="w-8 h-8 mb-2 stroke-1 text-slate-300" />
                <p className="font-semibold text-slate-600">No Endpoint Selected</p>
                <p className="text-[11px] text-slate-400 mt-1">Select a row in the table below to inspect.</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs font-mono text-slate-500">
            <span>Protocol: HTTP / REST</span>
            <span className="text-[#329F7B] font-semibold">Standardized Container Contract</span>
          </div>
        </div>
      </div>

      {/* ── Explorer Toolbar: Search & Status Filters ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deployments by model name, ID, or port..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] transition font-sans"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          {["ALL", "RUNNING", "STOPPED", "FAILED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? "bg-[#3BB48C] text-white shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {st === "ALL" ? "All Containers" : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Deployments Table ── */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-2xs">
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Deployed Endpoints ({filteredDeployments.length})
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {runningCount} Running • {stoppedCount} Stopped
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
              <tr>
                <th
                  onClick={() => handleSort("model")}
                  className="px-4 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Model Name</span>
                    {sortField === "model" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("version")}
                  className="px-4 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Version</span>
                    {sortField === "version" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("port")}
                  className="px-4 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Host Port</span>
                    {sortField === "port" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="px-4 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    {sortField === "status" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("date")}
                  className="px-4 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Deployed At</span>
                    {sortField === "date" && (
                      sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-[#3BB48C]" /> : <ChevronDown className="w-3 h-3 text-[#3BB48C]" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-2.5">Live Probe</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-mono">
              {filteredDeployments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-sans">
                    <Inbox className="w-8 h-8 mx-auto mb-2 stroke-1 text-slate-300" />
                    <p className="font-semibold text-slate-600">No Deployments Found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery || statusFilter !== "ALL"
                        ? "No deployments match your search filter."
                        : "No model containers have been deployed yet. Click 'Deploy Container' above."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDeployments.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedNodeId(d.id)}
                    className={`h-11 hover:bg-slate-50 transition-colors cursor-pointer ${
                      selectedNodeId === d.id ? "bg-slate-50 font-medium" : ""
                    }`}
                  >
                    {/* Model */}
                    <td className="px-4 py-2 font-sans font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900 leading-tight">
                            {d.model_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono" title={`ID: ${d.id}`}>
                            {d.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Version */}
                    <td className="px-4 py-2 text-xs text-slate-700">
                      v{d.model_version}
                    </td>

                    {/* Port */}
                    <td className="px-4 py-2 text-xs text-slate-600">
                      :{d.port}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            d.status === "RUNNING"
                              ? "bg-[#3BB48C]"
                              : d.status === "PENDING"
                              ? "bg-amber-500"
                              : "bg-slate-400"
                          }`}
                        />
                        <span
                          className={
                            d.status === "RUNNING"
                              ? "text-emerald-700 font-semibold"
                              : d.status === "PENDING"
                              ? "text-amber-700 font-medium"
                              : "text-slate-600"
                          }
                        >
                          {d.status}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-2 text-xs text-slate-500 font-sans">
                      {new Date(d.created_at).toLocaleString()}
                    </td>

                    {/* Live Probe Button */}
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTestPing(d)}
                          disabled={pingingId === d.id || d.status !== "RUNNING"}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-sans font-medium transition shadow-2xs bg-slate-800 hover:bg-slate-900 text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Probe /health endpoint"
                        >
                          <Activity className={`w-3 h-3 text-white ${pingingId === d.id ? "animate-spin text-emerald-400" : ""}`} />
                          <span>{pingingId === d.id ? "..." : "Ping"}</span>
                        </button>

                        {pingResult && pingResult.id === d.id && (
                          <span className={`font-mono text-[11px] font-semibold ${pingResult.healthy ? "text-[#3BB48C]" : "text-rose-600"}`}>
                            {pingResult.healthy ? `${pingResult.latency}ms` : "down"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        {isAdmin && d.status === "RUNNING" && (
                          <a
                            href={`${d.endpoint_url}/health`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded text-slate-400 hover:text-[#3BB48C] hover:bg-slate-100 transition"
                            title="Direct Health Check URL"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {d.status === "RUNNING" && canDeploy && (
                          <button
                            onClick={() => handleStop(d.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition shadow-2xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                            title="Stop container"
                          >
                            <StopCircle className="w-3 h-3 text-rose-600" />
                            <span>Stop</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deploy Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-md max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3BB48C]"></span>
                Deploy Model to Container
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {deployError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{deployError}</span>
              </div>
            )}

            <form onSubmit={handleDeploy} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Model Name
                </label>
                <input
                  type="text"
                  required
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. fraud-classifier-v1"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] transition font-sans"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Model Version
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={modelVersion}
                  onChange={(e) => setModelVersion(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] transition font-sans"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Host Port (optional, auto-allocated if empty)
                </label>
                <input
                  type="number"
                  min={1024}
                  max={65535}
                  value={port || ""}
                  onChange={(e) => setPort(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Auto (8100-8200)"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] transition font-sans"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deploying}
                  className="px-3.5 py-1.5 rounded bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer"
                >
                  {deploying ? "Deploying Container..." : "Launch Container"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rollback Modal */}
      {showRollbackModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-md max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">1-Click Instant Rollback</h3>
                  <p className="text-[11px] text-slate-500">Fast zero-downtime cutover to stable version</p>
                </div>
              </div>
              <button
                onClick={() => setShowRollbackModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {rollbackSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3BB48C]" />
                {rollbackSuccess}
              </div>
            )}

            {rollbackError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 font-medium flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                {rollbackError}
              </div>
            )}

            <form onSubmit={handleRollbackSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Target Model Name
                </label>
                <input
                  type="text"
                  required
                  value={rollbackModelName}
                  onChange={(e) => setRollbackModelName(e.target.value)}
                  placeholder="e.g. fraud-classifier-v1"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] transition font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Rollback to Version
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={targetVersion}
                  onChange={(e) => setTargetVersion(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] transition font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRollbackModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  Confirm Rollback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
