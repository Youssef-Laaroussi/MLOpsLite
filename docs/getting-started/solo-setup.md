# Solo installation: one personal account

Every MLite deployment has its own database, accounts and permissions. The developer
of the GitHub repository has no automatic access to anybody else's installation.
The same personal account can administer its installation and own its projects.
Solo is a usage pattern, not an additional role.

## Fresh installation

1. Run `docker compose up -d --build`.
2. Open the dashboard at `http://localhost:3000`. An unconfigured installation
   redirects to `/setup`.
3. Read the single-use code in `docker compose logs mlite-api`.
4. Enter that code and create your personal account, using a password of at least
   12 characters (at most 72 UTF-8 bytes).
5. MLite signs you in to the dashboard. Use **Settings → Storage** for storage
   settings and **Settings → Activity & Logs** for recorded activity. Service
   health remains in **Services**.

This account has the existing global `ADMIN` role. Creating a project inserts an
`OWNER` membership in the same database transaction. No second account is needed.
Team elements remain hidden while project collaboration is being implemented.

The setup code is never returned by a web endpoint and only its hash is stored.
Only an operator who can read the local API logs or execute the local CLI can
obtain it. Log access must remain restricted to the installation operator.
If the code is lost, generate a replacement on that installation:

```bash
docker compose exec mlite-api mlite instance setup-code
```

The previous code becomes invalid. Setup closes permanently after success.
Restarting the API neither creates another administrator nor resets a password.
An optional `MLITE_SETUP_TOKEN` environment variable can supply a code of at least
32 characters for the first startup; it is ignored after setup state is persisted.
It does not reopen setup after completion or replace a previously generated code.

## Upgrade an existing installation

Back up the database and object storage before upgrading. Rebuild/restart the API
to add the setup-state and membership tables. Existing accounts close web setup,
including installations without an active administrator. Neither first signup nor
the number of remaining users can grant administrator privileges.

Choose the exact username of your existing personal account, then run locally:

```bash
docker compose exec mlite-api mlite instance adopt-solo \
  --username YOUR_USERNAME --claim-unowned-projects
```

Replace `YOUR_USERNAME` with the chosen active account. This is an explicit local
operator action, not a web endpoint and not an automatic promotion of every user.
It promotes that account to `ADMIN` and assigns projects that currently have no
`OWNER`. Existing owners, accounts, passwords, projects, artifacts and deployments
are preserved. The changes are recorded in the audit log. Other administrators
are retained; they are not silently deleted or demoted.

Omit `--claim-unowned-projects` to designate only the administrator. Do not use the
claim option on a shared installation until its operator has reviewed which
account should own those projects. The new Solo project API shows only projects
owned by the authenticated user; unassigned legacy projects stay stored and are
not exposed as public projects. They become available after explicit assignment.

Sign out and sign back in with the selected account to refresh the frontend
profile. Use **Settings → Storage / Activity & Logs** with this same login.

For a local Python installation, use the same commands without `docker compose
exec mlite-api`, in the environment configured with the installation's database.
The optional Alembic baseline `0001_solo_installation` adds these tables to an
existing core schema without replacing existing ones. For a fresh database, start
the API first to initialize the core schema. API startup performs additive schema
creation and initializes the singleton setup state. Downgrade requires a reviewed
backup restoration; it must not silently remove ownership or reopen setup.

## Registration and compatibility

Self-registration is enabled by default (`MLITE_ALLOW_REGISTRATION=true`), with a
**Sign up** link on the sign-in page. An installation operator can explicitly set
this variable to `false` to close public registration. Registration creates `USER`
accounts, never administrators; initial administration is granted only through
the locally authorized setup flow.

The Solo interface hides **Accounts**, **Add New User**, and role-management
controls. Storage and **Activity & Logs** are tabs in the existing **Settings**
page, and health remains in **Services**. There is no separate Administration
navigation in Solo. Old `/admin`, `/admin/storage` and `/admin/accounts` links
redirect to Settings → Storage; `/admin/audit`, `/app/audit` and `/audit` redirect
to Settings → Activity & Logs. Activity & Logs is available to every signed-in
account and shows only actions performed by that account, including when it has
the Admin role. The backend enforces this scope through `/api/v1/audit/me/logs`
and its entry-detail endpoint; other accounts' entry IDs return 404.
The installation-wide `/api/v1/audit/logs` endpoints remain separate and require
the existing `audit:view` administration permission. Storage still requires
instance administrator permissions, even through a direct URL. Accounts
is omitted from navigation and search; its component is preserved behind
`workspaceFeatures.accountManagement` for future collaboration work. This display
flag is not a backend security rule.
This phase implements Solo setup and project ownership; it does not claim to
complete the planned multi-user isolation of MLflow, storage and inference.

Existing global roles and API routes remain supported. `ADMIN_USER`, `ADMIN_EMAIL`
and `ADMIN_PASSWORD` no longer bootstrap, promote, or overwrite accounts. Scripts
must log in using an account actually configured on their installation; setting
these old variables does not create that account.

The last active administrator cannot be deactivated or demoted through the API.
Project membership and instance administration remain distinct. Project ownership
is enforced by FastAPI for project listing, reads and mutations, not just by
hiding sidebar links.
