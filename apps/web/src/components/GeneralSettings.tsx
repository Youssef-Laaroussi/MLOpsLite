import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Building2, Calendar, Cpu, Database, FileText, FlaskConical, Globe, Info, Layers, Lock, Monitor, RefreshCw, Save, Settings, SlidersHorizontal, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type GeneralPreferences = { workspaceName: string; timezone: string; dateFormat: string; numberFormat: string; dataFormat: string };
const defaults: GeneralPreferences = { workspaceName: "MLite Workspace", timezone: "Africa/Casablanca", dateFormat: "medium", numberFormat: "en-US", dataFormat: "parquet" };
function readPreferences(key: string): GeneralPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    const result = { ...defaults };
    for (const field of Object.keys(defaults) as (keyof GeneralPreferences)[]) if (typeof saved[field] === "string") result[field] = saved[field];
    return result;
  } catch { return { ...defaults }; }
}
function SectionTitle({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <header className="general-section-title">{icon}<div><h2>{title}</h2><p>{description}</p></div></header>;
}
export function GeneralSettings() {
  const { user } = useAuth();
  const storageKey = `mlite_general_${user?.id ?? "guest"}`;
  const [saved, setSaved] = useState(() => readPreferences(storageKey));
  const [draft, setDraft] = useState(saved);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { const next = readPreferences(storageKey); setDraft(next); setSaved(next); setSuccess(""); setError(""); }, [storageKey]);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const change = (field: keyof GeneralPreferences, value: string) => { setDraft(previous => ({ ...previous, [field]: value })); setSuccess(""); setError(""); };
  function save(event: FormEvent) {
    event.preventDefault(); setError(""); setSuccess("");
    try {
      const next = { ...draft, workspaceName: draft.workspaceName.trim() };
      if (!next.workspaceName) return;
      localStorage.setItem(storageKey, JSON.stringify(next)); setDraft(next); setSaved(next);
      setSuccess("General preferences saved in this browser.");
    } catch { setError("Could not save preferences in this browser. Your changes have been kept."); }
  }
  function discard() { setDraft({ ...saved }); setSuccess(""); setError(""); }
  const timezones = Array.from(new Set(["Africa/Casablanca", "UTC", "Europe/Paris", "America/New_York", "Asia/Dubai", draft.timezone]));
  return <form className="settings-general" onSubmit={save}>
    <p className="general-intro">Basic configuration for your MLite workspace.</p>
    <section className="general-banner">
      <div className="general-workspace-logo"><img src="/logo.png" alt="" /></div>
      <div className="general-banner-copy"><h2>Workspace Configuration</h2><p>Manage your workspace identity, defaults, and general behavior.</p></div>
      <div className="general-banner-art" aria-hidden="true"><svg viewBox="0 0 500 120" preserveAspectRatio="none"><path fill="#e4fbea" d="M0 120Q90 20 180 65T350 35T500 0V120Z"/><path fill="#baf1cb" d="M100 120Q220 25 290 65T500 15V120Z"/></svg><span><Settings size={35}/></span></div>
    </section>
    <div className="general-columns">
      <div className="general-column">
        <section className="profile-card general-details">
          <SectionTitle icon={<Layers/>} title="Workspace Details" description="Core information about your MLite workspace." />
          <div className="general-details-fields">
            <label className="general-wide">Workspace Name <em>*</em><span className="general-input"><Building2/><input required maxLength={100} value={draft.workspaceName} onChange={event => change("workspaceName",event.target.value)}/></span></label>
            <label>Default Project Visibility <Info className="general-help" aria-label="Managed by the workspace server"/><span className="general-input"><Lock/><select disabled aria-label="Default Project Visibility"><option>Private (invited members only)</option></select></span></label>
            <label>Default Experiment Tracking<span className="general-input"><FlaskConical/><select disabled aria-label="Default Experiment Tracking"><option>MLflow</option></select></span></label>
            <label>Default Storage<span className="general-input"><Database/><select disabled aria-label="Default Storage"><option>MinIO (S3)</option></select></span></label>
          </div>
        </section>
        <section className="profile-card general-behavior">
          <SectionTitle icon={<SlidersHorizontal/>} title="Workspace Behavior" description="Workspace services are managed by the server." />
          {[
            [FlaskConical,"Auto-save experiments","Automatic experiment logging is configured in MLflow."],
            [FileText,"Enable activity logs","Activity logging follows the server configuration."],
            [RefreshCw,"Check for updates","Automatic update checks are not connected yet."],
          ].map(([Icon,title,description]) => {
            const RowIcon = Icon as typeof FlaskConical;
            return <div className="general-behavior-row" key={String(title)}><RowIcon size={22}/><div><strong>{String(title)}</strong><p>{String(description)}</p></div>
              <button type="button" role="switch" aria-label={String(title)} aria-checked="false" disabled title="Managed by the server; unavailable from this page" className="general-switch"><span/></button>
            </div>;
          })}
        </section>
      </div>
      <div className="general-column">
        <section className="profile-card general-regional">
          <SectionTitle icon={<Globe/>} title="Regional & Display" description="Set your language, theme, and time zone." />
          <div className="general-option-list">
            <label><span><Globe/>Language</span><select disabled><option>English</option></select></label>
            <label><span><Monitor/>Theme</span><select disabled><option>Light</option></select></label>
            <label><span><Clock/>Time zone</span><select value={draft.timezone} onChange={event => change("timezone",event.target.value)}>{timezones.map(zone => <option key={zone}>{zone}</option>)}</select></label>
            <label><span><Calendar/>Date format</span><select value={draft.dateFormat} onChange={event => change("dateFormat",event.target.value)}><option value="medium">Jan 31, 2026</option><option value="day-first">31/01/2026</option><option value="iso">2026-01-31</option></select></label>
            <label><span><span className="general-number-icon">123</span>Number format</span><select value={draft.numberFormat} onChange={event => change("numberFormat",event.target.value)}><option value="en-US">1,234.56</option><option value="fr-FR">1 234,56</option><option value="de-DE">1.234,56</option></select></label>
          </div>
        </section>
        <section className="profile-card general-resources">
          <SectionTitle icon={<Database/>} title="Data & Resources" description="Default settings for data handling and resources." />
          <div className="general-option-list">
            <label><span><FileText/>Default data format</span><select value={draft.dataFormat} onChange={event => change("dataFormat",event.target.value)}><option value="parquet">Parquet (.parquet)</option><option value="csv">CSV (.csv)</option><option value="json">JSON (.json)</option></select></label>
            <label><span><Cpu/>Default compute</span><select disabled><option>Local / Docker</option></select></label>
          </div>
        </section>
      </div>
    </div>
    <div className="general-feedback">{error ? <p className="profile-error" role="alert">{error}</p> : success ? <p className="profile-success" role="status">{success}</p> : <p className="general-scope-note"><Info size={13}/>Editable choices are saved in this browser. They do not change workspace services or defaults in other sections.</p>}</div>
    <footer className="general-actions"><button type="button" onClick={discard} disabled={!dirty}>Discard</button><button type="submit" className="general-save" disabled={!dirty || !draft.workspaceName.trim()}><Save size={16}/>Save Changes</button></footer>
  </form>;
}
