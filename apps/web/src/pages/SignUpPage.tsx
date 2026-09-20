import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Database,
  LineChart,
  Boxes,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const SignUpPage: React.FC = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
      if (!email.includes("@")) {
        throw new Error("Please enter a valid email address.");
      }
      if (password.length < 8) {
        throw new Error("Password must contain at least 8 characters.");
      }
      await register({
        email: email.trim(),
        username: username.trim(),
        password,
        full_name: fullName.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate("/app", { replace: true }), 800);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (password.length === 0) return { level: 0, text: "", color: "" };
    if (password.length < 6) return { level: 1, text: "Weak", color: "bg-rose-400" };
    if (password.length < 8) return { level: 2, text: "Fair", color: "bg-amber-400" };
    if (password.length < 12) return { level: 3, text: "Good", color: "bg-[#3BB48C]" };
    return { level: 4, text: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen flex bg-white">
      {/* ── Left Panel: Branded Visual (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[48%] bg-gradient-to-bl from-[#0D1F2D] via-[#0A1926] to-[#071420] relative overflow-hidden items-center justify-center p-12">
        {/* Animated ambient glows */}
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-[#3BB48C]/15 rounded-full blur-[80px] animate-pulse pointer-events-none" />
        <div className="absolute top-32 right-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />

        {/* Circuit decoration */}
        <div className="absolute top-12 right-12 w-40 h-40 pointer-events-none">
          <svg className="w-full h-full text-[#3BB48C]/30" viewBox="0 0 100 100" fill="none">
            <path d="M90 80 H40 V30 H10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="10" cy="30" r="3" fill="#3BB48C" opacity="0.6" />
            <circle cx="40" cy="80" r="2.5" fill="#3BB48C" opacity="0.4" />
          </svg>
        </div>

        <div className="relative z-10 text-center max-w-md animate-fade-in-up delay-200">
          {/* Platform capabilities showcase */}
          <div className="space-y-3 mb-10">
            {[
              { icon: Database, title: "Data Versioning", desc: "SHA-256 verified datasets with MinIO S3 sync" },
              { icon: Boxes, title: "Experiment Tracking", desc: "Full MLflow integration with metrics & artifacts" },
              { icon: LineChart, title: "Drift Monitoring", desc: "Evidently AI statistical tests in real-time" },
              { icon: RotateCcw, title: "Auto-Rollback", desc: "Zero-downtime automated model rollback" },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-[#3BB48C]/40 transition-all hover:translate-x-1 group text-left animate-fade-in-up"
                  style={{ animationDelay: `${(idx + 3) * 120}ms` }}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#3BB48C]/15 border border-[#3BB48C]/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4 text-[#3BB48C]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{item.title}</div>
                    <div className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</div>
                  </div>
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
            Join the lightweight MLOps revolution.
            <br />
            <span className="text-[#3BB48C] font-semibold">Track. Deploy. Guard.</span>
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-[#3BB48C]">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Open Source · Self-Hosted · Private
            </span>
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
        </div>
      </div>

      {/* ── Right Panel: Sign Up Form ── */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-12 relative">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#3BB48C]/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

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
            Create your account
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            Get started with MLite — track experiments, deploy models, and monitor drift instantly.
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
              <span>Account created! Redirecting to dashboard...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Youssef Laaroussi"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/15 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/15 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="youssef_ml"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-2 focus:ring-[#3BB48C]/15 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Password</label>
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
              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="mt-2 animate-fade-in-up">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            step <= strength.level ? strength.color : "bg-slate-100"
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[10px] font-bold ${
                      strength.level <= 1 ? "text-rose-500" :
                      strength.level === 2 ? "text-amber-500" :
                      "text-emerald-600"
                    }`}>
                      {strength.text}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Must be at least 8 characters long.
                  </p>
                </div>
              )}
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
                  Create Account
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Terms */}
          <p className="mt-4 text-[11px] text-slate-400 text-center leading-relaxed">
            By creating an account, you agree to MLite's self-hosted terms of use and acknowledge that your data stays on your own servers.
          </p>

          {/* Switcher */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="font-bold text-[#3BB48C] hover:text-[#329F7B] hover:underline transition"
              >
                Sign In
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
    </div>
  );
};
