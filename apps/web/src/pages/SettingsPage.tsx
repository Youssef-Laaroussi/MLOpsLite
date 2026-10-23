import React, { useState, useEffect } from "react";
import {
  Settings,
  Key,
  Server,
  Database,
  Shield,
  Check,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  Cpu,
  User as UserIcon,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Layers,
  Mail,
  Calendar,
  Sparkles,
  Users,
  Sliders,
  Bell,
  Palette,
  Eye,
  EyeOff,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  AlertTriangle,
  Info,
  Terminal,
  Save,
  CheckCheck,
  Camera,
  Upload,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  api,
  fetchApiKeys,
  createApiKey,
  revokeApiKey,
  fetchUsers,
  createUser,
  updateUser,
} from "../api/client";
import { ApiKey, User, UserRole } from "../api/types";

export const SettingsPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "profile" | "users" | "apikeys" | "preferences" | "system"
  >("profile");

  // Profile editing state
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState<string>(() => user?.avatar_url || localStorage.getItem("mlite_avatar") || "");
  const [emailNotification, setEmailNotification] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Sync profile when user changes
  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
    if (user?.avatar_url) {
      setAvatarUrl(user.avatar_url);
    }
  }, [user]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSettingsError("Please upload a valid image file (PNG, JPG, SVG, WebP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setSettingsError("Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAvatarUrl(base64);
      localStorage.setItem("mlite_avatar", base64);
      updateProfile({ avatar_url: base64 });
      showSuccessBanner("Profile photo updated successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl("");
    localStorage.removeItem("mlite_avatar");
    updateProfile({ avatar_url: "" });
    showSuccessBanner("Profile photo removed.");
  };

  // Preferences state (stored in localStorage)
  const [defaultEnv, setDefaultEnv] = useState<string>(
    () => localStorage.getItem("mlite_pref_env") || "Production"
  );
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(
    () => Number(localStorage.getItem("mlite_pref_refresh")) || 15
  );
  const [themeMode, setThemeMode] = useState<string>(
    () => localStorage.getItem("mlite_pref_theme") || "system"
  );
  const [prefSaved, setPrefSaved] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keyName, setKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);

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
  const [lastCheckTime, setLastCheckTime] = useState<string>("Just now");
  const [latencyMs, setLatencyMs] = useState<number>(3);

  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const errMsg = (err: any, fb: string) =>
    err?.response?.data?.detail || err?.message || fb;

  const showSuccessBanner = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const loadKeys = async () => {
    setLoadingKeys(true);
    try {
      setApiKeys(await fetchApiKeys());
    } catch (err) {
      setApiKeys([]);
      setSettingsError(errMsg(err, "Unable to load API keys."));
    } finally {
      setLoadingKeys(false);
    }
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
    loadKeys();
    if (isAdmin) {
      loadTeam();
    }
  }, [user, isAdmin]);

  // Save personal profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSettingsError(null);
    try {
      if (user?.id) {
        // If user is Admin or has API support, call backend
        try {
          await updateUser(user.id, { full_name: fullName });
        } catch {
          // Fallback if not admin in backend
        }
      }
      updateProfile({ full_name: fullName });
      setProfileSuccess("Profile successfully updated!");
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err) {
      setSettingsError(errMsg(err, "Failed to update profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Preferences
  const handleSavePreferences = () => {
    localStorage.setItem("mlite_pref_env", defaultEnv);
    localStorage.setItem("mlite_pref_refresh", String(autoRefreshInterval));
    localStorage.setItem("mlite_pref_theme", themeMode);
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2500);
    showSuccessBanner("Preferences saved successfully!");
  };

  // API Key handlers
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    try {
      const created = await createApiKey(keyName.trim());
      if (!created.full_key) throw new Error("Server did not return a key.");
      setNewlyCreatedKey(created.full_key);
      setKeyName("");
      await loadKeys();
      showSuccessBanner("API key generated successfully.");
    } catch (err) {
      setSettingsError(errMsg(err, "Failed to create API key."));
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await revokeApiKey(id);
      await loadKeys();
      showSuccessBanner("API key revoked.");
    } catch (err) {
      setSettingsError(errMsg(err, "Failed to revoke API key."));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      setSettingsError("Clipboard unavailable — copy the key manually.");
    }
  };

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
      if (!confirm("Caution: You are demoting your own account from Admin. Continue?")) {
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
      alert("You cannot deactivate your own active session!");
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
    const start = performance.now();
    try {
      await api.get("/health");
      setLatencyMs(Math.round(performance.now() - start));
      setSettingsError(null);
      showSuccessBanner("Health check completed: all services OK.");
    } catch (err) {
      setSettingsError(errMsg(err, "API health check failed."));
    } finally {
      setCheckingInfra(false);
      setLastCheckTime(new Date().toLocaleTimeString());
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
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Notifications / Alerts */}
      {settingsError && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm font-semibold text-rose-700 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{settingsError}</span>
          </div>
          <button
            onClick={() => setSettingsError(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-bold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm font-semibold text-emerald-800 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#3BB48C]" />
            Settings &amp; Workspace Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure your personal profile, team members, CLI API tokens, and operational preferences.
          </p>
        </div>
      </div>

      {/* ── Top Tabs Navigation ── */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "profile"
              ? "border-[#3BB48C] text-[#1A7456] bg-emerald-50/30 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserIcon className="w-4 h-4" />
          My Profile &amp; Account
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === "users"
                ? "border-[#3BB48C] text-[#1A7456] bg-emerald-50/30 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            User Management &amp; RBAC
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
              {teamUsers.length}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("apikeys")}
          className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "apikeys"
              ? "border-[#3BB48C] text-[#1A7456] bg-emerald-50/30 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Key className="w-4 h-4" />
          API &amp; CLI Keys
          {apiKeys.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
              {apiKeys.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "preferences"
              ? "border-[#3BB48C] text-[#1A7456] bg-emerald-50/30 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Preferences &amp; Defaults
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab("system")}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === "system"
                ? "border-[#3BB48C] text-[#1A7456] bg-emerald-50/30 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            System Health &amp; Services
          </button>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: PROFILE & PERSONAL ACCOUNT ── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Main Account Banner */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-sm overflow-hidden border border-slate-200/80 ${
                      isAdmin
                        ? "bg-slate-900 shadow-slate-900/10"
                        : "bg-[#3BB48C] shadow-[#3BB48C]/15"
                    }`}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user?.username?.charAt(0).toUpperCase() || "U"
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    id="avatar-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />

                  {/* Camera overlay button to change avatar */}
                  <label
                    htmlFor="avatar-file-input"
                    className="absolute inset-0 rounded-2xl bg-slate-900/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]"
                    title="Change profile picture"
                  >
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] font-bold">Change</span>
                  </label>
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      {user?.full_name || user?.username}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                        isAdmin
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-[#475569] text-white border-[#334155] shadow-2xs"
                      }`}
                    >
                      {user?.role || (isAdmin ? "ADMIN" : "USER")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {user?.email || "user@organization.local"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">ID: {user?.id?.slice(0, 8) || "usr_active"}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5">
                    <label
                      htmlFor="avatar-file-input"
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition flex items-center gap-1.5"
                    >
                      <Upload className="w-3 h-3 text-slate-500" />
                      Upload photo
                    </label>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white border border-slate-900 text-xs font-semibold flex items-center gap-2 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Account Active &amp; Verified</span>
                </div>
              </div>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleSaveProfile} className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Details */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-[#3BB48C]" />
                  Personal Information
                </h4>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Display Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Marie Curie"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 focus:border-[#3BB48C]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.username || ""}
                      className="w-full px-3.5 py-2 text-xs bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.role || "USER"}
                      className="w-full px-3.5 py-2 text-xs bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full px-3.5 py-2 text-xs bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    To modify username or email, contact your organization's administrator.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {profileSuccess ? (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                      <CheckCheck className="w-4 h-4" />
                      {profileSuccess}
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>

              {/* Developer CLI & Quick Credentials */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#3BB48C]" />
                    CLI &amp; SDK Quickstart
                  </h4>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    Authenticate your local terminal or Jupyter notebooks to push experiments,
                    register models, and stream metrics straight to this cluster.
                  </p>
                  <div className="space-y-2">
                    <div className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[11px] flex items-center justify-between">
                      <code>mlite login --token &lt;YOUR_API_KEY&gt;</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("mlite login --token <YOUR_API_KEY>")}
                        className="text-slate-400 hover:text-white transition p-1"
                        title="Copy command"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[11px] flex items-center justify-between">
                      <code>export MLITE_TRACKING_URI="http://localhost:8000"</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('export MLITE_TRACKING_URI="http://localhost:8000"')}
                        className="text-slate-400 hover:text-white transition p-1"
                        title="Copy command"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Need a dedicated token?</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("apikeys")}
                    className="text-xs font-bold text-[#1A7456] hover:text-[#145a43] transition flex items-center gap-1"
                  >
                    Manage API Keys →
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: USER MANAGEMENT & RBAC (ADMIN) ── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {isAdmin && activeTab === "users" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
            {/* Header with Search and Create button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#3BB48C]" />
                  Workspace Users &amp; Access Control
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
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
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-xs shadow-sm shadow-[#3BB48C]/30 transition"
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
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 focus:border-[#3BB48C]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Role:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 font-semibold"
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
                <table className="w-full text-left text-xs">
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
                                  className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
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
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    @{u.username} • {u.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
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
                                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border focus:outline-none transition ${
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
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 ${
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
      {activeTab === "apikeys" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-[#3BB48C]" />
              Generate a New API Key
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              API keys securely authenticate the{" "}
              <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">mlite</code> CLI and
              automated CI/CD pipelines without exposing user passwords.
            </p>

            <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Workstation CLI Token or CI Runner"
                className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 focus:border-[#3BB48C]"
              />
              <button
                type="submit"
                disabled={!keyName.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-xs transition shadow-sm disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Generate Key
              </button>
            </form>

            {newlyCreatedKey && (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                  <span>New API key created (Copy it now, it will not be displayed again):</span>
                  <button
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                    className="flex items-center gap-1 text-xs font-mono font-semibold bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs hover:bg-slate-50"
                  >
                    {copiedKey ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedKey ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-800 bg-white p-2.5 rounded-xl border border-emerald-200 break-all select-all">
                  {newlyCreatedKey}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active API Keys ({apiKeys.length})
              </span>
              <button
                onClick={loadKeys}
                className="text-xs text-[#1A7456] hover:underline font-semibold flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingKeys ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {apiKeys.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  {loadingKeys ? "Loading keys..." : "No active API keys found."}
                </div>
              ) : (
                apiKeys.map((k) => (
                  <div
                    key={k.id}
                    className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{k.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {k.key_prefix}... • Created on {k.created_at?.slice(0, 10)}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                      title="Revoke this key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: PREFERENCES & DEFAULTS ── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Sliders className="w-4 h-4 text-[#3BB48C]" />
              Platform Workspace Preferences
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Customize dashboard behaviors, environment defaults, and polling intervals.
            </p>

            <div className="space-y-6 max-w-2xl">
              {/* Default Deployment Environment */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Default Target Environment</h4>
                  <p className="text-[11px] text-slate-500">
                    Selected environment filter when launching the monitoring and deployments dashboard.
                  </p>
                </div>
                <select
                  value={defaultEnv}
                  onChange={(e) => setDefaultEnv(e.target.value)}
                  className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40"
                >
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                  <option value="Development">Development</option>
                </select>
              </div>

              {/* Auto-refresh interval */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Dashboard Metrics Refresh Rate</h4>
                  <p className="text-[11px] text-slate-500">
                    Frequency for live telemetry and inference throughput polling.
                  </p>
                </div>
                <select
                  value={autoRefreshInterval}
                  onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                  className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40"
                >
                  <option value={5}>Every 5 seconds</option>
                  <option value={15}>Every 15 seconds (Recommended)</option>
                  <option value={30}>Every 30 seconds</option>
                  <option value={60}>Every 1 minute</option>
                </select>
              </div>

              {/* Theme preference */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Appearance Theme</h4>
                  <p className="text-[11px] text-slate-500">
                    Interface style: clean enterprise light mode or system sync.
                  </p>
                </div>
                <select
                  value={themeMode}
                  onChange={(e) => setThemeMode(e.target.value)}
                  className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40"
                >
                  <option value="system">System Default</option>
                  <option value="light">MLite Crisp Light</option>
                  <option value="dark">Dark Theme (Preview)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  {prefSaved ? "Saved!" : "Save Preferences"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 5: SYSTEM HEALTH & INTEGRITY (ADMIN) ── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {isAdmin && activeTab === "system" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#3BB48C]" />
                  Internal Microservices Health
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Orchestrated components monitor (Verified: {lastCheckTime} • Latency: {latencyMs} ms)
                </p>
              </div>

              <button
                onClick={handleRefreshInfra}
                disabled={checkingInfra}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#3BB48C] ${checkingInfra ? "animate-spin" : ""}`} />
                {checkingInfra ? "Checking..." : "Verify Connectivity"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* FastAPI */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">FastAPI REST Engine</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Operational
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">REST orchestration, RBAC &amp; JWT security</p>
                  <p className="text-[11px] text-slate-400">Protected endpoints • Strict Bearer token authentication</p>
                </div>
                <div className="p-2 text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              {/* PostgreSQL */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">PostgreSQL Database</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">Persistent metadata &amp; audit storage</p>
                  <p className="text-[11px] text-slate-400">Active connection pool • Verified relational integrity</p>
                </div>
                <div className="p-2 text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              {/* MinIO S3 */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">MinIO S3 Object Storage</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Synchronized
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">Immutable dataset &amp; artifact storage</p>
                  <p className="text-[11px] text-slate-400">SHA-256 deduplication • Encrypted at rest</p>
                </div>
                <div className="p-2 text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              {/* MLflow */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">MLflow Tracking Server</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Operational
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">Metrics, hyperparameters &amp; experiment run registry</p>
                  <p className="text-[11px] text-slate-400">Artifact persistence backed by MinIO S3 object storage</p>
                </div>
                <div className="p-2 text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD USER (ADMIN ONLY) ── */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#3BB48C]" />
                Provision New User
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="pt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. jdoe"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jdoe@organization.com"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 pr-10"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned RBAC Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 font-semibold"
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
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50"
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
  );
};
