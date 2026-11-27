import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fetchUsers } from "../api/client";
import { useActionFeedback } from "./ActionFeedback";

type LegacyResource = { id: string; name: string | null };

export function WorkspaceRecovery() {
  const [username, setUsername] = useState("");
  const queryClient = useQueryClient();
  const { confirmAction } = useActionFeedback();
  const users = useQuery({ queryKey: ["administration-accounts"], queryFn: fetchUsers });
  const resources = useQuery({
    queryKey: ["administration-unassigned"],
    queryFn: async () => (await api.get<Record<string, LegacyResource[]>>("/admin/workspaces/unassigned")).data,
  });
  const assignment = useMutation({
    mutationFn: (resource: { kind: string; resource_id: string }) =>
      api.post("/admin/workspaces/assign", { ...resource, username }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["administration-unassigned"] }),
  });
  async function assign(kind: string, resource: LegacyResource) {
    if (await confirmAction("Assign legacy resource?",
      `${resource.name || resource.id} will become private to ${username}. Existing owners are never replaced.`, "Assign resource")) {
      assignment.mutate({ kind, resource_id: resource.id });
    }
  }
  const entries = Object.entries(resources.data ?? {}).flatMap(([kind, items]) => items.map(item => ({ ...item, kind })));
  return <section className="overview-card p-5 space-y-4">
    <h2 className="text-xl font-semibold">Legacy resource recovery</h2>
    <p>These existing resources have no established owner. Their data is preserved and hidden from personal workspaces until an administrator assigns them explicitly.</p>
    <label className="flex gap-3 items-center">Target account
      <select aria-label="Target account" value={username} onChange={event => setUsername(event.target.value)} className="border rounded-lg p-2">
        <option value="">Choose an active account</option>
        {users.data?.filter(user => user.is_active).map(user => <option key={user.id} value={user.username}>{user.username}</option>)}
      </select>
    </label>
    {resources.isError && <p role="alert">Could not load legacy resources. Refresh to retry.</p>}
    {assignment.isError && <p role="alert">{(assignment.error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Could not assign this resource."}</p>}
    {assignment.isSuccess && <p role="status">Resource assigned. Its owner can now find it in their workspace.</p>}
    <div className="overflow-auto"><table className="overview-table">
      <thead><tr><th>Type</th><th>Resource</th><th>Action</th></tr></thead>
      <tbody>{entries.map(resource => <tr key={`${resource.kind}-${resource.id}`}>
        <td>{resource.kind}</td><td>{resource.name || resource.id}</td>
        <td><button type="button" disabled={!username || assignment.isPending} onClick={() => void assign(resource.kind, resource)} className="border rounded-lg px-3 py-2 disabled:opacity-40">Assign</button></td>
      </tr>)}{!entries.length && <tr><td colSpan={3}>{resources.isPending ? "Loading legacy resources…" : "No unassigned resources."}</td></tr>}</tbody>
    </table></div>
  </section>;
}
