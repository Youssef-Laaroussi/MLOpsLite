import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Check, ChevronDown, Code2, Cpu, Database, FileText, Folder, Globe, Layers, Monitor, Moon, RefreshCw, Settings, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchProjects } from "../api/client";

type Preferences = {
  appearance: string; language: string; timezone: string; dateFormat: string;
  project: string; compute: string; logging: string; refresh: string;
  storage: string; modelFormat: string; modelVersioning: boolean;
  editorTheme: string; fontSize: string; timestamps: boolean;
};
const defaults: Preferences = {
  appearance: "light", language: "en", timezone: "Africa/Casablanca", dateFormat: "medium",
  project: "", compute: "cpu", logging: "INFO", refresh: "15",
  storage: "minio", modelFormat: "mlflow", modelVersioning: true,
  editorTheme: "vscode-light", fontSize: "14", timestamps: true,
};
const choices: Partial<Record<keyof Preferences, string[]>> = {
  appearance: ["light", "dark", "system"], language: ["en", "fr", "ar"], dateFormat: ["medium", "day-first", "iso"],
  compute: ["cpu", "gpu"], logging: ["DEBUG", "INFO", "WARNING", "ERROR"], refresh: ["5", "15", "30", "60"],
  storage: ["minio", "server"], modelFormat: ["mlflow", "onnx", "pickle"], editorTheme: ["vscode-light", "vscode-dark", "github"], fontSize: ["12", "13", "14", "15", "16", "18", "20"],
};
function readPreferences(key: string): Preferences {
  const result = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    for (const field of Object.keys(defaults) as (keyof Preferences)[]) {
      const value = saved?.[field];
      if (typeof value !== typeof defaults[field]) continue;
      if (choices[field] && !choices[field]!.includes(value)) continue;
      if (field === "timezone") { try { new Intl.DateTimeFormat("en", { timeZone: value }); } catch { continue; } }
      Object.assign(result, { [field]: value });
    }
    const refresh = localStorage.getItem("mlite_pref_refresh");
    if (refresh && choices.refresh!.includes(refresh)) result.refresh = refresh;
  } catch { /* Keep usable defaults if browser storage is unavailable or malformed. */ }
  return result;
}
export function PreferencesIcon({ size = 24 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 7h9m5 0h6M11 4v6m5-6v6M2 17h4m8 0h8"/><circle cx="10" cy="17" r="4"/></svg>;
}
function CardTitle({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <header className="preferences-card-title"><span>{icon}</span><div><h2>{title}</h2><p>{description}</p></div></header>;
}
function SelectField({ label, value, onChange, children, icon, disabled = false }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; icon?: ReactNode; disabled?: boolean }) {
  return <label className="preferences-field"><span>{label}</span><span className="preferences-input">{icon}<select value={value} onChange={event => onChange(event.target.value)} disabled={disabled}>{children}</select><ChevronDown size={16} className="preferences-chevron"/></span></label>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return <div className="preferences-toggle-row"><span>{label}</span><button type="button" role="switch" aria-label={label} aria-checked={checked} className="preferences-toggle" onClick={onChange}><span/></button></div>;
}

export function PreferencesSettings() {
  const { user } = useAuth();
  const storageKey = `mlite_preferences_${user?.id ?? "guest"}`;
  const [preferences, setPreferences] = useState(() => readPreferences(storageKey));
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const projects = useQuery({ queryKey: ["preferences-projects", user?.id], queryFn: fetchProjects, retry: false });
  useEffect(() => { setPreferences(readPreferences(storageKey)); setFeedback(""); setError(""); }, [storageKey]);
  function save(next: Preferences) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      localStorage.setItem("mlite_pref_refresh", next.refresh);
      setPreferences(next); setError(""); setFeedback("Preferences saved in this browser.");
    } catch { setError("Could not save preferences in this browser. Please try again."); setFeedback(""); }
  }
  function change<K extends keyof Preferences>(field: K, value: Preferences[K]) { save({ ...preferences, [field]: value }); }
  function reset() { save({ ...defaults }); }
  const zones = Array.from(new Set(["Africa/Casablanca", "UTC", "Europe/Paris", "America/New_York", "Asia/Dubai", preferences.timezone]));
  const timeZoneLabel = (zone: string) => {
    const offset = new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(new Date()).find(part => part.type === "timeZoneName")?.value;
    return `${zone} (${offset === "GMT" ? "GMT+00:00" : offset})`;
  };
  const sampleDate = new Date("2026-11-19T12:00:00Z");
  return <div className="settings-preferences">
    <p className="preferences-intro">Customize your MLite experience, workspace defaults, and working environment.</p>
    <section className="preferences-banner"><span className="preferences-banner-icon"><PreferencesIcon/></span><div className="preferences-banner-copy"><h2>Preferences</h2><p>Personalize the look, behavior, and default settings of your MLite workspace.</p></div><div className="preferences-banner-art" aria-hidden="true"><svg className="preferences-waves" viewBox="0 0 600 140" preserveAspectRatio="none"><path d="M0 140C150 60 180 75 310 0H600V140Z" fill="#edffed"/><path d="M65 140C210 65 270 90 390 0H600V140Z" fill="#dbffde"/><path d="M180 140C290 90 355 75 450 0H600V140Z" fill="#baffca"/><path d="M285 140C390 95 400 70 530 0H600V140Z" fill="#9affb5"/><path d="M380 140C470 115 470 65 600 28V140Z" fill="#70ffa1"/><path d="M450 140C510 125 540 90 600 80V140Z" fill="#35fa77"/></svg><span><Settings/></span></div></section>
    <div className="preferences-grid">
      <section className="profile-card preferences-appearance"><CardTitle icon={<Monitor/>} title="Appearance" description="Customize the interface look and feel."/><div className="preferences-theme-options" role="group" aria-label="Appearance">{([["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Monitor]] as const).map(([value, label, Icon]) => <button key={value} type="button" aria-pressed={preferences.appearance === value} onClick={() => change("appearance", value)}><Icon size={24}/><span>{label}</span>{preferences.appearance === value && <span className="preferences-selected"><Check size={11}/></span>}</button>)}</div></section>
      <section className="profile-card preferences-region"><CardTitle icon={<Globe/>} title="Language & Region" description="Set your language, timezone, and regional format."/><div className="preferences-fields"><SelectField label="Language" value={preferences.language} onChange={value => change("language", value)}><option value="en">English</option><option value="fr">Français</option><option value="ar">العربية</option></SelectField><SelectField label="Timezone" value={preferences.timezone} onChange={value => change("timezone", value)}>{zones.map(zone => <option key={zone} value={zone}>{timeZoneLabel(zone)}</option>)}</SelectField><SelectField label="Date format" value={preferences.dateFormat} onChange={value => change("dateFormat", value)}><option value="medium">{sampleDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" })}</option><option value="day-first">19/11/2026</option><option value="iso">2026-11-19</option></SelectField></div></section>
      <section className="profile-card preferences-workspace"><CardTitle icon={<Layers/>} title="Workspace Defaults" description="Default settings for new projects, experiments, and runs."/><div className="preferences-fields"><SelectField label="Default project" value={preferences.project} onChange={value => change("project", value)} icon={<Folder size={16}/>} disabled={projects.isPending || projects.isError}><option value="">{projects.isPending ? "Loading projects…" : projects.isError ? "Projects unavailable" : "No default project"}</option>{projects.data?.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}{preferences.project && !projects.data?.some(project => project.id === preferences.project) && <option value={preferences.project}>Saved project (unavailable)</option>}</SelectField><SelectField label="Compute type" value={preferences.compute} onChange={value => change("compute", value)} icon={<Cpu size={16}/>}><option value="cpu">CPU</option><option value="gpu">GPU</option></SelectField><SelectField label="Logging level" value={preferences.logging} onChange={value => change("logging", value)} icon={<FileText size={16}/>} >{["DEBUG", "INFO", "WARNING", "ERROR"].map(level => <option key={level}>{level}</option>)}</SelectField><SelectField label="Dashboard refresh" value={preferences.refresh} onChange={value => change("refresh", value)} icon={<RefreshCw size={16}/>} >{[5, 15, 30, 60].map(seconds => <option key={seconds} value={seconds}>Every {seconds} seconds</option>)}</SelectField></div></section>
      <section className="profile-card preferences-data"><CardTitle icon={<Box/>} title="Data & Model Defaults" description="Default options for datasets, artifacts, and model storage."/><div className="preferences-fields"><SelectField label="Default artifact storage" value={preferences.storage} onChange={value => change("storage", value)} icon={<Database size={16}/>}><option value="minio">MinIO (S3 compatible)</option><option value="server">Workspace default</option></SelectField><SelectField label="Default model format" value={preferences.modelFormat} onChange={value => change("modelFormat", value)} icon={<Box size={16}/>}><option value="mlflow">MLflow (recommended)</option><option value="onnx">ONNX</option><option value="pickle">Pickle</option></SelectField><Toggle label="Enable model versioning" checked={preferences.modelVersioning} onChange={() => change("modelVersioning", !preferences.modelVersioning)}/></div></section>
      <section className="profile-card preferences-editor"><CardTitle icon={<Code2/>} title="Editor & Logs" description="Customize the code editor and log display."/><div className="preferences-fields"><SelectField label="Editor theme" value={preferences.editorTheme} onChange={value => change("editorTheme", value)}><option value="vscode-light">VS Code Light</option><option value="vscode-dark">VS Code Dark</option><option value="github">GitHub</option></SelectField><SelectField label="Font size" value={preferences.fontSize} onChange={value => change("fontSize", value)}>{choices.fontSize!.map(size => <option key={size} value={size}>{size} px</option>)}</SelectField><Toggle label="Show timestamps in logs" checked={preferences.timestamps} onChange={() => change("timestamps", !preferences.timestamps)}/></div></section>
      <section className="preferences-reset"><RefreshCw/><div><h2>Reset Preferences</h2><p>Restore all preferences to their default values.</p></div><button type="button" onClick={reset}><RefreshCw size={15}/>Reset to Default</button></section>
    </div>
    <footer className="preferences-feedback"><p>Preferences are saved automatically in this browser. Workspace defaults are remembered here; server settings remain managed by your workspace.</p>{error ? <p role="alert">{error}</p> : <p role="status">{feedback}</p>}</footer>
  </div>;
}
