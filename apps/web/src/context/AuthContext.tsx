import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole, AuthTokens } from "../api/types";
import { apiLogin, apiRegister, apiGetMe } from "../api/client";

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    full_name?: string;
  }) => Promise<void>;
  logout: () => void;
  hasRole: (minRole: UserRole) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_LEVEL: Record<UserRole, number> = {
  VIEWER: 0,
  DEVELOPER: 1,
  USER: 1,
  MAINTAINER: 1,
  ADMIN: 2,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load session on startup from stored JWT token
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem("mlite_token");
      const savedRefreshToken = localStorage.getItem("mlite_refresh_token");

      if (savedToken) {
        setTokens({
          access_token: savedToken,
          refresh_token: savedRefreshToken || "",
          token_type: "bearer",
          expires_in: 3600,
        });

        try {
          // Fetch authoritative profile and permissions from backend /auth/me
          const currentUser = await apiGetMe();
          setUser(currentUser);
          localStorage.setItem("mlite_user", JSON.stringify(currentUser));
        } catch (err) {
          // Backend unreachable or token invalid → full logout to prevent stale state
          localStorage.removeItem("mlite_token");
          localStorage.removeItem("mlite_refresh_token");
          localStorage.removeItem("mlite_user");
          setTokens(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const authData = await apiLogin(username, password);
      localStorage.setItem("mlite_token", authData.access_token);
      localStorage.setItem("mlite_refresh_token", authData.refresh_token);
      setTokens(authData);

      // Retrieve full user profile & permissions
      const me = await apiGetMe();
      setUser(me);
      localStorage.setItem("mlite_user", JSON.stringify(me));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    username: string;
    password: string;
    full_name?: string;
  }): Promise<void> => {
    setIsLoading(true);
    try {
      const authData = await apiRegister(data);
      localStorage.setItem("mlite_token", authData.access_token);
      localStorage.setItem("mlite_refresh_token", authData.refresh_token);
      setTokens(authData);

      // Retrieve full user profile & permissions
      const me = await apiGetMe();
      setUser(me);
      localStorage.setItem("mlite_user", JSON.stringify(me));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem("mlite_token");
    localStorage.removeItem("mlite_refresh_token");
    localStorage.removeItem("mlite_user");
  };

  const hasRole = (minRole: UserRole): boolean => {
    if (!user) return false;
    return ROLE_LEVEL[user.role] >= ROLE_LEVEL[minRole];
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === "ADMIN") return true;
    if (user.role === "USER" || user.role === "DEVELOPER" || user.role === "MAINTAINER") {
      // Standard users have full operational MLOps lifecycle access
      if (!permission.startsWith("user:") && !permission.startsWith("audit:") && permission !== "project:delete") {
        return true;
      }
    }
    if (!user.permissions) return false;
    return user.permissions.includes(permission) || user.permissions.includes("*");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
