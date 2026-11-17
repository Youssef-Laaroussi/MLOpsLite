import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header, RouteMeta } from "./Header";
import { useAuth } from "../context/AuthContext";

const ROUTES: Record<string, Omit<RouteMeta, "href">> = {
  projects: { group: "Workspace", label: "Projects" },
  datasets: { group: "Data", label: "Datasets & Lineage" },
  experiments: { group: "Build", label: "Experiments" },
  models: { group: "Build", label: "Model Registry" },
  deployments: { group: "Operate", label: "Deployments" },
  monitoring: { group: "Operate", label: "Monitoring & Drift" },
  alerts: { group: "Operate", label: "Alerts" },
  audit: { group: "Governance", label: "Audit Logs" },
  settings: { group: "Account", label: "Settings" },
};

export const Layout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const segment = location.pathname.replace(/^\/app/, "").split("/").filter(Boolean)[0];
  const meta: RouteMeta =
    segment && ROUTES[segment]
      ? { ...ROUTES[segment], href: location.pathname }
      : { group: "Workspace", label: isAdmin ? "Governance Console" : "Overview", href: "/app" };

  return (
    <div className="min-h-screen bg-[#fcfdfc] text-slate-900">
      <Header meta={meta} />
      <div className="mx-auto flex w-[calc(100%-2rem)] max-w-[1920px] flex-col gap-5 py-5 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-3rem)] lg:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
