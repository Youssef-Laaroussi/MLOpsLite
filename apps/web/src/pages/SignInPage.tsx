import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Sparkles,
  ShieldCheck,
  Zap,
  Server,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const SignInPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    navigate("/app", { replace: true });
    return null;
  }

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
        err.response?.data?.detail ||
          err.message ||
          "Authentication failed. Please verify your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* ── Left Panel: Sign In Form ── */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-12 relative">
        {/* Ambient glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[#3BB48C]/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Logo & Back */}
        <div className="mb-10 animate-fade-in-up">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-200 shadow-xs p-1.5 transition-all group-hover:border-[#3BB48C]/50 group-hover:shadow-sm">
              <img
                src="/logo.png"
                alt="MLite Logo"
                className="w-full h-full object-contain transition-transform group-hover:scale-110"
              />
            </div>
            <span className="font-black text-slate-900 text-xl tracking-tight">MLite</span>
          </Link>
        </div>

        {/* Form Card */}
        <div className="max-w-md w-full animate-fade-in-up delay-100">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            Sign in to access your MLOps dashboard, manage models, and monitor deployments.
          </p>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-fade-in-up">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-fade-in-up">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Authentication successful! Redirecting to dashboard...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="your-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/15 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/15 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-sm transition-all shadow-lg shadow-[#3BB48C]/25 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-bold text-[#3BB48C] hover:text-[#329F7B] hover:underline transition"
              >
                Create Account
              </Link>
            </p>
          </div>

          {/* Back to landing */}
          <div className="mt-4 text-center">
            <Link
              to="/"
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              ← Back to Landing Page
            </Link>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Branded Visual (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[48%] bg-gradient-to-br from-[#0D1F2D] via-[#0A1926] to-[#071420] relative overflow-hidden items-center justify-center p-12">
        {/* Animated ambient glows */}
        <div className="absolute top-20 right-20 w-80 h-80 bg-[#3BB48C]/15 rounded-full blur-[80px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-32 left-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />

        {/* Circuit decoration */}
        <div className="absolute top-12 left-12 w-40 h-40 pointer-events-none">
          <svg className="w-full h-full text-[#3BB48C]/30" viewBox="0 0 100 100" fill="none">
            <path d="M10 80 H60 V30 H90" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="90" cy="30" r="3" fill="#3BB48C" opacity="0.6" />
            <circle cx="60" cy="80" r="2.5" fill="#3BB48C" opacity="0.4" />
            <circle cx="10" cy="80" r="2" fill="#3BB48C" opacity="0.3" />
          </svg>
        </div>
        <div className="absolute bottom-12 right-12 w-40 h-40 pointer-events-none">
          <svg className="w-full h-full text-[#3BB48C]/30" viewBox="0 0 100 100" fill="none">
            <path d="M90 20 H40 V70 H10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="10" cy="70" r="3" fill="#3BB48C" opacity="0.6" />
            <circle cx="40" cy="20" r="2.5" fill="#3BB48C" opacity="0.4" />
          </svg>
        </div>

        <div className="relative z-10 text-center max-w-md animate-fade-in-up delay-200">
          {/* Floating platform features */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            {[
              { icon: Terminal, label: "CLI + Dashboard", desc: "Full control" },
              { icon: ShieldCheck, label: "RBAC Security", desc: "Role-based" },
              { icon: Zap, label: "Sub-50ms", desc: "Fast serving" },
              { icon: Server, label: "Self-Hosted", desc: "Your infra" },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-[#3BB48C]/40 transition-all hover:-translate-y-1 group"
                  style={{ animationDelay: `${(idx + 3) * 100}ms` }}
                >
                  <Icon className="w-5 h-5 text-[#3BB48C] mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-bold text-white">{item.label}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{item.desc}</div>
                </div>
              );
            })}
          </div>

          {/* Big branding text */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white rounded-2xl p-2 shadow-lg border border-slate-200/20">
              <img src="/logo.png" alt="MLite" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-white text-3xl tracking-tight">MLite</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            Lightweight, open-source MLOps platform.
            <br />
            <span className="text-[#3BB48C] font-semibold">Deploy. Monitor. Control.</span>
          </p>

          {/* Sparkle decoration */}
          <div className="mt-6 flex items-center justify-center gap-2 text-[#3BB48C]">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Secure · Private · Fast
            </span>
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
