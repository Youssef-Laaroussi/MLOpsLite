import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const SignInPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username.trim(), password);
      setSuccess(true);
      setTimeout(() => navigate("/app", { replace: true }), 800);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        "Authentication failed. Please verify your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-[#FAFCFB] overflow-hidden select-none">
      {/* ── Neural Plexus Network Artwork on Right ── */}
      <div className="absolute -top-16 -right-16 w-[42rem] sm:w-[50rem] lg:w-[58rem] pointer-events-none z-0 opacity-90 mix-blend-multiply select-none">
        <img
          src="/neural-plexus.jpg"
          alt="MLOps Neural Network"
          className="w-full h-auto object-contain"
          style={{
            WebkitMaskImage: "radial-gradient(ellipse at 60% 40%, black 50%, transparent 95%)",
            maskImage: "radial-gradient(ellipse at 60% 40%, black 50%, transparent 95%)",
          }}
        />
      </div>

      {/* ── Neural Plexus Network Artwork on Left ── */}
      <div className="absolute -bottom-20 -left-20 w-[38rem] sm:w-[46rem] lg:w-[54rem] pointer-events-none z-0 opacity-80 mix-blend-multiply select-none transform rotate-180">
        <img
          src="/neural-plexus.jpg"
          alt="MLOps Neural Network"
          className="w-full h-auto object-contain"
          style={{
            WebkitMaskImage: "radial-gradient(ellipse at 40% 60%, black 50%, transparent 95%)",
            maskImage: "radial-gradient(ellipse at 40% 60%, black 50%, transparent 95%)",
          }}
        />
      </div>

      {/* ── Subtle Ambient Gradient Aura ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#3BB48C]/15 via-teal-100/30 to-emerald-50/20 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ── Centered Login Container ── */}
      <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center">
        {/* Brand Logo with Clean Glow */}
        <div className="mb-6 flex items-center justify-center">
          <Link to="/" className="group flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white p-3 shadow-lg shadow-[#3BB48C]/15 border border-slate-200/90 flex items-center justify-center transition-transform group-hover:scale-105">
              <img
                src="/logo.png"
                alt="MLite Logo"
                className="w-full h-full object-contain filter drop-shadow-sm select-none"
              />
            </div>
          </Link>
        </div>

        {/* Brand Name & Tagline */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Welcome to MLite
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            Sign in to manage models, pipelines, and deployments
          </p>
        </div>

        {/* Centered Glassmorphic Login Card */}
        <div className="w-full bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-8 sm:p-9 shadow-xl shadow-slate-200/50">
          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Authentication successful! Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Username or Email
              </label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#3BB48C] transition-colors" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#3BB48C] transition-colors" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full mt-2 py-3.5 px-6 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-sm transition-all shadow-lg shadow-[#3BB48C]/25 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to Workspace
                  <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Navigation Links */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-bold text-[#3BB48C] hover:text-[#2FA07B] transition"
              >
                Create Account
              </Link>
            </p>
            <div>
              <Link
                to="/"
                className="text-xs text-slate-400 hover:text-slate-600 transition"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
