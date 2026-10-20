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
  }),
  fetchModels: vi.fn().mockResolvedValue([
    { name: "fraud-detector", version: 1, stage: "PRODUCTION" },
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
    prediction: { healthy: true },
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
});
