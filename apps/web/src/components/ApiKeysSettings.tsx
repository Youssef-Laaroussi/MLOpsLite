import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, Check, CheckCircle2, Code2, Copy, Ellipsis, KeyRound, Layers, Plus, RefreshCw, Shield, Tag, Trash2, X } from "lucide-react";
import { createApiKey, fetchApiKeys, revokeApiKey } from "../api/client";
import type { ApiKey } from "../api/types";
import { useActionFeedback } from "./ActionFeedback";

function CardTitle({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <header className="apikeys-card-title">{icon}<div><h2>{title}</h2><p>{description}</p></div>{action}</header>;
}
function UsageIcon() {
  return <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 18h4v8H3zM12 10h4v16h-4zM21 2h4v24h-4z"/></svg>;
}
function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}
function keyStatus(key: ApiKey) {
  return key.is_revoked ? "Revoked" : key.expires_at && new Date(key.expires_at).getTime() <= Date.now() ? "Expired" : "Active";
}
const practices = [
  "Keep your API keys private (do not share or commit them to Git).",
  "Use the least privilege (only the necessary account permissions).",
  "Rotate keys regularly and revoke unused keys.",
  "Set an expiration date for temporary access (e.g., CI/CD, tests).",
];

export function ApiKeysSettings() {
  const { confirmAction } = useActionFeedback();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState("");
  const [expiration, setExpiration] = useState("0");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const message = (err: unknown, fallback: string) => (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || fallback;

  async function loadKeys() {
    setLoading(true);
    setError(null);
    try { setKeys(await fetchApiKeys()); }
    catch (err) { setError(message(err, "Unable to load API keys. Please retry.")); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadKeys(); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !permissions || creating) return;
    setCreating(true); setError(null); setNotice("");
    try {
      const result = await createApiKey(name.trim(), Number(expiration) || undefined);
      const fullKey = result.key || result.full_key;
      if (!fullKey) throw new Error("Missing API key");
      setSecret(fullKey); setCopied(false); setName(""); setPermissions(""); setExpiration("0");
      await loadKeys(); setNotice("API key created. Copy it now; it is shown only once.");
    } catch (err) { setError(message(err, "Failed to create API key.")); }
    finally { setCreating(false); }
  }
  async function revoke(key: ApiKey) {
    if (!await confirmAction("Revoke API key?", `Tools using “${key.name}” will lose access immediately.`, "Revoke key")) return;
    setRevoking(key.id); setError(null); setNotice("");
    try { await revokeApiKey(key.id); await loadKeys(); setNotice(`API key “${key.name}” revoked.`); }
    catch (err) { setError(message(err, "Failed to revoke API key.")); }
    finally { setRevoking(null); }
  }
  async function copy() {
    if (!secret) return;
    try { await navigator.clipboard.writeText(secret); setCopied(true); }
    catch { setError("Clipboard unavailable. Select and copy the key manually."); }
  }
  const activeCount = keys.filter(key => keyStatus(key) === "Active").length;

  return <div className="settings-apikeys">
    <p className="apikeys-intro">Create and manage API keys to access the MLite API programmatically.</p>
    <section className="apikeys-banner">
      <span className="apikeys-banner-icon"><Code2/></span><div className="apikeys-banner-copy"><h2>API Keys</h2><p>Generate secure API keys to integrate MLite with your tools, scripts, and CI/CD pipelines.</p></div>
      <div className="apikeys-banner-art" aria-hidden="true"><svg className="apikeys-banner-waves" viewBox="0 0 600 140" preserveAspectRatio="none"><path d="M0 140C150 60 180 75 310 0H600V140Z" fill="#edffed"/><path d="M65 140C210 65 270 90 390 0H600V140Z" fill="#dbffde"/><path d="M180 140C290 90 355 75 450 0H600V140Z" fill="#baffca"/><path d="M285 140C390 95 400 70 530 0H600V140Z" fill="#9affb5"/><path d="M380 140C470 115 470 65 600 28V140Z" fill="#70ffa1"/><path d="M450 140C510 125 540 90 600 80V140Z" fill="#35fa77"/></svg><span><Code2/></span></div>
    </section>
    {error && <div className="apikeys-error" role="alert">{error}<button type="button" onClick={() => void loadKeys()}><RefreshCw size={14}/>Retry</button></div>}
    {notice && <p className="apikeys-notice" role="status">{notice}</p>}
    {secret && <section className="apikeys-secret" aria-label="New API key"><div><strong>Copy your new API key</strong><button type="button" onClick={() => { setSecret(null); setNotice(""); }} aria-label="Dismiss new API key"><X size={17}/></button></div><p>This key is shown only once. Store it somewhere secure.</p><div><code>{secret}</code><button type="button" onClick={() => void copy()}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "Copied!" : "Copy"}</button></div></section>}
    <div className="apikeys-main-grid">
      <section className="profile-card apikeys-create">
        <CardTitle icon={<KeyRound/>} title="Create New API Key" description="Generate a new API key with a name, scope, and optional expiration."/>
        <form onSubmit={event => void create(event)}>
          <label htmlFor="apikey-name">Key Name <em>*</em></label><span className="apikeys-input"><Tag size={17}/><input id="apikey-name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="e.g., ci-deploy, experiment-runner"/></span>
          <label htmlFor="apikey-permissions">Permissions (Scopes) <em>*</em></label><span className="apikeys-input apikeys-permissions-input"><Layers size={17}/><select id="apikey-permissions" required value={permissions} onChange={event => setPermissions(event.target.value)} aria-describedby="apikey-permissions-note"><option value="" disabled>Select permissions...</option><option value="account">Account permissions</option></select><ChevronDown size={16} className="apikeys-select-chevron"/></span>
          <p id="apikey-permissions-note" className="apikeys-field-note">Keys inherit your account permissions.</p>
          <label htmlFor="apikey-expiration">Expiration <span>(optional)</span></label><span className="apikeys-input"><CalendarDays size={17}/><select id="apikey-expiration" value={expiration} onChange={event => setExpiration(event.target.value)}><option value="0">No expiration</option><option value="7">In 7 days</option><option value="30">In 30 days</option><option value="90">In 90 days</option><option value="365">In 1 year</option></select><ChevronDown size={16} className="apikeys-select-chevron"/></span>
          <footer><button className="apikeys-primary" type="submit" disabled={creating}><Plus size={17}/>{creating ? "Creating…" : "Create API Key"}</button></footer>
        </form>
      </section>
      <section className="profile-card apikeys-list">
        <CardTitle icon={<Layers/>} title={`Your API Keys (${keys.length})`} description="Manage your existing API keys." action={<button type="button" className="apikeys-refresh" aria-label="Refresh API keys" disabled={loading} onClick={() => void loadKeys()}><RefreshCw size={16} className={loading ? "animate-spin" : undefined}/></button>}/>
        <div className="apikeys-table-scroll" aria-busy={loading}><table><thead><tr><th>Name</th><th>Scopes</th><th>Created</th><th>Expires</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{keys.map(key => {
          const status = keyStatus(key);
          return <tr key={key.id}><td><div className="apikeys-key-name"><KeyRound size={17}/><span title={key.name}>{key.name}</span></div></td><td><span className="apikeys-scope">Account</span></td><td>{formatDate(key.created_at)}</td><td>{formatDate(key.expires_at)}</td><td><span className="apikeys-status" data-status={status}>{status === "Active" && <CheckCircle2 size={11} className="apikeys-active-icon"/>} {status}</span></td><td><details className="apikeys-actions"><summary aria-label={`Actions for ${key.name}`} title={`Actions for ${key.name}`}><Ellipsis size={17}/></summary><div className="apikeys-actions-menu"><button type="button" aria-label={`Revoke ${key.name}`} disabled={status !== "Active" || revoking === key.id} onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); void revoke(key); }}><Trash2 size={14}/>Revoke key</button></div></details></td></tr>;
        })}</tbody></table></div>
        {!keys.length && <p className="apikeys-empty">{loading ? "Loading API keys…" : error ? "API keys unavailable. Retry to load your keys." : "No API keys yet. Create your first key to get started."}</p>}
      </section>
    </div>
    <div className="apikeys-bottom-grid">
      <section className="profile-card apikeys-usage"><CardTitle icon={<UsageIcon/>} title="Usage & Limits" description="An overview of your API access."/><div className="apikeys-usage-grid"><div className="apikeys-active-count"><Layers size={26}/><div><strong>{loading || error ? "—" : activeCount}</strong><p>Active API keys</p></div></div><div className="apikeys-request-count"><span className="apikeys-usage-ring" aria-hidden="true">—</span><div><strong>Not available</strong><p>Request usage & monthly limit</p></div></div></div><p className="apikeys-field-note">Request metering is not reported by the server.</p></section>
      <section className="profile-card apikeys-practices"><CardTitle icon={<Shield/>} title="Best Practices" description="Keep your API keys secure and only grant the permissions you need."/><ul>{practices.map(practice => <li key={practice}><Check size={20}/><span>{practice}</span></li>)}</ul></section>
    </div>
  </div>;
}
