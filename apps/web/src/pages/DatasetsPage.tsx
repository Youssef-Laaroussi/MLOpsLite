import { DatasetDashboard } from "../components/DatasetDashboard";
import "./DatasetsPage.css";
import { useActionFeedback } from "../components/ActionFeedback";
import React, { useEffect, useRef, useState } from "react";
import {
  Database,
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
} from "lucide-react";
import {
  fetchDatasets,
  fetchProjects,
  createDataset,
  uploadDatasetFile,
  fetchDatasetVersions,
  fetchDvcStatus,
  deleteDataset,
} from "../api/client";
import { Dataset, DatasetVersion, Project } from "../api/types";

import { useAuth } from "../context/AuthContext";

export const DatasetsPage: React.FC = () => {
  const { confirmAction } = useActionFeedback();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search & Filtering
  const [projects, setProjects] = useState<Project[]>([]);
  const inspectorRequest = useRef(0);
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
  const [uploadMode, setUploadMode] = useState(false);
  const [createdForUpload, setCreatedForUpload] = useState<Dataset | null>(null);
  const [newProject, setNewProject] = useState("");
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
        isAdmin ? fetchDvcStatus().catch(() => null) : Promise.resolve(null),
      ]);
      setDatasets(dsList || []);
      setDvcStatus(dvcInfo);
    } catch (err: any) {
      setDatasets([]);
      setLoadError(err?.response?.data?.detail || err?.message || "Failed to load datasets from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  useEffect(() => {
    let active = true;
    fetchProjects().then(items => { if (active) setProjects(items); }).catch(() => {});
    return () => { active = false; };
  }, []);

  function openCreate(upload: boolean) {
    setUploadMode(upload);
    setCreatedForUpload(null);
    setCreateError(null);
    setNewDatasetName("");
    setNewDatasetFormat("CSV");
    setNewDatasetDescription("");
    setNewProject("");
    setSelectedFile(null);
    setShowCreateModal(true);
  }

  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDatasetName.trim() || ((uploadMode || createdForUpload) && !selectedFile)) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = createdForUpload ?? await createDataset({
        name: newDatasetName.trim(),
        project_id: newProject || undefined,
        format: newDatasetFormat.toUpperCase(),
        description: newDatasetDescription.trim() || undefined,
      });

      // If a real file was selected, immediately upload it to register v1 with real SHA-256 and MinIO key
      if (selectedFile) {
        setCreatedForUpload(created);
        await uploadDatasetFile(created.id, selectedFile, newDatasetDescription.trim() || undefined);
      }

      await loadData();
      setShowCreateModal(false);
      setNewDatasetName("");
      setNewDatasetDescription("");
      setSelectedFile(null);
      setToastMessage(`Dataset "${created.name}" ${selectedFile ? "uploaded" : "created"}.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      const detail = err.response?.data?.detail ?? err.response?.data?.error;
      const msg = typeof detail === "string" ? detail : err.message || "Failed to create dataset";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDataset = async (datasetId: string, datasetName: string) => {
    if (!(await confirmAction("Delete dataset?", `Delete “${datasetName}”?`, "Delete dataset"))) return;
    try {
      await deleteDataset(datasetId);
      setInspectingDataset(null);
      await loadData();
      setToastMessage(`Dataset "${datasetName}" deleted.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setLoadError(err.response?.data?.detail || err.message || "Failed to delete dataset");
    }
  };

  const openInspector = async (d: Dataset, tab: "versions" | "profiling" | "dvc" = "versions") => {
    const request = ++inspectorRequest.current;
    setDatasetVersions([]);
    setInspectingDataset(d);
    setActiveInspectorTab(tab);
    setLoadingVersions(true);
    try {
      const versions = await fetchDatasetVersions(d.id);
      if (request === inspectorRequest.current) setDatasetVersions(versions);
    } catch (err) {
      if (request === inspectorRequest.current) setDatasetVersions([]);
    } finally {
      if (request === inspectorRequest.current) setLoadingVersions(false);
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
  return (
    <div className="lifecycle-dashboard projects-dashboard datasets-dashboard">
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

      <DatasetDashboard datasets={datasets} projects={projects} loading={loading}
        formatBytes={formatBytes} onOpen={(dataset, tab) => openInspector(dataset, tab === "dvc" && !isAdmin ? "versions" : tab)} onCreate={openCreate}
        onDvc={isAdmin ? () => setShowDvcModal(true) : undefined}
        onCopy={handleCopyHash} copiedHash={copiedHash} />

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

              <div className="dataset-inspector-actions">
                <button className="secondary-action" onClick={() => setLineageDataset(inspectingDataset)}>Lineage</button>
                {isAdmin && <button className="secondary-action" onClick={async () => {
                  await handleDeleteDataset(inspectingDataset.id, inspectingDataset.name);
                }}>Delete</button>}
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
                {isAdmin && (
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
                )}
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

              {isAdmin && activeInspectorTab === "dvc" && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-900 text-slate-100 rounded-md font-mono text-xs space-y-2">
                    <div className="text-slate-400 text-[11px]"># 1. Initialize DVC with MinIO S3 Remote</div>
                    <div className="text-emerald-400">mlite data dvc-init</div>
                    <div className="text-slate-400 text-[11px] pt-1"># 2. Track dataset in DVC</div>
                    <div className="text-emerald-400">dvc add data/{inspectingDataset.name}.{inspectingDataset.format.toLowerCase()}</div>
                    <div className="text-slate-400 text-[11px] pt-1"># 3. Push data to MinIO remote storage</div>
                    <div className="text-emerald-400">dvc push</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-800">MinIO Target Bucket:</div>
                    <div className="font-mono text-[11px] text-slate-700">{dvcStatus ? `s3://${dvcStatus.remote_bucket}/${dvcStatus.remote_prefix}` : "Unavailable"}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: DVC REMOTE CONFIGURATION ── */}
      {isAdmin && showDvcModal && (
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
                <span className="font-semibold text-slate-800">{dvcStatus?.remote_name || "Unavailable"}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                <span className="text-slate-500">MinIO S3 Bucket:</span>
                <span className="font-semibold text-slate-800">{dvcStatus?.remote_bucket || "Unavailable"}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                <span className="text-slate-500">MinIO Endpoint:</span>
                <span className="font-semibold text-slate-800">{dvcStatus?.minio_endpoint || "Unavailable"}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
                <span className="text-slate-500">DVC CLI Host Status:</span>
                <span className={`font-semibold ${dvcStatus?.is_installed ? "text-emerald-700" : "text-amber-700"}`}>
                  {!dvcStatus ? "Unavailable" : dvcStatus.is_installed ? "Installed in PATH" : "Available via MinIO S3 API"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900 text-slate-200 rounded font-mono text-xs">
              <div className="text-slate-400 text-[11px] mb-1">CLI Remote Setup:</div>
              <div>mlite data dvc-init</div>
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
                    {isAdmin ? lineageDataset.s3_key || "Unavailable" : "Object storage"}
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
                    {uploadMode ? "Upload Dataset" : "New Dataset"}
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
              <label className="block text-xs font-semibold text-slate-700">
                Project
                <select className="mt-1 block w-full rounded border border-slate-200 px-2.5 py-1.5"
                  value={newProject} disabled={!!createdForUpload} onChange={event => setNewProject(event.target.value)}>
                  <option value="">No project</option>
                  {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
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
                      required={uploadMode && !selectedFile}
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
                  disabled={!!createdForUpload}
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
                  disabled={!!createdForUpload}
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
                  disabled={creating || !newDatasetName.trim() || ((uploadMode || !!createdForUpload) && !selectedFile)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#3BB48C] hover:bg-[#329F7B] disabled:opacity-50 rounded border border-[#329F7B] transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{creating ? "Saving…" : uploadMode ? "Upload Dataset" : "Create Dataset"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
