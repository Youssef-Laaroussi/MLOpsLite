import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export const Layout: React.FC = () => {
  const location = useLocation();

  const titleMap: Record<string, string> = {
    "/": "System Overview",
    "/projects": "Project Management",
    "/datasets": "Datasets & Lineage",
    "/experiments": "Experiment Tracking",
    "/models": "Model Registry & Stages",
    "/deployments": "Inference Deployments",
    "/monitoring": "Model Monitoring & Drift",
    "/alerts": "Alerts & Webhooks",
  };

  const title = titleMap[location.pathname] || "MLite Dashboard";

  return (
    <div className="flex min-h-screen bg-[#0b1120] text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={title} />
        <main className="p-8 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
