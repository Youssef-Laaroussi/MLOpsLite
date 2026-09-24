# Enterprise Self-Hosting Production Deployment Guide

This guide details the recommended architecture, configuration, and operational procedures for deploying **MLite** into a secure, highly available, production-grade enterprise environment.

```mermaid
flowchart TD
    subgraph Ingress
        A[Client Traffic] -->|HTTPS 443| B[Nginx / Traefik Reverse Proxy]
    end

    subgraph "Application Tier"
        B -->|HTTP 8000| C[MLite FastAPI Backend]
        B -->|HTTP 5000| D[MLflow Tracking Server]
        B -->|HTTP 9000| E[MinIO Storage API]
    end

    subgraph "Serving Tier (Docker)"
        C -->|Docker API| F[Serving Container: Model A]
        C -->|Docker API| G[Serving Container: Model B]
    end

    subgraph "Persistence Tier (HA)"
        C & D --> H[(PostgreSQL Primary)]
        H -.->|Streaming Replication| I[(PostgreSQL Standby)]
        E --> J[(Distributed NVMe / S3 Disks)]
    end
```

---

## 1. System Requirements

### Recommended Hardware (Production Node)
- **CPU**: 8 vCPUs (x86_64 or ARM64)
- **Memory**: 32 GB RAM
- **Disk**: 250 GB NVMe SSD for operating system, Docker layers, and local cache
- **Operating System**: Ubuntu 22.04 LTS or Debian 12
- **Docker Engine**: v26.0+ with Docker Compose v2.24+

---

## 2. Production Environment Configuration

Create a dedicated production configuration file `.env.production`:

```ini
# Core Security
ENVIRONMENT=production
SECRET_KEY=generate_with_openssl_rand_hex_32
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# PostgreSQL High Availability
POSTGRES_USER=mlite_admin
POSTGRES_PASSWORD=strong_random_db_password
POSTGRES_DB=mlite_prod
DATABASE_URL=postgresql+asyncpg://mlite_admin:strong_random_db_password@postgres.internal.net:5432/mlite_prod

# MinIO / Object Storage
MINIO_ROOT_USER=mlite_minio_admin
MINIO_ROOT_PASSWORD=strong_random_minio_password
MINIO_ENDPOINT=minio.internal.net:9000
MINIO_SECURE=true
MINIO_BUCKET_NAME=mlite-production-artifacts

# MLflow Tracking
MLFLOW_TRACKING_URI=http://mlflow.internal.net:5000
MLFLOW_ARTIFACT_STORE=s3://mlite-production-artifacts/mlflow

# Container Orchestration
MLITE_DOCKER_NETWORK=mlite_prod_network
MLITE_SERVING_PORT_START=8100
MLITE_SERVING_PORT_END=8999
```

---

## 3. Reverse Proxy & TLS Termination (Nginx)

Place an Nginx reverse proxy in front of MLite services to terminate TLS 1.3, enforce rate limiting, and set security headers.

Example `/etc/nginx/sites-available/mlite.conf`:

```nginx
# Rate Limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=50r/s;

server {
    listen 443 ssl http2;
    server_name mlite.company.com;

    ssl_certificate /etc/letsencrypt/live/mlite.company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mlite.company.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self';" always;

    client_max_body_size 500M; # Accommodates large model artifacts

    # MLite REST API
    location / {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # MLflow Tracking UI (Restricted via Basic Auth or VPN)
    location /mlflow/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
    }
}
```

---

## 4. Production Docker Compose (`docker-compose.prod.yml`)

Deploy with resource limitations and restart policies:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G

  minio:
    image: minio/minio:RELEASE.2024-03-05T04-48-44Z
    restart: always
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G

  api:
    image: ghcr.io/youssef-laaroussi/mlite-api:1.0.0
    restart: always
    env_file: .env.production
    ports:
      - "127.0.0.1:8000:8000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - postgres
      - minio
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

volumes:
  postgres_data:
  minio_data:
```

---

## 5. Backup & Disaster Recovery Procedures

### 1. Daily Automated PostgreSQL Backup
Create a cron job on the database node:

```bash
#!/usr/bin/env bash
BACKUP_DIR="/var/backups/mlite"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

pg_dump -U mlite_admin -h 127.0.0.1 mlite_prod | gzip > "$BACKUP_DIR/mlite_backup_$TIMESTAMP.sql.gz"

# Retain backups for 30 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -delete
```

### 2. S3/MinIO Object Storage Replication
Synchronize all model weights and artifact snapshots to an offsite S3 cold-storage bucket daily:

```bash
mc mirror --overwrite /data/mlite-production-artifacts offsite-s3/mlite-cold-backups/
```

### 3. Disaster Recovery Restoration Drill
To test recovery from a backup archive:

```bash
# 1. Restore Database
gunzip -c /var/backups/mlite/mlite_backup_20260918.sql.gz | psql -U mlite_admin -d mlite_prod

# 2. Run Pre-Flight Smoke Test
python scripts/release_smoke_test.py
```

---

## 6. Zero-Downtime Rolling Upgrades

1. Pre-pull the new version image:
   ```bash
   docker pull ghcr.io/youssef-laaroussi/mlite-api:1.0.1
   ```
2. Run database migration dry-run:
   ```bash
   alembic upgrade head --sql
   alembic upgrade head
   ```
3. Restart backend service with zero connection drop:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --no-deps api
   ```
4. Confirm health:
   ```bash
   curl -f http://127.0.0.1:8000/health
   ```
