import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Key,
  LogOut,
  ChevronDown,
  ChevronRight,
  LogIn,
  Settings,
  Search,
  Bell,
  Plus,
  FolderGit2,
  Database,
  FlaskConical,
  Box,
  Server,
  LineChart,
  ShieldCheck,
  LayoutDashboard,
  AlertTriangle,
  CheckCircle2,
  Rocket,
  CornerDownLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiKeysModal } from "./ApiKeysModal";
import { UserRole, Alert } from "../api/types";
import { fetchAlerts } from "../api/client";

export interface RouteMeta {
  group: string;
  label: string;
  href: string;
}

interface HeaderProps {
  meta: RouteMeta;
}

const NAV_TARGETS = [
  { label: "Overview", href: "/app", icon: LayoutDashboard, hint: "Platform summary" },
  { label: "Projects", href: "/app/projects", icon: FolderGit2, hint: "Workspaces & teams" },
  { label: "Datasets", href: "/app/datasets", icon: Database, hint: "Versions & lineage" },
  { label: "Experiments", href: "/app/experiments", icon: FlaskConical, hint: "Runs & metrics" },
  { label: "Model Registry", href: "/app/models", icon: Box, hint: "Versions & stages" },
  { label: "Deployments", href: "/app/deployments", icon: Server, hint: "Inference endpoints" },
  { label: "Monitoring", href: "/app/monitoring", icon: LineChart, hint: "Drift & latency" },
  { label: "Alerts", href: "/app/alerts", icon: Bell, hint: "Rules & incidents" },
  { label: "Audit Logs", href: "/app/audit", icon: ShieldCheck, hint: "Governance trail" },
  { label: "Settings", href: "/app/settings", icon: Settings, hint: "Profile & API keys" },
];

const QUICK_CREATE = [
  { label: "New project", href: "/app/projects", icon: FolderGit2 },
  { label: "Upload dataset", href: "/app/datasets", icon: Database },
  { label: "Track experiment", href: "/app/experiments", icon: FlaskConical },
  { label: "Deploy a model", href: "/app/deployments", icon: Rocket },
];

const useClickOutside = (ref: React.RefObject<HTMLElement>, cb: () => void) => {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, cb]);
};

export const Header: React.FC<HeaderProps> = ({ meta }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<null | "user" | "create" | "notif" | "env">(null);
  const [apiKeysModalOpen, setApiKeysModalOpen] = useState(false);
  const [env, setEnv] = useState<"Production" | "Staging" | "Development">("Production");
  const [realAlerts, setRealAlerts] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    fetchAlerts({ status: "OPEN", limit: 5 })
      .then((items) => {
        if (!mounted) return;
        setRealAlerts(items);
        setUnread(items.length);
      })
      .catch(() => {
        if (!mounted) return;
        setRealAlerts([]);
        setUnread(0);
      });
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, location.pathname]);

  // Command palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const barRef = useRef<HTMLDivElement>(null);
  useClickOutside(barRef, () => setOpenMenu(null));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!paletteOpen) {
      setQuery("");
      setCursor(0);
    }
  }, [paletteOpen]);

  const results = NAV_TARGETS.filter(
    (t) =>
      t.label.toLowerCase().includes(query.toLowerCase()) ||
      t.hint.toLowerCase().includes(query.toLowerCase())
  );

  const go = (href: string) => {
    setPaletteOpen(false);
    setOpenMenu(null);
    navigate(href);
  };

  const toggle = (m: typeof openMenu) => setOpenMenu((cur) => (cur === m ? null : m));

  const roleBadge = (role?: UserRole) =>
    role === "ADMIN"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-[#475569] text-white border-[#334155] shadow-2xs";

  const envDot =
    env === "Production" ? "bg-emerald-500" : env === "Staging" ? "bg-amber-500" : "bg-sky-500";

  return (
    <>
      <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
          <Link to="/app" className="font-semibold text-slate-400 hover:text-slate-700 transition">
            MLite
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="font-medium text-slate-400 hidden md:inline">{meta.group}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 hidden md:inline" />
          <h1 className="font-bold text-slate-900 truncate">{meta.label}</h1>
        </nav>

        <div ref={barRef} className="flex items-center gap-2">
          {/* Search trigger */}
          <button
            id="header-search"
            onClick={() => setPaletteOpen(true)}
            className="hidden lg:flex items-center gap-2 w-64 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs hover:border-slate-300 hover:bg-white transition"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Search or jump to…</span>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-500">
              Ctrl K
            </kbd>
          </button>

          {/* Environment switcher */}
          <div className="relative">
            <button
              id="header-env"
              onClick={() => toggle("env")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 transition"
            >
              <span className="relative flex w-2 h-2">
                <span className={`absolute inset-0 rounded-full ${envDot} opacity-60 animate-ping`} />
                <span className={`relative w-2 h-2 rounded-full ${envDot}`} />
              </span>
              <span className="hidden sm:inline">{env}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {openMenu === "env" && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50">
                <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Environment
                </p>
                {(["Production", "Staging", "Development"] as const).map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      setEnv(e);
                      setOpenMenu(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition ${env === e ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    {e}
                    {env === e && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                ))}
                <div className="mt-1 px-2.5 py-2 border-t border-slate-100 text-[11px] text-slate-500">
                  Target Scope: <span className="font-semibold text-slate-700">{env} Workspace</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick create */}
          <div className="relative">
            <button
              id="header-create"
              onClick={() => toggle("create")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white text-xs font-bold shadow-sm shadow-[#3BB48C]/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
            {openMenu === "create" && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50">
                {QUICK_CREATE.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => go(q.href)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <q.icon className="w-4 h-4 text-slate-400" />
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              id="header-notifications"
              onClick={() => {
                toggle("notif");
                setUnread(0);
              }}
              className="relative p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 transition"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
            {openMenu === "notif" && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Active Alerts</span>
                  <Link to="/app/alerts" onClick={() => setOpenMenu(null)} className="text-[11px] font-semibold text-[#3BB48C] hover:underline">
                    View all
                  </Link>
                </div>
                {realAlerts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-2 opacity-80" />
                    No open alerts. All systems healthy.
                  </div>
                ) : (
                  realAlerts.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => go("/app/alerts")}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition border-b border-slate-50 last:border-0"
                    >
                      {n.severity === "CRITICAL" || n.severity === "HIGH" ? (
                        <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{n.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{n.message}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* User */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                id="header-user"
                onClick={() => toggle("user")}
                className="flex items-center gap-2 p-1 pr-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs overflow-hidden ${user.role === "ADMIN"
                    ? "bg-gradient-to-tr from-rose-500 to-pink-600"
                    : "bg-gradient-to-tr from-[#3BB48C] to-teal-400"
                    }`}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user.username.charAt(0).toUpperCase()
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {openMenu === "user" && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-900">{user.full_name || user.username}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadge(user.role)}`}>
                        {user.role}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    </div>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/app/settings"
                      onClick={() => setOpenMenu(null)}
                      className="w-full px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2.5">
                        <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#3BB48C] transition" />
                        Settings & Profile
                      </span>
                      <span className="text-[10px] text-slate-400">Manage</span>
                    </Link>
                    <button
                      onClick={() => {
                        setOpenMenu(null);
                        setApiKeysModalOpen(true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2.5">
                        <Key className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#3BB48C] transition" />
                        API & CLI Keys
                      </span>
                      <span className="text-[10px] text-slate-400">Tokens</span>
                    </button>
                  </div>
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        logout();
                        setOpenMenu(null);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Command palette */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                id="command-palette-input"
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(c + 1, results.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(c - 1, 0));
                  } else if (e.key === "Enter" && results[cursor]) {
                    go(results[cursor].href);
                  }
                }}
                placeholder="Jump to a page…"
                className="flex-1 py-4 text-sm outline-none bg-transparent placeholder:text-slate-400"
              />
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-400">Esc</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-8">No results for “{query}”</p>
              )}
              {results.map((r, i) => (
                <button
                  key={r.href}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(r.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${i === cursor ? "bg-slate-50" : ""
                    }`}
                >
                  <div className={`p-1.5 rounded-lg ${i === cursor ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    <r.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                    <p className="text-[11px] text-slate-500">{r.hint}</p>
                  </div>
                  {i === cursor && <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <ApiKeysModal isOpen={apiKeysModalOpen} onClose={() => setApiKeysModalOpen(false)} />
    </>
  );
};
