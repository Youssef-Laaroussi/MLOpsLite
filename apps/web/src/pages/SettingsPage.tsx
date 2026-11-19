import { AboutSettings } from "../components/AboutSettings";
import { PreferencesIcon, PreferencesSettings } from "../components/PreferencesSettings";
import { ApiKeysSettings } from "../components/ApiKeysSettings";
import { Link } from "react-router-dom";
import { NotificationsSettings } from "../components/NotificationsSettings";
import { StorageSettings } from "../components/StorageSettings";
import { IntegrationsSettings } from "../components/IntegrationsSettings";
import { SecuritySettings } from "../components/SecuritySettings";
import { GeneralSettings } from "../components/GeneralSettings";
import { ProfileSettings } from "../components/ProfileSettings";
import "./SettingsPage.css";
import { useActionFeedback } from "../components/ActionFeedback";
import React, { useState, useEffect } from "react";
import {
  Settings,
  Puzzle,
  Code2,
  Server,
  Database,
  Shield,
  RefreshCw,
  User as UserIcon,
  CheckCircle2,
  ShieldCheck,
  Users,
  Bell,
  Eye,
  EyeOff,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  fetchSystemServices,
  fetchUsers,
  createUser,
  updateUser,
} from "../api/client";
import { SubsystemService, User, UserRole } from "../api/types";

export const SettingsPage: React.FC = () => {
  const { confirmAction } = useActionFeedback();
  const { user, updateProfile } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "profile" | "users" | "apikeys" | "preferences" | "system" | "general" | "security" | "about" | "integrations" | "storage" | "notifications"
  >("profile");

  // Team / User Management state (Admin)
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("USER");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Stack Integrity state (Admin)
  const [checkingInfra, setCheckingInfra] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [serviceChecks, setServiceChecks] = useState<SubsystemService[] | null>(null);

  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const errMsg = (err: any, fb: string) =>
    err?.response?.data?.detail || err?.message || fb;

  const showSuccessBanner = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const loadTeam = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const users = await fetchUsers();
      setTeamUsers(users);
    } catch (err) {
      setTeamUsers([]);
      setSettingsError(errMsg(err, "Unable to load team members."));
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadTeam();
    }
  }, [user, isAdmin]);

  // Admin User Management handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newEmail.trim() || !newPassword) return;
    setCreatingUser(true);
    setSettingsError(null);
    try {
      await createUser({
        username: newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword,
        full_name: newFullName.trim() || undefined,
        role: newRole,
      });
      setShowAddUserModal(false);
      setNewUsername("");
      setNewEmail("");
      setNewFullName("");
      setNewPassword("");
      setNewRole("USER");
      await loadTeam();
      showSuccessBanner(`User "${newUsername}" created successfully!`);
    } catch (err) {
      setSettingsError(errMsg(err, "Failed to create user account."));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleChange = async (targetUser: User, role: UserRole) => {
    if (targetUser.id === user?.id && role !== "ADMIN") {
      if (!(await confirmAction("Change your role?", "Your account will lose administrator permissions.", "Change role"))) {
        return;
      }
    }
    setUpdatingUserId(targetUser.id);
    setSettingsError(null);
    try {
      await updateUser(targetUser.id, { role });
      await loadTeam();
      if (targetUser.id === user?.id) {
        updateProfile({ role });
      }
      showSuccessBanner(`Role for ${targetUser.username} updated to ${role}`);
    } catch (err) {
      setSettingsError(errMsg(err, `Failed to update role for ${targetUser.username}.`));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleActive = async (targetUser: User) => {
    const nextState = !targetUser.is_active;
    if (targetUser.id === user?.id && !nextState) {
      setSettingsError("You cannot deactivate your own active session.");
      return;
    }
    setUpdatingUserId(targetUser.id);
    setSettingsError(null);
    try {
      await updateUser(targetUser.id, { is_active: nextState });
      await loadTeam();
      showSuccessBanner(
        `User ${targetUser.username} ${nextState ? "activated" : "deactivated"}.`
      );
    } catch (err) {
      setSettingsError(errMsg(err, "Failed to change user status."));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRefreshInfra = async () => {
    setCheckingInfra(true);
    setSettingsError(null);
    try {
      setServiceChecks(await fetchSystemServices());
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (err) {
      setServiceChecks(null);
      setSettingsError(errMsg(err, "Service connectivity checks unavailable."));
    } finally {
      setCheckingInfra(false);
    }
  };

  // Filtered users
  const filteredUsers = teamUsers.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase()));
    const matchesRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="settings-dashboard" data-settings-tab={activeTab}>
      <aside className="settings-navigation"><h1>Settings</h1><p>Manage your workspace, security, integrations, and preferences.</p>
        <nav aria-label="Settings sections">
          {([["general", Settings, "General"], ["profile", UserIcon, "Profile"], ["security", Shield, "Security"]] as const).map(([tab, Icon, label]) => <button key={tab} type="button" aria-current={activeTab === tab ? "page" : undefined} onClick={() => setActiveTab(tab)}><Icon size={21}/>{label}</button>)}
          <button type="button" aria-current={activeTab === "integrations" ? "page" : undefined} onClick={() => setActiveTab("integrations")}><Puzzle size={21}/>Integrations</button>
          <button type="button" aria-current={activeTab === "storage" ? "page" : undefined} onClick={() => setActiveTab("storage")}><Database size={21}/>Storage</button>
          <button type="button" aria-current={activeTab === "notifications" ? "page" : undefined} onClick={() => setActiveTab("notifications")}><Bell size={21}/>Notifications</button>
          {([["apikeys", Code2, "API Keys"], ["preferences", PreferencesIcon, "Preferences"], ["about", Info, "About"]] as const).map(([tab, Icon, label]) => <button key={tab} type="button" aria-current={activeTab === tab ? "page" : undefined} onClick={() => setActiveTab(tab)}><Icon size={21}/>{label}</button>)}
          {isAdmin && <><button type="button" aria-current={activeTab === "users" ? "page" : undefined} onClick={() => setActiveTab("users")}><Users size={21}/>User Management</button><button type="button" aria-current={activeTab === "system" ? "page" : undefined} onClick={() => setActiveTab("system")}><ShieldCheck size={21}/>System Health</button></>}
        </nav>
      </aside>
      <div className="settings-content">
        <header className={`settings-breadcrumb${(activeTab === "about" || activeTab === "preferences" || activeTab === "apikeys" || activeTab === "general" || activeTab === "security" || activeTab === "integrations" || activeTab === "storage" || activeTab === "notifications") ? " settings-breadcrumb-general" : ""}`}><span>Settings</span><span aria-hidden="true">›</span><h1>{{profile:"Profile", users:"User Management", apikeys:"API Keys", preferences:"Preferences", system:"System Health", general:"General", security:"Security", about:"About", integrations:"Integrations", storage:"Storage", notifications:"Notifications"}[activeTab]}</h1></header>
      {/* Notifications / Alerts */}
      {settingsError && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-[13px] sm:text-[15px] font-semibold text-rose-700 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{settingsError}</span>
          </div>
          <button
            onClick={() => setSettingsError(null)}
            className="text-rose-500 hover:text-rose-700 text-[13px] font-bold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-[13px] sm:text-[15px] font-semibold text-emerald-800 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {activeTab === "profile" && <ProfileSettings />}
      {activeTab === "general" && <GeneralSettings />}
      {activeTab === "security" && <SecuritySettings />}
      {activeTab === "integrations" && <IntegrationsSettings />}
      {activeTab === "storage" && <StorageSettings />}
      {activeTab === "notifications" && <NotificationsSettings />}
      {activeTab === "about" && <AboutSettings />}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: USER MANAGEMENT & RBAC (ADMIN) ── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {isAdmin && activeTab === "users" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
            {/* Header with Search and Create button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-[17px] font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#3BB48C]" />
                  Workspace Users &amp; Access Control
                </h3>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  View, provision accounts, and manage RBAC roles for your organization ({teamUsers.length} total)
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={loadTeam}
                  disabled={loadingUsers}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  title="Reload users"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-[13px] shadow-sm shadow-[#3BB48C]/30 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Add New User
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter by name, username or email..."
                  className="w-full pl-9 pr-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 focus:border-[#3BB48C]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[13px] text-slate-500 font-medium">Role:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-1.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 font-semibold"
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="USER">USER</option>
                  <option value="DEVELOPER">DEVELOPER</option>
                  <option value="MAINTAINER">MAINTAINER</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          {loadingUsers ? "Loading users..." : "No users matched the search query."}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSelf = u.id === user?.id;
                        const isUpdating = updatingUserId === u.id;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl font-bold text-[13px] flex items-center justify-center shrink-0 ${
                                    u.role === "ADMIN"
                                      ? "bg-rose-100 text-rose-700 font-black"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  {u.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    {u.full_name || u.username}
                                    {isSelf && (
                                      <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[12px] text-slate-400 font-mono">
                                    @{u.username} • {u.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[12px] ${
                                  u.is_active !== false
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    u.is_active !== false ? "bg-emerald-500" : "bg-slate-400"
                                  }`}
                                />
                                {u.is_active !== false ? "Active" : "Deactivated"}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <select
                                value={u.role}
                                disabled={isUpdating}
                                onChange={(e) =>
                                  handleRoleChange(u, e.target.value as UserRole)
                                }
                                className={`px-2.5 py-1 text-[13px] font-mono font-bold rounded-lg border focus:outline-none transition ${
                                  u.role === "ADMIN"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-white text-slate-700 border-slate-300"
                                }`}
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option value="USER">USER</option>
                                <option value="DEVELOPER">DEVELOPER</option>
                                <option value="MAINTAINER">MAINTAINER</option>
                                <option value="VIEWER">VIEWER</option>
                              </select>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleToggleActive(u)}
                                disabled={isUpdating || isSelf}
                                className={`px-3 py-1.5 rounded-xl text-[13px] font-bold transition inline-flex items-center gap-1.5 ${
                                  u.is_active !== false
                                    ? "text-rose-600 hover:bg-rose-50 border border-rose-200 disabled:opacity-40"
                                    : "text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                                }`}
                                title={
                                  isSelf
                                    ? "You cannot deactivate yourself"
                                    : u.is_active !== false
                                    ? "Deactivate user account"
                                    : "Activate user account"
                                }
                              >
                                {u.is_active !== false ? (
                                  <>
                                    <UserX className="w-3.5 h-3.5" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    Activate
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: API & CLI KEYS ── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeTab === "apikeys" && <ApiKeysSettings />}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: PREFERENCES & DEFAULTS ── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeTab === "preferences" && <PreferencesSettings />}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 5: SYSTEM HEALTH & INTEGRITY (ADMIN) ── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {isAdmin && activeTab === "system" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-[15px] font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#3BB48C]" />
                  Internal Microservices Health
                </h3>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  {serviceChecks && lastCheckTime ? `Last checked at ${lastCheckTime}` : "Run a connectivity check to get service status."}
                </p>
              </div>

              <button
                onClick={handleRefreshInfra}
                disabled={checkingInfra}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[13px] transition shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#3BB48C] ${checkingInfra ? "animate-spin" : ""}`} />
                {checkingInfra ? "Checking..." : "Verify Connectivity"}
              </button>
            </div>

            {checkingInfra ? (
              <p role="status" className="text-[15px] text-slate-600">Checking service connectivity…</p>
            ) : serviceChecks?.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {serviceChecks.map((service) => (
                  <li key={service.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[15px] font-semibold text-slate-900">{service.name}</span>
                      <span className={service.status === "online" ? "text-[13px] text-emerald-700" : "text-[13px] text-rose-700"}>
                        {service.status === "online" ? "Reachable" : "Unreachable"}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] text-slate-600">
                      {service.status === "online" ? `Probe duration: ${service.latency}` : "The latest probe failed."}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p role="status" className="rounded-xl bg-slate-50 p-4 text-[15px] text-slate-600">
                {lastCheckTime ? "No current service status available." : "No service check results yet."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: ADD USER (ADMIN ONLY) ── */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="creation-dialog bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-[17px] font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#3BB48C]" />
                Provision New User
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-700 text-[15px] font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="pt-4 space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. jdoe"
                  className="w-full px-3.5 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jdoe@organization.com"
                  className="w-full px-3.5 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3.5 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3.5 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Assigned RBAC Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 font-semibold"
                >
                  <option value="USER">USER (Standard Engineer)</option>
                  <option value="DEVELOPER">DEVELOPER (Model Developer)</option>
                  <option value="MAINTAINER">MAINTAINER (Release Lead)</option>
                  <option value="ADMIN">ADMIN (Workspace Administrator)</option>
                  <option value="VIEWER">VIEWER (Read-only)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#3BB48C] hover:bg-[#329F7B] text-white text-[13px] font-bold rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {creatingUser ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
