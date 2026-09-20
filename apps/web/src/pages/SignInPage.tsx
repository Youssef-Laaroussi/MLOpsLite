import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="min-h-screen flex bg-[#FAFCFB]">
      {/* ── Left Panel: Sign In Form ── */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-20 xl:px-28 py-12 relative overflow-hidden">
        {/* Subtle ambient blobs */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-[#3BB48C]/8 via-emerald-100/15 to-transparent rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-teal-50/40 to-transparent rounded-full blur-[80px] pointer-events-none" />

        {/* Logo & Back */}
        <div className={`mb-12 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 flex items-center justify-center bg-white rounded-2xl border border-slate-200/80 shadow-sm p-2 transition-all group-hover:border-[#3BB48C]/50 group-hover:shadow-md group-hover:scale-105">
              <img
                src="/logo.png"
                alt="MLite Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-black text-slate-900 text-xl tracking-tight block leading-tight">MLite</span>
              <span className="text-[10px] text-slate-400 font-medium">← Back to home</span>
            </div>
          </Link>
        </div>

        {/* Form Card */}
        <div className={`max-w-[420px] w-full transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="mb-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#3BB48C] uppercase tracking-widest bg-[#EBF8F4] px-3 py-1 rounded-full border border-[#BCE9DA] mb-4">
              <Lock className="w-3 h-3" />
              Secure Authentication
            </span>
          </div>
          <h1 className="text-3xl sm:text-[40px] font-black text-slate-900 tracking-tight leading-[1.1] mb-3">
            Welcome back
          </h1>
          <p className="text-[15px] text-slate-500 mb-8 leading-relaxed">
            Sign in to your MLOps workspace. Manage models, track experiments, and monitor deployments.
          </p>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-sm text-rose-700 animate-fade-in-up">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-sm text-emerald-800 font-semibold animate-fade-in-up">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Authentication successful! Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Username or Email
              </label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 group-focus-within:text-[#3BB48C] transition-colors" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="your-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 focus:shadow-lg focus:shadow-[#3BB48C]/5 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 group-focus-within:text-[#3BB48C] transition-colors" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 focus:shadow-lg focus:shadow-[#3BB48C]/5 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full mt-3 py-4 px-6 rounded-2xl bg-gradient-to-r from-[#3BB48C] to-[#2FA07B] hover:from-[#329F7B] hover:to-[#278A6A] text-white font-bold text-sm transition-all shadow-xl shadow-[#3BB48C]/20 flex items-center justify-center gap-2.5 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#3BB48C]/30 active:translate-y-0 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-sm text-slate-500 text-center">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-bold text-[#3BB48C] hover:text-[#278A6A] transition inline-flex items-center gap-1 hover:gap-2"
              >
                Create Account <ArrowRight className="w-3 h-3" />
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

      {/* ── Right Panel: Natural Living Visual Décor (Pure Art & Motion) ── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden items-center justify-center select-none"
        style={{
          background: "linear-gradient(135deg, #07131D 0%, #0A1B28 35%, #081722 70%, #050E15 100%)",
        }}
      >
        {/* ── Ambient Organic Nebula Glows ── */}
        <div
          className="absolute top-[15%] right-[20%] w-[440px] h-[440px] rounded-full opacity-45 pointer-events-none blur-[120px]"
          style={{
            background: "radial-gradient(circle, rgba(59,180,140,0.35) 0%, rgba(16,185,129,0.15) 50%, transparent 70%)",
            animation: "auroraPulse1 10s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute bottom-[18%] left-[15%] w-[480px] h-[480px] rounded-full opacity-35 pointer-events-none blur-[140px]"
          style={{
            background: "radial-gradient(circle, rgba(20,184,166,0.3) 0%, rgba(59,180,140,0.1) 60%, transparent 80%)",
            animation: "auroraPulse2 12s ease-in-out infinite alternate",
          }}
        />

        {/* ── Subtle Geometric Grid ── */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at center, rgba(59,180,140,0.8) 1.2px, transparent 1.2px),
              linear-gradient(rgba(59,180,140,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,180,140,0.3) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px, 80px 80px, 80px 80px",
          }}
        />

        {/* ── Organic Flowing Aurora Waves (SVG) ── */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 800 1000"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="signInAurora1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3BB48C" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="signInAurora2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#3BB48C" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#065F46" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d="M-50 350 C 180 200, 320 500, 520 300 C 680 140, 750 380, 900 250 L 900 1000 L -50 1000 Z"
            fill="url(#signInAurora1)"
            opacity="0.6"
          >
            <animate
              attributeName="d"
              dur="16s"
              repeatCount="indefinite"
              values="
                M-50 350 C 180 200, 320 500, 520 300 C 680 140, 750 380, 900 250 L 900 1000 L -50 1000 Z;
                M-50 300 C 220 420, 350 220, 560 450 C 700 280, 780 200, 900 320 L 900 1000 L -50 1000 Z;
                M-50 350 C 180 200, 320 500, 520 300 C 680 140, 750 380, 900 250 L 900 1000 L -50 1000 Z
              "
            />
          </path>
          <path
            d="M-50 480 C 200 620, 380 340, 600 520 C 720 620, 800 400, 900 460 L 900 1000 L -50 1000 Z"
            fill="url(#signInAurora2)"
            opacity="0.5"
          >
            <animate
              attributeName="d"
              dur="20s"
              repeatCount="indefinite"
              values="
                M-50 480 C 200 620, 380 340, 600 520 C 720 620, 800 400, 900 460 L 900 1000 L -50 1000 Z;
                M-50 520 C 150 360, 420 580, 580 380 C 750 460, 820 600, 900 420 L 900 1000 L -50 1000 Z;
                M-50 480 C 200 620, 380 340, 600 520 C 720 620, 800 400, 900 460 L 900 1000 L -50 1000 Z
              "
            />
          </path>
        </svg>

        {/* ── Central Living Orbital Core ── */}
        <div
          className={`relative z-10 flex flex-col items-center justify-center p-8 transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Orbital Container */}
          <div className="relative w-80 h-80 flex items-center justify-center mb-8">
            {/* Outer Orbit Ring */}
            <div
              className="absolute w-72 h-72 rounded-full border border-[#3BB48C]/25"
              style={{
                animation: "spinSlow 36s linear infinite",
                boxShadow: "0 0 40px rgba(59, 180, 140, 0.08)",
              }}
            >
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#3BB48C] shadow-lg shadow-[#3BB48C]/80 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              </div>
            </div>

            {/* Middle Dashed Orbit Ring */}
            <div
              className="absolute w-56 h-56 rounded-full border border-dashed border-teal-400/30"
              style={{
                animation: "spinReverse 24s linear infinite",
              }}
            >
              <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-teal-300 shadow-md shadow-teal-300/80" />
            </div>

            {/* Inner Orbit Ring */}
            <div
              className="absolute w-40 h-40 rounded-full border border-[#3BB48C]/40"
              style={{
                animation: "spinSlow 16s linear infinite",
              }}
            >
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400" />
            </div>

            {/* Radiant Breathing Halo Behind Logo */}
            <div className="absolute w-32 h-32 rounded-full bg-gradient-to-tr from-[#3BB48C]/30 via-emerald-400/25 to-teal-300/20 blur-2xl animate-pulse" />

            {/* Central Floating Glass Emblem */}
            <div className="relative w-28 h-28 rounded-3xl bg-white/95 p-5 shadow-2xl shadow-[#3BB48C]/30 border border-white/40 flex items-center justify-center backdrop-blur-md transition-transform duration-700 hover:scale-105">
              <img
                src="/logo.png"
                alt="MLite"
                className="w-full h-full object-contain filter drop-shadow-sm select-none"
              />
            </div>
          </div>

          {/* Minimalist Natural Brand Mark */}
          <div className="text-center space-y-2">
            <h2 className="font-black text-white text-4xl sm:text-5xl tracking-tight">
              MLite
            </h2>
            <p className="text-sm font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#3BB48C] via-emerald-300 to-teal-300">
              Autonomous Machine Learning Infrastructure
            </p>
          </div>

          {/* Living Core Engine Status Pill */}
          <div className="mt-8 flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3BB48C] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3BB48C]" />
            </span>
            <span className="text-xs font-mono font-bold text-slate-300 tracking-wider">
              CORE ENGINE ONLINE
            </span>
          </div>
        </div>

        {/* ── Corner Framing Accents ── */}
        <div className="absolute top-8 left-8 w-8 h-8 border-l-2 border-t-2 border-[#3BB48C]/30 rounded-tl-xl pointer-events-none" />
        <div className="absolute top-8 right-8 w-8 h-8 border-r-2 border-t-2 border-[#3BB48C]/30 rounded-tr-xl pointer-events-none" />
        <div className="absolute bottom-8 left-8 w-8 h-8 border-l-2 border-b-2 border-[#3BB48C]/30 rounded-bl-xl pointer-events-none" />
        <div className="absolute bottom-8 right-8 w-8 h-8 border-r-2 border-b-2 border-[#3BB48C]/30 rounded-br-xl pointer-events-none" />
      </div>

      {/* ── Keyframe Styles ── */}
      <style>{`
        @keyframes auroraPulse1 {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.15) translate(25px, -18px); }
        }
        @keyframes auroraPulse2 {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.12) translate(-20px, 20px); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};
