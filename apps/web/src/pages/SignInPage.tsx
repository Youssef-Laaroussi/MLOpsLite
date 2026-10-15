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
      setTimeout(() => navigate("/app", { replace: true }), 700);
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
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 bg-[#FAFCFB] select-none overflow-hidden">
      {/* ── Background: Data Pipelines & Neural Stream Matrix ── */}
      {/* Subtle Data Dot Matrix (Tensor grid) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(59, 180, 140, 0.18) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at 50% 50%, transparent 20%, black 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, transparent 20%, black 80%)",
        }}
      />

      {/* Top-Right: Vector Data Nodes & Interconnected Flow Graph */}
      <div className="absolute -top-10 -right-10 w-[520px] lg:w-[680px] pointer-events-none z-0 opacity-80 select-none">
        <svg viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          {/* Data Line Streams */}
          <path d="M120 180 C 260 120, 380 240, 560 140" stroke="#3BB48C" strokeWidth="2" strokeDasharray="6 6" opacity="0.45" />
          <path d="M80 320 C 220 220, 360 380, 580 260" stroke="#1A7456" strokeWidth="2.5" opacity="0.4" />
          <path d="M160 440 C 300 340, 420 480, 600 360" stroke="#2DD4BF" strokeWidth="2" strokeDasharray="4 4" opacity="0.35" />

          {/* Node Clusters (Connected Data Graph) */}
          <line x1="280" y1="160" x2="380" y2="240" stroke="#3BB48C" strokeWidth="1.5" opacity="0.5" />
          <line x1="380" y1="240" x2="480" y2="180" stroke="#3BB48C" strokeWidth="1.5" opacity="0.5" />
          <line x1="380" y1="240" x2="420" y2="340" stroke="#1A7456" strokeWidth="1.5" opacity="0.4" />
          <line x1="240" y1="280" x2="340" y2="360" stroke="#2DD4BF" strokeWidth="1.5" opacity="0.4" />

          {/* Glowing Data Nodes (Circles) */}
          <circle cx="280" cy="160" r="7" fill="#3BB48C" fillOpacity="0.8" />
          <circle cx="280" cy="160" r="14" stroke="#3BB48C" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />

          <circle cx="380" cy="240" r="9" fill="#1A7456" />
          <circle cx="380" cy="240" r="18" stroke="#1A7456" strokeWidth="1.5" opacity="0.3" />

          <circle cx="480" cy="180" r="6" fill="#2DD4BF" />
          <circle cx="420" cy="340" r="7.5" fill="#3BB48C" />
          <circle cx="240" cy="280" r="6" fill="#14B8A6" />
          <circle cx="340" cy="360" r="8" fill="#10B981" />
          <circle cx="520" cy="280" r="6.5" fill="#047857" />

          {/* Micro Data Packets */}
          <circle cx="330" cy="200" r="3" fill="#3BB48C" />
          <circle cx="430" cy="210" r="3" fill="#2DD4BF" />
          <circle cx="400" cy="290" r="2.5" fill="#1A7456" />
          <circle cx="290" cy="320" r="3" fill="#10B981" />
        </svg>
      </div>

      {/* Bottom-Left: Waveform Distribution & Time-Series Data Stream */}
      <div className="absolute -bottom-16 -left-16 w-[480px] lg:w-[620px] pointer-events-none z-0 opacity-70 select-none">
        <svg viewBox="0 0 600 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          {/* Signal / Frequency Curves (Drift & Latency Curves) */}
          <path
            d="M0 380 Q 100 280, 200 360 T 400 320 T 600 390"
            stroke="#1A7456"
            strokeWidth="2.5"
            opacity="0.35"
          />
          <path
            d="M0 420 Q 120 340, 240 410 T 480 370 T 600 430"
            stroke="#3BB48C"
            strokeWidth="2"
            strokeDasharray="6 4"
            opacity="0.4"
          />

          {/* Distribution Histogram Bars (Statistical Data Indicator) */}
          <g opacity="0.22" fill="#3BB48C">
            <rect x="120" y="380" width="8" height="45" rx="4" />
            <rect x="136" y="350" width="8" height="75" rx="4" />
            <rect x="152" y="320" width="8" height="105" rx="4" />
            <rect x="168" y="290" width="8" height="135" rx="4" />
            <rect x="184" y="270" width="8" height="155" rx="4" />
            <rect x="200" y="260" width="8" height="165" rx="4" fill="#1A7456" />
            <rect x="216" y="275" width="8" height="150" rx="4" />
            <rect x="232" y="300" width="8" height="125" rx="4" />
            <rect x="248" y="335" width="8" height="90" rx="4" />
            <rect x="264" y="365" width="8" height="60" rx="4" />
            <rect x="280" y="390" width="8" height="35" rx="4" />
          </g>

          {/* Graph Vertices */}
          <circle cx="100" cy="330" r="5" fill="#3BB48C" />
          <circle cx="200" cy="360" r="6" fill="#1A7456" />
          <circle cx="300" cy="335" r="4.5" fill="#2DD4BF" />
          <circle cx="400" cy="320" r="5.5" fill="#10B981" />
        </svg>
      </div>

      {/* ── Soft Ambient Glow Behind Central Form ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[480px] bg-gradient-to-tr from-[#3BB48C]/10 via-teal-100/20 to-transparent rounded-full blur-[110px] pointer-events-none -z-10" />

      {/* ── Top Navigation Bar ── */}
      <header className="absolute top-0 left-0 right-0 py-6 px-8 flex items-center justify-between max-w-7xl mx-auto z-20">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs p-1.5 flex items-center justify-center transition-all group-hover:border-[#3BB48C]">
            <img src="/logo.png" alt="MLite" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-black text-slate-900 text-lg tracking-tight">
              MLite
            </span>
            <span className="text-xs text-slate-400 font-medium">
              MLOps Platform
            </span>
          </div>
        </Link>

        <Link
          to="/"
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition flex items-center gap-1.5"
        >
          <span>Back to Home</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* ── Centered Card ── */}
      <main className="relative z-10 w-full max-w-[420px] my-auto">
        {/* Header Title */}
        <div className="text-center mb-8 space-y-2">
          <h1 className="font-display text-3xl font-black text-slate-900 tracking-tight">
            Sign in to Workspace
          </h1>
          <p className="text-sm text-slate-500 font-normal">
            Manage your model lineage, serving endpoints, and drift telemetry
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-7 sm:p-8">
          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Authentication successful! Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username or Email
              </label>
              <div className="relative group">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#3BB48C] transition-colors" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#3BB48C] transition-colors" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#3BB48C] hover:bg-[#2FA07B] active:bg-[#278A6A] text-white font-bold text-sm transition-all shadow-md shadow-[#3BB48C]/25 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Card Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-bold text-[#3BB48C] hover:underline"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
