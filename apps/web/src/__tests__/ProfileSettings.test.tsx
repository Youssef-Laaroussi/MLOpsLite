import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {ProfileSettings} from "../components/ProfileSettings";
import {api} from "../api/client";
import {useAuth} from "../context/AuthContext";
vi.mock("../api/client",()=>({api:{patch:vi.fn()}}));
vi.mock("../context/AuthContext",()=>({useAuth:vi.fn()}));
const updateProfile = vi.fn();
const user = {id:"account-1",username:"engineer",full_name:"Test Engineer",email:"test@example.com",role:"USER",is_active:true,created_at:"2026-01-15T12:00:00Z"};
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();vi.mocked(useAuth).mockReturnValue({user,updateProfile} as unknown as ReturnType<typeof useAuth>);});
afterEach(cleanup);
describe("Profile settings",()=>{
  it("saves the current user's name and browser details only after a successful request",async()=>{
    vi.mocked(api.patch).mockResolvedValue({data:{...user,full_name:"Updated Engineer"}});
    render(<ProfileSettings/>);
    fireEvent.change(screen.getByLabelText(/Full Name/),{target:{value:"Updated Engineer"}});
    fireEvent.change(screen.getByLabelText("Job Title"),{target:{value:"ML Engineer"}});
    fireEvent.click(screen.getByRole("button",{name:"Save Changes"}));
    await screen.findByRole("status");
    expect(api.patch).toHaveBeenCalledWith("/auth/me",{full_name:"Updated Engineer"});
    expect(JSON.parse(localStorage.getItem("mlite_profile_account-1")!).jobTitle).toBe("ML Engineer");
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({full_name:"Updated Engineer"}));
  });
  it("keeps failed requests visible without persisting unsaved details",async()=>{
    vi.mocked(api.patch).mockRejectedValue(new Error("Offline"));
    render(<ProfileSettings/>);
    fireEvent.change(screen.getByLabelText("Job Title"),{target:{value:"Unsaved"}});
    fireEvent.click(screen.getByRole("button",{name:"Save Changes"}));
    await screen.findByRole("alert");
    expect(localStorage.getItem("mlite_profile_account-1")).toBeNull();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("discards edits and does not load another account's browser details",()=>{
    localStorage.setItem("mlite_profile_other",JSON.stringify({jobTitle:"Other account"}));
    render(<ProfileSettings/>);
    expect((screen.getByLabelText("Job Title") as HTMLInputElement).value).toBe("");
    fireEvent.change(screen.getByLabelText("Job Title"),{target:{value:"Draft"}});
    fireEvent.click(screen.getByRole("button",{name:"Discard"}));
    expect((screen.getByLabelText("Job Title") as HTMLInputElement).value).toBe("");
    expect(api.patch).not.toHaveBeenCalled();
  });
});
