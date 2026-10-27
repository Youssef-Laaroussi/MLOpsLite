import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { DashboardOverview } from "../pages/DashboardOverview";
import { AuthProvider } from "../context/AuthContext";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = global.ResizeObserver || MockResizeObserver;

// Mock API client
vi.mock("../api/client", () => ({
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
    latency_telemetry: [
      { time: "14:00", p50: 2.1, p95: 5.4, p99: null, reqs: 120 },
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

describe("DashboardOverview Component", () => {
  it("renders welcome header and key metrics", async () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <DashboardOverview />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText("Quick actions")).toBeDefined();
    expect(screen.getAllByText("Projects").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Models").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Deployments").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Experiments").length).toBeGreaterThan(0);
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
  });
});
