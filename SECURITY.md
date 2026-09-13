# Security Policy

## Supported Versions

We release patches for security vulnerabilities on the following active versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

---

## Reporting a Vulnerability

The MLite team and community take security vulnerabilities seriously. We appreciate your efforts to responsibly disclose your findings.

If you believe you have discovered a security vulnerability in MLite:

1. **Do NOT open a public GitHub Issue.**
2. Send an email directly to the maintainers at **security@mlite.dev** (or submit a private security advisory via GitHub Security Advisories tab).
3. Include in your report:
   - A clear description of the vulnerability and affected component (API, CLI, Model Serving, Worker, etc.)
   - Steps to reproduce the issue or a minimal Proof of Concept (PoC)
   - The potential impact and attack vector
   - Any proposed mitigations or fixes if available

### What to Expect

- **Acknowledgment**: You will receive an acknowledgment of your report within 48 hours.
- **Assessment**: We will evaluate the report, determine its severity, and keep you informed throughout the process.
- **Fix & Disclosure**: Once a patch is confirmed and tested, a security release will be published along with appropriate attribution in the release notes.

---

## Security Best Practices for Self-Hosting

When deploying MLite in production environments, ensure you follow these baseline guidelines:
- Never commit `.env` files or API secrets to version control.
- Change default PostgreSQL, MinIO, and JWT secret keys before running `docker compose up`.
- Bind management ports to localhost (`127.0.0.1`) and expose services through a secure TLS reverse proxy (e.g., Nginx or Traefik).
- Restrict file upload endpoints and model serving networks to trusted VPCs or internal subnets.
