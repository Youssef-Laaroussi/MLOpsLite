import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute — guards Dashboard routes.
 * If user is not authenticated → redirects to /signin with a return URL.
 * Shows a loading spinner while auth state is being resolved.
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
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

  return <>{children}</>;
};
