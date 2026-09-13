# #14 — Build unified React dashboard with Vite, TypeScript, and Tailwind CSS

> **Milestone:** M3 — Dashboard  
> **Priority:** `P1`  
> **Labels:** `frontend` `P1`  

---

## Problem
Currently, users must rely exclusively on the terminal or browse disjointed raw tools (MLflow UI, MinIO Console). There is no unified, cohesive web portal providing an at-a-glance overview of projects, active deployments, model registry stages, drift alerts, and system health.

## Objective
Develop a sleek, modern, self-hosted web dashboard in `apps/web` using React 18, Vite, TypeScript, and Tailwind CSS, delivering a unified single-pane-of-glass interface for MLite.

## Proposed solution
Scaffold `apps/web` with Vite, TypeScript, and Tailwind CSS. Implement views matching the specification (Section 12): Dashboard Home (System summary, production model health, quick actions), Projects, Datasets, Experiments, Models, Deployments, Monitoring, and Alerts. Connect to the FastAPI backend using TanStack Query (React Query) and Axios.

## Technical requirements
- React 18 + TypeScript + Vite + Tailwind CSS.
- Component library: Lucide React icons, Headless UI / Radix primitives, Recharts for data and drift visualization.
- Client API layer: TanStack Query for caching, polling, and optimistic updates.
- Pages: `/` (Overview summary), `/projects` (CRUD & list), `/models` (Registry & stage promotion modal), `/deployments` (Active endpoints, health badges, rollback trigger), `/monitoring` (Drift charts & quality scores), `/alerts` (Alert history & webhook settings).
- Responsive layout with dark mode toggle and system health status bar.

## Acceptance criteria
- Web UI builds cleanly without TypeScript or lint errors (`npm run build`).
- Dashboard overview displays real-time counts: active projects, registered models, online deployments, and active alerts.
- Model registry view enables 1-click stage promotion and links directly to active endpoints.
- Deployment view displays live health status and provides quick-action buttons ([Monitor], [Deploy], [Rollback]).

## Tests
- Frontend component unit tests using Vitest and React Testing Library.
- Cypress / Playwright E2E smoke test verifying initial navigation and dashboard metrics rendering.

## Documentation
- Write `docs/dashboard/overview.md` outlining the frontend architecture, state management, and UI component conventions.
- Document environment variables (`VITE_API_BASE_URL`) for custom deployments.

## Dependencies
Issue #6 (FastAPI Core), Issue #7 (Project API), Issue #10 (Model Registry), Issue #11 (Deployment).
