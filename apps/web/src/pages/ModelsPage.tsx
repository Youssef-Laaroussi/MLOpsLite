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
        <h2 className="text-xl font-bold text-white tracking-tight">Model Registry & Lifecycle</h2>
        <p className="text-sm text-slate-400">
          Centralized governance, version management, and stage promotions with single-active production rule
        </p>
      </div>

      <div className="bg-[#0D1F2D] border border-[#19364C] rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-[#071018] border-b border-[#19364C] text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Model Name</th>
              <th className="px-6 py-4">Version</th>
              <th className="px-6 py-4">Lifecycle Stage</th>
              <th className="px-6 py-4">Run Link</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#19364C]">
            {models.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No models registered yet. Register via CLI: `mlite model register &lt;name&gt; --run-id &lt;id&gt;`
                </td>
              </tr>
            ) : (
              models.map((m, idx) => (
                <tr key={idx} className="hover:bg-[#112738] transition">
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                    <Box className="w-4 h-4 text-[#3BB48C]" />
                    {m.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-300">v{m.version}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={m.stage || "DEVELOPMENT"} />
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">
                    {m.mlflow_run_id ? (
                      <span className="text-[#3BB48C]">{m.mlflow_run_id.slice(0, 8)}...</span>
                    ) : (
                      "Manual"
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedModel(m)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D3326] text-[#3BB48C] hover:bg-[#134D3A] border border-[#1A7456] text-xs font-semibold transition"
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0D1F2D] border border-[#19364C] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3BB48C]"></span>
              Promote Model Stage
            </h3>
            <p className="text-sm text-slate-400">
              Select the target lifecycle stage for <span className="text-white font-medium">{selectedModel.name} (v{selectedModel.version})</span>:
            </p>

            <div className="space-y-2">
              {["CANDIDATE", "STAGING", "PRODUCTION", "ARCHIVED"].map((stage) => (
                <label
                  key={stage}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                    targetStage === stage
                      ? "border-[#3BB48C] bg-[#0D3326] text-white"
                      : "border-[#19364C] bg-[#071018] text-slate-400 hover:bg-[#112738]"
                  }`}
                >
                  <span className="text-sm font-semibold">{stage}</span>
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
              <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-xs text-amber-300">
                Promoting to Production will automatically archive any currently active production version of this model.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedModel(null)}
                className="px-4 py-2 rounded-lg bg-[#071018] text-slate-300 text-sm hover:bg-[#112738] border border-[#19364C]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePromote}
                className="px-4 py-2 rounded-lg bg-[#3BB48C] hover:bg-[#34A47F] text-[#071018] text-sm font-bold shadow-md shadow-[#3BB48C]/20"
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
