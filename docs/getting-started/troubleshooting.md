# 🛠️ Troubleshooting & Frequently Asked Questions

> **Component:** `docs/getting-started/troubleshooting.md`  
> **Milestone:** M8 — Documentation & Examples (Issue #33)

---

## Troubleshooting Matrix

| Issue Symptom | Probable Cause | Immediate Remediation |
| :--- | :--- | :--- |
| `Bind for 0.0.0.0:5432 failed: port is already allocated` | Existing local PostgreSQL instance running | Stop host service: `sudo systemctl stop postgresql` or change `DB_PORT=5433` in `.env` |
| `Bind for 0.0.0.0:8000 failed` | Preexisting web server on port 8000 | Change `API_PORT=8080` in `.env` |
| `Cannot connect to the Docker daemon` | Docker daemon is stopped or current user lacks permissions | Start Docker service (`sudo systemctl start docker`) and add user to docker group (`sudo usermod -aG docker $USER`) |
| `connection to server at "localhost", port 5432 failed: Connection refused` | `mlite-db` container is starting up or crashed | Run `docker compose logs mlite-db` to inspect startup logs; wait 10s for healthcheck |
| `MinIO SignatureDoesNotMatch` | Mismatched S3 credentials between API and MinIO | Ensure `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` in `.env` match `AWS_ACCESS_KEY_ID` |
| `Permission denied: /var/run/docker.sock` | Deployment engine cannot communicate with Docker daemon | Ensure user running `mlite` is in the `docker` group or run `sudo chmod 666 /var/run/docker.sock` |
| `HTTP 401 Unauthorized` on API endpoints | Missing or expired JWT token / API key | Run `mlite login` to renew session or pass valid `X-API-Key` |
| `HTTP 403 Forbidden: Missing permission` | User account has insufficient role | Ask administrator to grant `MAINTAINER` or `ADMIN` role via `mlite user update` |

---

## Detailed Diagnostics

### 1. Checking Container Health
Inspect all container states and health probes:
```bash
docker compose ps
```
If a container reports `unhealthy` or `restarting`, inspect its logs:
```bash
docker compose logs --tail=100 mlite-api
docker compose logs --tail=100 mlite-db
docker compose logs --tail=100 mlite-storage
```

### 2. Resetting the Environment (Clean Slate)
If test state becomes corrupted or database migrations encounter an unrecoverable mismatch during development:
```bash
# 1. Halt all containers and purge persistent data volumes
docker compose down -v

# 2. Relaunch fresh services
docker compose up -d

# 3. Verify health
curl http://localhost:8000/health
```

### 3. Resolving Port Conflicts
To quickly identify what host process is occupying a port:
```bash
# On Linux / macOS:
sudo lsof -i :5432
sudo lsof -i :8000
sudo lsof -i :5000

# Terminate process if necessary:
sudo kill -9 <PID>
```
Alternatively, override port bindings in `.env`:
```ini
API_PORT=8080
UI_PORT=3001
MLFLOW_PORT=5001
DB_PORT=5433
MINIO_PORT=9002
```

---

## Getting Help & Support

- **GitHub Issues:** [File a Bug or Feature Request](https://github.com/Youssef-Laaroussi/MLOpsLite/issues)
- **Discussions:** [Community Forum & Q&A](https://github.com/Youssef-Laaroussi/MLOpsLite/discussions)
- **Documentation:** [MLite Documentation Portal](http://localhost:8000/docs)
