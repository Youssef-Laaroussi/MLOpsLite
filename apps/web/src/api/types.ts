export type UserRole = "ADMIN" | "USER" | "DEVELOPER" | "MAINTAINER" | "VIEWER";

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  is_active?: boolean;
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
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
  default_branch?: string;
  status: "active" | "archived" | "ACTIVE" | "ARCHIVED";
  models_count?: number;
  datasets_count?: number;
  deployments_count?: number;
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

export interface DatasetColumn {
  name: string;
  dtype: string;
  null_count: number;
  null_pct?: number;
  unique_count?: number;
  min_val?: string | number;
  max_val?: string | number;
  sample_values?: (string | number)[];
}

export interface DatasetVersion {
  id: string;
  dataset_id: string;
  version_num: number;
  hash_sha256: string;
  row_count: number;
  column_count: number;
  size_bytes: number;
  schema_json?: Record<string, any>;
  s3_key?: string;
  description?: string;
  created_at: string;
}

export interface Dataset {
  id: string;
  project_id?: string;
  name: string;
  format: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  version_num?: number;
  row_count?: number;
  column_count?: number;
  size_bytes?: number;
  hash_sha256?: string;
  s3_key?: string;
  quality_score?: number;
  downstream_models?: string[];
  columns?: DatasetColumn[];
  sample_records?: Record<string, any>[];
  latest_version?: DatasetVersion;
}

export interface SystemStats {
  projects_count: number;
  models_count: number;
  datasets_count?: number;
  experiments_count?: number;
  active_deployments: number;
  alerts_count: number;
  system_healthy: boolean;
  stages?: {
    production: number;
    candidate?: number;
    staging: number;
    development: number;
    archived: number;
  };
  funnel?: { name: string; value: number }[];
  benchmarks?: {
    model: string;
    full_name: string;
    stage: string;
    auc: number;
    f1: number;
    has_metrics: boolean;
  }[];
  latency_telemetry?: {
    time: string;
    p50: number;
    p95: number;
    p99?: number | null;
    reqs: number;
  }[];
  drift_trajectory?: {
    date: string;
    model_name: string;
    drift_share: number;
    drift_status: string;
  }[];
}

export interface SubsystemService {
  name: string;
  status: "online" | "offline";
  latency: string;
  uptime: string;
}

export interface ExperimentRun {
  run_id: string;
  run_name?: string;
  status: string;
  start_time?: number;
  end_time?: number;
  metrics: Record<string, number>;
  params: Record<string, string>;
  tags?: Record<string, string>;
}

export interface Experiment {
  experiment_id: string;
  name: string;
  artifact_location?: string;
  lifecycle_stage?: string;
  tags?: Record<string, string>;
  created_at?: string;
  runs_count?: number;
  runs?: ExperimentRun[];
}

export interface DriftEvaluationItem {
  id: string;
  model_name: string;
  deployment_id?: string | null;
  drift_share: number;
  drift_status: "LOW" | "MEDIUM" | "HIGH";
  drifted_features?: string[] | null;
  metrics?: Record<string, any> | null;
  html_report_path?: string | null;
  created_at: string;
}

export interface TelemetryPoint {
  time: string;
  p50: number;
  p95: number;
  p99: number;
  requests: number;
  errors: number;
}

export interface DataQualitySummary {
  id: string;
  dataset_id: string;
  score: number;
  status: "PASS" | "WARN" | "FAIL";
  rows_count: number;
  cols_count: number;
  null_percentage: number;
  duplicate_percentage: number;
  created_at: string;
}

export interface MonitoringSummary {
  model_name: string;
  models_available: string[];
  latest_drift?: DriftEvaluationItem | null;
  drift_history: DriftEvaluationItem[];
  telemetry: TelemetryPoint[];
  active_deployments: number;
  total_predictions: number;
  latest_quality?: DataQualitySummary | null;
}

export type AlertSeverity = "INFO" | "WARNING" | "HIGH" | "CRITICAL";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export interface Alert {
  id: string;
  project_id?: string | null;
  model_name?: string | null;
  deployment_id?: string | null;
  event_type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  details_json?: Record<string, any> | null;
  status: AlertStatus;
  acknowledged_by?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: "drift_share" | "latency_p95_ms" | "failed_deployments";
  operator: ">" | ">=" | "<" | "<=";
  threshold: number;
  model_name?: string | null;
  severity: AlertSeverity;
  enabled: boolean;
  created_at: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  kind: "SLACK" | "DISCORD" | "WEBHOOK";
  url: string;
  enabled: boolean;
  last_test_at?: string | null;
  last_test_ok?: boolean | null;
  created_at: string;
}

export interface AlertSummary {
  open_critical: number;
  open_warning: number;
  resolved_7d: number;
  mttr_minutes: number | null;
}

