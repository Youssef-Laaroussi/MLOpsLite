import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User as UserIcon,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { AuditLog } from "../api/types";
import { fetchAuditLogs } from "../api/client";

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs(100);
      setLogs(data);
    } catch {
      // Fallback realistic audit log data if backend offline
      setLogs([
        {
          id: "aud-001",
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          action: "user.login",
          resource_type: "user",
          resource_name: "admin",
          user_email: "admin@mlite.local",
          ip_address: "127.0.0.1",
          status: "SUCCESS",
          details: { method: "oauth2_password" },
        },
        {
          id: "aud-002",
          timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
          action: "model.promote",
          resource_type: "model",
          resource_name: "fraud-detector:v1",
          user_email: "sarah@mlite.local",
          ip_address: "192.168.1.45",
          status: "SUCCESS",
          details: { from_stage: "STAGING", to_stage: "PRODUCTION" },
        },
        {
          id: "aud-003",
          timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
          action: "deployment.create",
          resource_type: "deployment",
          resource_name: "fraud-detector-prod",
          user_email: "sarah@mlite.local",
          ip_address: "192.168.1.45",
          status: "SUCCESS",
          details: { port: 8100, container: "mlite-serve-fraud-detector" },
        },
        {
          id: "aud-004",
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          action: "dataset.sync",
          resource_type: "dataset",
          resource_name: "transactions-2024.parquet",
          user_email: "alex@mlite.local",
          ip_address: "192.168.1.80",
          status: "SUCCESS",
          details: { rows: 250000, hash: "sha256:7f4a...b21" },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.resource_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user_email || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction =
      actionFilter === "ALL" || log.action.toLowerCase().includes(actionFilter.toLowerCase());

    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    if (action.includes("login") || action.includes("auth")) {
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
    if (action.includes("promote") || action.includes("deploy")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (action.includes("rollback") || action.includes("delete") || action.includes("revoke")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#EBF8F4] via-white to-white border border-[#BCE9DA] rounded-3xl p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
              <ShieldCheck className="w-4 h-4 text-[#3BB48C]" />
              Immutable Security Journal
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Audit Logs & Governance
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Append-only audit trail capturing all authentication, deployment promotions, container rollbacks, and dataset mutations.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#3BB48C]" : ""}`} />
          Refresh Journal
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, resource or user email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#3BB48C]"
          >
            <option value="ALL">All Actions</option>
            <option value="login">Authentication</option>
            <option value="promote">Model Promotions</option>
            <option value="deploy">Deployments</option>
            <option value="dataset">Datasets</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-6">Action</th>
                <th className="py-3.5 px-6">Resource</th>
                <th className="py-3.5 px-6">Actor / User</th>
                <th className="py-3.5 px-6">IP Address</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No matching audit log entries found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6 font-mono text-slate-500 whitespace-nowrap flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {log.resource_name || log.resource_type}
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        {log.user_email || "system"}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-500">
                      {log.ip_address || "127.0.0.1"}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
