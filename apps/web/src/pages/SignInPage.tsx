import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
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
      setTimeout(() => navigate("/app", { replace: true }), 600);
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
    <div className="relative h-screen max-h-screen bg-white flex flex-col justify-between font-sans antialiased text-slate-900 select-none overflow-hidden">
      {/* ── Décoration abstraite sur les bords (visible immédiatement à l'écran sans scroll) ── */}
      {/* Bord supérieur gauche - Les pilules émergent de l'extérieur sans extrémité visible à l'origine */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 sm:w-96 sm:h-96 select-none z-0">
        <svg viewBox="0 0 420 420" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="diag-stripes-tl" width="10" height="10" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#3BB48C" strokeWidth="3" />
            </pattern>
            <linearGradient id="pillGradDark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0B2A20" />
              <stop offset="100%" stopColor="#061B14" />
            </linearGradient>
            <linearGradient id="pillGradEmerald" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3BB48C" />
              <stop offset="100%" stopColor="#258E6C" />
            </linearGradient>
            <linearGradient id="pillGradMint" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>

          {/* Pilules diagonales longues : l'origine commence à y=-80/-120 hors champ, seule l'extrémité basse arrondie entre dans la page */}
          <g transform="rotate(-35 150 150)">
            <rect x="-10" y="-120" width="68" height="420" rx="34" fill="url(#pillGradDark)" />
            <rect x="70" y="-140" width="54" height="400" rx="27" fill="url(#pillGradEmerald)" />
            <rect x="136" y="-100" width="46" height="360" rx="23" fill="#E6F7F2" />
            <rect x="136" y="-100" width="46" height="360" rx="23" fill="url(#diag-stripes-tl)" />
            <rect x="194" y="-120" width="42" height="330" rx="21" fill="url(#pillGradMint)" />
            <rect x="248" y="-90" width="38" height="280" rx="19" fill="#3BB48C" />

            {/* Cercles et anneaux */}
            <circle cx="24" cy="180" r="16" fill="#3BB48C" />
            <circle cx="24" cy="180" r="26" stroke="#6EE7B7" strokeWidth="3" fill="none" />
            <circle cx="98" cy="220" r="15" fill="#0B2A20" />
            <circle cx="158" cy="190" r="13" fill="#3BB48C" />
            <circle cx="158" cy="190" r="22" stroke="#0B2A20" strokeWidth="2.5" fill="none" />
            <circle cx="214" cy="180" r="11" fill="#061B14" />
            <circle cx="122" cy="280" r="19" stroke="#3BB48C" strokeWidth="3" fill="none" />
            <circle cx="266" cy="140" r="10" fill="#6EE7B7" />
          </g>
        </svg>
      </div>

      {/* Bord inférieur droit - Les pilules émergent de l'extérieur sans extrémité visible à l'origine */}
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 sm:w-96 sm:h-96 select-none z-0">
        <svg viewBox="0 0 420 420" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="diag-stripes-br" width="10" height="10" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#3BB48C" strokeWidth="3" />
            </pattern>
            <linearGradient id="pillGradDarkBR" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0B2A20" />
              <stop offset="100%" stopColor="#061B14" />
            </linearGradient>
            <linearGradient id="pillGradEmeraldBR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3BB48C" />
              <stop offset="100%" stopColor="#258E6C" />
            </linearGradient>
            <linearGradient id="pillGradMintBR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>

          {/* Pilules diagonales longues : l'origine commence à y=480 hors champ, seule l'extrémité supérieure arrondie entre dans la page */}
          <g transform="rotate(-35 220 220)">
            <rect x="74" y="100" width="68" height="420" rx="34" fill="url(#pillGradDarkBR)" />
            <rect x="154" y="60" width="54" height="400" rx="27" fill="url(#pillGradEmeraldBR)" />
            <rect x="220" y="110" width="46" height="360" rx="23" fill="#E6F7F2" />
            <rect x="220" y="110" width="46" height="360" rx="23" fill="url(#diag-stripes-br)" />
            <rect x="278" y="80" width="42" height="330" rx="21" fill="url(#pillGradMintBR)" />
            <rect x="332" y="130" width="38" height="280" rx="19" fill="#3BB48C" />

            {/* Cercles et anneaux */}
            <circle cx="108" cy="180" r="16" fill="#3BB48C" />
            <circle cx="108" cy="180" r="26" stroke="#6EE7B7" strokeWidth="3" fill="none" />
            <circle cx="182" cy="140" r="14" fill="#0B2A20" />
            <circle cx="242" cy="200" r="18" stroke="#3BB48C" strokeWidth="3" fill="none" />
            <circle cx="298" cy="140" r="11" fill="#061B14" />
            <circle cx="350" cy="190" r="13" fill="#6EE7B7" />
          </g>
        </svg>
      </div>

      {/* ── Header Épuré avec lien de retour ── */}
      <header className="relative z-10 pt-4 pb-2 px-6 sm:px-10 max-w-7xl w-full mx-auto flex items-center justify-end shrink-0">
        <Link
          to="/"
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs"
        >
          <span>Back to Home</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* ── Main Formulaire Centré avec Logo au Centre Parfait (Sans Scroll) ── */}
      <main className="relative z-10 w-full max-w-[400px] mx-auto px-6 py-2 my-auto shrink-0">
        {/* Logo MLOpsLite centré au-dessus du formulaire */}
        <div className="flex flex-col items-center justify-center text-center mb-5">
          <Link to="/" className="inline-flex flex-col items-center gap-2 group mb-1">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/90 p-2 flex items-center justify-center shadow-xs group-hover:border-[#3BB48C] transition-all">
              <img src="/logo.png" alt="MLOpsLite" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-slate-900 text-xl tracking-tight">
                MLOps<span className="text-[#3BB48C]">Lite</span>
              </span>
            </div>
          </Link>

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Sign in
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            Access your workspace
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {success && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Signed in successfully. Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email / Username field */}
          <div>
            <label htmlFor="username-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email or Username
            </label>
            <div className="relative group">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#3BB48C] transition-colors pointer-events-none">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="username-input"
                type="text"
                required
                autoFocus
                placeholder="Email address"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Password field with show/hide toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password-input" className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  setError("Contact your administrator (admin@mlite.local) to reset credentials.");
                }}
                className="text-xs font-medium text-[#1A7456] hover:text-[#145a43] hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative group">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#3BB48C] transition-colors pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:ring-4 focus:ring-[#3BB48C]/10 transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-0.5"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center text-xs pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#3BB48C] focus:ring-[#3BB48C]/20 accent-[#3BB48C]"
              />
              <span>Remember me</span>
            </label>
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

        {/* Boutons Sociaux GitHub & Google */}
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

        {/* Lien Inscription */}
        <div className="mt-5 text-center">
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
      </main>

      {/* ── Footer Discret ── */}
      <footer className="relative z-10 py-3 px-6 sm:px-10 max-w-7xl w-full mx-auto border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 shrink-0">
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
      </footer>
    </div>
  );
};
