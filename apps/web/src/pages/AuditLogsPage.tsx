import { countBy, MetricDistribution } from "../components/charts/MetricDistribution";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { fetchAuditLogs } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./AuditLogsPage.css";

export const AuditLogsPage: React.FC<{ scope?: "personal" | "instance" }> = ({ scope = "personal" }) => {
  const instance = scope === "instance";
  const { user } = useAuth();
  const { data: logs = [], isError: loadError, isFetching: loading, refetch: loadLogs } = useQuery({
    queryKey: [instance ? "instance-audit" : "personal-audit", user?.id],
    queryFn: () => fetchAuditLogs(100, scope),
    enabled: Boolean(user?.id),
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.resource_name || log.resource_type).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction =
      actionFilter === "ALL" || log.action.toLowerCase().includes(actionFilter.toLowerCase());

    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    const normalized = action.toLowerCase();
    if (normalized.includes("login") || normalized.includes("auth")) {
      return "audit-badge-green";
    }
    if (normalized.includes("promote") || normalized.includes("deploy")) {
      return "audit-badge-green";
    }
    if (normalized.includes("rollback") || normalized.includes("delete") || normalized.includes("revoke")) {
      return "audit-badge-danger";
    }
    return "audit-badge-neutral";
  };

  return (
    <div className="settings-activity">
      <header className="audit-banner">
        <span className="audit-banner-icon" aria-hidden="true"><ShieldCheck /></span>
        <div className="audit-banner-copy">
          <h2>{instance ? "Instance Audit Logs" : "Activity & Logs"}</h2>
          <p>
            {instance ? "Administrative journal across this MLite installation" : "Your recorded account, project, model, deployment, and dataset activity"}
          </p>
        </div>
        <button
          onClick={() => void loadLogs()}
          className="audit-refresh"
          disabled={loading}
        >
          <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : undefined} />
          Refresh Journal
        </button>
      </header>

      <div className="overview-card audit-controls">
        <label className="audit-search">
          <Search aria-hidden="true" />
          <input
            type="text"
            aria-label="Search audit logs"
            placeholder="Search your activity by action or resource..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>

        <label className="audit-filter">
          <Filter aria-hidden="true" />
          <select
            aria-label="Filter audit logs by action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="ALL">All Actions</option>
            <option value="login">Authentication</option>
            <option value="promote">Model Promotions</option>
            <option value="deploy">Deployments</option>
            <option value="dataset">Datasets</option>
          </select>
        </label>
      </div>

      <div className="audit-distribution">
        <MetricDistribution
          title={instance ? "Instance activity by resource" : "Your activity by resource"}
          description={instance ? "Matching events within the latest 100 installation entries" : "Matching events within your latest 100 recorded entries"}
          rows={countBy(filteredLogs, log => log.resource_type)}
          loading={loading}
          unavailable={Boolean(loadError)}
        />
      </div>

      <section className="overview-card audit-journal" aria-labelledby="audit-journal-title">
        <header className="audit-journal-heading">
          <h3 id="audit-journal-title"><Activity aria-hidden="true" />{instance ? "Instance event journal" : "Your event journal"}</h3>
          <span>{loading ? "Loading…" : loadError ? "Unavailable" : `${filteredLogs.length} of ${logs.length} recent events`}</span>
        </header>
        <div className="audit-table-scroll" role="region" aria-label="Audit event journal" tabIndex={0}>
          <table className="overview-table audit-table" aria-busy={loading}>
            <thead>
              <tr>
                <th scope="col">Timestamp</th>
                <th scope="col">Action</th>
                <th scope="col">Resource</th>
                {instance && <th scope="col">Actor / User</th>}
                <th scope="col">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading || loadError || filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={instance ? 5 : 4} className="audit-empty">
                    <div role={loadError ? "alert" : "status"}>
                      {loadError ? <AlertTriangle aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
                      {loading ? "Loading audit logs…" : loadError ? "Could not load audit logs. Use Refresh to try again." : "No matching audit log entries found."}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="audit-timestamp">
                      <span className="audit-cell-icon">
                        <Clock aria-hidden="true" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`audit-badge ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="audit-resource">
                      {log.resource_name || log.resource_type}
                    </td>
                    {instance && <td>{log.user_email || "System"}</td>}
                    <td className="audit-ip">
                      {log.ip_address || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
