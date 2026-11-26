import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, Database, ShieldCheck, Users } from "lucide-react";
import { Header } from "./Header";
import { workspaceFeatures } from "../config/workspace";
import "../pages/SettingsPage.css";

export function AdministrationLayout() {
  const { pathname } = useLocation();
  const section = pathname.endsWith("/audit") ? "Audit Logs"
    : pathname.endsWith("/accounts") && workspaceFeatures.accountManagement ? "Accounts" : "Storage";
  return <div className="min-h-screen bg-[#fcfdfc] text-slate-900">
    <Header meta={{ group: "Administration", label: "Administration", href: "/admin" }} />
    <main className="mx-auto w-[calc(100%-2rem)] max-w-[1920px] py-5 sm:w-[calc(100%-3rem)]">
      <div className="settings-dashboard administration-dashboard">
        <aside className="settings-navigation">
          <h1>Administration</h1>
          <p>Manage this MLite installation.</p>
          <nav aria-label="Administration sections">
            {([
              ["accounts", "Accounts", Users],
              ["storage", "Storage", Database],
              ["audit", "Audit Logs", ShieldCheck],
            ] as const).filter(([path]) => path !== "accounts" || workspaceFeatures.accountManagement)
              .map(([path, label, Icon]) => <NavLink key={path} to={`/admin/${path}`}>
              <Icon size={21} />{label}
            </NavLink>)}
            <Link to="/app/services"><ArrowLeft size={18} />Service Health</Link>
            <Link to="/app"><ArrowLeft size={18} />Back to Workspace</Link>
          </nav>
        </aside>
        <div className="settings-content">
          <header className="settings-breadcrumb"><span>Administration</span><span aria-hidden="true">›</span><h1>{section}</h1></header>
          <Outlet />
        </div>
      </div>
    </main>
  </div>;
}
