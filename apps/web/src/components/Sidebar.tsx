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
  Sparkles,
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
    <aside className="w-64 bg-[#0D1F2D] border-r border-[#19364C] flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Real Brand Logo */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-[#19364C]">
          <Link
            to="/welcome"
            title="Go to Welcome Landing Page"
            className="w-9 h-9 flex items-center justify-center bg-[#071018] rounded-lg border border-[#19364C] p-1 shadow-inner hover:border-[#3BB48C]/70 transition group"
          >
            <img src="/logo.png" alt="MLite Logo" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/" className="font-bold text-white text-lg tracking-tight hover:text-[#3BB48C] transition">
              MLite
            </Link>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-[#0D3326] text-[#3BB48C] border border-[#1A7456]">
              v1.0.0
            </span>
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
                    ? "bg-[#3BB48C] text-[#071018] font-bold shadow-md shadow-[#3BB48C]/25"
                    : "text-slate-400 hover:text-white hover:bg-[#153046]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#071018]" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-[#19364C]/70">
            <Link
              to="/welcome"
              className="flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-[#3BB48C] hover:bg-[#071018] transition border border-transparent hover:border-[#19364C]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#3BB48C]" />
              Landing Page
            </Link>
          </div>
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-[#19364C]">
        <div className="bg-[#071018] border border-[#19364C] rounded-lg p-3 text-xs">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#3BB48C]" />
              Infrastructure
            </span>
            <span className="text-[#3BB48C] font-semibold flex items-center gap-1">
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
