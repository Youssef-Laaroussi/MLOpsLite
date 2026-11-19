import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {SecuritySettings} from "../components/SecuritySettings";
import {api} from "../api/client";
vi.mock("../api/client",()=>({api:{get:vi.fn(),post:vi.fn()}}));
vi.mock("../context/AuthContext",()=>({useAuth:()=>({user:{id:"account-1",email:"engineer@example.com"}})}));
function mount(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><SecuritySettings/></QueryClientProvider>);}
function fillPasswords(confirm="new-test-password"){
  fireEvent.change(screen.getByLabelText("Current password",{exact:true}),{target:{value:"old-test-password"}});
  fireEvent.change(screen.getByLabelText("New password",{exact:true}),{target:{value:"new-test-password"}});
  fireEvent.change(screen.getByLabelText("Confirm new password",{exact:true}),{target:{value:confirm}});
}
beforeEach(()=>{vi.clearAllMocks();vi.mocked(api.get).mockResolvedValue({data:{events:[]}});});
afterEach(cleanup);
describe("Security settings",()=>{
  it("rejects mismatched passwords before calling the API",async()=>{
    mount();fillPasswords("another-password");fireEvent.click(screen.getByRole("button",{name:"Update Password"}));
    expect(await screen.findByRole("alert")).toBeTruthy();expect(api.post).not.toHaveBeenCalled();
  });
  it("updates the password, clears password fields, and refreshes activity",async()=>{
    vi.mocked(api.post).mockResolvedValue({data:{message:"Password updated.",other_sessions_revoked:false}});
    mount();await screen.findByText("No security events recorded yet.");fillPasswords();
    fireEvent.click(screen.getByRole("button",{name:"Update Password"}));
    await screen.findByText("Password updated. Existing sessions remain valid until they expire.");
    expect(api.post).toHaveBeenCalledWith("/auth/password",{current_password:"old-test-password",new_password:"new-test-password",confirm_password:"new-test-password"});
    expect((screen.getByLabelText("Current password",{exact:true}) as HTMLInputElement).value).toBe("");
    await waitFor(()=>expect(api.get).toHaveBeenCalledTimes(2));
  });
  it("shows server errors and keeps unavailable security actions disabled",async()=>{
    vi.mocked(api.post).mockRejectedValue({response:{data:{detail:"Current password is incorrect."}}});
    mount();fillPasswords();fireEvent.click(screen.getByRole("button",{name:"Update Password"}));
    expect((await screen.findByRole("alert")).textContent).toBe("Current password is incorrect.");
    expect((screen.getByRole("switch",{name:"Two-factor authentication"}) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button",{name:"Sign Out of Other Sessions"}) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/2FA is enabled/)).toBeNull();
  });
});
