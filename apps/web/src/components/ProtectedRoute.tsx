import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute — guards Dashboard routes.
 * If user is not authenticated → redirects to /signin with a return URL.
 * Shows a loading spinner while auth state is being resolved.
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show a subtle loading state while auth is being resolved
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4 animate-fade-in-up">
          <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 shadow-sm p-2">
            <img src="/logo.png" alt="MLite" className="w-full h-full object-contain" />
          </div>
          <div className="w-8 h-8 border-3 border-[#3BB48C]/20 border-t-[#3BB48C] rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Loading workspace...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated → redirect to sign in
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  if (adminOnly && user?.role !== "ADMIN") {
    return <div className="p-6 text-slate-700" role="alert">
      <h1 className="text-xl font-semibold">Administrator access required</h1>
      <p className="mt-2">Administration is available to instance administrators.</p>
      <a className="mt-4 inline-block text-emerald-700 underline" href="/app">Back to Workspace</a>
    </div>;
  }

  return <>{children}</>;
};
