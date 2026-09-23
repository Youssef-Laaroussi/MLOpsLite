import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Key,
  LogOut,
  User as UserIcon,
  ChevronDown,
  LogIn,
  Settings,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiKeysModal } from "./ApiKeysModal";
import { UserRole } from "../api/types";

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [apiKeysModalOpen, setApiKeysModalOpen] = useState(false);

  const getRoleBadgeStyle = (role?: UserRole) => {
    if (role === "ADMIN") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  const getRoleLabel = (role?: UserRole) => {
    return role === "ADMIN" ? "ADMIN" : "USER";
  };

  return (
    <>
      <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3BB48C] animate-pulse"></span>
          {title}
        </h1>

        <div className="flex items-center gap-3">

          {/* User Profile / Auth Area */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl border border-slate-200 hover:border-[#3BB48C] hover:bg-slate-50 transition shadow-xs bg-white"
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-xs ${
                    user.role === "ADMIN"
                      ? "bg-gradient-to-tr from-rose-500 to-pink-600 shadow-rose-500/20"
                      : "bg-gradient-to-tr from-[#3BB48C] to-teal-400 shadow-[#3BB48C]/20"
                  }`}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>

                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {user.full_name || user.username}
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md border ${getRoleBadgeStyle(
                        user.role
                      )}`}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user.full_name || user.username}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
                    <div className="mt-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                          user.role
                        )}`}
                      >
                        Role: {getRoleLabel(user.role)}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/app/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      Paramètres
                    </Link>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setApiKeysModalOpen(true);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
                    >
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      API Keys & Tokens
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3BB48C] hover:bg-[#329F7B] text-white font-bold text-xs transition shadow-sm hover:-translate-y-0.5 active:translate-y-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              Connect
            </Link>
          )}
        </div>
      </header>

      {/* API Keys Modal */}
      <ApiKeysModal isOpen={apiKeysModalOpen} onClose={() => setApiKeysModalOpen(false)} />
    </>
  );
};
