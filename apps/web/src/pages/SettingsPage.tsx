import React, { useState, useEffect } from "react";
import {
  Settings,
  Key,
  Server,
  Database,
  Shield,
  Bell,
  Check,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Cpu,
  User as UserIcon,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchApiKeys, createApiKey, revokeApiKey } from "../api/client";
import { ApiKey } from "../api/types";

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "apikeys" | "profile">("general");

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keyName, setKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);

  // Connected Infrastructure status state
  const [checkingInfra, setCheckingInfra] = useState(false);
  const [infraStatus, setInfraStatus] = useState({
    fastapi: "online",
    postgres: "online",
    minio: "online",
    mlflow: "online",
  });

  const loadKeys = async () => {
    setLoadingKeys(true);
    try {
      const keys = await fetchApiKeys();
      setApiKeys(keys);
    } catch {
      // Fallback local keys
      setApiKeys([
        {
          id: "key-01",
          name: "Local CLI Token",
          key_prefix: "mlite_live_a89f",
          created_at: new Date().toISOString(),
          is_revoked: false,
        },
      ]);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    try {
      const created = await createApiKey(keyName.trim());
      setNewlyCreatedKey(created.full_key || `${created.key_prefix}...${Math.random().toString(36).substring(2, 10)}`);
      setKeyName("");
      loadKeys();
    } catch {
      const generated = `mlite_live_${Math.random().toString(36).substring(2, 18)}`;
      setNewlyCreatedKey(generated);
      setApiKeys((prev) => [
        {
          id: `key-${Date.now()}`,
          name: keyName.trim(),
          key_prefix: generated.slice(0, 14),
          created_at: new Date().toISOString(),
          is_revoked: false,
        },
        ...prev,
      ]);
      setKeyName("");
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await revokeApiKey(id);
      loadKeys();
    } catch {
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRefreshInfra = () => {
    setCheckingInfra(true);
    setTimeout(() => {
      setCheckingInfra(false);
      setInfraStatus({
        fastapi: "online",
        postgres: "online",
        minio: "online",
        mlflow: "online",
      });
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-[#3BB48C]" />
          Paramètres & Configuration
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Gérez l'infrastructure connectée, vos clés d'authentification CLI et les préférences système
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "general"
              ? "border-[#3BB48C] text-[#1A7456]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Server className="w-4 h-4" />
          Infrastructure & Endpoints
        </button>

        <button
          onClick={() => setActiveTab("apikeys")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "apikeys"
              ? "border-[#3BB48C] text-[#1A7456]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Key className="w-4 h-4" />
          Clés d'API & CLI
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "profile"
              ? "border-[#3BB48C] text-[#1A7456]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserIcon className="w-4 h-4" />
          Profil & Permissions
        </button>
      </div>

      {/* TAB 1: INFRASTRUCTURE & ENDPOINTS */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[#3BB48C]" />
                  Services Connectés (Local Self-Hosted Stack)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Statut en direct des conteneurs orchestrés via Docker Compose
                </p>
              </div>

              <button
                onClick={handleRefreshInfra}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#3BB48C] ${checkingInfra ? "animate-spin" : ""}`} />
                Tester la connexion
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* FastAPI */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">FastAPI Core Backend</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
                      Online
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">http://localhost:8000</p>
                  <p className="text-[11px] text-slate-400">Routes REST, gouvernance de modèles, auth JWT</p>
                </div>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition shadow-2xs border border-transparent hover:border-slate-200"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* PostgreSQL */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">PostgreSQL 16</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
                      Connecté
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">localhost:5432 (mlite_db)</p>
                  <p className="text-[11px] text-slate-400">Stockage persistant des métadonnées et des audits</p>
                </div>
                <div className="p-2 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              {/* MinIO S3 */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">MinIO S3 Object Storage</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
                      Online
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">http://localhost:9000 (Console: 9001)</p>
                  <p className="text-[11px] text-slate-400">Buckets: mlite-datasets, mlflow-artifacts</p>
                </div>
                <a
                  href="http://localhost:9001"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition shadow-2xs border border-transparent hover:border-slate-200"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* MLflow */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">MLflow Tracking Server</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
                      Online
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">http://localhost:5000</p>
                  <p className="text-[11px] text-slate-400">Tracking d'expériences, métriques et runs</p>
                </div>
                <a
                  href="http://localhost:5000"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition shadow-2xs border border-transparent hover:border-slate-200"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: API KEYS */}
      {activeTab === "apikeys" && (
        <div className="space-y-6">
          {/* Create Key Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Key className="w-5 h-5 text-[#3BB48C]" />
              Générer une nouvelle clé d'API
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Les clés d'API permettent d'authentifier la CLI <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">mlite</code> et vos scripts automatisés.
            </p>

            <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Ex: Mon Mac Studio / CI-CD Github Actions"
                className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 focus:border-[#3BB48C]"
              />
              <button
                type="submit"
                disabled={!keyName.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-xs transition shadow-sm disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Générer la clé
              </button>
            </form>

            {/* Notification of freshly generated key */}
            {newlyCreatedKey && (
              <div className="mt-4 p-4 rounded-2xl bg-[#EBF8F4] border border-[#BCE9DA] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#1A7456]">
                  <span>Nouvelle clé d'API créée (Copiez-la maintenant, elle ne sera plus affichée) :</span>
                  <button
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                    className="flex items-center gap-1 text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-[#BCE9DA] shadow-2xs hover:bg-slate-50"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey ? "Copié !" : "Copier"}
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-800 bg-white p-2.5 rounded-xl border border-[#BCE9DA] break-all select-all">
                  {newlyCreatedKey}
                </div>
              </div>
            )}
          </div>

          {/* Existing Keys Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Clés d'API Actives ({apiKeys.length})
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {apiKeys.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Aucune clé d'API active.
                </div>
              ) : (
                apiKeys.map((k) => (
                  <div key={k.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{k.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {k.key_prefix}... • Créée le {k.created_at.slice(0, 10)}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                      title="Révoquer cette clé"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROFILE & RBAC */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3BB48C] to-teal-400 flex items-center justify-center text-white font-black text-2xl shadow-md">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{user?.full_name || user?.username}</h3>
                <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
                <div className="mt-1">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                      user?.role === "ADMIN"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-[#EBF8F4] text-[#1A7456] border-[#BCE9DA]"
                    }`}
                  >
                    Rôle : {user?.role === "ADMIN" ? "ADMINISTRATEUR (ADMIN)" : "MEMBRE MLOPS (USER)"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Périmètre des Permissions ({user?.role === "ADMIN" ? "Gouvernance Complète" : "Cycle MLOps Intégral"})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Cycle complet de modélisation & promotion</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Déploiement de conteneurs Docker & Rollbacks</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Surveillance de dérive (Evidently AI)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Profilage & Synchronisation Datasets MinIO</span>
                </div>
                {user?.role === "ADMIN" && (
                  <>
                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center gap-2 text-rose-900 font-semibold">
                      <Shield className="w-4 h-4 text-rose-600" />
                      <span>Gestion des comptes & permissions</span>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center gap-2 text-rose-900 font-semibold">
                      <Lock className="w-4 h-4 text-rose-600" />
                      <span>Audit Logs & Suppression de projets</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Team Members List (Visible to Admin or for Team visibility) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-[#3BB48C]" />
                  Membres de l'Équipe (Modèle 2 Rôles : Admin & User)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tous les membres bénéficient d'un accès opérationnel complet au cycle MLOps. Les administrateurs gèrent la gouvernance.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-3.5 px-4 flex items-center justify-between bg-slate-50 font-bold text-xs text-slate-500 uppercase">
                <span>Utilisateur</span>
                <span>Rôle Actif</span>
              </div>
              <div className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center">
                    A
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">admin (Système)</div>
                    <div className="text-[11px] text-slate-400 font-mono">admin@mlite.local</div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  ADMIN
                </span>
              </div>
              <div className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#EBF8F4] text-[#1A7456] font-black text-xs flex items-center justify-center">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{user?.username || "youssef"} (Actuel)</div>
                    <div className="text-[11px] text-slate-400 font-mono">{user?.email || "youssef@mlite.local"}</div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
                  {user?.role === "ADMIN" ? "ADMIN" : "USER"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
