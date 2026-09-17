import axios from "axios";
import { Project, RegisteredModel, Deployment, Dataset, SystemStats } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export const fetchProjects = async (): Promise<Project[]> => {
  const res = await api.get("/projects/");
  return res.data.projects || [];
};

export const createProject = async (data: { name: string; slug: string; description?: string }): Promise<Project> => {
  const res = await api.post("/projects/", data);
  return res.data;
};

export const fetchModels = async (): Promise<RegisteredModel[]> => {
  const res = await api.get("/models/");
  return res.data.models || [];
};

export const promoteModelVersion = async (name: string, version: number, stage: string): Promise<any> => {
  const res = await api.post(`/models/${name}/versions/${version}/promote`, { stage });
  return res.data;
};

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

export const fetchDatasets = async (): Promise<Dataset[]> => {
  const res = await api.get("/datasets/");
  return res.data.datasets || [];
};

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
