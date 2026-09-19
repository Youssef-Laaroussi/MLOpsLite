import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { DashboardOverview } from "./pages/DashboardOverview";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ModelsPage } from "./pages/ModelsPage";
import { DeploymentsPage } from "./pages/DeploymentsPage";
import { DatasetsPage } from "./pages/DatasetsPage";
import { MonitoringPage } from "./pages/MonitoringPage";
import { AlertsPage } from "./pages/AlertsPage";
import { LandingPage } from "./pages/LandingPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Main Landing Page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />

          {/* Dashboard Application under /app */}
          <Route path="/app" element={<Layout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="overview" element={<DashboardOverview />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="datasets" element={<DatasetsPage />} />
            <Route path="experiments" element={<Navigate to="/app" replace />} />
            <Route path="models" element={<ModelsPage />} />
            <Route path="deployments" element={<DeploymentsPage />} />
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="alerts" element={<AlertsPage />} />
          </Route>

          {/* Direct convenience routes (e.g. /deployments, /projects) */}
          <Route element={<Layout />}>
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="datasets" element={<DatasetsPage />} />
            <Route path="experiments" element={<Navigate to="/app" replace />} />
            <Route path="models" element={<ModelsPage />} />
            <Route path="deployments" element={<DeploymentsPage />} />
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="alerts" element={<AlertsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
