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
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header meta={meta} />
        <main className="p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
