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
  Terminal,
  Activity,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const navigation = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderGit2 },
    { name: "Datasets", href: "/datasets", icon: Database },
    { name: "Experiments", href: "/experiments", icon: FlaskConical },
    { name: "Model Registry", href: "/models", icon: Box },
    { name: "Deployments", href: "/deployments", icon: Server },
    { name: "Monitoring", href: "/monitoring", icon: LineChart },
    { name: "Alerts", href: "/alerts", icon: Bell },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20">
            M
          </div>
          <div>
            <span className="font-bold text-white text-lg tracking-tight">MLite</span>
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">v0.1.0</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-4 space-y-1.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-sky-500 text-white shadow-md shadow-sky-500/25"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Infrastructure
            </span>
            <span className="text-emerald-400 font-semibold">Online</span>
          </div>
          <div className="text-[11px] text-slate-500">
            MinIO: 9000 • API: 8000
          </div>
        </div>
      </div>
    </aside>
  );
};
