import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export type InstallationStatus = {
  setup_required: boolean;
  registration_enabled: boolean;
  migration_required: boolean;
};

export function useInstallation() {
  return useQuery({
    queryKey: ["installation-status"],
    queryFn: async ({ signal }) => (await api.get<InstallationStatus>("/setup/status", { signal })).data,
    staleTime: 30_000,
    retry: 1,
  });
}
