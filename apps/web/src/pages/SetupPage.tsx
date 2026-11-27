import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function SetupPage() {
  const { setup } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (password !== confirmation) { setError("The passwords do not match."); return; }
    if (new TextEncoder().encode(password).length > 72) { setError("Password must be at most 72 UTF-8 bytes."); return; }
    setPending(true);
    setError("");
    try {
      await setup({ setup_code: code.trim(), username: username.trim(), email: email.trim(), full_name: fullName.trim() || undefined, password });
      await queryClient.invalidateQueries({ queryKey: ["installation-status"] });
    } catch (failure: unknown) {
      const detail = (failure as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Could not configure MLite. Check your code and account details, then try again.");
      // Another installer may have completed setup; the gate will close this page.
      void queryClient.invalidateQueries({ queryKey: ["installation-status"] });
    } finally {
      setPending(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

  return <main className="min-h-screen bg-[#fcfdfc] px-4 py-10 text-slate-900">
    <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-5 flex items-center gap-3"><img src="/logo.png" width={38} height={38} alt="MLite" /><strong className="text-xl">MLite</strong></div>
      <h1 className="text-2xl font-bold">Set up your MLite installation</h1>
      <p className="mt-2 text-sm text-slate-600">Create your personal account. It will administer this installation and own the projects you create.</p>
      <p className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><ShieldCheck size={20} className="shrink-0" />One account to work on your models and manage this installation from Settings. No second account is needed.</p>
      <form className="mt-5 grid gap-4 text-sm" onSubmit={submit}>
        <fieldset disabled={pending} className="grid gap-4 disabled:opacity-60">
          <label>Installation code<input className={inputClass} type="password" value={code} onChange={event => setCode(event.target.value)} required minLength={32} maxLength={256} autoComplete="off" /></label>
          <details className="text-xs text-slate-600"><summary className="cursor-pointer">Where is my installation code?</summary><p className="mt-2">Use the code printed in the API startup logs. With Docker:</p><code className="mt-2 block break-all rounded bg-slate-50 p-2">docker compose logs mlite-api</code><p className="mt-2">If you lost it, generate a replacement locally:</p><code className="mt-2 block break-all rounded bg-slate-50 p-2">docker compose exec mlite-api mlite instance setup-code</code></details>
          <label>Full name (optional)<input className={inputClass} value={fullName} onChange={event => setFullName(event.target.value)} maxLength={200} autoComplete="name" /></label>
          <label>Username<input className={inputClass} value={username} onChange={event => setUsername(event.target.value)} required minLength={3} maxLength={100} pattern="[a-zA-Z0-9_-]+" autoComplete="username" /></label>
          <label>Email<input className={inputClass} type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={255} autoComplete="email" /></label>
          <label>Password<input className={inputClass} type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={12} maxLength={72} autoComplete="new-password" /><span className="mt-1 block text-xs text-slate-500">At least 12 characters.</span></label>
          <label>Confirm password<input className={inputClass} type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required autoComplete="new-password" /></label>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p>}
        <button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{pending ? "Configuring…" : "Create my account and open MLite"}</button>
      </form>
      <p className="mt-4 text-xs text-slate-500">After setup: Settings → Storage or Activity &amp; Logs.</p>
    </section>
  </main>;
}
