import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldAlert,
  Calendar,
} from "lucide-react";
import { ApiKey } from "../api/types";
import { fetchApiKeys, createApiKey, revokeApiKey } from "../api/client";

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeysModal: React.FC<ApiKeysModalProps> = ({ isOpen, onClose }) => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errMsg = (err: any, fallback: string) =>
    err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback;

  useEffect(() => {
    if (isOpen) {
      setNewlyCreatedKey(null);
      loadKeys();
    }
  }, [isOpen]);

  const loadKeys = async () => {
    try {
      setKeys(await fetchApiKeys());
      setError(null);
    } catch (err) {
      setKeys([]);
      setError(errMsg(err, "Unable to load API keys."));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setLoading(true);
    try {
      const res = await createApiKey(newKeyName.trim(), 90);
      if (!res.full_key) throw new Error("Server did not return a key.");
      setNewlyCreatedKey(res.full_key);
      setNewKeyName("");
      await loadKeys();
    } catch (err) {
      setError(errMsg(err, "Failed to create API key."));
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey(id);
      await loadKeys();
    } catch (err) {
      setError(errMsg(err, "Failed to revoke API key."));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard unavailable — copy the key manually.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">API Keys & Tokens</h2>
              <p className="text-xs text-slate-500">
                Authenticate your CLI scripts and CI/CD pipelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}
          {/* Newly Generated Secret Banner */}
          {newlyCreatedKey && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                <span>Save this API Key! It will not be shown again.</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  readOnly
                  value={newlyCreatedKey}
                  className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-xl font-mono text-xs text-slate-900 select-all"
                />
                <button
                  onClick={() => copyToClipboard(newlyCreatedKey)}
                  className="px-3 py-2 rounded-xl bg-[#3BB48C] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#329F7B] transition shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Create Key Form */}
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Key description (e.g. GitHub Actions, MacBook CLI)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-xs transition shadow-md shadow-[#3BB48C]/25 flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Generate Key
            </button>
          </form>

          {/* Keys List */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Active Keys ({keys.length})
            </h3>
            {keys.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                No active API keys found. Generate one above to access the CLI.
              </div>
            ) : (
              <div className="space-y-2">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900">{key.name}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5">
                        <span>Prefix: {key.key_prefix}...</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(key.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      title="Revoke Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
