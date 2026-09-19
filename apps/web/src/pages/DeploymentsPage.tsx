import React, { useEffect, useState } from "react";
import { Server, StopCircle, ExternalLink, Plus } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { fetchDeployments, deployModel, stopDeployment } from "../api/client";
import { Deployment } from "../api/types";

export const DeploymentsPage: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modelName, setModelName] = useState("");
  const [modelVersion, setModelVersion] = useState(1);
  const [port, setPort] = useState<number | undefined>(undefined);

  const loadDeployments = async () => {
    try {
      const data = await fetchDeployments();
      setDeployments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeployments();
  }, []);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await deployModel(modelName, modelVersion, port);
      setShowModal(false);
      setModelName("");
      setModelVersion(1);
      setPort(undefined);
      loadDeployments();
    } catch (err) {
      alert("Deployment launch failed");
    }
  };

  const handleStop = async (id: string) => {
    if (!confirm("Are you sure you want to stop this container?")) return;
    try {
      await stopDeployment(id);
      loadDeployments();
    } catch (err) {
      alert("Failed to stop deployment");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Inference Deployments</h2>
          <p className="text-sm text-slate-500">
            Isolated Docker serving containers with dynamic host port mapping
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-sm transition shadow-md shadow-[#3BB48C]/25"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Deploy Container
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Deployment ID</th>
              <th className="px-6 py-4">Model & Version</th>
              <th className="px-6 py-4">Host Port</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Live Endpoint</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deployments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  No active deployments found. Launch a model container using the button above or `mlite deploy`.
                </td>
              </tr>
            ) : (
              deployments.map((d) => (
                <tr key={d.id} className="hover:bg-[#F0FDF9]/50 transition">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {d.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#3BB48C]" />
                    {d.model_name} <span className="text-xs text-slate-400 font-mono">v{d.model_version}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">{d.port}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    <a
                      href={`${d.endpoint_url}/health`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#3BB48C] hover:underline flex items-center gap-1 font-semibold"
                    >
                      {d.endpoint_url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {d.status === "RUNNING" && (
                      <button
                        onClick={() => handleStop(d.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        Stop
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Deploy Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-7 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3BB48C]"></span>
              Deploy Model to Container
            </h3>
            <form onSubmit={handleDeploy} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Model Name</label>
                <input
                  type="text"
                  required
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. fraud-detector"
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/20 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Model Version</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={modelVersion}
                  onChange={(e) => setModelVersion(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/20 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Port (optional)</label>
                <input
                  type="number"
                  min={1024}
                  max={65535}
                  value={port || ""}
                  onChange={(e) => setPort(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 8100"
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/20 transition"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white text-sm font-bold shadow-md shadow-[#3BB48C]/25 transition"
                >
                  Launch Container
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
