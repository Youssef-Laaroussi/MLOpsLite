import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectResources } from "../components/ProjectResources";
import { api, fetchExperimentRuns } from "../api/client";
vi.mock("../api/client", () => ({
  fetchDatasets: vi.fn().mockResolvedValue([{id:"d1", project_id:"p1", name:"Project dataset", format:"csv"}, {id:"d2", project_id:"p2", name:"Other dataset"}]),
  fetchModels: vi.fn().mockResolvedValue([{name:"fraud", version:2, stage:"STAGING"}]),
  fetchDeployments: vi.fn().mockResolvedValue([]),
  fetchExperiments: vi.fn().mockResolvedValue([{experiment_id:"e1", tags:{"mlite.project":"fraud"}}, {experiment_id:"e2", tags:{"mlite.project":"other"}}]),
  fetchExperimentRuns: vi.fn().mockResolvedValue([]),
  api: {get: vi.fn().mockResolvedValue({data:{run_id:"run-42", git_commit:"abc123", dataset_sha256:"sha256-value", matching_datasets:[{name:"Training data", version:3}], metrics:{auc:0.98}}})}
}));
afterEach(cleanup);
describe("Project resource navigation", () => {
  it("isolates project resources and opens provenance for the selected model version", async () => {
    render(<MemoryRouter><ProjectResources project={{id:"p1", slug:"fraud", name:"Fraud", status:"active", created_at:"2026-11-01", updated_at:"2026-11-01"}}/></MemoryRouter>);
    expect(await screen.findByText("Project dataset")).toBeTruthy();
    expect(screen.queryByText("Other dataset")).toBeNull();
    expect(fetchExperimentRuns).toHaveBeenCalledWith("e1");
    expect(fetchExperimentRuns).not.toHaveBeenCalledWith("e2");
    fireEvent.click(screen.getByRole("tab", {name:/Models/}));
    fireEvent.click(screen.getByRole("button", {name:/View lineage/}));
    expect(await screen.findByText("run-42")).toBeTruthy();
    expect(screen.getByText("abc123")).toBeTruthy();
    expect(screen.getByText("Training data v3")).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith("/models/fraud/versions/2/lineage");
    fireEvent.click(screen.getByRole("button", {name:"Close"}));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
