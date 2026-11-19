import React from "react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {StorageSettings} from "../components/StorageSettings";
import {api} from "../api/client";
import {useAuth} from "../context/AuthContext";
vi.mock("../api/client",()=>({api:{get:vi.fn(),post:vi.fn()}}));
vi.mock("../context/AuthContext",()=>({useAuth:vi.fn()}));
const snapshot={storage_type:"MinIO / S3 Compatible",endpoint:"http://minio:9000",default_bucket:"mlite-datasets",connected:true,buckets:[{name:"mlite-datasets",kind:"datasets",objects:3,size_bytes:1024,complete:true,available:true}],categories:{datasets:1024,models:0,artifacts:0,other:0},used_bytes:1024,capacity_bytes:null,complete:true};
function mount(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><StorageSettings/></QueryClientProvider>);}
beforeEach(()=>{vi.clearAllMocks();vi.mocked(useAuth).mockReturnValue({user:{id:"admin",role:"ADMIN"}} as unknown as ReturnType<typeof useAuth>);vi.mocked(api.get).mockResolvedValue({data:snapshot});HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});
afterEach(cleanup);
describe("Storage settings",()=>{
  it("renders measured inventory without inventing a capacity and leaves cleanup disabled",async()=>{
    mount();await screen.findByText("Connected");
    expect((screen.getByLabelText("Endpoint") as HTMLInputElement).value).toBe("http://minio:9000");
    expect(screen.getByText("Capacity not reported by S3")).toBeTruthy();
    expect(screen.getByRole("button",{name:"Details for mlite-datasets"})).toBeTruthy();
    expect((screen.getByRole("button",{name:"Run Cleanup Now"}) as HTMLButtonElement).disabled).toBe(true);
  });
  it("creates a bucket only after submitting an explicit name",async()=>{
    vi.mocked(api.post).mockResolvedValue({data:{name:"new-bucket"}});
    mount();await screen.findByText("Connected");
    fireEvent.click(screen.getByRole("button",{name:"Create Bucket"}));
    const dialog=await screen.findByRole("dialog");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText("Bucket name"),{target:{value:"new-bucket"}});
    fireEvent.click(within(dialog).getByRole("button",{name:"Create Bucket"}));
    await screen.findByText("Bucket created.");
    expect(api.post).toHaveBeenCalledWith("/settings/storage/buckets",{name:"new-bucket"});
  });
  it("does not request global storage inventory for a non-administrator",async()=>{
    vi.mocked(useAuth).mockReturnValue({user:{id:"user",role:"USER"}} as unknown as ReturnType<typeof useAuth>);
    mount();expect(screen.getByText("Administrator access required.")).toBeTruthy();
    expect(api.get).not.toHaveBeenCalled();
    expect((screen.getByRole("button",{name:"Create Bucket"}) as HTMLButtonElement).disabled).toBe(true);
  });
  it("marks a previously connected endpoint unverified after a failed connection test",async()=>{
    vi.mocked(api.post).mockRejectedValue(new Error("Offline"));
    mount();await screen.findByText("Connected");
    fireEvent.click(screen.getByRole("button",{name:"Test Connection"}));
    await screen.findByRole("alert");
    expect(screen.getByText("Unverified")).toBeTruthy();
    expect(screen.queryByText("Connected")).toBeNull();
  });

});
