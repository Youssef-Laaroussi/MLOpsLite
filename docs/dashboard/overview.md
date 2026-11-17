# MLite React Dashboard

> Sleek, modern single-pane-of-glass web dashboard built with React 18, Vite, TypeScript, and Tailwind CSS.

---

## Overview

The MLite Web Dashboard (`apps/web`) provides an intuitive visual interface to oversee your entire self-hosted machine learning ecosystem:
- **System Overview**: Live counters of active projects, registered models, running deployment endpoints, and infrastructure health.
- **Projects**: Workspace management and Git repository links.
- **Model Registry**: Model versioning with 1-click stage promotion and single-active production auto-demotion warnings.
- **Deployments**: Live inference endpoints with real-time status and instant stop controls.
- **Datasets**: Data lineage, file formats, and content-addressed SHA-256 storage tracking.
- **Monitoring & Alerts**: Drift evaluation status and incident notifications.

---

## Architecture & Tech Stack

```
apps/web/
├── src/
│   ├── api/             # Axios API client with TypeScript interfaces
│   │   ├── client.ts    # REST endpoints integration
│   │   └── types.ts     # Domain models (Project, Model, Deployment, Dataset)
│   ├── components/      # Reusable UI primitives
│   │   ├── Layout.tsx   # Shell layout wrapping Sidebar and Header
│   │   ├── Sidebar.tsx  # Navigation links with active route indicator
│   │   ├── Header.tsx   # Header with quick external links (API, MLflow, MinIO)
│   │   ├── StatCard.tsx # Metric KPI cards with trend indicators
│   │   └── StatusBadge.tsx # Semantic color-coded stage/health badges
│   └── pages/           # Route views
│       ├── DashboardOverview.tsx
│       ├── ProjectsPage.tsx
│       ├── ModelsPage.tsx
│       ├── DeploymentsPage.tsx
│       ├── DatasetsPage.tsx
│       ├── MonitoringPage.tsx
│       └── AlertsPage.tsx
```

---

## Configuration & Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | API base path or URL used by the browser. |
| `MLITE_API_PROXY_TARGET` | `http://localhost:8000` | Backend targeted by the Vite development proxy. Compose sets it to `http://mlite-api:8000`. |

---

## Local Development

```bash
cd apps/web

# Install dependencies
npm install

# Start Vite hot-reloading dev server on http://localhost:3000
npm run dev

# Run frontend tests
npm run test

# Build production bundle
npm run build
```

---

## Production Deployment via Docker

The dashboard is packaged via a multi-stage Docker build:
1. **Build Stage**: Compiles TypeScript and packages static HTML/JS/CSS assets via Vite.
2. **Runtime Stage**: Ultra-lightweight `nginx:alpine` image serving the assets on port `3000` with client-side HTML5 pushState routing.

```bash
docker build -f apps/web/Dockerfile -t mlite/web:latest .
docker run -p 3000:3000 mlite/web:latest
```

## Overview data semantics

- Resource counts and stage distribution are current inventory, independent of the observation period. Running means recorded container state, not verified readiness.
- The period selector applies to recorded model scores and drift observations. Unresolved alerts remain counted regardless of age.
- Each source displays its latest successful refresh age. A failed refresh or an age over two minutes marks it stale; unavailable data is not presented as an empty inventory.
- Running endpoints exclude stopped, pending and failed deployments. Readiness checks are manual, timestamped and expire after two minutes. Their round-trip time is not inference latency.
- Drift bars use the reported severity. Missing metrics remain unavailable; measured zero scores remain visible.
