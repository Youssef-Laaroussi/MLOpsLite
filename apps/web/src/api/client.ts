import axios from "axios";
import {
  Project,
  RegisteredModel,
  Deployment,
  Dataset,
  SystemStats,
  User,
  AuthTokens,
  ApiKey,
  AuditLog,
  Experiment,
  ExperimentRun,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Interceptor: inject Bearer JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mlite_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: on 401, clear the stale session and redirect to sign-in
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url || "";
    if (error.response?.status === 401 && !url.startsWith("/auth/")) {
      ["mlite_token", "mlite_refresh_token", "mlite_user"].forEach((k) => localStorage.removeItem(k));
      if (window.location.pathname.startsWith("/app")) window.location.assign("/signin");
    }
    return Promise.reject(error);
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
  const res = await api.get("/projects/");
  return res.data.projects || [];
};

export const createProject = async (data: { name: string; slug: string; description?: string }): Promise<Project> => {
  const res = await api.post("/projects/", data);
  return res.data;
};

// ── Models & Registry ──────────────────────────────────────────────

export const fetchModels = async (): Promise<RegisteredModel[]> => {
  const res = await api.get("/models/");
  return res.data.models || [];
};

export const promoteModelVersion = async (name: string, version: number, stage: string): Promise<any> => {
  const res = await api.post(`/models/${name}/versions/${version}/promote`, { stage });
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
  });
  return res.data;
};

export const stopDeployment = async (id: string): Promise<Deployment> => {
  const res = await api.post(`/deployments/${id}/stop`);
  return res.data;
};

// ── Rollback ───────────────────────────────────────────────────────

export const rollbackDeployment = async (modelName: string, targetVersion: number): Promise<any> => {
  const res = await api.post("/rollback/trigger", {
    model_name: modelName,
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

// ── System Stats ───────────────────────────────────────────────────

export const fetchSystemStats = async (): Promise<SystemStats> => {
  try {
    const [projectsRes, modelsRes, deploymentsRes] = await Promise.all([
      api.get("/projects/"),
      api.get("/models/"),
      api.get("/deployments/"),
    ]);

    const activeDeps = (deploymentsRes.data.deployments || []).filter(
      (d: any) => d.status === "RUNNING"
    ).length;

    return {
      projects_count: projectsRes.data.total || 0,
      models_count: modelsRes.data.total || 0,
      active_deployments: activeDeps,
      alerts_count: 0,
      system_healthy: true,
    };
  } catch (err) {
    return {
      projects_count: 0,
      models_count: 0,
      active_deployments: 0,
      alerts_count: 0,
      system_healthy: false,
    };
  }
};

// ── Experiments & Runs (MLflow Proxy) ──────────────────────────────

export const fetchExperiments = async (project?: string): Promise<Experiment[]> => {
  try {
    const res = await api.get("/experiments/", { params: { project } });
    return res.data.experiments || [];
  } catch {
    return [];
  }
};

export const fetchExperimentRuns = async (experimentId: string): Promise<ExperimentRun[]> => {
  try {
    const res = await api.get(`/experiments/${experimentId}/runs`);
    return res.data.runs || [];
  } catch {
    return [];
  }
};

export const createExperiment = async (data: { name: string; tags?: Record<string, string> }): Promise<any> => {
  const res = await api.post("/experiments/", data);
  return res.data;
};

