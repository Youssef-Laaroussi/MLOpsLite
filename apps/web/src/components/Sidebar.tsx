import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  LayoutDashboard,
  FolderGit2,
  Database,
  FlaskConical,
  Box,
  Server,
  Layers,
  LineChart,
  Bell,
  Home,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { hasPermission } = useAuth();

  const navigation = [
    { name: "Overview", href: "/app", icon: LayoutDashboard },
    { name: "Projects", href: "/app/projects", icon: FolderGit2 },
    { name: "Datasets", href: "/app/datasets", icon: Database },
    { name: "Experiments", href: "/app/experiments", icon: FlaskConical },
    { name: "Model Registry", href: "/app/models", icon: Box },
    { name: "Deployments", href: "/app/deployments", icon: Server },
    { name: "Monitoring", href: "/app/monitoring", icon: LineChart },
    { name: "Alerts", href: "/app/alerts", icon: Bell },
    { name: "Services", href: "/app/services", icon: Layers },
    ...(hasPermission("audit:view")
      ? [{ name: "Audit Logs", href: "/app/audit", icon: ShieldCheck }]
      : []),
    { name: "Settings", href: "/app/settings", icon: Settings },
  ];

  return (
    <aside className="w-full min-w-0 shrink-0 self-start lg:sticky lg:top-[80px] lg:w-[200px]">
      <div className="rounded-2xl border border-[#dce5dd] bg-white shadow-sm">
        <p className="hidden px-4 pt-3 text-[10px] font-bold tracking-wide text-slate-400 lg:block">MLITE WORKSPACE</p>
        <nav className="flex items-center gap-1 overflow-x-auto p-2.5 lg:block lg:space-y-0.5 lg:overflow-visible">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href === "/app" && ["/", "/app/overview", "/dashboard"].includes(location.pathname));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full px-3 py-[7px] text-sm font-semibold transition-colors ${isActive
                  ? "bg-[#e7f5e7] text-[#096235]"
                  : "text-slate-700 hover:bg-[#f0f6f1] hover:text-[#096235]"
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#096235]" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}

        </nav>
      </div>

      <div className="sidebar-promo mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block">
        <div className="px-4 pt-4"><h2 className="font-serif text-xl font-bold text-[#005b30]">MLite</h2><h3 className="font-serif font-bold text-[#006a32]">Self-Hosted MLOps</h3><p className="mt-2 text-xs leading-relaxed text-slate-500">Build, manage, and operate ML models end-to-end<br />in your own infrastructure.</p></div>
        <div className="promo-art"><div className="iso-cube"><i /><b /><em /></div></div>
        <a href="https://github.com/Youssef-Laaroussi/MLOpsLite/tree/main/docs" target="_blank" rel="noreferrer" className="mx-4 mb-4 flex items-center justify-center gap-2 rounded-lg bg-[#007c37] py-2.5 text-xs font-semibold text-white hover:bg-[#00632c]">Documentation <ArrowRight size={14} /></a>
      </div>
    </aside>
  );
};
