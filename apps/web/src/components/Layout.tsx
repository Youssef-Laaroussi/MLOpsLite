import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "../context/AuthContext";

export const Layout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const overviewTitle = isAdmin
    ? "Governance & Admin Console"
    : "MLOps Dashboard";

  const titleMap: Record<string, string> = {
    "/": overviewTitle,
    "/app": overviewTitle,
    "/app/projects": "Project Management",
    "/app/datasets": "Datasets & Lineage",
    "/app/experiments": "Experiment Tracking",
    "/app/models": "Model Registry & Stages",
    "/app/deployments": "Inference Deployments",
    "/app/monitoring": "Model Monitoring & Drift",
    "/app/alerts": "Alerts & Webhooks",
    "/app/audit": "Audit Logs & Governance",
    "/app/settings": "Settings & Configuration",
    "/projects": "Project Management",
    "/datasets": "Datasets & Lineage",
    "/experiments": "Experiment Tracking",
    "/models": "Model Registry & Stages",
    "/deployments": "Inference Deployments",
    "/monitoring": "Model Monitoring & Drift",
    "/alerts": "Alerts & Webhooks",
    "/audit": "Audit Logs & Governance",
    "/settings": "Settings & Configuration",
  };

  const title = titleMap[location.pathname] || "MLite Dashboard";

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
