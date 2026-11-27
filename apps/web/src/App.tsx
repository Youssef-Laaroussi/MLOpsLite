import { ActionFeedbackProvider } from "./components/ActionFeedback";
import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { InstallationGate } from "./components/InstallationGate";
import { workspaceSettingsPaths } from "./config/workspace";

const DashboardOverview = lazy(() => import("./pages/DashboardOverview").then((page) => ({ default: page.DashboardOverview })));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage").then((page) => ({ default: page.ProjectsPage })));
const ModelsPage = lazy(() => import("./pages/ModelsPage").then((page) => ({ default: page.ModelsPage })));
const DeploymentsPage = lazy(() => import("./pages/DeploymentsPage").then((page) => ({ default: page.DeploymentsPage })));
const DatasetsPage = lazy(() => import("./pages/DatasetsPage").then((page) => ({ default: page.DatasetsPage })));
const MonitoringPage = lazy(() => import("./pages/MonitoringPage").then((page) => ({ default: page.MonitoringPage })));
const AlertsPage = lazy(() => import("./pages/AlertsPage").then((page) => ({ default: page.AlertsPage })));
const ServicesPage = lazy(() => import("./pages/ServicesPage").then((page) => ({ default: page.ServicesPage })));
const LandingPage = lazy(() => import("./pages/LandingPage").then((page) => ({ default: page.LandingPage })));
const SignInPage = lazy(() => import("./pages/SignInPage").then((page) => ({ default: page.SignInPage })));
const SignUpPage = lazy(() => import("./pages/SignUpPage").then((page) => ({ default: page.SignUpPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((page) => ({ default: page.SettingsPage })));
const ExperimentsPage = lazy(() => import("./pages/ExperimentsPage").then((page) => ({ default: page.ExperimentsPage })));
const SetupPage = lazy(() => import("./pages/SetupPage").then((page) => ({ default: page.SetupPage })));
const AdministrationLayout = lazy(() => import("./components/AdministrationLayout").then(module => ({ default: module.AdministrationLayout })));
const AccountsSettings = lazy(() => import("./components/AccountsSettings").then(module => ({ default: module.AccountsSettings })));
const StorageSettings = lazy(() => import("./components/StorageSettings").then(module => ({ default: module.StorageSettings })));
const WorkspaceRecovery = lazy(() => import("./components/WorkspaceRecovery").then(module => ({ default: module.WorkspaceRecovery })));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage").then(module => ({ default: module.AuditLogsPage })));


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
        <ActionFeedbackProvider>
          <BrowserRouter>
            <InstallationGate>
            <Suspense fallback={<p role="status" className="p-6 text-slate-600">Loading page…</p>}>
              <Routes>
                <Route path="/setup" element={<SetupPage />} />
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
                  <Route path="experiments" element={<ExperimentsPage />} />
                  <Route path="models" element={<ModelsPage />} />
                  <Route path="deployments" element={<DeploymentsPage />} />
                  <Route path="monitoring" element={<MonitoringPage />} />
                  <Route path="alerts" element={<AlertsPage />} />
                  <Route path="services" element={<ServicesPage />} />
                  <Route path="audit" element={<Navigate to={workspaceSettingsPaths.activity} replace />} />
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
                  <Route path="experiments" element={<ExperimentsPage />} />
                  <Route path="models" element={<ModelsPage />} />
                  <Route path="deployments" element={<DeploymentsPage />} />
                  <Route path="monitoring" element={<MonitoringPage />} />
                  <Route path="alerts" element={<AlertsPage />} />
                  <Route path="services" element={<ServicesPage />} />
                  <Route path="audit" element={<Navigate to={workspaceSettingsPaths.activity} replace />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                <Route path="/admin" element={<ProtectedRoute adminOnly><AdministrationLayout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="accounts" replace />} />
                  <Route path="accounts" element={<AccountsSettings />} />
                  <Route path="storage" element={<StorageSettings />} />
                  <Route path="audit" element={<AuditLogsPage scope="instance" />} />
                  <Route path="recovery" element={<WorkspaceRecovery />} />
                  <Route path="*" element={<Navigate to="/admin/accounts" replace />} />
                </Route>

                {/* ── Catch-all ── */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            </InstallationGate>

          </BrowserRouter>
        </ActionFeedbackProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
