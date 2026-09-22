import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardOverview } from "./pages/DashboardOverview";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ModelsPage } from "./pages/ModelsPage";
import { DeploymentsPage } from "./pages/DeploymentsPage";
import { DatasetsPage } from "./pages/DatasetsPage";
import { MonitoringPage } from "./pages/MonitoringPage";
import { AlertsPage } from "./pages/AlertsPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { LandingPage } from "./pages/LandingPage";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";
import { SettingsPage } from "./pages/SettingsPage";

import { AIAgentWidget } from "./components/AIAgentWidget";

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
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public Routes ── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />

            {/* ── Auth Routes (dedicated pages) ── */}
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/login" element={<Navigate to="/signin" replace />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/register" element={<Navigate to="/signup" replace />} />

            {/* ── Protected Dashboard Routes ── */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardOverview />} />
              <Route path="overview" element={<DashboardOverview />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="datasets" element={<DatasetsPage />} />
              <Route path="experiments" element={<Navigate to="/app" replace />} />
              <Route path="models" element={<ModelsPage />} />
              <Route path="deployments" element={<DeploymentsPage />} />
              <Route path="monitoring" element={<MonitoringPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="audit" element={<AuditLogsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* ── Direct convenience routes (also protected) ── */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DashboardOverview />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="datasets" element={<DatasetsPage />} />
              <Route path="experiments" element={<Navigate to="/app" replace />} />
              <Route path="models" element={<ModelsPage />} />
              <Route path="deployments" element={<DeploymentsPage />} />
              <Route path="monitoring" element={<MonitoringPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="audit" element={<AuditLogsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* ── Catch-all ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* ── Global Autonomous AI Agent Copilot ── */}
          <AIAgentWidget />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};
