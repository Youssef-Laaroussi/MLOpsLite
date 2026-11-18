import { useActionFeedback } from "../components/ActionFeedback";
import { DeploymentDashboard } from "../components/DeploymentDashboard";
import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { fetchDeployments, deployModel, stopDeployment, rollbackDeployment } from "../api/client";
import type { Deployment } from "../api/types";
import { useAuth } from "../context/AuthContext";
import "./DeploymentsPage.css";

export const DeploymentsPage: React.FC = () => {
  const { confirmAction, showSuccess } = useActionFeedback();
  const queryClient = useQueryClient();
  const { hasRole, user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || hasRole("ADMIN");
  const canDeploy = isAdmin || user?.role === "USER" || user?.role === "MAINTAINER";
  const canRollback = canDeploy;
  const [params] = useSearchParams();
  const registryModel = params.get("model") ?? "";
  const registryVersion = Number(params.get("version"));

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Deploy modal
  const [showModal, setShowModal] = useState(Boolean(canDeploy && registryModel && Number.isInteger(registryVersion) && registryVersion > 0));
  const [deploying, setDeploying] = useState<boolean>(false);
  const [modelName, setModelName] = useState(registryModel);
  const [modelVersion, setModelVersion] = useState(Number.isInteger(registryVersion) && registryVersion > 0 ? registryVersion : 1);
  const [port, setPort] = useState<number | undefined>(undefined);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Rollback modal
  const [showRollbackModal, setShowRollbackModal] = useState<boolean>(false);
  const [rollbackTarget, setRollbackTarget] = useState<Deployment>();
  const [rollingBack, setRollingBack] = useState(false);
  const [targetVersion, setTargetVersion] = useState<number>(1);
  const [rollbackSuccess, setRollbackSuccess] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  const loadDeployments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDeployments();
      setDeployments(data || []);
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
      showSuccess("Deployment created.");
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
    if (!(await confirmAction("Stop deployment?", "The inference container will be stopped and removed.", "Stop deployment"))) return;
    try {
      await stopDeployment(id);
      showSuccess("Deployment stopped.");
      await loadDeployments();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to stop container");
    }
  };

  const handleRollbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollbackTarget || rollingBack) return;
    setRollingBack(true);
    setRollbackSuccess(null);
    setRollbackError(null);
    try {
      const result = await rollbackDeployment(rollbackTarget.id, targetVersion);
      if (["FAILED", "ABORTED"].includes(result.status)) throw new Error(result.error_message || "Rollback failed.");
      setRollbackSuccess(result.status === "COMPLETED"
        ? `Rolled back ${rollbackTarget.model_name} to version ${targetVersion}.`
        : `Rollback for ${rollbackTarget.model_name} submitted.`);
      await Promise.all([loadDeployments(), queryClient.invalidateQueries({ queryKey: ["deployment-rollbacks"] })]);
    } catch (err: any) {
      setRollbackError(err?.response?.data?.detail || err?.message || "Rollback failed");
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <div className="deployment-dashboard">
      <DeploymentDashboard deployments={deployments} loading={loading} error={error}
        canDeploy={canDeploy} canViewAudit={user?.role === "MAINTAINER" || isAdmin}
        canRollback={canRollback} canStop={isAdmin} onReload={loadDeployments}
        onCreate={() => { setDeployError(null); setShowModal(true); }}
        onStop={handleStop}
        onRollback={deployment => {
          setRollbackTarget(deployment);
          setTargetVersion(Math.max(1, deployment.model_version - 1));
          setRollbackSuccess(null);
          setRollbackError(null);
          setShowRollbackModal(true);
        }} />
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
                  <h3 className="text-sm font-semibold text-slate-900">Rollback Deployment</h3>
                  <p className="text-[11px] text-slate-500">Select an earlier registered version.</p>
                </div>
              </div>
              <button
                onClick={() => setShowRollbackModal(false)}
                disabled={rollingBack}
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
                  value={rollbackTarget?.model_name ?? ""}
                  readOnly
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
                  disabled={rollingBack}
                  className="px-3 py-1.5 rounded bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rollingBack || Boolean(rollbackSuccess)}
                  className="px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  {rollingBack ? "Rolling back…" : "Confirm Rollback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
