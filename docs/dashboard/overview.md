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
| `VITE_API_BASE_URL` | `/api/v1` | URL of the MLite FastAPI backend. When developing locally with Vite, requests to `/api` are automatically proxied to `http://localhost:8000`. |

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
