import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const SignInPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans antialiased text-slate-900 select-none">
      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ── LEFT PANEL (50%): Formulaire épuré sur fond blanc ── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 lg:p-16 xl:p-20 min-h-screen bg-white z-10">
        {/* Brand Header */}
        <div>
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 p-2 flex items-center justify-center transition-all group-hover:border-[#3BB48C]">
              <img src="/logo.png" alt="MLOpsLite" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-xl tracking-tight">
                MLOps<span className="text-[#3BB48C]">Lite</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Centered Form Area */}
        <div className="w-full max-w-[390px] mx-auto my-auto py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Sign in
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-normal">
              Access your workspace
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Signed in successfully. Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Username field */}
            <div>
              <div className="relative group">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#3BB48C] transition-colors pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="email"
                  type="text"
                  required
                  autoFocus
                  placeholder="Email address"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password field with show/hide toggle */}
            <div>
              <div className="relative group">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#3BB48C] transition-colors pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#3BB48C] focus:ring-[#3BB48C]/20 accent-[#3BB48C]"
                />
                <span>Remember me</span>
              </label>

              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  setError("Contact your administrator (admin@mlite.local) to reset credentials.");
                }}
                className="font-medium text-[#1A7456] hover:text-[#145a43] hover:underline"
              >
                Forgot password?
              </a>
            </div>

            {/* Bouton Sign in vert pleine largeur */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] active:bg-[#2A8567] text-white font-bold text-sm transition-all shadow-sm shadow-[#3BB48C]/25 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Séparateur "or" */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative px-3 bg-white text-xs text-slate-400 font-medium">
              or
            </span>
          </div>

          {/* Social Sign In Buttons: GitHub & Google (Exactement comme sur l'image) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                window.open("https://github.com/Youssef-Laaroussi/MLOpsLite", "_blank");
              }}
              className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-2 shadow-2xs hover:border-slate-300 cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-900 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>GitHub</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setError("Google OAuth is available for Enterprise SSO.");
              }}
              className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-2 shadow-2xs hover:border-slate-300 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google</span>
            </button>
          </div>

          {/* Lien Create account */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-bold text-[#3BB48C] hover:text-[#2FA07B] hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Pied de page discret */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>MLOpsLite v1.0.0</span>
          <div className="flex items-center gap-3">
            <span>Apache 2.0</span>
            <span>•</span>
            <a
              href="https://github.com/Youssef-Laaroussi/MLOpsLite"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-700 transition"
            >
              Docs
            </a>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ── RIGHT PANEL (50%): Décor Vectoriel Épuré MLOps (Sans Image) ── */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#071913] via-[#0C241B] to-[#040D0A] flex-col justify-between p-12 lg:p-16 text-white select-none">
        {/* Lueur d'ambiance vert émeraude douce en arrière-plan */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-[#3BB48C]/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-teal-400/10 blur-[100px] pointer-events-none" />

        {/* Grille technique de fond très discrète */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(59, 180, 140, 0.9) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* En-tête subtil du panneau droit */}
        <div className="relative z-10 flex items-center justify-between text-xs text-emerald-400/70 font-mono">
          <span className="tracking-widest uppercase">MLOps Infrastructure</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3BB48C] animate-pulse" />
            <span className="text-emerald-300 font-medium font-sans">Active &amp; Ready</span>
          </div>
        </div>

        {/* ── DÉCOR CENTRAL GÉOMÉTRIQUE VECTORIEL PUR (Zero image raster) ── */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center">
          <div className="relative w-80 h-80 flex items-center justify-center">
            {/* Anneau orbital externe avec satellite */}
            <div
              className="absolute w-72 h-72 rounded-full border border-emerald-500/20"
              style={{ animation: "spinSlow 40s linear infinite" }}
            >
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#3BB48C] shadow-lg shadow-[#3BB48C]/70" />
            </div>

            {/* Anneau isométrique incliné */}
            <div
              className="absolute w-60 h-60 rounded-full border border-dashed border-teal-400/30"
              style={{
                transform: "rotateX(60deg) rotateY(15deg)",
                animation: "spinReverse 28s linear infinite",
              }}
            >
              <div className="absolute top-0 right-1/4 w-2 h-2 rounded-full bg-teal-300" />
            </div>

            {/* Carré losange isométrique central */}
            <div
              className="absolute w-44 h-44 rounded-3xl border border-[#3BB48C]/40 bg-[#0C241B]/60 backdrop-blur-xs flex items-center justify-center shadow-2xl"
              style={{
                transform: "rotate(45deg)",
                boxShadow: "0 0 60px rgba(59, 180, 140, 0.18)",
              }}
            >
              {/* Ligne intérieure */}
              <div className="w-32 h-32 rounded-2xl border border-dashed border-[#3BB48C]/30 flex items-center justify-center" />
            </div>

            {/* Emblème central au premier plan */}
            <div className="relative w-24 h-24 rounded-2xl bg-white/95 p-3.5 shadow-2xl shadow-[#3BB48C]/40 border border-white/50 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="MLite Core"
                className="w-full h-full object-contain filter drop-shadow-sm select-none"
              />
            </div>
          </div>

          {/* Mini capsules télémétrie graphiques en bas du décor */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-8">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs text-center">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Latency</span>
              <span className="text-xs font-bold font-mono text-[#3BB48C]">3.8 ms</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs text-center">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Uptime</span>
              <span className="text-xs font-bold font-mono text-[#3BB48C]">99.99%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs text-center">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Drift SLA</span>
              <span className="text-xs font-bold font-mono text-emerald-400">Zero PSI</span>
            </div>
          </div>
        </div>

        {/* ── Citation & Trait vert en bas à gauche ── */}
        <div className="relative z-10 pt-6">
          <p className="text-2xl font-bold tracking-tight text-white leading-snug">
            From data to decisions <br />
            — faster.
          </p>
          <div className="w-12 h-1 bg-[#3BB48C] rounded-full mt-3.5 shadow-sm" />
        </div>
      </div>
    </div>
  );
};
