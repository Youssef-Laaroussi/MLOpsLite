import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render as renderUI, screen, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { DashboardOverview } from "../pages/DashboardOverview";
import { fetchExperiments, fetchDeployments, fetchModels, fetchSystemStats, pingDeployment } from "../api/client";
import { AuthProvider } from "../context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function render(ui: React.ReactElement) {
  return renderUI(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><AuthProvider>{ui}</AuthProvider></QueryClientProvider>);
}

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = global.ResizeObserver || MockResizeObserver;

// Mock API client
vi.mock("../api/client", () => ({
  fetchExperiments: vi.fn().mockResolvedValue([]),
  fetchSystemStats: vi.fn().mockResolvedValue({
    projects_count: 3,
    models_count: 5,
    active_deployments: 2,
    alerts_count: 0,
    system_healthy: true,
    stages: {
      production: 2,
      candidate: 1,
      staging: 1,
      development: 1,
      archived: 0,
    },
    drift_trajectory: [
      { id: "d1", date: "Nov 15, 12:00 UTC", model_name: "iris", drift_share: 0, drift_status: "NONE" },
      { id: "d2", date: "Nov 15, 13:00 UTC", model_name: "iris", drift_share: 0.2, drift_status: "DRIFT" },
      { id: "d3", date: "Nov 15, 14:00 UTC", model_name: "fraud", drift_share: 0.4, drift_status: "DRIFT" },
    ],
    benchmarks: [
      { model: "iris v1", full_name: "iris v1", stage: "STAGING", auc: null, f1: 0, accuracy: 1, has_metrics: true },
    ],
  }),
  fetchSystemServices: vi.fn().mockResolvedValue([
    { name: "Database (PostgreSQL/SQLite)", status: "online", latency: "1.2ms", uptime: "Operational" },
  ]),
  fetchModels: vi.fn().mockResolvedValue([
    { name: "fraud-detector", version: 1, stage: "PRODUCTION" },
    { name: "churn-risk", version: 2, stage: "CANDIDATE" },
  ]),
  fetchDeployments: vi.fn().mockResolvedValue([
    {
      id: "dep-1234",
      model_name: "fraud-detector",
      model_version: 1,
      port: 8100,
      endpoint_url: "http://localhost:8100",
      status: "RUNNING",
    },
  ]),
  pingDeployment: vi.fn().mockResolvedValue({
    prediction: { healthy: true, status: "HEALTHY" },
    latency_ms: 12,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DashboardOverview Component", () => {
  it("renders welcome header and key metrics", async () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <DashboardOverview />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(await screen.findByText(/Candidate \(1\)/)).toBeDefined();
    expect(screen.getByText("Lifecycle & Registry Overview")).toBeDefined();
    expect(screen.getAllByText("Projects").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Models").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Deployments").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Datasets").length).toBeGreaterThan(0);
  });

  it("renders Candidate stage in breakdown legend", async () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <DashboardOverview />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(await screen.findByText(/Candidate \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Production \(2\)/i)).toBeDefined();
    expect(screen.queryByText("Lifecycle Activity")).toBeNull();
    expect(screen.queryByText("Resources Overview")).toBeNull();
  });
  it("filters drift by model and keeps measured zero scores visible", async () => {
    render(<BrowserRouter><DashboardOverview /></BrowserRouter>);

    expect(await screen.findByText("40.0%")).toBeDefined();
    fireEvent.change(screen.getByRole("combobox", { name: "Model" }), { target: { value: "iris" } });
    expect(screen.getByText("20.0%")).toBeDefined();
    expect(screen.getByText("0.0%")).toBeDefined();
    expect(screen.queryByText("40.0%")).toBeNull();
    expect(screen.getByText("0.000")).toBeDefined();
  });
});


describe("Overview data integrity", () => {
  it("excludes stopped endpoints and does not claim running means healthy", async () => {
    vi.mocked(fetchDeployments).mockResolvedValueOnce([
      { id: "failed", model_name: "failed-endpoint", model_version: 1, port: 8101, endpoint_url: "", status: "FAILED", created_at: "" },
      { id: "running", model_name: "running-endpoint", model_version: 1, port: 8100, endpoint_url: "", status: "RUNNING", created_at: "" },
    ]);
    render(<BrowserRouter><DashboardOverview /></BrowserRouter>);
    expect(await screen.findByText("running-endpoint")).toBeDefined();
    expect(screen.queryByText("failed-endpoint")).toBeNull();
    expect(screen.getByText("Readiness unverified")).toBeDefined();
    fireEvent.click(screen.getByText("Inventory & endpoint readiness"));
    fireEvent.click(screen.getByRole("button", { name: "Check readiness" }));
    expect(await screen.findByText(/Check round-trip 12ms/)).toBeDefined();
    expect(screen.getByText(/Not inference latency/)).toBeDefined();
    expect(pingDeployment).toHaveBeenCalledWith("running");
  });

  it("shows unavailable sources instead of empty inventories", async () => {
    vi.mocked(fetchModels).mockRejectedValueOnce(new Error("offline"));
    vi.mocked(fetchDeployments).mockRejectedValueOnce(new Error("offline"));
    render(<BrowserRouter><DashboardOverview /></BrowserRouter>);
    expect(await screen.findByText("Deployments unavailable. Retry the refresh.")).toBeDefined();
    expect(screen.getByText("Model catalog unavailable. Retry the refresh.")).toBeDefined();
    expect(screen.queryByText("No running containers found.")).toBeNull();
  });

  it("preserves a measured zero in catalog cards without inventing a linked run", async () => {
    vi.mocked(fetchModels).mockResolvedValueOnce([
      { name: "zero-score", version: 1, stage: "STAGING", created_at: "", metrics: { f1_score: 0 } },
    ]);
    render(<BrowserRouter><DashboardOverview /></BrowserRouter>);
    expect(await screen.findByText("F1: 0.0%")).toBeDefined();
    expect(screen.getByText("No linked run")).toBeDefined();
  });

  it("labels inventory independently of the selected observation period", async () => {
    render(<BrowserRouter><DashboardOverview /></BrowserRouter>);
    await screen.findByText(/Candidate \(1\)/);
    fireEvent.click(screen.getByRole("button", { name: "All time" }));
    fireEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
    await waitFor(() => expect(fetchSystemStats).toHaveBeenLastCalledWith("Last 7 days"));
    expect(screen.getByText(/Inventory: current totals · Scores and drift: last 7 days/)).toBeDefined();
  });
});


it("marks the last successful refresh stale after a failed refresh", async () => {
  render(<BrowserRouter><DashboardOverview /></BrowserRouter>);
  await screen.findByText(/Candidate \(1\)/);
  vi.mocked(fetchSystemStats).mockRejectedValueOnce(new Error("offline"));
  fireEvent.click(screen.getByRole("button", { name: "Refresh metrics" }));
  expect(await screen.findByText(/Inventory:.*Stale · Updated/)).toBeDefined();
  expect(screen.getByText("Model versions unavailable")).toBeDefined();
});

it("computes experiment growth from dated active experiments", async () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
  vi.mocked(fetchExperiments).mockResolvedValue([
    ...[1, 2, 3, 8, 9].map(days => ({ experiment_id: String(days), name: `Experiment ${days}`, lifecycle_stage: "active", created_at: daysAgo(days) })),
    { experiment_id: "archived", name: "Archived", lifecycle_stage: "deleted", created_at: daysAgo(1) },
  ]);
  render(<BrowserRouter><DashboardOverview /></BrowserRouter>);
  expect(await screen.findByText("+50%")).toBeDefined();
  vi.mocked(fetchExperiments).mockResolvedValue([]);
});
