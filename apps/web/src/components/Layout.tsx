import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header, RouteMeta } from "./Header";
import { useInstallation } from "../hooks/useInstallation";
import { useAuth } from "../context/AuthContext";

const ROUTES: Record<string, Omit<RouteMeta, "href">> = {
  projects: { group: "Workspace", label: "Projects" },
  datasets: { group: "Data", label: "Datasets & Lineage" },
  experiments: { group: "Build", label: "Experiments" },
  models: { group: "Build", label: "Model Registry" },
  deployments: { group: "Operate", label: "Deployments" },
  monitoring: { group: "Operate", label: "Monitoring & Drift" },
  alerts: { group: "Operate", label: "Alerts" },
  services: { group: "Operate", label: "Services" },
  audit: { group: "Governance", label: "Audit Logs" },
  settings: { group: "Account", label: "Settings" },
};

export const Layout: React.FC = () => {
  const location = useLocation();
  const installation = useInstallation();
  const { user } = useAuth();

  const segment = location.pathname.replace(/^\/app/, "").split("/").filter(Boolean)[0];
  const isSettings = segment === "settings";
  const meta: RouteMeta =
    segment && ROUTES[segment]
      ? { ...ROUTES[segment], href: location.pathname }
      : { group: "Workspace", label: "Overview", href: "/app" };

  return (
    <div className={`${isSettings ? "workspace-settings-layout" : "min-h-screen"} bg-[#fcfdfc] text-slate-900`}>
      <Header meta={meta} />
      <div className={`mx-auto flex w-[calc(100%-2rem)] max-w-[1920px] flex-col gap-5 py-5 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-3rem)] lg:flex-row${isSettings ? " workspace-settings-frame" : ""}`}>
        <Sidebar />
        <main className={`min-w-0 flex-1${isSettings ? " workspace-settings-main" : ""}`}>
          {user?.role === "ADMIN" && installation.data?.migration_required && <aside role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <strong>Complete the Solo migration for this existing installation.</strong>
            <p className="mt-1">The local installer must select the personal administrator account and assign projects that have no Owner. Existing accounts and data are preserved.</p>
            <code className="mt-2 block break-all rounded bg-white/70 p-2 text-xs">docker compose exec mlite-api mlite instance adopt-solo --username YOUR_USERNAME --claim-unowned-projects</code>
            <p className="mt-2 text-xs">Replace YOUR_USERNAME with the chosen existing account. Then sign in again; installation options are in Administration.</p>
          </aside>}
          <Outlet />
        </main>
      </div>
    </div>
  );
};
