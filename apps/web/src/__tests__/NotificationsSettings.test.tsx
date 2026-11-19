import React from "react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {NotificationsSettings} from "../components/NotificationsSettings";
import {useAuth} from "../context/AuthContext";
vi.mock("../context/AuthContext",()=>({useAuth:vi.fn()}));
beforeEach(()=>{localStorage.clear();vi.mocked(useAuth).mockReturnValue({user:{id:"user-1"}} as unknown as ReturnType<typeof useAuth>);});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe("Notification preferences",()=>{
  it("matches the channels, event selections, frequency and example from the reference",()=>{
    render(<NotificationsSettings/>);
    expect(screen.getByRole("switch",{name:"Email notifications"}).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch",{name:"Slack notifications"}).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("switch",{name:"Webhook notifications"}).getAttribute("aria-checked")).toBe("false");
    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
    expect(screen.getAllByRole("checkbox").filter(input=>(input as HTMLInputElement).checked)).toHaveLength(4);
    expect((screen.getByRole("radio",{name:/^Real-time/}) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("MLite · Deployment Successful")).toBeTruthy();
    expect(screen.getByRole("img",{name:"Slack logo"})).toBeTruthy();
  });
  it("persists choices per account and updates the example for the selected frequency",()=>{
    const view=render(<NotificationsSettings/>);
    fireEvent.click(screen.getByRole("switch",{name:"Slack notifications"}));
    fireEvent.click(screen.getByRole("checkbox",{name:/^Model Registry/}));
    fireEvent.click(screen.getByRole("radio",{name:/^Daily summary/}));
    expect(screen.getByText("MLite · Daily Summary")).toBeTruthy();
    view.unmount();render(<NotificationsSettings/>);
    expect(screen.getByRole("switch",{name:"Slack notifications"}).getAttribute("aria-checked")).toBe("true");
    expect((screen.getByRole("checkbox",{name:/^Model Registry/}) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio",{name:/^Daily summary/}) as HTMLInputElement).checked).toBe(true);
    expect(JSON.parse(localStorage.getItem("mlite_notifications_user-1")!).frequency).toBe("daily");
  });
  it("retains previous choices and reports an error if persistence fails",()=>{
    render(<NotificationsSettings/>);
    vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("Storage unavailable");});
    fireEvent.click(screen.getByRole("switch",{name:"Email notifications"}));
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("switch",{name:"Email notifications"}).getAttribute("aria-checked")).toBe("true");
  });
  it("does not show a delivery example when all notification channels are off",()=>{
    render(<NotificationsSettings/>);
    fireEvent.click(screen.getByRole("switch",{name:"Email notifications"}));
    expect(screen.queryByText("MLite · Deployment Successful")).toBeNull();
    expect(screen.getByText("Select a notification channel and an event category to preview a notification.")).toBeTruthy();
  });
});
