import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {GeneralSettings} from "../components/GeneralSettings";
vi.mock("../context/AuthContext",()=>({useAuth:()=>({user:{id:"account-1"}})}));
beforeEach(()=>{localStorage.clear();});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe("General settings",()=>{
  it("saves browser preferences and restores them when reopened",()=>{
    const view=render(<GeneralSettings/>);
    fireEvent.change(screen.getByLabelText(/Workspace Name/),{target:{value:"My Workspace"}});
    fireEvent.change(screen.getByLabelText("Default data format"),{target:{value:"csv"}});
    fireEvent.click(screen.getByRole("button",{name:"Save Changes"}));
    expect(screen.getByRole("status").textContent).toContain("this browser");
    view.unmount();render(<GeneralSettings/>);
    expect((screen.getByLabelText(/Workspace Name/) as HTMLInputElement).value).toBe("My Workspace");
    expect((screen.getByLabelText("Default data format") as HTMLSelectElement).value).toBe("csv");
  });
  it("discards unsaved changes and leaves server controls disabled",()=>{
    render(<GeneralSettings/>);
    fireEvent.change(screen.getByLabelText(/Workspace Name/),{target:{value:"Draft"}});
    fireEvent.click(screen.getByRole("button",{name:"Discard"}));
    expect((screen.getByLabelText(/Workspace Name/) as HTMLInputElement).value).toBe("MLite Workspace");
    for(const control of screen.getAllByRole("switch")) expect((control as HTMLButtonElement).disabled).toBe(true);
    expect(localStorage.getItem("mlite_general_account-1")).toBeNull();
  });
  it("reports a storage failure without showing a successful save",()=>{
    render(<GeneralSettings/>);
    vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("Storage full");});
    fireEvent.change(screen.getByLabelText(/Workspace Name/),{target:{value:"Unsaved"}});
    fireEvent.click(screen.getByRole("button",{name:"Save Changes"}));
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
