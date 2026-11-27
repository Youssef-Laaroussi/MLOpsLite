import { useEffect, useRef, useState, type FormEvent } from "react";
import { BriefcaseBusiness, Building2, Calendar, CheckCircle2, Clock, Crown, Globe, Layers, Mail, MapPin, Monitor, Pencil, Save, SlidersHorizontal, UserRound } from "lucide-react";
import { api } from "../api/client";
import type { User } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { workspaceFeatures } from "../config/workspace";

interface Details { jobTitle: string; organization: string; location: string; bio: string; avatar: string; language: string; timezone: string }
const defaults: Details = { jobTitle: "", organization: "", location: "", bio: "", avatar: "", language: "en", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
function readDetails(key: string): Details {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch { return defaults; }
}
export function ProfileSettings() {
  const { user, updateProfile } = useAuth();
  const storageKey = `mlite_profile_${user?.id ?? "guest"}`;
  const [saved, setSaved] = useState(() => readDetails(storageKey));
  const [details, setDetails] = useState(saved);
  const [name, setName] = useState(user?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  useEffect(() => { const next = readDetails(storageKey); setSaved(next); setDetails(next); setMessage(""); setError(""); }, [storageKey]);
  useEffect(() => { setName(user?.full_name ?? ""); }, [user?.full_name]);
  const field = (key: keyof Details, value: string) => { setDetails(previous => ({ ...previous, [key]: value })); setMessage(""); };
  const initials = (user?.full_name || user?.username || "U").split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
  const role = ({ ADMIN: "Administrator", USER: "User", MAINTAINER: "Maintainer", DEVELOPER: "Developer", VIEWER: "Viewer" } as const)[user?.role ?? "USER"];
  const dirty = name !== (user?.full_name ?? "") || JSON.stringify(details) !== JSON.stringify(saved);
  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage(""); setSaving(true);
    try {
      const { data } = await api.patch<User>("/auth/me", { full_name: name.trim() });
      localStorage.setItem(storageKey, JSON.stringify(details));
      setSaved(details); updateProfile({ ...data, avatar_url: details.avatar });
      setMessage("Profile saved. Additional details and preferences are saved in this browser.");
    } catch { setError("Could not save your profile. Please try again."); }
    finally { setSaving(false); }
  }
  function discard() { setName(user?.full_name ?? ""); setDetails(saved); setMessage(""); setError(""); }
  async function choosePhoto(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) { setError("Choose a PNG, JPG or WebP image smaller than 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => field("avatar", String(reader.result));
    reader.onerror = () => setError("Could not read this image.");
    reader.readAsDataURL(file);
  }
  const avatar = details.avatar || user?.avatar_url;
  const memberSince = user?.created_at && !Number.isNaN(Date.parse(user.created_at)) ? new Intl.DateTimeFormat("en", {dateStyle:"medium", timeZone:details.timezone}).format(new Date(user.created_at)) : "—";
  const timezones = Array.from(new Set([defaults.timezone, "Africa/Casablanca", "UTC", "Europe/Paris", "America/New_York", "Asia/Dubai", details.timezone]));
  return <form className="profile-settings" onSubmit={save}>
    <section className="profile-banner" aria-label="Profile summary">
      <div className="profile-avatar-wrap"><div className="profile-avatar">{avatar ? <img src={avatar} alt="Profile" /> : initials}</div>
        <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Profile photo" onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = ""; }} />
        <button type="button" className="profile-photo-edit" aria-label="Change profile photo" disabled={saving} onClick={() => photoInput.current?.click()}><Pencil size={21}/></button>
      </div>
      <div className="profile-identity"><h2>{user?.full_name || user?.username}</h2>{workspaceFeatures.accountManagement && <span className="profile-badge"><Crown size={18}/>{role}</span>}
        <p><Mail size={18}/>{user?.email}</p>{saved.location && <p><MapPin size={18}/>{saved.location}</p>}
      </div>
      <div className="profile-landscape" aria-hidden="true"><svg viewBox="0 0 600 190" preserveAspectRatio="none"><path fill="#e6faeb" d="M0 190Q80 90 140 118T270 65T410 45T600 0V190Z"/><path fill="#caf5d4" d="M90 190Q180 70 270 105T420 70T600 10V190Z"/><path fill="#a1edb4" d="M220 190Q320 110 400 140T600 35V190Z"/></svg><div className="profile-brand-tile"><img src="/logo.png" alt=""/></div></div>
    </section>
    <div className="profile-columns">
      <section className="profile-card profile-personal"><header><UserRound size={32}/><div><h2>Personal Information</h2><p>Update your personal details and how others see you.</p></div></header>
        <fieldset disabled={saving}>
          <label className="profile-wide">Full Name <em>*</em><span className="profile-input"><UserRound size={19}/><input required maxLength={200} value={name} onChange={event => {setName(event.target.value); setMessage("");}} autoComplete="name" /></span></label>
          <label>Email <em>*</em><span className="profile-input"><Mail size={19}/><input type="email" value={user?.email ?? ""} readOnly autoComplete="email" title="Email is managed by your administrator" /></span></label>
          <label>Job Title<span className="profile-input"><BriefcaseBusiness size={19}/><input value={details.jobTitle} maxLength={100} onChange={event => field("jobTitle", event.target.value)} autoComplete="organization-title" /></span></label>
          <label>Organization <span className="profile-optional">(optional)</span><span className="profile-input"><Building2 size={19}/><input value={details.organization} maxLength={150} onChange={event => field("organization", event.target.value)} autoComplete="organization" /></span></label>
          <label>Location<span className="profile-input"><MapPin size={19}/><input value={details.location} maxLength={150} onChange={event => field("location", event.target.value)} autoComplete="address-level2" /></span></label>
          <label className="profile-wide">Bio<textarea value={details.bio} maxLength={300} rows={4} onChange={event => field("bio", event.target.value)} /><small className="profile-counter">{details.bio.length} / 300</small></label>
        </fieldset>
        <p className="profile-storage-note">Email is managed by your administrator. Additional details and preferences are saved in this browser.</p>
        {error && <p className="profile-error" role="alert">{error}</p>}{message && <p className="profile-success" role="status">{message}</p>}
        <footer><button type="button" onClick={discard} disabled={!dirty || saving}>Discard</button><button type="submit" className="profile-save" disabled={!dirty || saving || !name.trim()}><Save size={19}/>{saving ? "Saving…" : "Save Changes"}</button></footer>
      </section>
      <aside className="profile-sidecards"><section className="profile-card"><h2><Layers size={24}/>Account Overview</h2><dl className="profile-account">
        {workspaceFeatures.accountManagement && <div><dt><Crown size={19}/>Role</dt><dd><span className="profile-badge"><Crown size={16}/>{role}</span></dd></div>}
        <div><dt><Calendar size={19}/>Member since</dt><dd>{memberSince}</dd></div>
        <div><dt><Clock size={19}/>Last login</dt><dd>—</dd></div>
        <div><dt><CheckCircle2 size={19}/>Account status</dt><dd><span className="profile-badge">{user?.is_active === false ? "Inactive" : "Active"}</span></dd></div>
      </dl></section>
      <section className="profile-card"><h2><SlidersHorizontal size={24}/>Preferences</h2><div className="profile-preferences">
        <label><span><Globe size={20}/>Language</span><select value={details.language} onChange={event => field("language",event.target.value)} disabled={saving}><option value="en">English</option></select></label>
        <label><span><Monitor size={20}/>Theme</span><select aria-label="Theme" value="light" disabled><option value="light">Light</option></select></label>
        <label><span><Clock size={20}/>Time zone</span><select value={details.timezone} onChange={event => field("timezone",event.target.value)} disabled={saving}>{timezones.map(zone=><option key={zone}>{zone}</option>)}</select></label>
      </div></section></aside>
    </div>
  </form>;
}
