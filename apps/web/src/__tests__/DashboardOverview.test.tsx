import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { DashboardOverview } from "../pages/DashboardOverview";

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
}));

describe("DashboardOverview Component", () => {
  it("renders welcome header and key metrics", async () => {
    render(
      <BrowserRouter>
        <DashboardOverview />
      </BrowserRouter>
    );

    expect(screen.getByText("Welcome to MLite Dashboard")).toBeDefined();
    expect(screen.getByText("Active Projects")).toBeDefined();
    expect(screen.getByText("Registered Models")).toBeDefined();
    expect(screen.getByText("Live Deployments")).toBeDefined();
    expect(screen.getByText("Active Alerts")).toBeDefined();
  });
});
