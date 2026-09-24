# 💻 Comprehensive Installation Guide

> **Component:** `docs/getting-started/installation.md`  
> **Milestone:** M8 — Documentation & Examples (Issue #33)

---

## Quick Installation (All Platforms)

Get MLite running locally in 3 commands:

```bash
# 1. Clone the repository
git clone https://github.com/Youssef-Laaroussi/MLOpsLite.git
cd MLOpsLite

# 2. Copy the default environment configuration
cp .env.example .env

# 3. Launch all services in background mode
docker compose up -d
```

Once running, verify system health:
```bash
curl http://localhost:8000/health
# Expected output: {"status":"healthy","version":"0.1.0"}
```

---

## Operating System Guides

### 1. Ubuntu & Debian Linux

#### Install Docker & Compose:
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable non-root docker execution
sudo usermod -aG docker $USER
newgrp docker
```

#### Install MLite CLI:
```bash
pip install --user mlite-cli
```

---

### 2. macOS (Apple Silicon M1/M2/M3 & Intel)

#### Install Prerequisites via Homebrew:
```bash
# Install Docker Desktop or Colima
brew install --cask docker

# Install Python 3.12
brew install python@3.12
```

Launch Docker Desktop and start MLite:
```bash
git clone https://github.com/Youssef-Laaroussi/MLOpsLite.git
cd MLOpsLite
docker compose up -d
```

---

### 3. Windows 11 / 10 (WSL2)

1. Ensure **WSL2** is enabled: `wsl --install -d Ubuntu`.
2. Install **Docker Desktop for Windows** and enable **WSL 2 based engine** under Settings → General.
3. Open your Ubuntu WSL terminal and follow the [Ubuntu Linux guide](#1-ubuntu--debian-linux).

---

### 4. Headless Cloud VPS (Hetzner, DigitalOcean, Linode)

For remote cloud deployments without a desktop browser:

```bash
# 1. SSH into your VPS
ssh root@your-server-ip

# 2. Clone and configure
git clone https://github.com/Youssef-Laaroussi/MLOpsLite.git
cd MLOpsLite
cp .env.example .env

# 3. Bind to external server IP or domain in .env
sed -i 's/localhost/your-server-ip/g' .env

# 4. Launch services
docker compose up -d
```

To secure and access remote UIs without opening public firewall ports, set up an SSH port forward:
```bash
# From your local machine:
ssh -L 8000:localhost:8000 -L 3000:localhost:3000 -L 5000:localhost:5000 root@your-server-ip
```
You can now access `http://localhost:3000` locally!

---

## Service Verification Checklist

| Service | Verification Command | Expected Output |
| :--- | :--- | :--- |
| **API Health** | `curl -s http://localhost:8000/health` | `{"status":"healthy","version":"0.1.0"}` |
| **Database** | `docker exec -it mlite-db pg_isready` | `accepting connections` |
| **MinIO S3** | `curl -s http://localhost:9000/minio/health/live` | HTTP 200 OK |
| **MLflow** | `curl -s http://localhost:5000/health` | HTTP 200 OK |
| **Dashboard** | `curl -I -s http://localhost:3000/` | HTTP 200 OK |

---

## Stopping and Updating Services

```bash
# Gracefully stop services while preserving database and S3 volumes
docker compose down

# Stop and purge all data volumes (fresh start)
docker compose down -v

# Update to latest container images
docker compose pull
docker compose up -d
```
