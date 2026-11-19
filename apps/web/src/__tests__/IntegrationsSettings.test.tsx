import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {IntegrationsSettings} from "../components/IntegrationsSettings";
import {fetchSystemServices} from "../api/client";
vi.mock("../api/client",()=>({fetchSystemServices:vi.fn()}));
function mount(){return render(<MemoryRouter><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><IntegrationsSettings/></QueryClientProvider></MemoryRouter>);}
beforeEach(()=>{
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  HTMLDialogElement.prototype.close=function(){this.open=false;};
  vi.mocked(fetchSystemServices).mockResolvedValue([
    {name:"MLflow Tracking Server",status:"online",latency:"10ms",uptime:"Operational"},
    {name:"MinIO S3 Artifact Store",status:"online",latency:"8ms",uptime:"Operational"},
    {name:"Model Serving (Docker Engine)",status:"online",latency:"2ms",uptime:"Operational"},
    {name:"Database (PostgreSQL/SQLite)",status:"online",latency:"1ms",uptime:"Operational"},
  ]);
});
afterEach(cleanup);
describe("Settings integrations",()=>{
  it("uses real probe results and keeps unverified tools available with their logos",async()=>{
    mount();await screen.findByRole("heading",{name:"Active Integrations (3)"});
    expect(screen.getAllByText("Connected")).toHaveLength(3);
    expect(screen.getByRole("button",{name:"Connect PostgreSQL"})).toBeTruthy();
    expect(screen.getByRole("button",{name:"Connect DVC"})).toBeTruthy();
    for(const tool of ["MLflow","DVC","GitHub","PostgreSQL","MinIO (S3)","Evidently","Docker","Kubernetes","Slack"]){expect(screen.getByRole("img",{name:`${tool} logo`})).toBeTruthy();}
  });
  it("opens setup details without claiming a GitHub connection",async()=>{
    mount();await screen.findByRole("heading",{name:"Active Integrations (3)"});
    fireEvent.click(screen.getByRole("button",{name:"Connect GitHub"}));
    const dialog=await screen.findByRole("dialog");
    expect(within(dialog).getByText("Not verified")).toBeTruthy();
    expect(within(dialog).getByRole("link",{name:/Setup documentation/}).getAttribute("href")).toBe("https://docs.github.com/en/actions");
    fireEvent.click(within(dialog).getByRole("button",{name:"Close integration details"}));
    await waitFor(()=>expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getAllByText("Connected")).toHaveLength(3);
  });
  it("does not invent active connections when verification fails",async()=>{
    vi.mocked(fetchSystemServices).mockRejectedValue(new Error("Unavailable"));
    mount();await screen.findByRole("alert");
    expect(screen.queryByText("Connected")).toBeNull();
    expect(screen.getByRole("heading",{name:"Active Integrations (0)"})).toBeTruthy();
    expect(screen.getByRole("button",{name:"Retry"})).toBeTruthy();
  });
});
