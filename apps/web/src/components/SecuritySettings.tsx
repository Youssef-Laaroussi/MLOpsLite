import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Eye, EyeOff, KeyRound, LockKeyhole, LogIn, LogOut, Monitor, QrCode, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

type SecurityEvent = { id: string; label: string; category: string; timestamp: string; ip_address: string | null };
const emptyPasswords = { current: "", next: "", confirm: "" };
const passwordFields = [ ["current", "Current password", "current-password"], ["next", "New password", "new-password"], ["confirm", "Confirm new password", "new-password"] ] as const;
function SecurityQrIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M2 2h7v7H2V2Zm1 1v5h5V3H3Zm1 1h3v3H4V4Zm11-2h7v7h-7V2Zm1 1v5h5V3h-5Zm1 1h3v3h-3V4ZM2 15h7v7H2v-7Zm1 1v5h5v-5H3Zm1 1h3v3H4v-3Z" />
    <path d="M11 2h2v2h-2zM11 6h2v3h-2zM2 11h3v2H2zM7 11h2v2H7zM11 11h3v3h-3zM16 11h2v2h-2zM20 11h2v3h-2zM11 16h2v2h-2zM15 15h3v3h-3zM20 16h2v3h-2zM11 20h3v2h-3zM16 20h2v2h-2zM20 21h2v1h-2z" />
  </svg>;
}
function CardTitle({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <header className="security-card-title">{icon}<div><h2>{title}</h2><p>{description}</p></div></header>;
}
function deviceLabel() {
  const agent = navigator.userAgent;
  const os = /Windows/i.test(agent) ? "Windows" : /Android/i.test(agent) ? "Android" : /iPhone|iPad/i.test(agent) ? "iOS" : /Macintosh/i.test(agent) ? "macOS" : /Linux/i.test(agent) ? "Linux" : "This device";
  const browser = /Edg\//.test(agent) ? "Edge" : /Firefox\//.test(agent) ? "Firefox" : /Chrome\//.test(agent) ? "Chrome" : /Safari\//.test(agent) ? "Safari" : "Browser";
  return `${browser} on ${os}`;
}
function eventDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
export function SecuritySettings() {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const activity = useQuery({
    queryKey: ["account-security-activity", user?.id],
    queryFn: async ({ signal }) => (await api.get<{ events: SecurityEvent[] }>("/auth/security/activity", { signal })).data.events,
    enabled: Boolean(user?.id), retry: false, staleTime: 30000,
  });
  async function updatePassword(event: FormEvent) {
    event.preventDefault(); setError(""); setSuccess("");
    if (passwords.next !== passwords.confirm) { setError("New passwords do not match."); return; }
    if (new TextEncoder().encode(passwords.next).length > 72) { setError("This password is too long. Use a shorter password (maximum 72 UTF-8 bytes)."); return; }
    setSaving(true);
    try {
      await api.post("/auth/password", { current_password: passwords.current, new_password: passwords.next, confirm_password: passwords.confirm });
      setPasswords(emptyPasswords); setVisible({ current: false, next: false, confirm: false });
      setSuccess("Password updated. Existing sessions remain valid until they expire.");
      void activity.refetch();
    } catch (failure) {
      const detail = (failure as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Could not update your password. Please try again.");
    } finally { setSaving(false); }
  }
  return <div className="settings-security">
    <p className="security-intro">Secure your account and keep your MLite workspace and projects protected.</p>
    <section className="security-banner"><div className="security-banner-icon"><ShieldCheck size={40}/></div><div className="security-banner-copy"><h2>Account Security</h2><p>Manage your password, authentication, and account access.</p></div>
      <div className="security-banner-art" aria-hidden="true"><svg viewBox="0 0 500 120" preserveAspectRatio="none"><path fill="#e4fbea" d="M0 120Q90 20 180 65T350 35T500 0V120Z"/><path fill="#baf1cb" d="M100 120Q220 25 290 65T500 15V120Z"/></svg><span><LockKeyhole size={32}/></span></div>
    </section>
    <div className="security-columns">
      <div className="security-column">
        <section className="profile-card security-password"><CardTitle icon={<LockKeyhole/>} title="Change Password" description="Update your password regularly to keep your account secure."/>
          <form onSubmit={updatePassword}><fieldset disabled={saving}>{passwordFields.map(([key, label, autocomplete]) => <label key={key} className="security-password-field"><LockKeyhole size={17}/><input aria-label={label} autoComplete={autocomplete} placeholder={label} type={visible[key] ? "text" : "password"} required minLength={key === "current" ? 1 : 8} maxLength={key === "current" ? 200 : 72} value={passwords[key]} onChange={event => { setPasswords(previous => ({ ...previous, [key]: event.target.value })); setError(""); setSuccess(""); }}/><button type="button" aria-label={`${visible[key] ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible[key]} onClick={() => setVisible(previous => ({ ...previous, [key]: !previous[key] }))}>{visible[key] ? <Eye size={16}/> : <EyeOff size={16}/>}</button></label>)}</fieldset>
            <div className="security-password-feedback" aria-live="polite">{error ? <p className="profile-error" role="alert">{error}</p> : success ? <p className="profile-success" role="status">{success}</p> : <p className="security-password-hint">Use at least 8 characters for your new password.</p>}</div>
            <footer><button type="submit" disabled={saving || !passwords.current || !passwords.next || !passwords.confirm}><KeyRound size={16}/>{saving ? "Updating…" : "Update Password"}</button></footer>
          </form>
        </section>
        <section className="profile-card security-sessions"><CardTitle icon={<Monitor/>} title="Active Sessions" description="Devices currently signed in to your MLite account."/>
          <div className="security-session-current"><Monitor size={22}/><div><strong>{deviceLabel()}</strong><span className="security-badge">Current Session</span><p>{user?.email} · This browser</p></div><i aria-label="Current browser"/></div>
          <p className="security-support-note">Only your current browser is shown. Remote session management is not available yet.</p>
          <footer><button type="button" disabled title="Remote session revocation is not available"><LogOut size={16}/>Sign Out of Other Sessions</button></footer>
        </section>
      </div>
      <div className="security-column">
        <section className="profile-card security-two-factor"><div className="security-two-factor-header"><CardTitle icon={<SecurityQrIcon/>} title="Two-Factor Authentication (2FA)" description="Add an extra layer of security to your account."/><button role="switch" aria-checked="false" aria-label="Two-factor authentication" type="button" disabled title="Two-factor authentication is not supported by this server" className="security-toggle"><span/></button></div>
          <div className="security-two-factor-content"><div className="security-unavailable"><ShieldCheck size={20}/><div><strong>2FA is not available yet</strong><p>This server does not support authenticator enrollment. Your account is protected by its password.</p></div></div><div className="security-qr-placeholder"><QrCode size={58}/><p>Authenticator setup unavailable</p></div></div>
        </section>
        <section className="profile-card security-activity"><CardTitle icon={<Clock/>} title="Recent Security Activity" description="Key security events on your account."/>
          {activity.isPending && <p className="security-empty" role="status">Loading security activity…</p>}
          {activity.isError && <div className="security-empty"><p role="alert">Could not load security activity.</p><button type="button" onClick={() => void activity.refetch()}><RefreshCw size={13}/>Retry</button></div>}
          {activity.isSuccess && (!activity.data.length ? <p className="security-empty">No security events recorded yet.</p> : <ul>{activity.data.map(event => {
            const Icon = event.category === "sign-in" ? LogIn : event.category === "password" || event.category === "api-key" ? KeyRound : ShieldCheck;
            return <li key={event.id}><Icon size={20}/><div><strong>{event.label}</strong><p><time dateTime={event.timestamp}>{eventDate(event.timestamp)}</time>{event.ip_address ? ` · ${event.ip_address}` : ""}</p></div><span className="security-badge">Success</span></li>;
          })}</ul>)}
        </section>
      </div>
    </div>
  </div>;
}
