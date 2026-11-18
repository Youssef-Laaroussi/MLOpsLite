import axios, { InternalAxiosRequestConfig } from "axios";
import {
  Project,
  RegisteredModel,
  Deployment,
  Dataset,
  DatasetVersion,
  SystemStats,
  SubsystemService,
  User,
  UserRole,
  AuthTokens,
  ApiKey,
  AuditLog,
  Experiment,
  ExperimentArtifact,
  ExperimentRun,
  MonitoringSummary,
  Alert,
  AlertRule,
  NotificationChannel,
  AlertSummary,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

type RetryConfig = InternalAxiosRequestConfig & { sessionRetried?: boolean; sessionToken?: string | null };

// Interceptor: inject Bearer JWT token if available
api.interceptors.request.use((config: RetryConfig) => {
  config.sessionToken = localStorage.getItem("mlite_refresh_token");
  const token = localStorage.getItem("mlite_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let lastRefresh: { previous: string; current: string } | undefined;
let refreshInFlight: { token: string; promise: Promise<AuthTokens> } | undefined;

function refreshSession(token: string): Promise<AuthTokens> {
  if (refreshInFlight?.token === token) return refreshInFlight.promise;

  const promise = axios.post<AuthTokens>(
    `${API_BASE.replace(/\/$/, "")}/auth/refresh`,
    { refresh_token: token },
    { timeout: 10000 }
  ).then(({ data }) => {
    if (localStorage.getItem("mlite_refresh_token") === token) {
      localStorage.setItem("mlite_token", data.access_token);
      localStorage.setItem("mlite_refresh_token", data.refresh_token);
      lastRefresh = { previous: token, current: data.refresh_token };
    }
    return data;
  }).finally(() => {
    if (refreshInFlight?.promise === promise) refreshInFlight = undefined;
  });
  refreshInFlight = { token, promise };
  return promise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config: RetryConfig | undefined = error.config;
    if (error.response?.status !== 401 || !config || config.sessionRetried ||
        /^\/auth\/(login|register|refresh)$/.test(config.url || "")) {
      throw error;
    }

    const token = localStorage.getItem("mlite_refresh_token");
    if (!token) throw error;

    config.sessionRetried = true;
    if (config.sessionToken !== token) {
      if (lastRefresh?.previous === config.sessionToken && lastRefresh?.current === token) {
        return api.request(config);
      }
      throw error;
    }

    try {
      const tokens = await refreshSession(token);
      if (localStorage.getItem("mlite_token") === tokens.access_token) {
        return api.request(config);
      }
    } catch (refreshError) {
      const status = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
      if ((status === 401 || status === 403) && localStorage.getItem("mlite_refresh_token") === token) {
        ["mlite_token", "mlite_refresh_token", "mlite_user"].forEach((key) => localStorage.removeItem(key));
        window.location.assign("/signin");
      }
      throw refreshError;
    }
    throw error;
  }
);

// ── Auth APIs ──────────────────────────────────────────────────────

export const apiLogin = async (username: string, password: string): Promise<AuthTokens> => {
  const res = await api.post("/auth/login", { username, password });
  return res.data;
};

export const apiRegister = async (data: {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}): Promise<AuthTokens> => {
  const res = await api.post("/auth/register", data);
  return res.data;
};

export const apiGetMe = async (): Promise<User> => {
  const res = await api.get("/auth/me");
  return res.data;
};

// ── API Key Management ─────────────────────────────────────────────

export const fetchApiKeys = async (): Promise<ApiKey[]> => {
  const res = await api.get("/auth/api-keys");
  return res.data.keys || [];
};

export const createApiKey = async (name: string, expires_days?: number): Promise<ApiKey> => {
  const res = await api.post("/auth/api-keys", { name, expires_days });
  return res.data;
};

export const revokeApiKey = async (keyId: string): Promise<void> => {
  await api.delete(`/auth/api-keys/${keyId}`);
};

// ── User Management (Admin) ─────────────────────────────────────────

export const fetchUsers = async (): Promise<User[]> => {
  const res = await api.get("/users");
  return res.data.users || [];
};

export const createUser = async (data: {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  role: UserRole;
}): Promise<User> => {
  const res = await api.post("/users", data);
  return res.data;
};

export const updateUser = async (
  userId: string,
  data: {
    full_name?: string;
    role?: UserRole;
    is_active?: boolean;
  }
): Promise<User> => {
  const res = await api.patch(`/users/${userId}`, data);
  return res.data;
};

// ── Audit Logs ─────────────────────────────────────────────────────

export const fetchAuditLogs = async (limit: number = 50): Promise<AuditLog[]> => {
  const res = await api.get("/audit/logs", { params: { limit } });
  return res.data.logs || [];
};

// ── Projects ───────────────────────────────────────────────────────

export const fetchProjects = async (): Promise<Project[]> => {
  const projects: Project[] = [];
  for (let page = 1; ; page += 1) {
    const { data } = await api.get<{ projects: Project[]; total: number }>("/projects/", {
      params: { page, page_size: 100 },
    });
    projects.push(...data.projects);
    if (projects.length >= data.total || data.projects.length < 100) return projects;
  }
};

export const createProject = async (data: {
  name: string;
  slug?: string;
  description?: string;
  git_url?: string;
}): Promise<Project> => {
  const res = await api.post("/projects/", data);
  return res.data;
};

export const archiveProject = async (slugOrId: string): Promise<Project> => {
  const res = await api.delete(`/projects/${slugOrId}`);
  return res.data;
};

export const updateProject = async (
  slugOrId: string,
  data: {
    name?: string;
    description?: string;
    git_url?: string;
    default_branch?: string;
    status?: string;
  }
): Promise<Project> => {
  const res = await api.patch(`/projects/${slugOrId}`, data);
  return res.data;
};

export const deleteProject = async (slugOrId: string): Promise<void> => {
  await api.delete(`/projects/${slugOrId}`, { params: { permanent: true } });
};


// ── Models & Registry ──────────────────────────────────────────────

export const fetchModels = async (project?: string): Promise<RegisteredModel[]> => {
  const res = await api.get("/models/", { params: { project } });
  return res.data.models || [];
};

export const promoteModelVersion = async (name: string, version: number, stage: string): Promise<any> => {
  const res = await api.post(`/models/${encodeURIComponent(name)}/versions/${version}/promote`, { stage });
  if (res.data.promoted !== true) throw new Error(res.data.error || "The model stage could not be changed.");
  return res.data;
};

// ── Deployments ────────────────────────────────────────────────────

export const fetchDeployments = async (): Promise<Deployment[]> => {
  const res = await api.get("/deployments/");
  return res.data.deployments || [];
};

export const deployModel = async (modelName: string, version: number, port?: number): Promise<Deployment> => {
  const res = await api.post("/deployments/", {
    model_name: modelName,
    model_version: version,
    port,
  }, { timeout: 90000 });
  if (res.data.status === "FAILED") {
    throw new Error(res.data.error_message || "The inference container failed to start.");
  }
  return res.data;
};

export const stopDeployment = async (id: string): Promise<Deployment> => {
  const res = await api.post(`/deployments/${id}/stop`);
  return res.data;
};

// ── Rollback ───────────────────────────────────────────────────────

export const rollbackDeployment = async (deploymentId: string, targetVersion: number): Promise<{ status: string; error_message?: string | null }> => {
  const res = await api.post(`/deployments/${encodeURIComponent(deploymentId)}/rollback`, {
    target_version: targetVersion,
  });
  return res.data;
};

// ── Live Model Test Prediction ─────────────────────────────────────

export const testModelPrediction = async (
  endpointUrl: string,
  inputs: number[][]
): Promise<{ prediction: any; latency_ms: number }> => {
  const start = performance.now();
  // Errors propagate to the caller: never fabricate predictions.
  const res = await axios.post(`${endpointUrl.replace(/\/$/, "")}/predict`, { inputs }, { timeout: 10000 });
  return { prediction: res.data, latency_ms: Math.round(performance.now() - start) };
};

/** Real liveness probe routed through the authenticated backend (no CORS / no container exposure). */
export const pingDeployment = async (id: string): Promise<{ prediction: any; latency_ms: number }> => {
  const start = performance.now();
  const res = await api.get(`/deployments/${id}/health`);
  return { prediction: res.data, latency_ms: Math.round(performance.now() - start) };
};

// ── Datasets ───────────────────────────────────────────────────────

export const fetchDatasets = async (): Promise<Dataset[]> => {
  const res = await api.get("/datasets/");
  return res.data.datasets || [];
};

export const createDataset = async (data: {
  name: string;
  format?: string;
  description?: string;
  project_id?: string;
}): Promise<Dataset> => {
  const res = await api.post("/datasets/", data);
  return res.data;
};

export const uploadDatasetFile = async (datasetId: string, file: File, description?: string): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);
  if (description) formData.append("description", description);
  const res = await api.post(`/datasets/${datasetId}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const fetchDatasetVersions = async (datasetId: string): Promise<DatasetVersion[]> => {
  const res = await api.get(`/datasets/${datasetId}/versions`);
  return res.data || [];
};

export const fetchDvcStatus = async (): Promise<{
  is_installed: boolean;
  remote_name: string;
  remote_bucket: string;
  remote_prefix: string;
  minio_endpoint: string;
  dvc_dir_exists: boolean;
}> => {
  const res = await api.get("/datasets/dvc/status");
  return res.data;
};

export const deleteDataset = async (datasetId: string): Promise<void> => {
  await api.delete(`/datasets/${datasetId}`);
};


// ── System Stats & Subsystem Health ───────────────────────────────

export const fetchSystemStats = async (timeRange?: string): Promise<SystemStats> => {
  const rangeParam =
    timeRange === "Last 7 days" ? "7d" : timeRange === "Last 30 days" ? "30d" : "all";
  const res = await api.get("/health/stats", { params: { time_range: rangeParam } });
  return res.data;
};

export const fetchSystemServices = async (): Promise<SubsystemService[]> => {
  const res = await api.get<SubsystemService[]>("/health/services");
  return res.data;
};

// ── Experiments & Runs (MLflow Proxy) ──────────────────────────────

export const fetchExperiments = async (project?: string): Promise<Experiment[]> => {
  const res = await api.get("/experiments/", { params: { project } });
  return res.data.experiments || [];
};

export const fetchExperimentRuns = async (experimentId: string): Promise<ExperimentRun[]> => {
  const res = await api.get(`/experiments/${experimentId}/runs`);
  return res.data.runs || [];
};

export const fetchRunMetricHistory = async (experimentId: string, runId: string, metric: string, signal: AbortSignal) => {
  const path = `/experiments/${encodeURIComponent(experimentId)}/runs/${encodeURIComponent(runId)}/metric-history`;
  const { data } = await api.get<{ points: { step: number; value: number }[] }>(path, { params: { metric }, signal });
  return data.points;
};

export const fetchExperimentArtifacts = async (experimentId: string, runId: string): Promise<ExperimentArtifact[]> => {
  const path = `/experiments/${encodeURIComponent(experimentId)}/runs/${encodeURIComponent(runId)}/artifacts`;
  const { data } = await api.get<{ artifacts: ExperimentArtifact[] }>(path);
  return data.artifacts;
};

export const createExperiment = async (data: { name: string; tags?: Record<string, string> }): Promise<any> => {
  const res = await api.post("/experiments/", data);
  return res.data;
};

export const deleteExperiment = async (experimentId: string): Promise<void> => {
  await api.delete(`/experiments/${experimentId}`);
};

// ── Monitoring & Observability ─────────────────────────────────────

export const fetchMonitoringSummary = async (modelName?: string): Promise<MonitoringSummary> => {
  const res = await api.get("/monitoring/summary", { params: { model_name: modelName } });
  return res.data;
};

export const triggerDriftCheck = async (data: {
  model_name: string;
  drift_threshold?: number;
  reference_dataset_id: string;
  current_dataset_id: string;
}): Promise<any> => {
  const res = await api.post("/monitoring/drift/check", data);
  return res.data;
};

export const fetchDriftReportHtml = async (reportId: string): Promise<string> => {
  const res = await api.get(`/monitoring/reports/${reportId}/html`);
  return res.data;
};

// ── Alerts, Rules & Webhook Channels ──────────────────────────────

export const fetchAlerts = async (params?: {
  status?: string;
  severity?: string;
  model_name?: string;
  limit?: number;
}): Promise<Alert[]> => {
  const res = await api.get("/alerts/", { params });
  return res.data.alerts || [];
};

export const fetchAlertsSummary = async (): Promise<AlertSummary> => {
  const res = await api.get("/alerts/summary");
  return res.data;
};

export const acknowledgeAlert = async (id: string, acknowledgedBy?: string): Promise<Alert> => {
  const res = await api.post(`/alerts/${id}/acknowledge`, null, {
    params: { acknowledged_by: acknowledgedBy || "UI User" },
  });
  return res.data;
};

export const resolveAlert = async (id: string): Promise<Alert> => {
  const res = await api.post(`/alerts/${id}/resolve`);
  return res.data;
};

export const fetchAlertRules = async (): Promise<AlertRule[]> => {
  const res = await api.get("/alerts/rules");
  return res.data || [];
};

export const createAlertRule = async (data: {
  name: string;
  metric: "drift_share" | "latency_p95_ms" | "failed_deployments";
  operator: ">" | ">=" | "<" | "<=";
  threshold: number;
  model_name?: string | null;
  severity?: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
  enabled?: boolean;
}): Promise<AlertRule> => {
  const res = await api.post("/alerts/rules", data);
  return res.data;
};

export const toggleAlertRule = async (id: string, enabled: boolean): Promise<AlertRule> => {
  const res = await api.patch(`/alerts/rules/${id}`, { enabled });
  return res.data;
};

export const deleteAlertRule = async (id: string): Promise<void> => {
  await api.delete(`/alerts/rules/${id}`);
};

export const evaluateAlertRules = async (): Promise<{ evaluated: number; triggered: Alert[] }> => {
  const res = await api.post("/alerts/rules/evaluate");
  return res.data;
};

export const fetchNotificationChannels = async (): Promise<NotificationChannel[]> => {
  const res = await api.get("/alerts/channels");
  return res.data || [];
};

export const createNotificationChannel = async (data: {
  name: string;
  kind: "SLACK" | "DISCORD" | "WEBHOOK";
  url: string;
}): Promise<NotificationChannel> => {
  const res = await api.post("/alerts/channels", data);
  return res.data;
};

export const deleteNotificationChannel = async (id: string): Promise<void> => {
  await api.delete(`/alerts/channels/${id}`);
};

export const testNotificationChannel = async (
  id: string
): Promise<{ channel_id: string; name: string; delivered: boolean; error?: string | null }> => {
  const res = await api.post(`/alerts/channels/${id}/test`);
  return res.data;
};



export const sendContactMessage = async (submission: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): Promise<void> => {
  await api.post("/contact", submission, { timeout: 30000 });
};

export async function syncModelMetrics(name: string, version: number): Promise<Record<string, number>> {
  const { data } = await api.post<{ metrics: Record<string, number> }>(
    `/models/${encodeURIComponent(name)}/versions/${version}/sync-metrics`,
  );
  return data.metrics;
}
