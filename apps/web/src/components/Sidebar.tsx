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
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const navigation = [
    { name: "Overview", href: "/app", icon: LayoutDashboard },
    { name: "Projects", href: "/app/projects", icon: FolderGit2 },
    { name: "Datasets", href: "/app/datasets", icon: Database },
    { name: "Experiments", href: "/app/experiments", icon: FlaskConical },
    { name: "Model Registry", href: "/app/models", icon: Box },
    { name: "Deployments", href: "/app/deployments", icon: Server },
    { name: "Monitoring", href: "/app/monitoring", icon: LineChart },
    { name: "Alerts", href: "/app/alerts", icon: Bell },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 shadow-sm">
      <div>
        {/* Brand Logo Header */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-100">
          <Link
            to="/"
            title="Go to Landing Page"
            className="w-9 h-9 flex items-center justify-center bg-white rounded-xl border border-slate-200 p-1.5 shadow-xs hover:border-[#3BB48C]/60 hover:shadow-sm transition-all"
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

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs">
          <div className="flex items-center justify-between text-slate-700 mb-1 font-medium">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#3BB48C]" />
              Infrastructure
            </span>
            <span className="text-[#1A7456] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3BB48C] animate-pulse"></span>
              Online
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            MinIO: 9000 • API: 8000
          </div>
        </div>
      </div>
    </aside>
  );
};
