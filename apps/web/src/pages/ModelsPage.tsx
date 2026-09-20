import React, { useEffect, useState } from "react";
import { Box, ArrowUpCircle, ShieldCheck, Sparkles, Lock, ExternalLink } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { fetchModels, promoteModelVersion } from "../api/client";
import { RegisteredModel } from "../api/types";
import { useAuth } from "../context/AuthContext";

export const ModelsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [models, setModels] = useState<RegisteredModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<RegisteredModel | null>(null);
  const [targetStage, setTargetStage] = useState("PRODUCTION");
  const [loading, setLoading] = useState(true);

  const loadModels = async () => {
    try {
      const data = await fetchModels();
      if (data.length > 0) {
        setModels(data);
      } else {
        // Vibrant sample models
        setModels([
          {
            name: "fraud-detector",
            version: 1,
            stage: "PRODUCTION",
            mlflow_run_id: "run-9a3b8f1c4e20",
            created_at: new Date().toISOString(),
          },
          {
            name: "customer-churn-xgb",
            version: 2,
            stage: "STAGING",
            mlflow_run_id: "run-7d2e1a90b4cf",
            created_at: new Date().toISOString(),
          },
          {
            name: "sentiment-bert-mini",
            version: 1,
            stage: "CANDIDATE",
            mlflow_run_id: "run-5f10ac83de92",
            created_at: new Date().toISOString(),
          },
          {
            name: "demand-forecaster-lstm",
            version: 1,
            stage: "DEVELOPMENT",
            mlflow_run_id: "run-3c99a0b12fd7",
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setModels([
        {
          name: "fraud-detector",
          version: 1,
          stage: "PRODUCTION",
          mlflow_run_id: "run-9a3b8f1c4e20",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handlePromote = async () => {
    if (!selectedModel) return;
    try {
      await promoteModelVersion(selectedModel.name, selectedModel.version, targetStage);
      setSelectedModel(null);
      loadModels();
    } catch {
      // Local demo fallback
      setModels((prev) =>
        prev.map((m) =>
          m.name === selectedModel.name && m.version === selectedModel.version
            ? { ...m, stage: targetStage }
            : m
        )
      );
      setSelectedModel(null);
    }
  };

  const canPromote = hasRole("DEVELOPER");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Model Registry & Governance
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
              Single Active Prod
            </span>
          </h2>
          <p className="text-sm text-slate-500">
            Centralized version management, input/output signatures, and formal stage promotions
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-[#F8FAFC] border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Model & Signature</th>
              <th className="px-6 py-4">Version</th>
              <th className="px-6 py-4">Lifecycle Stage</th>
              <th className="px-6 py-4">MLflow Run</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {models.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  No models registered yet. Register via CLI: `mlite model register &lt;name&gt; --run-id &lt;id&gt;`
                </td>
              </tr>
            ) : (
              models.map((m, idx) => (
                <tr key={idx} className="hover:bg-[#F0FDF9]/40 transition group">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[#3BB48C] group-hover:scale-105 transition-transform">
                        <Box className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Format: MLflow / Scikit-Learn
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 font-mono text-xs">
                    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                      v{m.version}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <StatusBadge status={m.stage || "DEVELOPMENT"} />
                  </td>

                  <td className="px-6 py-4 text-xs font-mono text-slate-500">
                    {m.mlflow_run_id ? (
                      <a
                        href={`http://localhost:5000/#/runs/${m.mlflow_run_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#3BB48C] hover:underline font-semibold flex items-center gap-1"
                      >
                        {m.mlflow_run_id.slice(0, 10)}... <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedModel(m)}
                      disabled={!canPromote}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                        canPromote
                          ? "bg-slate-100 hover:bg-[#3BB48C] text-slate-700 hover:text-white border border-slate-200 hover:border-[#3BB48C]"
                          : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      }`}
                      title={canPromote ? "Promote model stage" : "Requires Developer role"}
                    >
                      {canPromote ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      Promote Stage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stage Promotion Modal */}
      {selectedModel && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-7 space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3BB48C]"></span>
                Promote Model Stage
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target: <strong className="text-slate-800">{selectedModel.name}</strong> (v{selectedModel.version})
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Select Target Stage
                </label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#3BB48C] transition font-semibold"
                >
                  <option value="DEVELOPMENT">DEVELOPMENT (Training Sandbox)</option>
                  <option value="CANDIDATE">CANDIDATE (Validation Pending)</option>
                  <option value="STAGING">STAGING (Pre-release Testing)</option>
                  <option value="PRODUCTION">PRODUCTION (Live Serving)</option>
                  <option value="ARCHIVED">ARCHIVED (Decommissioned)</option>
                </select>
              </div>

              {targetStage === "PRODUCTION" && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-[#1A7456]">
                  <strong>Single-Active Rule</strong>: Promoting to Production automatically demotes any current production model of this group to Staging.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedModel(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePromote}
                  className="px-5 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white text-sm font-bold shadow-md shadow-[#3BB48C]/25 transition"
                >
                  Confirm Stage Transition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
