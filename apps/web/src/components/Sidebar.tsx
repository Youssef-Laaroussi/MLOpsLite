import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderGit2,
  Database,
  FlaskConical,
  Box,
  Server,
  LineChart,
  Bell,
  Activity,
  Home,
  ShieldCheck,
  User as UserIcon,
  Settings,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, hasPermission } = useAuth();

  const navigation = [
    { name: "Overview", href: "/app", icon: LayoutDashboard },
    { name: "Projects", href: "/app/projects", icon: FolderGit2 },
    { name: "Datasets", href: "/app/datasets", icon: Database },
    { name: "Experiments", href: "/app/experiments", icon: FlaskConical },
    { name: "Model Registry", href: "/app/models", icon: Box },
    { name: "Deployments", href: "/app/deployments", icon: Server },
    { name: "Monitoring", href: "/app/monitoring", icon: LineChart },
    { name: "Alerts", href: "/app/alerts", icon: Bell },
    ...(hasPermission("audit:view")
      ? [{ name: "Audit Logs", href: "/app/audit", icon: ShieldCheck }]
      : []),
    { name: "Settings", href: "/app/settings", icon: Settings },
  ];

  const getRoleColor = (role?: string) => {
    if (role === "ADMIN") {
      return "text-rose-700 bg-rose-50 border-rose-200";
    }
    return "text-emerald-700 bg-emerald-50 border-emerald-200";
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 shadow-sm z-20">
      <div className="overflow-y-auto">
        {/* Brand Logo Header */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-100">
          <Link
            to="/"
            title="Go to Landing Page"
            className="w-10 h-10 flex items-center justify-center bg-slate-50/90 rounded-2xl border border-slate-200/90 p-2 shadow-xs hover:border-[#3BB48C]/60 hover:bg-white hover:shadow-sm transition-all"
          >
            <img src="/logo.png" alt="MLite Logo" className="w-full h-full object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/app" className="font-extrabold text-slate-900 text-lg tracking-tight hover:text-[#3BB48C] transition">
              MLite
            </Link>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
              v1.0.0
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href === "/app" && location.pathname === "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive
                    ? "bg-[#3BB48C] text-white shadow-md shadow-[#3BB48C]/25"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#F0FDF9]"
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                {item.name}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-100">
            <Link
              to="/"
              className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-[#3BB48C] hover:bg-[#F0FDF9] transition border border-transparent hover:border-[#BCE9DA]"
            >
              <Home className="w-3.5 h-3.5 text-[#3BB48C]" />
              Return to Landing Page
            </Link>
          </div>
        </nav>
      </div>

      {/* User Status & Settings Footer */}
      <div className="p-4 border-t border-slate-100">
        {isAuthenticated && user ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                  user.role === "ADMIN"
                    ? "bg-gradient-to-tr from-rose-500 to-pink-600 shadow-rose-500/20"
                    : "bg-[#3BB48C]"
                }`}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="truncate text-left">
                <div className="text-xs font-bold text-slate-800 truncate leading-none">
                  {user.username}
                </div>
                <span className={`inline-block text-[9px] font-mono font-bold px-1.5 py-0.2 rounded mt-1 border ${getRoleColor(user.role)}`}>
                  {user.role === "ADMIN" ? "ADMIN" : "USER"}
                </span>
              </div>
            </div>

            <Link
              to="/app/settings"
              title="Paramètres de l'application"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <Link
            to="/app/settings"
            className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-400" />
              Paramètres
            </span>
          </Link>
        )}
      </div>
    </aside>
  );
};
