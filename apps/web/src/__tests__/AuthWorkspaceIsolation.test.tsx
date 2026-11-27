import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { apiGetMe, apiLogin } from "../api/client";

vi.mock("../api/client", () => ({ apiGetMe: vi.fn(), apiLogin: vi.fn(), apiRegister: vi.fn(), apiSetup: vi.fn() }));
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });

function AccountControls() {
  const { user, isLoading, login, logout } = useAuth();
  return <><span>{isLoading ? "Loading" : user?.username || "Signed out"}</span>
    <button onClick={() => void login("account-b", "test-only")}>Sign in B</button>
    <button onClick={logout}>Sign out</button></>;
}

it("removes private cached data on account change and sign out", async () => {
  localStorage.clear();
  vi.mocked(apiLogin).mockResolvedValue({access_token:"test-b",refresh_token:"refresh-b",token_type:"bearer",expires_in:3600});
  vi.mocked(apiGetMe).mockResolvedValue({id:"b",username:"account-b",email:"b@example.test",role:"USER",is_active:true,created_at:"2026-01-01"});
  const client = new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  client.setQueryData(["datasets"], [{name:"private-data-account-a"}]);
  render(<QueryClientProvider client={client}><AuthProvider><AccountControls/></AuthProvider></QueryClientProvider>);
  await screen.findByText("Signed out");
  fireEvent.click(screen.getByRole("button",{name:"Sign in B"}));
  await screen.findByText("account-b");
  expect(client.getQueryData(["datasets"])).toBeUndefined();
  client.setQueryData(["models"], [{name:"private-model-b"}]);
  fireEvent.click(screen.getByRole("button",{name:"Sign out"}));
  expect(client.getQueryData(["models"])).toBeUndefined();
  expect(localStorage.getItem("mlite_token")).toBeNull();
});
