import React, { useEffect, useState } from "react";
import { Box, ArrowUpCircle } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { fetchModels, promoteModelVersion } from "../api/client";
import { RegisteredModel } from "../api/types";

export const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<RegisteredModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<RegisteredModel | null>(null);
  const [targetStage, setTargetStage] = useState("PRODUCTION");
  const [loading, setLoading] = useState(true);

  const loadModels = async () => {
    try {
      const data = await fetchModels();
      setModels(data);
    } catch (e) {
      console.error(e);
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
    } catch (err) {
      alert("Promotion failed");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Model Registry & Lifecycle</h2>
        <p className="text-sm text-slate-500">
          Centralized governance, version management, and stage promotions with single-active production rule
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Model Name</th>
              <th className="px-6 py-4">Version</th>
              <th className="px-6 py-4">Lifecycle Stage</th>
              <th className="px-6 py-4">Run Link</th>
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
                <tr key={idx} className="hover:bg-[#F0FDF9]/50 transition">
                  <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                    <Box className="w-4 h-4 text-[#3BB48C]" />
                    {m.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">v{m.version}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={m.stage || "DEVELOPMENT"} />
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">
                    {m.mlflow_run_id ? (
                      <span className="text-[#3BB48C] font-semibold">{m.mlflow_run_id.slice(0, 8)}...</span>
                    ) : (
                      "Manual"
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedModel(m)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EBF8F4] text-[#1A7456] hover:bg-[#DCFCE7] border border-[#BCE9DA] text-xs font-bold transition"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      Promote Stage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Promotion Modal */}
      {selectedModel && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-7 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3BB48C]"></span>
              Promote Model Stage
            </h3>
            <p className="text-sm text-slate-500">
              Select target stage for <span className="text-slate-900 font-bold">{selectedModel.name} (v{selectedModel.version})</span>:
            </p>

            <div className="space-y-2.5">
              {["CANDIDATE", "STAGING", "PRODUCTION", "ARCHIVED"].map((stage) => (
                <label
                  key={stage}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                    targetStage === stage
                      ? "border-[#3BB48C] bg-[#EBF8F4] text-[#1A7456] font-bold"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm">{stage}</span>
                  <input
                    type="radio"
                    name="target_stage"
                    value={stage}
                    checked={targetStage === stage}
                    onChange={(e) => setTargetStage(e.target.value)}
                    className="accent-[#3BB48C]"
                  />
                </label>
              ))}
            </div>

            {targetStage === "PRODUCTION" && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Promoting to Production automatically archives any currently active production version of this model.
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
                type="button"
                onClick={handlePromote}
                className="px-5 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white text-sm font-bold shadow-md shadow-[#3BB48C]/25 transition"
              >
                Confirm Promotion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
