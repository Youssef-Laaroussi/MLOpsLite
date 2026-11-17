import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SubsystemService, SystemStats } from "../../api/types";

const colors = ["#287A65", "#0891b2", "#6366f1"];
const axis = { fontSize: 11, fill: "#64748b" };

export function ModelScoreChart({ versions }: { versions: NonNullable<SystemStats["benchmarks"]> }) {
  const [selected, setSelected] = useState("");
  const version = versions.find((item) => item.model === selected) ?? versions[0];
  if (!version) return null;
  const scores = [
    { metric: "Accuracy", score: version.accuracy ?? null },
    { metric: "F1", score: version.f1 },
    { metric: "ROC AUC", score: version.auc },
  ];
  const measured = scores.filter((item) => item.score !== null);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <select aria-label="Model version for scores" value={version.model} onChange={(event) => setSelected(event.target.value)}
          className="max-w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800">
          {versions.map((item) => <option key={item.model} value={item.model}>{item.model}</option>)}
        </select>
        <span className="text-[10px] font-semibold tracking-wider text-slate-500">{version.stage}</span>
      </div>
      <div className="h-64 min-w-0" role="img" aria-label={`Recorded scores for ${version.model}, scale 0 to 1`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={measured} margin={{ top: 26, right: 16, bottom: 8, left: -20 }} barSize={48}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 4" />
            <XAxis dataKey="metric" tick={axis} axisLine={false} tickLine={false} dy={8} />
            <YAxis domain={[0, 1]} ticks={[0, .25, .5, .75, 1]} tick={axis} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(value: number) => [value.toFixed(3), "Score"]}
              contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="score" radius={[5, 5, 0, 0]} isAnimationActive={false}>
              {measured.map((item) => <Cell key={item.metric} fill={colors[scores.findIndex((score) => score.metric === item.metric)]} />)}
              <LabelList dataKey="score" position="top" formatter={(value: number) => value.toFixed(3)} style={{ fontSize: 12, fill: "#0f172a", fontFamily: "monospace" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        {scores.map((item, index) => <span key={item.metric} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: colors[index] }} />
          {item.metric} <span className="font-mono text-slate-800">{item.score === null ? "Not recorded" : item.score.toFixed(3)}</span>
        </span>)}
      </div>
    </>
  );
}

export function ServiceResponseChart({ services }: { services: SubsystemService[] }) {
  const data = services.map((service) => ({
    name: service.name.startsWith("Database") ? "Database" : service.name.startsWith("MLflow") ? "MLflow" : service.name.startsWith("MinIO") ? "MinIO" : service.name.includes("Docker") ? "Docker" : service.name,
    fullName: service.name,
    status: service.status,
    ms: service.status === "online" && Number.isFinite(parseFloat(service.latency)) ? parseFloat(service.latency) : null,
  }));
  return (
    <>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-slate-900">{services.filter((s) => s.status === "online").length}<span className="text-base text-slate-400"> / {services.length}</span></span>
        <span className="text-xs text-slate-500">services reachable</span>
      </div>
      <div className="h-64 min-w-0" role="img" aria-label="Latest service probe response times in milliseconds">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ top: 4, right: 65, bottom: 14, left: 0 }} barSize={18}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 4" />
            <XAxis type="number" domain={[0, "auto"]} tick={axis} axisLine={false} tickLine={false} unit=" ms" />
            <YAxis type="category" dataKey="name" width={72} tick={axis} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(value: number) => [`${value.toFixed(1)} ms`, "Probe round-trip"]}
              contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="ms" fill="#287A65" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              <LabelList dataKey="ms" position="right" formatter={(value: number | null) => value == null ? "" : `${value.toFixed(1)} ms`} style={{ fontSize: 11, fill: "#334155", fontFamily: "monospace" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
        {data.map((service) => <span key={service.fullName} title={service.fullName} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className={`h-2 w-2 rounded-full ${service.status === "online" ? "bg-emerald-500" : "bg-rose-500"}`} />
          {service.name} · {service.status === "online" ? "Online" : "Offline"}
        </span>)}
      </div>
    </>
  );
}
