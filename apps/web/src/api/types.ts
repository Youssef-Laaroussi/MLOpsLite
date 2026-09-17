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
