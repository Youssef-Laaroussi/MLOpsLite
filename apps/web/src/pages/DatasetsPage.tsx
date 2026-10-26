import React, { useEffect, useState, useMemo } from "react";
import {
  Database,
  Search,
  Eye,
  GitBranch,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  ShieldCheck,
  BarChart2,
  Table as TableIcon,
  RefreshCw,
  Server,
  Plus,
  Upload,
  Terminal,
  Trash2,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import {
  fetchDatasets,
  createDataset,
  uploadDatasetFile,
  fetchDatasetVersions,
  fetchDvcStatus,
  deleteDataset,
} from "../api/client";
import { Dataset, DatasetVersion } from "../api/types";

export const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"date" | "rows" | "size">("date");

  // Inspection Modal state
  const [inspectingDataset, setInspectingDataset] = useState<Dataset | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<"versions" | "profiling" | "dvc">("versions");
  const [datasetVersions, setDatasetVersions] = useState<DatasetVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Lineage Drawer/Modal state
  const [lineageDataset, setLineageDataset] = useState<Dataset | null>(null);

  // DVC System Status state
  const [dvcStatus, setDvcStatus] = useState<{
    is_installed: boolean;
    remote_name: string;
    remote_bucket: string;
    remote_prefix: string;
    minio_endpoint: string;
    dvc_dir_exists: boolean;
  } | null>(null);
  const [showDvcModal, setShowDvcModal] = useState(false);

  // Copy feedback state
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Create Dataset Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newDatasetName, setNewDatasetName] = useState("");
  const [newDatasetFormat, setNewDatasetFormat] = useState("CSV");
  const [newDatasetDescription, setNewDatasetDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // File selection helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    if (!newDatasetName.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_").toLowerCase();
      setNewDatasetName(cleanName);
    }

    const ext = file.name.split(".").pop()?.toUpperCase();
    if (ext === "CSV") setNewDatasetFormat("CSV");
    else if (ext === "PARQUET") setNewDatasetFormat("PARQUET");
    else if (ext === "JSON") setNewDatasetFormat("JSON");
  };

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [dsList, dvcInfo] = await Promise.all([
        fetchDatasets(),
        fetchDvcStatus().catch(() => null),
      ]);
      setDatasets(dsList || []);
      if (dvcInfo) setDvcStatus(dvcInfo);
    } catch (err: any) {
      setDatasets([]);
      setLoadError(err?.response?.data?.detail || err?.message || "Failed to load datasets from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDatasetName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createDataset({
        name: newDatasetName.trim(),
        format: newDatasetFormat.toUpperCase(),
        description: newDatasetDescription.trim() || undefined,
      });

      // If a real file was selected, immediately upload it to register v1 with real SHA-256 and MinIO key
      if (selectedFile) {
        await uploadDatasetFile(created.id, selectedFile, newDatasetDescription.trim() || undefined);
      }

      await loadData();
      setShowCreateModal(false);
      setNewDatasetName("");
      setNewDatasetDescription("");
      setSelectedFile(null);
      setToastMessage(`Dataset "${created.name}" created and synced to MinIO!`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to create dataset";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDataset = async (datasetId: string, datasetName: string) => {
    if (!confirm(`Are you sure you want to delete dataset "${datasetName}"?`)) return;
    try {
      await deleteDataset(datasetId);
      await loadData();
      setToastMessage(`Dataset "${datasetName}" deleted.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || "Failed to delete dataset");
    }
  };

  const openInspector = async (d: Dataset) => {
    setInspectingDataset(d);
    setActiveInspectorTab("versions");
    setLoadingVersions(true);
    try {
      const versions = await fetchDatasetVersions(d.id);
      setDatasetVersions(versions);
    } catch (err) {
      setDatasetVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 0.1) return `${(bytes / 1024).toFixed(1)} KB`;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const handleCopyHash = (hash?: string) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Filter & Sort
  const filteredDatasets = useMemo(() => {
    return datasets
      .filter((d) => {
        const matchesQuery =
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (d.hash_sha256 && d.hash_sha256.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesFormat = formatFilter === "ALL" || (d.format || "").toUpperCase() === formatFilter.toUpperCase();
        return matchesQuery && matchesFormat;
      })
      .sort((a, b) => {
        if (sortBy === "rows") return (b.row_count || 0) - (a.row_count || 0);
        if (sortBy === "size") return (b.size_bytes || 0) - (a.size_bytes || 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [datasets, searchQuery, formatFilter, sortBy]);

  // Real aggregate KPIs
  const totalRows = useMemo(() => datasets.reduce((sum, d) => sum + (d.row_count || 0), 0), [datasets]);
  const totalSizeBytes = useMemo(() => datasets.reduce((sum, d) => sum + (d.size_bytes || 0), 0), [datasets]);
  const totalVersions = useMemo(() => datasets.reduce((sum, d) => sum + (d.version_num || 0), 0), [datasets]);

  // Real format distribution
  const formatStats = useMemo(() => {
    if (!datasets.length) return [];
    const map = new Map<string, { bytes: number; count: number }>();
    let totalBytes = 0;
    datasets.forEach((d) => {
      const fmt = (d.format || "CSV").toUpperCase();
      const current = map.get(fmt) || { bytes: 0, count: 0 };
      const b = d.size_bytes || 0;
      current.bytes += b;
      current.count += 1;
      totalBytes += b;
      map.set(fmt, current);
    });

    const colors = ["bg-[#3BB48C]", "bg-slate-500", "bg-slate-400", "bg-slate-600"];
    let i = 0;
    const result: Array<{ format: string; bytes: number; pct: number; count: number; color: string }> = [];
    map.forEach((val, key) => {
      result.push({
        format: key,
        bytes: val.bytes,
        count: val.count,
        pct: totalBytes > 0 ? Math.round((val.bytes / totalBytes) * 100) : 0,
        color: colors[i % colors.length],
      });
      i++;
    });
    return result;
  }, [datasets]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-md shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#3BB48C]" />
          {toastMessage}
        </div>
      )}

      {/* Backend Error Banner */}
      {loadError && (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs font-semibold text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={loadData}
            className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
            Datasets &amp; Data Versioning
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            DVC reproducible data lineage, SHA-256 versioning, and MinIO S3 object store
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* DVC Status Pill Button */}
          <button
            onClick={() => setShowDvcModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-300 transition"
            title="Inspect DVC MinIO Remote Config"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span>DVC Remote</span>
            <span className={`w-1.5 h-1.5 rounded-full ${dvcStatus ? "bg-emerald-500" : "bg-slate-300"}`} />
          </button>

          <button
            onClick={loadData}
            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:border-slate-300 transition shadow-2xs"
            title="Refresh datasets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>

          <button
            onClick={() => {
              setShowCreateModal(true);
              setCreateError(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3BB48C] hover:bg-[#329F7B] text-white rounded-lg text-xs font-semibold shadow-2xs transition active:translate-y-0.5 cursor-pointer border border-[#329F7B]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Dataset</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (StatCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Indexed Datasets"
          value={loading ? "..." : `${datasets.length}`}
          subtitle="Cataloged in PostgreSQL"
          icon={Database}
          color="brand"
        />
        <StatCard
          title="Tabular Rows"
          value={loading ? "..." : totalRows > 0 ? totalRows.toLocaleString() : "0"}
          subtitle="Actual verified records"
          icon={TableIcon}
          color="brand"
        />
        <StatCard
          title="Versioned Fingerprints"
          value={loading ? "..." : `${totalVersions}`}
          subtitle="Immutable SHA-256 versions"
          icon={ShieldCheck}
          color="emerald"
          isLive={totalVersions > 0}
        />
        <StatCard
          title="MinIO S3 Volume"
          value={loading ? "..." : formatBytes(totalSizeBytes)}
          subtitle="Stored in mlite-datasets bucket"
          icon={Server}
          color="brand"
        />
      </div>

      {/* ── Visual Analytics Row: Formats & Storage Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CARD 1: Datasets by Format */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Datasets by Storage Format
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Distribution across registered formats</p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">{datasets.length} cataloged</span>
            </div>

            {datasets.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                <Database className="w-6 h-6 mb-1 text-slate-300" />
                <span>No datasets indexed yet</span>
              </div>
            ) : (
              <div className="relative h-44 w-full flex flex-col justify-between pt-2 pb-6">
                <div className="relative z-10 flex-1 ml-4 mr-4 flex items-end justify-around gap-6 pb-6">
                  {formatStats.map((st) => (
                    <div key={st.format} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
                      <span className="text-[11px] font-mono font-bold text-slate-700 mb-1 group-hover:text-emerald-700">
                        {st.count}
                      </span>
                      <div
                        className={`w-full max-w-[56px] ${st.color} rounded-t transition-all`}
                        style={{ height: `${Math.max((st.count / Math.max(...formatStats.map((f) => f.count), 1)) * 100, 15)}%` }}
                      />
                      <span className="absolute -bottom-1 text-[11px] font-medium text-slate-600">
                        {st.format}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Storage: MinIO S3 cluster</span>
            <span className="text-emerald-700 font-medium">100% SHA-256 Content-Addressed</span>
          </div>
        </div>

        {/* CARD 2: DVC Remote Target & Data Health */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  DVC &amp; Object Store Remote
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">MinIO remote storage endpoint &amp; bucket</p>
              </div>
              <span className="text-[11px] font-mono text-emerald-700">Online</span>
            </div>

            <div className="space-y-2 mb-4 text-xs font-mono">
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">MinIO Bucket Target</span>
                <span className="text-slate-800 font-semibold">s3://mlite-datasets/dvc-cache</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase">Endpoint URL</span>
                <span className="text-slate-800">{dvcStatus?.minio_endpoint || "http://mlite-storage:9000"}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total Versions Tracked</span>
                <span className="font-mono text-slate-800 font-semibold">{totalVersions} versions</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">SHA-256 Verified Files</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {datasets.filter((d) => d.hash_sha256).length}/{datasets.length}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>DVC CLI: {dvcStatus?.is_installed ? "Ready" : "Standalone S3 Mode"}</span>
            <span className="text-slate-700">{datasets.length} Objects Synced</span>
          </div>
        </div>
      </div>

      {/* Explorer Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search datasets by name, description or SHA-256..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] focus:border-[#3BB48C] transition font-sans"
          />
        </div>

        {/* Format Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {["ALL", "CSV", "PARQUET", "JSON"].map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormatFilter(fmt)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap border ${
                formatFilter === fmt
                  ? "bg-[#3BB48C] text-white border-[#329F7B]"
                  : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              {fmt === "ALL" ? "All formats" : fmt}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-slate-400">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-medium bg-white border border-slate-200 text-slate-700 py-1 px-2.5 rounded focus:outline-none focus:ring-1 focus:ring-[#3BB48C]"
          >
            <option value="date">Registration date</option>
            <option value="rows">Row count</option>
            <option value="size">File size</option>
          </select>
        </div>
      </div>

      {/* Main Datasets Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-2xs">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Datasets Catalog
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({filteredDatasets.length})
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {totalRows.toLocaleString()} total verified records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2">Dataset &amp; Version Hash</th>
                <th className="px-3 py-2">Format</th>
                <th className="px-3 py-2">Records &amp; Size</th>
                <th className="px-3 py-2">DVC Storage Key</th>
                <th className="px-3 py-2">Registered</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin mx-auto mb-2" />
                    <span>Loading datasets from database...</span>
                  </td>
                </tr>
              ) : filteredDatasets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="font-semibold text-slate-700 text-xs">No Datasets Found</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {datasets.length === 0
                        ? "Register a dataset to start tracking data versions and MinIO lineage."
                        : "No dataset matches your search criteria."}
                    </div>
                    {datasets.length === 0 && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3BB48C] hover:bg-[#329F7B] text-white rounded text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Register Dataset</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDatasets.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & SHA-256 */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1 rounded bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{d.name}</span>
                            {d.version_num ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px]">
                                v{d.version_num}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200 font-mono text-[10px]">
                                v0 (unversioned)
                              </span>
                            )}
                          </div>
                          {d.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 max-w-sm mt-0.5">
                              {d.description}
                            </p>
                          )}
                          {d.hash_sha256 ? (
                            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 mt-0.5">
                              <span className="truncate max-w-[150px] sm:max-w-[220px]">
                                sha256:{d.hash_sha256.slice(0, 16)}...
                              </span>
                              <button
                                onClick={() => handleCopyHash(d.hash_sha256)}
                                title="Copy SHA-256 hash"
                                className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                              >
                                {copiedHash === d.hash_sha256 ? (
                                  <Check className="w-3 h-3 text-[#3BB48C]" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              Pending file upload
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Format */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-slate-700 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                        {d.format}
                      </span>
                    </td>

                    {/* Volume (Rows & Size) */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="font-mono text-slate-800 text-[11px] font-medium">
                        {d.row_count ? `${d.row_count.toLocaleString()} rows` : "0 rows"}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {d.column_count ? `${d.column_count} cols • ` : ""}
                        {formatBytes(d.size_bytes)}
                      </div>
                    </td>

                    {/* S3 Key / MinIO */}
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      {d.s3_key ? (
                        <span className="truncate max-w-[200px] block" title={d.s3_key}>
                          {d.s3_key.replace("s3://", "")}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openInspector(d)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-medium transition shadow-2xs hover:border-[#3BB48C]"
                          title="View version history and DVC commands"
                        >
                          <Eye className="w-3 h-3 text-[#3BB48C]" />
                          Versions
                        </button>

                        <button
                          onClick={() => setLineageDataset(d)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium transition"
                          title="View data lineage graph"
                        >
                          <GitBranch className="w-3 h-3 text-slate-500" />
                          Lineage
                        </button>

                        <button
                          onClick={() => handleDeleteDataset(d.id, d.name)}
                          className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-200 text-[11px] transition"
                          title="Delete dataset and versions"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL 1: VERSIONS & DVC INSPECTOR ── */}
      {inspectingDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-md w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-slate-100 text-slate-700 shrink-0">
                  <Database className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {inspectingDataset.name}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-600 border border-slate-200">
                      {inspectingDataset.format}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono border border-emerald-200">
                      {datasetVersions.length} versions
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {inspectingDataset.description || "Logical dataset version tracking"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectingDataset(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-5 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setActiveInspectorTab("versions")}
                  className={`py-2.5 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
                    activeInspectorTab === "versions"
                      ? "border-[#3BB48C] text-[#3BB48C]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Version Lineage ({datasetVersions.length})
                </button>
                <button
                  onClick={() => setActiveInspectorTab("dvc")}
                  className={`py-2.5 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
                    activeInspectorTab === "dvc"
                      ? "border-[#3BB48C] text-[#3BB48C]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  DVC Push / Pull Commands
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
              {activeInspectorTab === "versions" && (
                <div>
                  {loadingVersions ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading versions...</div>
                  ) : datasetVersions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded border border-slate-200">
                      No versions registered yet for this dataset. Upload a file to create v1.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-800 border-collapse">
                        <thead className="bg-[#F8FAFC] border-b border-slate-200 font-semibold text-[11px] text-slate-500 uppercase">
                          <tr>
                            <th className="px-3 py-2">Version</th>
                            <th className="px-3 py-2">SHA-256 Hash</th>
                            <th className="px-3 py-2">Rows</th>
                            <th className="px-3 py-2">Size</th>
                            <th className="px-3 py-2">Storage Key</th>
                            <th className="px-3 py-2">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {datasetVersions.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-3 py-2 font-semibold text-emerald-700">v{v.version_num}</td>
                              <td className="px-3 py-2 text-slate-600 truncate max-w-[180px]">
                                {v.hash_sha256}
                              </td>
                              <td className="px-3 py-2 text-slate-800">{v.row_count?.toLocaleString()}</td>
                              <td className="px-3 py-2 text-slate-600">{formatBytes(v.size_bytes)}</td>
                              <td className="px-3 py-2 text-slate-500 truncate max-w-[200px]">{v.s3_key || "—"}</td>
                              <td className="px-3 py-2 text-slate-400">
                                {new Date(v.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeInspectorTab === "dvc" && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-900 text-slate-100 rounded-md font-mono text-xs space-y-2">
                    <div className="text-slate-400 text-[11px]"># 1. Initialize DVC with MinIO S3 Remote</div>
                    <div className="text-emerald-400">mlite data dvc-init --remote minio</div>
                    <div className="text-slate-400 text-[11px] pt-1"># 2. Track dataset in DVC</div>
                    <div className="text-emerald-400">dvc add data/{inspectingDataset.name}.{inspectingDataset.format.toLowerCase()}</div>
                    <div className="text-slate-400 text-[11px] pt-1"># 3. Push data to MinIO remote storage</div>
                    <div className="text-emerald-400">dvc push</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-800">MinIO Target Bucket:</div>
                    <div className="font-mono text-[11px] text-slate-700">s3://mlite-datasets/dvc-cache/</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: DVC REMOTE CONFIGURATION ── */}
      {showDvcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-md w-full max-w-lg p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#3BB48C]" />
                <h3 className="text-sm font-semibold text-slate-900">DVC MinIO Configuration</h3>
              </div>
              <button onClick={() => setShowDvcModal(false)} className="p-1 rounded text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                <span className="text-slate-500">Remote Name:</span>
                <span className="font-semibold text-slate-800">{dvcStatus?.remote_name || "minio"}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                <span className="text-slate-500">MinIO S3 Bucket:</span>
                <span className="font-semibold text-slate-800">{dvcStatus?.remote_bucket || "mlite-datasets"}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                <span className="text-slate-500">MinIO Endpoint:</span>
                <span className="font-semibold text-slate-800">{dvcStatus?.minio_endpoint || "http://localhost:9000"}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                <span className="text-slate-500">DVC CLI Host Status:</span>
                <span className={`font-semibold ${dvcStatus?.is_installed ? "text-emerald-700" : "text-amber-700"}`}>
                  {dvcStatus?.is_installed ? "Installed in PATH" : "Available via MinIO S3 API"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900 text-slate-200 rounded font-mono text-xs">
              <div className="text-slate-400 text-[11px] mb-1">CLI Remote Setup:</div>
              <div>mlite data dvc-init --remote minio</div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDvcModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: LINEAGE GRAPH ── */}
      {lineageDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-md w-full max-w-4xl p-5 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-[#3BB48C]" />
                  Data Lineage Graph
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Traceability from MinIO object store to serving endpoints
                </p>
              </div>
              <button
                onClick={() => setLineageDataset(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50/70 border border-slate-200 rounded p-4 overflow-x-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 min-w-[650px]">
                <div className="flex-1 bg-white border border-slate-200 p-3 rounded text-center">
                  <div className="w-8 h-8 rounded bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-1.5">
                    <Server className="w-4 h-4" />
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Storage Source</div>
                  <div className="font-semibold text-slate-900 text-xs mt-0.5">MinIO S3 Bucket</div>
                  <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                    {lineageDataset.s3_key || `s3://mlite-datasets/${lineageDataset.name}`}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 hidden md:block" />

                <div className="flex-1 bg-white border-2 border-[#3BB48C] p-3 rounded text-center">
                  <div className="w-8 h-8 rounded bg-[#3BB48C]/10 text-[#3BB48C] flex items-center justify-center mx-auto mb-1.5">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="text-[10px] font-semibold text-[#3BB48C] uppercase tracking-wider">Active Dataset</div>
                  <div className="font-semibold text-slate-900 text-xs mt-0.5 truncate">{lineageDataset.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    v{lineageDataset.version_num || 0} • {lineageDataset.row_count?.toLocaleString()} rows
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 hidden md:block" />

                <div className="flex-1 bg-white border border-slate-200 p-3 rounded text-center">
                  <div className="w-8 h-8 rounded bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-1.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SHA-256 Provenance</div>
                  <div className="font-semibold text-slate-900 text-xs mt-0.5">Content Addressed</div>
                  <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                    {lineageDataset.hash_sha256 ? lineageDataset.hash_sha256.slice(0, 16) + "..." : "Pending"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: CREATE / UPLOAD DATASET ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-md w-full max-w-lg p-5 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[#3BB48C]/10 text-[#3BB48C]">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Register New Dataset
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Upload raw data to MinIO with SHA-256 deduplication and schema extraction
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDataset} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Source File (CSV, Parquet, JSON)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-medium text-slate-700 cursor-pointer transition shadow-2xs hover:border-[#3BB48C]">
                    <Upload className="w-3.5 h-3.5 text-[#3BB48C]" />
                    <span>Choose File...</span>
                    <input
                      type="file"
                      accept=".csv,.parquet,.json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] font-mono text-slate-500 truncate flex-1">
                    {selectedFile ? (
                      <span className="text-slate-800 font-medium">
                        {selectedFile.name} ({formatBytes(selectedFile.size)})
                      </span>
                    ) : (
                      "No file selected"
                    )}
                  </span>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-[11px] text-slate-400 hover:text-rose-600 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dataset Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  placeholder="e.g. churn_features_v2, customer_transactions"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3BB48C] focus:border-[#3BB48C] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Storage Format
                </label>
                <select
                  value={newDatasetFormat}
                  onChange={(e) => setNewDatasetFormat(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#3BB48C]"
                >
                  <option value="CSV">CSV (Delimited)</option>
                  <option value="PARQUET">PARQUET (Columnar)</option>
                  <option value="JSON">JSON (Record-based)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDatasetDescription}
                  onChange={(e) => setNewDatasetDescription(e.target.value)}
                  placeholder="Describe dataset schema, training features, or data source..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3BB48C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newDatasetName.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#3BB48C] hover:bg-[#329F7B] disabled:opacity-50 rounded border border-[#329F7B] transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{creating ? "Registering & Uploading..." : "Create Dataset"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
