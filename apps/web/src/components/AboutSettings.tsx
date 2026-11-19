import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Check, Copy, ExternalLink, Github, Heart, Info, Infinity as InfinityIcon, Layers, Monitor, RefreshCw } from "lucide-react";
import { api } from "../api/client";

const repository = "https://github.com/Youssef-Laaroussi/MLOpsLite";
type RuntimeInfo = { version: string; python: string | null; fastapi: string | null; database: string | null; mlflow: string | null; dvc: string | null; runtime: string | null };
const technologies = ["FastAPI", "MLflow", "DVC", "Evidently", "PostgreSQL", "MinIO", "Docker", "React", "Tailwind CSS"];
const moreTechnologies = ["SQLAlchemy", "Pydantic", "Polars", "Vite", "TypeScript"];
function CardTitle({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <header className="about-card-title"><span>{icon}</span><div><h2>{title}</h2><p>{description}</p></div></header>;
}
function InfinityArtwork() {
  return <svg className="about-infinity-art" viewBox="0 0 300 150" fill="none" aria-hidden="true"><defs><linearGradient id="about-loop-green" x1="50" y1="25" x2="240" y2="125" gradientUnits="userSpaceOnUse"><stop stopColor="#71ff13"/><stop offset=".36" stopColor="#00a000"/><stop offset=".7" stopColor="#1fff37"/><stop offset="1" stopColor="#008d00"/></linearGradient><linearGradient id="about-loop-white" x1="100" y1="125" x2="225" y2="25" gradientUnits="userSpaceOnUse"><stop stopColor="#e0ffe4"/><stop offset=".35" stopColor="white"/><stop offset=".8" stopColor="#fff"/><stop offset="1" stopColor="#d7ffdf"/></linearGradient><filter id="about-loop-shadow" x="-30%" y="-40%" width="160%" height="200%"><feDropShadow dx="0" dy="7" stdDeviation="4" floodColor="#068b19" floodOpacity=".4"/></filter></defs><g filter="url(#about-loop-shadow)" strokeLinecap="round"><path d="M150 75C116 35 99 27 77 30C26 35 28 116 77 120C105 124 122 102 150 75C183 40 198 25 222 30C273 38 268 117 222 120C194 123 176 104 150 75Z" stroke="url(#about-loop-green)" strokeWidth="24"/><path d="M42 86C46 108 60 118 77 120C105 124 122 102 150 75C183 40 198 25 222 30C246 34 255 46 260 62" stroke="url(#about-loop-white)" strokeWidth="24"/><path d="M48 60C52 39 66 29 82 31C103 33 121 49 139 67" stroke="#b4ff89" strokeOpacity=".4" strokeWidth="4"/></g></svg>;
}
export function AboutSettings() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const runtime = useQuery({ queryKey: ["settings-about"], queryFn: async () => (await api.get<RuntimeInfo>("/settings/about")).data, retry: false, staleTime: 60000 });
  const commit = __MLITE_BUILD__.commit;
  async function copyCommit() {
    if (!commit) return;
    try { await navigator.clipboard.writeText(commit); setCopied(true); setCopyError(""); }
    catch { setCopyError("Clipboard unavailable. Select and copy the commit manually."); }
  }
  const value = (field: keyof RuntimeInfo) => runtime.isPending ? "Loading…" : runtime.isError ? "Unavailable" : runtime.data?.[field] || "Not installed";
  return <div className="settings-about">
    <p className="about-intro">Learn more about MLite, its version, and the technologies behind it.</p>
    <section className="about-banner"><span className="about-banner-icon"><InfinityIcon/></span><div className="about-banner-copy"><h2>MLite</h2><p>A lightweight, self-hosted MLOps platform to build, version, deploy,<br className="about-banner-break"/> and monitor machine learning models efficiently.</p></div><div className="about-banner-art" aria-hidden="true"><svg className="about-waves" viewBox="0 0 600 140" preserveAspectRatio="none"><path d="M0 140C150 60 180 75 310 0H600V140Z" fill="#edffed"/><path d="M65 140C210 65 270 90 390 0H600V140Z" fill="#dbffde"/><path d="M180 140C290 90 355 75 450 0H600V140Z" fill="#baffca"/><path d="M285 140C390 95 400 70 530 0H600V140Z" fill="#9affb5"/><path d="M380 140C470 115 470 65 600 28V140Z" fill="#70ffa1"/><path d="M450 140C510 125 540 90 600 80V140Z" fill="#35fa77"/></svg><InfinityArtwork/></div></section>
    <div className="about-grid">
      <section className="profile-card about-version"><CardTitle icon={<Layers/>} title="Version & Build" description="Current version and build information of MLite."/><dl className="about-details"><div><dt>MLite version</dt><dd><span className="about-badge">v{__MLITE_BUILD__.version}</span></dd></div><div><dt>Build date</dt><dd>{new Date(__MLITE_BUILD__.date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" })}</dd></div><div><dt>Commit</dt><dd className="about-commit"><code title={commit ?? undefined}>{commit?.slice(0, 7) || "Unavailable"}</code><button type="button" aria-label={copied ? "Commit copied" : "Copy commit hash"} disabled={!commit} onClick={() => void copyCommit()}>{copied ? <Check size={16}/> : <Copy size={16}/>}</button></dd></div><div><dt>License</dt><dd><a className="about-badge" href={`${repository}/blob/main/LICENSE`} target="_blank" rel="noreferrer">Apache-2.0</a></dd></div></dl>{copied && <p className="about-copy-status" role="status">Commit hash copied.</p>}{copyError && <p className="about-error" role="alert">{copyError}</p>}</section>
      <section className="profile-card about-system"><CardTitle icon={<Monitor/>} title="System Information" description="Details about the current runtime environment."/><dl className="about-details">{([["Python", "python"], ["FastAPI", "fastapi"], ["Database", "database"], ["MLflow", "mlflow"], ["DVC", "dvc"], ["Runtime", "runtime"]] as const).map(([label, field]) => <div key={field}><dt>{label}</dt><dd>{value(field)}</dd></div>)}</dl>{runtime.isError && <p className="about-error" role="alert">System information unavailable.<button type="button" onClick={() => void runtime.refetch()}><RefreshCw size={13}/>Retry</button></p>}</section>
      <section className="profile-card about-links"><CardTitle icon={<Github/>} title="Open-Source & Links" description="Access the source code, documentation, and support."/><div className="about-link-buttons"><a href={repository} target="_blank" rel="noreferrer"><Github size={20}/>GitHub</a><a href={`${repository}/tree/main/docs`} target="_blank" rel="noreferrer"><BookOpen size={20}/>Documentation</a><a href={`${repository}/releases`} target="_blank" rel="noreferrer"><ExternalLink size={19}/>Releases</a></div></section>
      <section className="profile-card about-acknowledgements"><CardTitle icon={<Heart/>} title="Acknowledgements" description="Tools and open-source projects that make MLite possible."/><ul className="about-technologies">{[...technologies, ...(expanded ? moreTechnologies : [])].map(technology => <li key={technology}>{technology}</li>)}<li className="about-more"><button type="button" aria-label={expanded ? "Show fewer technologies" : "Show more technologies"} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Less" : "•••"}</button></li></ul></section>
    </div>
    <section className="about-learn-more"><Info/><h2>About MLite</h2><p>MLite is an open-source project built to make MLOps simple, practical, and accessible for data scientists and ML engineers.</p><a href={`${repository}#readme`} target="_blank" rel="noreferrer"><ExternalLink size={17}/>Learn More</a></section>
  </div>;
}
