import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Award, FlaskConical, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchAuditLogs, fetchExperimentRuns } from "../api/client";
import type { AuditLog, Deployment, Experiment, ExperimentRun, RegisteredModel } from "../api/types";

type RunRow = { experiment: Experiment; run: ExperimentRun };
const day = 86_400_000;

function dateLabel(value: string | number | undefined, time = false) {
  return value ? new Date(value).toLocaleString("en-US", {
    month: "short", day: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }) : "—";
}

export function OverviewActivity({ deployments, experiments, models, deploymentsUnavailable, experimentsUnavailable, infrastructure }: {
  deployments: Deployment[];
  experiments: Experiment[];
  models: RegisteredModel[];
  deploymentsUnavailable: boolean;
  experimentsUnavailable: boolean;
  infrastructure: ReactNode;
}) {
  const [period, setPeriod] = useState(30);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [runsUnavailable, setRunsUnavailable] = useState(false);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [auditUnavailable, setAuditUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const results = await Promise.allSettled(experiments.map(async experiment =>
        (await fetchExperimentRuns(experiment.experiment_id)).map(run => ({ experiment, run }))
      ));
      if (!active) return;
      setRunsUnavailable(results.some(result => result.status === "rejected"));
      setRuns(results.flatMap(result => result.status === "fulfilled" ? result.value : [])
        .sort((a, b) => (b.run.start_time ?? 0) - (a.run.start_time ?? 0)).slice(0, 3));
    })();
    return () => { active = false; };
  }, [experiments]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const logs = await fetchAuditLogs(100);
        if (active) setAudit(logs);
      } catch {
        if (active) setAuditUnavailable(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const now = Date.now();
  const bucketCount = Math.ceil(period / 7);
  const history = Array.from({ length: bucketCount }, (_, index) => {
    const start = now - (period - index * 7) * day;
    const end = Math.min(now, start + 7 * day);
    const records = deployments.filter(item => {
      const created = Date.parse(item.created_at);
      return created >= start && created < end;
    });
    return {
      date: dateLabel(start),
      success: records.filter(item => item.status === "RUNNING").length,
      failed: records.filter(item => item.status === "FAILED").length,
      rolledBack: audit.filter(item => {
        const timestamp = Date.parse(item.timestamp);
        return item.action === "DEPLOYMENT_ROLLBACK" && (!item.status || item.status.toUpperCase() === "SUCCESS") && timestamp >= start && timestamp < end;
      }).length,
    };
  });
  const series = [
    { key: "success", label: "Running", color: "#087d3b" },
    { key: "failed", label: "Failed", color: "#b4e99b" },
    { key: "rolledBack", label: "Rolled Back", color: "#c5cdd0" },
  ] as const;
  const promotions = audit.filter(item => item.action === "MODEL_PROMOTE" && (!item.status || item.status.toUpperCase() === "SUCCESS"))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 3);

  return <div className="overview-activity reference-activity">
    <section className="overview-card">
      <h3><FlaskConical />Recent Experiments<Link to="/app/experiments">View All →</Link></h3>
      <div className="overflow-x-auto"><table className="overview-table">
        <thead><tr><th>Experiment</th><th>Project</th><th>Model (Run)</th><th>Status</th><th>Score (F1)</th><th>Started</th></tr></thead>
        <tbody>{runs.map(({ experiment, run }) => {
          const model = models.find(item => item.mlflow_run_id === run.run_id);
          const complete = run.status === "FINISHED";
          const f1 = run.metrics?.f1_score ?? run.metrics?.f1;
          return <tr key={run.run_id}>
            <td><Link to="/app/experiments">{experiment.name}</Link></td>
            <td>{experiment.tags?.["mlite.project"] ?? run.tags?.["mlite.project"] ?? "—"}</td>
            <td>{model?.name ?? "—"} ({run.run_name || run.run_id.slice(0, 7)})</td>
            <td><span className={complete ? "health-pill" : "activity-status"}>{complete ? "Completed" : run.status}</span></td>
            <td>{f1?.toFixed(3) ?? "—"}</td><td>{dateLabel(run.start_time, true)}</td>
          </tr>;
        })}</tbody>
      </table></div>
      {runs.length === 0 && <p className="activity-empty">{experimentsUnavailable || runsUnavailable ? "Experiment runs unavailable" : "No experiment runs recorded"}</p>}
    </section>
    <section className="overview-card">
      <h3><Award />Recent Promotions / Approvals<Link to={auditUnavailable ? "/app/models" : "/app/audit"}>View All →</Link></h3>
      <div className="overflow-x-auto"><table className="overview-table">
        <thead><tr><th>Model</th><th>From → To</th><th>Approved By</th><th>When</th></tr></thead>
        <tbody>{promotions.map(item => {
          const changes = item.changes_json ?? item.details;
          return <tr key={item.id}>
            <td>{item.resource_name ?? "—"}</td>
            <td><span className="promotion-check" aria-hidden="true">✓</span>{changes?.previous_stage ?? "—"} → {changes?.target_stage ?? "—"}</td>
            <td>{item.user_email ?? "—"}</td><td>{dateLabel(item.timestamp, true)}</td>
          </tr>;
        })}</tbody>
      </table></div>
      {promotions.length === 0 && <p className="activity-empty">{auditUnavailable ? "Promotion history unavailable" : "No promotions recorded"}</p>}
    </section>
    <div className="activity-resources">
    <section className="overview-card">
      <h3><Rocket />Deployment History
        <select className="chart-period" aria-label="Deployment history period" value={period} onChange={event => setPeriod(Number(event.target.value))}>
          <option value={30}>Last 30 Days</option><option value={7}>Last 7 Days</option><option value={90}>Last 90 Days</option>
        </select>
      </h3>
      {deploymentsUnavailable ? <p className="activity-empty">Deployment history unavailable</p> : <>
        <div className="h-[130px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history} margin={{ left: -10, right: 5 }}>
              <CartesianGrid vertical={false} stroke="#edf0f2" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis allowDecimals={false} domain={[0, (dataMax: number) => Math.max(3, dataMax)]} width={30} tick={{ fontSize: 10 }} tickLine={false} />
              <Tooltip />
              {series.filter(item => item.key !== "rolledBack" || !auditUnavailable).map(item =>
                <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color} maxBarSize={27} isAnimationActive={false} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-legend activity-legend">
          {series.map(item => <span key={item.key}><i style={{ background: item.color }} />
            {item.label} ({item.key === "rolledBack" && auditUnavailable ? "—" : history.reduce((sum, bucket) => sum + bucket[item.key], 0)})
          </span>)}
        </div>
      </>}
    </section>
      {infrastructure}
    </div>
  </div>;
}
