import React, { useEffect, useState } from "react";
import {
  FolderGit2,
  Box,
  Server,
  Bell,
  ArrowUpRight,
  ShieldCheck,
  Terminal,
  Activity,
  Plus,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { fetchSystemStats, fetchModels, fetchDeployments } from "../api/client";
import { RegisteredModel, Deployment } from "../api/types";
import { Link } from "react-router-dom";

export const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState({
    projects_count: 0,
    models_count: 0,
    active_deployments: 0,
    alerts_count: 0,
    system_healthy: true,
  });
  const [models, setModels] = useState<RegisteredModel[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, modelsData, deploymentsData] = await Promise.all([
          fetchSystemStats(),
          fetchModels(),
          fetchDeployments(),
        ]);
        setStats(statsData);
        setModels(modelsData);
        setDeployments(deploymentsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-[#EBF8F4] via-white to-white border border-[#BCE9DA] rounded-3xl p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
              <span className="w-2 h-2 rounded-full bg-[#3BB48C] animate-pulse" />
              All Systems Operational
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Welcome to MLite Console
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Lightweight, self-hosted platform orchestrating model versioning, Docker inference, drift monitoring, and dataset integrity.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/app/projects"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-sm transition shadow-md shadow-[#3BB48C]/25"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Project
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Projects"
          value={stats.projects_count}
          subtitle="Tracked repos & workspaces"
          icon={FolderGit2}
          color="brand"
        />
        <StatCard
          title="Registered Models"
          value={stats.models_count}
          subtitle="Cataloged in Model Registry"
          icon={Box}
          color="brand"
        />
        <StatCard
          title="Live Deployments"
          value={stats.active_deployments}
          subtitle="Serving traffic on local ports"
          icon={Server}
          color="emerald"
        />
        <StatCard
          title="Active Alerts"
          value={stats.alerts_count}
          subtitle="Drift & latency violations"
          icon={Bell}
          color="amber"
        />
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Production Models */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#3BB48C]" />
              Production Models
            </h3>
            <Link to="/app/models" className="text-xs text-[#3BB48C] hover:underline flex items-center gap-1 font-bold">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {models.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No models promoted to Production yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {models.slice(0, 5).map((m, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{m.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 font-mono">
                      Version v{m.version}
                    </div>
                  </div>
                  <StatusBadge status={m.stage || "DEVELOPMENT"} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Container Deployments */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#3BB48C]" />
              Active Inference Endpoints
            </h3>
            <Link to="/app/deployments" className="text-xs text-[#3BB48C] hover:underline flex items-center gap-1 font-bold">
              Manage <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {deployments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No active deployments running.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {deployments.slice(0, 5).map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">
                      {d.model_name} <span className="text-xs text-slate-400 font-mono">v{d.model_version}</span>
                    </div>
                    <div className="text-xs text-[#3BB48C] mt-0.5 font-mono font-medium">
                      {d.endpoint_url}
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick CLI Reference */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 text-sm font-bold mb-3">
          <Terminal className="w-4 h-4 text-[#3BB48C]" />
          Quick CLI Reference
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-800">
            <span className="text-slate-400"># Deploy model:</span><br />
            <span className="text-[#1A7456] font-bold">mlite deploy</span> &lt;model&gt; --version 1
          </div>
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-800">
            <span className="text-slate-400"># Check status:</span><br />
            <span className="text-[#1A7456] font-bold">mlite deployment status</span> &lt;id&gt;
          </div>
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-800">
            <span className="text-slate-400"># Register dataset:</span><br />
            <span className="text-[#1A7456] font-bold">mlite data add</span> ./data.csv
          </div>
        </div>
      </div>
    </div>
  );
};
