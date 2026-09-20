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

      {/* ── Right Panel: Premium Animated Visual ── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #081520 0%, #0B1E2D 25%, #0A1926 50%, #061318 100%)",
        }}
      >
        {/* ── Animated Grid Background ── */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59,180,140,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,180,140,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* ── Floating Gradient Orbs ── */}
        <div className="absolute top-[10%] right-[15%] w-72 h-72 rounded-full opacity-60 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(59,180,140,0.25) 0%, transparent 70%)",
            animation: "floatOrb1 8s ease-in-out infinite",
          }}
        />
        <div className="absolute bottom-[15%] left-[10%] w-96 h-96 rounded-full opacity-40 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)",
            animation: "floatOrb2 10s ease-in-out infinite",
          }}
        />
        <div className="absolute top-[50%] left-[50%] w-64 h-64 rounded-full opacity-30 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(59,180,140,0.3) 0%, transparent 60%)",
            animation: "floatOrb3 12s ease-in-out infinite",
          }}
        />

        {/* ── Animated Neural Network Lines (SVG) ── */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 900" fill="none" preserveAspectRatio="xMidYMid slice">
          {/* Connection lines */}
          <path d="M100 150 Q 250 100, 400 200 T 700 180" stroke="url(#line1)" strokeWidth="1" opacity="0.3" strokeDasharray="8 6">
            <animate attributeName="stroke-dashoffset" values="0;-28" dur="3s" repeatCount="indefinite" />
          </path>
          <path d="M50 400 Q 200 350, 350 450 T 750 400" stroke="url(#line2)" strokeWidth="1" opacity="0.25" strokeDasharray="6 8">
            <animate attributeName="stroke-dashoffset" values="0;-28" dur="4s" repeatCount="indefinite" />
          </path>
          <path d="M150 650 Q 300 600, 500 700 T 780 620" stroke="url(#line1)" strokeWidth="1" opacity="0.2" strokeDasharray="8 6">
            <animate attributeName="stroke-dashoffset" values="0;-28" dur="3.5s" repeatCount="indefinite" />
          </path>
          <path d="M80 800 Q 250 750, 450 830 T 720 780" stroke="url(#line2)" strokeWidth="1" opacity="0.15" strokeDasharray="6 8">
            <animate attributeName="stroke-dashoffset" values="0;-28" dur="5s" repeatCount="indefinite" />
          </path>

          {/* Animated nodes / dots */}
          <circle cx="400" cy="200" r="3" fill="#3BB48C" opacity="0.8">
            <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="200" cy="350" r="2.5" fill="#3BB48C" opacity="0.6">
            <animate attributeName="r" values="2.5;4.5;2.5" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="600" cy="450" r="3" fill="#10B981" opacity="0.7">
            <animate attributeName="r" values="3;5;3" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0.25;0.7" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="150" cy="600" r="2" fill="#3BB48C" opacity="0.5">
            <animate attributeName="r" values="2;4;2" dur="2.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="500" cy="700" r="2.5" fill="#10B981" opacity="0.6">
            <animate attributeName="r" values="2.5;4;2.5" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="700" cy="180" r="2" fill="#3BB48C" opacity="0.4">
            <animate attributeName="r" values="2;3.5;2" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="350" cy="500" r="2" fill="#3BB48C" opacity="0.5">
            <animate attributeName="r" values="2;4;2" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* Gradient definitions */}
          <defs>
            <linearGradient id="line1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3BB48C" stopOpacity="0" />
              <stop offset="50%" stopColor="#3BB48C" stopOpacity="1" />
              <stop offset="100%" stopColor="#3BB48C" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="line2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="1" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* ── Center Content ── */}
        <div className={`relative z-10 max-w-lg px-8 transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Center Logo + Text */}
          <div className="text-center">
            {/* Logo with animated glow ring */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-3xl bg-[#3BB48C]/20 blur-xl animate-pulse" />
              <div className="relative w-full h-full bg-white rounded-3xl p-4 shadow-2xl shadow-[#3BB48C]/20 border border-white/20">
                <img src="/logo.png" alt="MLite" className="w-full h-full object-contain" />
              </div>
            </div>

            <h2 className="font-black text-white text-5xl tracking-tight mb-3">
              MLite
            </h2>
            <p className="text-base text-slate-400 leading-relaxed max-w-xs mx-auto mb-2">
              The lightweight, self-hosted MLOps platform.
            </p>
            <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#3BB48C] via-emerald-400 to-teal-300">
              Deploy. Monitor. Control.
            </p>

            {/* Animated separator */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#3BB48C]/40" />
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#3BB48C]/60 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Secure · Private · Fast
                </span>
                <Sparkles className="w-3.5 h-3.5 text-[#3BB48C]/60 animate-pulse" />
              </div>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#3BB48C]/40" />
            </div>
          </div>
        </div>

        {/* ── Corner accents ── */}
        <div className="absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-[#3BB48C]/20 rounded-tl-lg" />
        <div className="absolute top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-[#3BB48C]/20 rounded-tr-lg" />
        <div className="absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-[#3BB48C]/20 rounded-bl-lg" />
        <div className="absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-[#3BB48C]/20 rounded-br-lg" />
      </div>

      {/* ── Keyframe Styles ── */}
      <style>{`
        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.1); }
          66% { transform: translate(-15px, 15px) scale(0.95); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, 20px) scale(1.05); }
          66% { transform: translate(20px, -10px) scale(0.98); }
        }
        @keyframes floatOrb3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(calc(-50% + 20px), calc(-50% - 15px)) scale(1.08); }
        }
      `}</style>
    </div>
  );
};
