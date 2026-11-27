# Personal workspaces and instance administration

## Normal sign-in and sign-up

Start MLite with Docker Compose and open `http://localhost:3000`.
The existing **Sign in** (`/signin`) and **Sign up** (`/signup`) pages are used,
including on a fresh or emptied database. No installation code is required for
normal registration. The old frontend `/setup` address redirects to `/signup`.

Registration creates a **USER**, including for the first account. It never grants
administration automatically. That account can create its own projects and use
its private MLOps workspace. Signing up atomically closes the legacy bootstrap
state in the same transaction, without changing other accounts or passwords.

Public registration is enabled by default (`MLITE_ALLOW_REGISTRATION=true`).
An installation operator can explicitly set it to `false`; the API then rejects
registration. This setting is independent of whether an initial Admin exists.

## Explicit administration

An installation operator can designate an existing active account locally:

```bash
docker compose exec mlite-api mlite instance adopt-solo --username YOUR_USERNAME
```

Replace `YOUR_USERNAME` with the exact chosen account. When a separate Admin
account is wanted, register that account normally first and select it explicitly
with this command. There is no automatically created shared Admin password.

Sign out and back in with the selected account, then open **profile →
Administration**. Accounts, global storage, instance audit logs and Legacy Recovery
are separate from personal Settings and Activity & Logs. A normal USER does not
see administration or technical migration instructions in their dashboard.

The designation preserves passwords and existing data. Existing administrators
are retained. For a local Python installation, run the same `mlite instance`
command in the environment configured with that installation's database.

## Existing projects and resources

API startup applies additive schema migrations. Existing owners are preserved;
resources without an established owner stay stored and hidden from personal
workspaces. An administrator can explicitly assign them through Legacy Recovery.

The local command also supports `--claim-unowned-projects`, which assigns only
projects without an OWNER to the selected account. Review ownership before using
that option. Never use the count of remaining users to infer ownership or grant
administration automatically.

Project creation records an OWNER membership. Datasets, experiments, models,
deployments, monitoring and alerts are restricted to their authenticated owner,
including in an Admin's personal workspace. Team collaboration remains hidden.
Personal audit activity uses `/api/v1/audit/me/logs`; the instance-wide audit API
requires administration permissions. The last active Admin cannot be deactivated
or demoted through the API.

## Legacy bootstrap API compatibility

The locally authorized `POST /api/v1/setup` endpoint remains available only before
an installation has accounts. Operators maintaining existing automation can use
its one-use code from local API logs or `mlite instance setup-code`. It is not a
mandatory login/signup screen. Normal registration invalidates that bootstrap
code; later administration must be designated explicitly by a local operator.

Restarting the API does not reopen completed bootstrap or reset passwords.
`ADMIN_USER`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` do not automatically create,
promote or overwrite accounts. Keep local codes, credentials and logs private.
