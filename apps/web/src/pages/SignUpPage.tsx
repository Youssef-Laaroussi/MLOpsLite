import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Shield,
  GitBranch,
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
    <div className="min-h-screen flex bg-[#FAFCFB]">
      {/* ── Left Panel: Natural Living Visual Décor (Pure Art & Motion - No Text, Pure Atmosphere) ── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden items-center justify-center select-none"
        style={{
          background: "linear-gradient(225deg, #050F16 0%, #081722 35%, #06151F 70%, #040A0F 100%)",
        }}
      >
        {/* ── Ambient Organic Nebula Glows ── */}
        <div
          className="absolute top-[12%] left-[18%] w-[480px] h-[480px] rounded-full opacity-45 pointer-events-none blur-[130px]"
          style={{
            background: "radial-gradient(circle, rgba(59,180,140,0.38) 0%, rgba(16,185,129,0.18) 50%, transparent 70%)",
            animation: "auroraPulse1 12s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute bottom-[14%] right-[12%] w-[520px] h-[520px] rounded-full opacity-35 pointer-events-none blur-[150px]"
          style={{
            background: "radial-gradient(circle, rgba(20,184,166,0.32) 0%, rgba(59,180,140,0.12) 60%, transparent 80%)",
            animation: "auroraPulse2 14s ease-in-out infinite alternate",
          }}
        />

        {/* ── Subtle Geometric Starlight Grid ── */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at center, rgba(59,180,140,0.85) 1.2px, transparent 1.2px),
              linear-gradient(rgba(59,180,140,0.25) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,180,140,0.25) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px, 88px 88px, 88px 88px",
          }}
        />

        {/* ── Organic Flowing Aurora Ribbon Waves (SVG) ── */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 800 1000"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="auroraGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3BB48C" stopOpacity="0.28" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="auroraGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#3BB48C" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#065F46" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d="M-50 350 C 180 200, 320 500, 520 300 C 680 140, 750 380, 900 250 L 900 1000 L -50 1000 Z"
            fill="url(#auroraGrad1)"
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
            fill="url(#auroraGrad2)"
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

        {/* ── Natural Floating Bioluminescent Motes / Fireflies ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-2 h-2 rounded-full bg-[#3BB48C] blur-[1px] shadow-[0_0_10px_#3BB48C]"
            style={{ top: "25%", left: "30%", animation: "floatMote1 8s ease-in-out infinite" }}
          />
          <div
            className="absolute w-1.5 h-1.5 rounded-full bg-teal-300 blur-[0.5px] shadow-[0_0_8px_#14B8A6]"
            style={{ top: "65%", left: "22%", animation: "floatMote2 10s ease-in-out infinite 2s" }}
          />
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 blur-[1px] shadow-[0_0_12px_#10B981]"
            style={{ top: "35%", right: "25%", animation: "floatMote3 9s ease-in-out infinite 1s" }}
          />
          <div
            className="absolute w-1 h-1 rounded-full bg-white shadow-[0_0_6px_#3BB48C]"
            style={{ top: "75%", right: "32%", animation: "floatMote1 11s ease-in-out infinite 3s" }}
          />
          <div
            className="absolute w-2 h-2 rounded-full bg-[#6EE7B7] blur-[1px] shadow-[0_0_10px_#6EE7B7]"
            style={{ top: "18%", right: "40%", animation: "floatMote2 12s ease-in-out infinite 4s" }}
          />
        </div>

        {/* ── Central Sacred Geometric Gyroscope (Pure Natural Décor - Zero Text) ── */}
        <div
          className={`relative z-10 flex flex-col items-center justify-center p-8 transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Astrolabe Orbital Mandala */}
          <div className="relative w-96 h-96 flex items-center justify-center">
            {/* Outermost Celestial Ring with Orbiting Satellite */}
            <div
              className="absolute w-88 h-88 rounded-full border border-[#3BB48C]/20"
              style={{
                animation: "spinSlow 42s linear infinite",
                boxShadow: "0 0 50px rgba(59, 180, 140, 0.08)",
              }}
            >
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#3BB48C] shadow-lg shadow-[#3BB48C]/80 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              </div>
              <div className="absolute -bottom-1 left-1/4 w-2 h-2 rounded-full bg-teal-400/80 shadow-md shadow-teal-400/50" />
            </div>

            {/* 3D Inclined Gyroscopic Ring */}
            <div
              className="absolute w-76 h-76 rounded-full border border-dashed border-[#3BB48C]/35"
              style={{
                transform: "rotateX(62deg) rotateY(18deg)",
                animation: "spinReverse 28s linear infinite",
              }}
            >
              <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-teal-300 shadow-md shadow-teal-300/80" />
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 rounded-full bg-emerald-400" />
            </div>

            {/* Counter-Rotating Mid Celestial Ring */}
            <div
              className="absolute w-60 h-60 rounded-full border border-teal-400/30"
              style={{
                animation: "spinSlow 20s linear infinite",
              }}
            >
              <div className="absolute top-0 right-1/4 w-2 h-2 rounded-full bg-[#3BB48C] shadow-md shadow-[#3BB48C]/70" />
            </div>

            {/* Inner Sacred Geometric Constellation Ring */}
            <div
              className="absolute w-44 h-44 rounded-full border border-dashed border-emerald-300/35"
              style={{
                animation: "spinReverse 14s linear infinite",
              }}
            >
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400" />
            </div>

            {/* Radiant Breathing Halo Behind Logo */}
            <div className="absolute w-36 h-36 rounded-full bg-gradient-to-tr from-[#3BB48C]/35 via-emerald-400/25 to-teal-300/20 blur-2xl animate-pulse" />

            {/* Central Floating Glass Emblem (Natural Breathing Levitation) */}
            <div
              className="relative w-32 h-32 rounded-3xl bg-white/95 p-5 shadow-2xl shadow-[#3BB48C]/30 border border-white/40 flex items-center justify-center backdrop-blur-md transition-all duration-700 hover:scale-105 select-none"
              style={{
                animation: "levitateFloat 6s ease-in-out infinite",
              }}
            >
              <img
                src="/logo.png"
                alt="MLite"
                className="w-full h-full object-contain filter drop-shadow-sm select-none"
              />
            </div>
          </div>
        </div>

        {/* ── Corner Framing Accents ── */}
        <div className="absolute top-8 left-8 w-8 h-8 border-l-2 border-t-2 border-[#3BB48C]/30 rounded-tl-xl pointer-events-none" />
        <div className="absolute top-8 right-8 w-8 h-8 border-r-2 border-t-2 border-[#3BB48C]/30 rounded-tr-xl pointer-events-none" />
        <div className="absolute bottom-8 left-8 w-8 h-8 border-l-2 border-b-2 border-[#3BB48C]/30 rounded-bl-xl pointer-events-none" />
        <div className="absolute bottom-8 right-8 w-8 h-8 border-r-2 border-b-2 border-[#3BB48C]/30 rounded-br-xl pointer-events-none" />
      </div>

      {/* ── Right Panel: Sign Up Form ── */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-20 xl:px-28 py-12 relative overflow-hidden">
        {/* Subtle ambient blobs */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-bl from-[#3BB48C]/8 via-emerald-100/15 to-transparent rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-teal-50/40 to-transparent rounded-full blur-[80px] pointer-events-none" />

        {/* Logo & Back */}
        <div className={`mb-10 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
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
              <Shield className="w-3 h-3" />
              Create Account
            </span>
          </div>
          <h1 className="text-3xl sm:text-[36px] font-black text-slate-900 tracking-tight leading-[1.1] mb-3">
            Get started with MLite
          </h1>
          <p className="text-[15px] text-slate-500 mb-7 leading-relaxed">
            Create your account to track experiments, deploy models, and monitor drift instantly.
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
              <span>Account created! Redirecting to dashboard...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 2-column row for Name and Username */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative group">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#3BB48C] transition-colors" />
                  <input
                    type="text"
                    placeholder="Youssef L."
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative group">
                  <GitBranch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#3BB48C] transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="youssef_ml"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 group-focus-within:text-[#3BB48C] transition-colors" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
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
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 transition-all"
                />
              </div>
              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="mt-2.5 animate-fade-in-up">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full transition-all duration-500 ${step <= strength.level ? strength.color : "bg-slate-100"
                            }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[10px] font-bold min-w-[40px] text-right ${strength.level <= 1 ? "text-rose-500" :
                        strength.level === 2 ? "text-amber-500" :
                          "text-emerald-600"
                      }`}>
                      {strength.text}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Minimum 8 characters required.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full mt-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-[#3BB48C] to-[#2FA07B] hover:from-[#329F7B] hover:to-[#278A6A] text-white font-bold text-sm transition-all shadow-xl shadow-[#3BB48C]/20 flex items-center justify-center gap-2.5 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#3BB48C]/30 active:translate-y-0 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Terms */}
          <p className="mt-4 text-[10px] text-slate-400 text-center leading-relaxed">
            By creating an account, you agree to MLite's self-hosted terms. Your data stays on your servers.
          </p>

          {/* Switcher */}
          <div className="mt-5 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="font-bold text-[#3BB48C] hover:text-[#278A6A] transition inline-flex items-center gap-1 hover:gap-2"
              >
                Sign In <ArrowRight className="w-3 h-3" />
              </Link>
            </p>
          </div>

          {/* Back to landing */}
          <div className="mt-3 text-center">
            <Link
              to="/"
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              ← Back to Landing Page
            </Link>
          </div>
        </div>
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
        @keyframes levitateFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-9px) scale(1.02); }
        }
        @keyframes floatMote1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.35; }
          50% { transform: translate(16px, -22px) scale(1.25); opacity: 0.9; }
        }
        @keyframes floatMote2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          50% { transform: translate(-18px, -28px) scale(1.15); opacity: 0.85; }
        }
        @keyframes floatMote3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.45; }
          50% { transform: translate(22px, -16px) scale(1.3); opacity: 0.95; }
        }
      `}</style>
    </div>
  );
};
