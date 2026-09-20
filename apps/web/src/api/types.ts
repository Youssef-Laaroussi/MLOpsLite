export type UserRole = "ADMIN" | "MAINTAINER" | "DEVELOPER" | "VIEWER";

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role: UserRole;
  is_active?: boolean;
  permissions?: string[];
  created_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  full_key?: string;
  created_at: string;
  expires_at?: string | null;
  last_used_at?: string | null;
  is_revoked: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  resource_name?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  ip_address?: string | null;
  status: string;
  details?: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  git_url?: string;
  status: "ACTIVE" | "ARCHIVED";
  created_at: string;
  updated_at: string;
}

export interface ModelVersion {
  version: number;
  stage: "DEVELOPMENT" | "CANDIDATE" | "STAGING" | "PRODUCTION" | "ARCHIVED";
  metrics?: Record<string, number>;
  mlflow_run_id?: string;
  artifact_path?: string;
  created_at: string;
}

export interface RegisteredModel {
  name: string;
  version: number;
  stage: string;
  metrics?: Record<string, number>;
  mlflow_run_id?: string;
  created_at: string;
}

export interface Deployment {
  id: string;
  model_name: string;
  model_version: number;
  container_id?: string;
  port: number;
  endpoint_url: string;
  status: "PENDING" | "RUNNING" | "STOPPED" | "FAILED";
  error_message?: string;
  created_at: string;
}

export interface Dataset {
  id: string;
  name: string;
  format: string;
  description?: string;
  created_at: string;
}

export interface SystemStats {
  projects_count: number;
  models_count: number;
  active_deployments: number;
  alerts_count: number;
  system_healthy: boolean;
}
