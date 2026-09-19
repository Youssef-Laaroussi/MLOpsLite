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
          <h2 className="text-xl font-bold text-white tracking-tight">Inference Deployments</h2>
          <p className="text-sm text-slate-400">
            Isolated Docker serving containers with dynamic host port mapping
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3BB48C] hover:bg-[#34A47F] text-[#071018] font-bold text-sm transition shadow-md shadow-[#3BB48C]/20"
        >
          <Plus className="w-4 h-4 text-[#071018] stroke-[2.5]" />
          Deploy Container
        </button>
      </div>

      <div className="bg-[#0D1F2D] border border-[#19364C] rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-[#071018] border-b border-[#19364C] text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Deployment ID</th>
              <th className="px-6 py-4">Model & Version</th>
              <th className="px-6 py-4">Host Port</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Live Endpoint</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#19364C]">
            {deployments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No active deployments found. Launch a model container using the button above or `mlite deploy`.
                </td>
              </tr>
            ) : (
              deployments.map((d) => (
                <tr key={d.id} className="hover:bg-[#112738] transition">
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">
                    {d.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#3BB48C]" />
                    {d.model_name} <span className="text-xs text-slate-400 font-mono">v{d.model_version}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{d.port}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    <a
                      href={`${d.endpoint_url}/health`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#3BB48C] hover:underline flex items-center gap-1"
                    >
                      {d.endpoint_url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {d.status === "RUNNING" && (
                      <button
                        onClick={() => handleStop(d.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/80 text-rose-400 hover:bg-rose-900 border border-rose-800/80 text-xs font-medium transition"
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0D1F2D] border border-[#19364C] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3BB48C]"></span>
              Deploy Model to Container
            </h3>
            <form onSubmit={handleDeploy} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Model Name</label>
                <input
                  type="text"
                  required
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. fraud-detector"
                  className="w-full bg-[#071018] border border-[#19364C] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3BB48C] focus:ring-1 focus:ring-[#3BB48C]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Model Version</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={modelVersion}
                  onChange={(e) => setModelVersion(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#071018] border border-[#19364C] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3BB48C] focus:ring-1 focus:ring-[#3BB48C]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Port (optional, auto-allocated if empty)</label>
                <input
                  type="number"
                  min={1024}
                  max={65535}
                  value={port || ""}
                  onChange={(e) => setPort(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 8100"
                  className="w-full bg-[#071018] border border-[#19364C] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3BB48C] focus:ring-1 focus:ring-[#3BB48C]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#071018] text-slate-300 text-sm hover:bg-[#112738] border border-[#19364C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#3BB48C] hover:bg-[#34A47F] text-[#071018] text-sm font-bold shadow-md shadow-[#3BB48C]/20"
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
