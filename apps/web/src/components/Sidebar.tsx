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
  ];

  const getRoleColor = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return "text-rose-700 bg-rose-50 border-rose-200";
      case "MAINTAINER":
        return "text-sky-700 bg-sky-50 border-sky-200";
      case "DEVELOPER":
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "VIEWER":
      default:
        return "text-slate-700 bg-slate-100 border-slate-200";
    }
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
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

      {/* User Status & Infrastructure Footer */}
      <div className="p-4 border-t border-slate-100 space-y-2.5">
        {isAuthenticated && user && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#3BB48C] text-white font-black text-xs flex items-center justify-center shrink-0">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="truncate text-left">
                <div className="text-xs font-bold text-slate-800 truncate leading-none">
                  {user.username}
                </div>
                <span className={`inline-block text-[9px] font-mono font-bold px-1.5 py-0.2 rounded mt-1 border ${getRoleColor(user.role)}`}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs">
          <div className="flex items-center justify-between text-slate-700 mb-1 font-medium">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Activity className="w-3.5 h-3.5 text-[#3BB48C]" />
              Infrastructure
            </span>
            <span className="text-[#1A7456] text-[11px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3BB48C] animate-pulse"></span>
              Online
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            MinIO: 9000 • API: 8000
          </div>
        </div>
      </div>
    </aside>
  );
};
