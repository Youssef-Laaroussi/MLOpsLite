import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useInstallation } from "../hooks/useInstallation";
import { useAuth } from "../context/AuthContext";

export function InstallationGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const installation = useInstallation();

  if (installation.isPending || (isLoading && pathname === "/setup")) return <p className="p-6 text-slate-600" role="status">Loading your MLite installation…</p>;
  if (installation.isError) return <div role="alert" className="p-6 text-slate-700">
    <p>Could not check the installation. Make sure the MLite API is running.</p>
    <button className="mt-3 text-emerald-700 underline" onClick={() => void installation.refetch()}>Retry</button>
  </div>;

  if (installation.data.setup_required && pathname !== "/setup") return <Navigate to="/setup" replace />;
  if (!installation.data.setup_required && pathname === "/setup") return <Navigate to={isAuthenticated ? "/app" : "/signin"} replace />;
  if (!installation.data.registration_enabled && ["/signup", "/register"].includes(pathname)) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}
