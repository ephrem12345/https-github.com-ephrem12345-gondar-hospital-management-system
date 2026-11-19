# Gondar Hospital Management System (GHMS)
## Environment Variables & Configuration Reference

**Document Version:** 1.0  
**Effective Date:** November 15, 2026  
**Auditor:** Senior DevOps & Security Engineer  
**Classification:** Operational Guide — Zero Secrets Disclosed  

---

## 1. Overview & Security Policy

All operational configurations in GHMS are managed via environment variables conforming to 12-Factor App principles. 
- **Rule 1: Secrets Isolation.** Passwords, cryptographic keys, and database connection strings must **NEVER** be committed to Git or public version control.
- **Rule 2: Separation of Environments.** Staging and production must maintain completely separate databases, credentials, and domains.
- **Rule 3: Least Privilege.** The production database user must not possess `SUPER` or server-wide administrative privileges.

---

## 2. Frontend Environment Variables (`.env.production`)

Frontend variables prefixed with `NEXT_PUBLIC_` are bundled into client-side JavaScript by Next.js and are readable by web browsers. **Never place private keys or database passwords in frontend files.**

| Variable Name | Required | Default | Sensitivity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | **Yes** | `http://localhost:4000/api/v1` | Public | The full HTTPS base URL for the backend Express API (e.g., `https://api.gondar-hospital.et/api/v1`). |
| `NEXT_PUBLIC_API_MODE` | **Yes** | `live` | Configuration | Must be set to `live` in production. Setting to `demo` enables in-memory mock fallback mode. |
| `NODE_ENV` | **Yes** | `production` | System | Specifies the execution environment. Enables minification, caching, and production optimizations. |
| `PORT` | No | `3000` | Network | The internal HTTP listening port for Next.js when running standalone or behind Nginx. |

---

## 3. Backend Environment Variables (`backend/.env.production`)

Backend variables are strictly server-side and are never exposed to clients or browser bundles.

| Variable Name | Required | Default | Sensitivity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | System | Controls framework optimizations, disables detailed stack traces in HTTP responses, and enables structured JSON logging. |
| `PORT` | No | `4000` | Network | The local TCP port where the Express server listens (reverse-proxied by Nginx). |
| `WEB_ORIGINS` | **Yes** | *None* | Configuration | Comma-separated list of approved CORS origins (e.g., `https://gondar-hospital.et,https://portal.gondar-hospital.et`). |
| `DATABASE_URL` | **Yes** | *None* | **SECRET** | Connection URI for the MySQL database. Must specify username, password, host, port, database name, connection pool size, and timeout flags. |
| `JWT_ACCESS_SECRET` | **Yes** | *None* | **SECRET** | Cryptographic secret key used to sign and verify HS256 JWT access tokens. Must be at least 32 characters (64 bytes hex recommended). |
| `JWT_ACCESS_TTL_SECONDS` | No | `900` | Configuration | Access token lifespan in seconds (default: 900 seconds = 15 minutes). |
| `COOKIE_SECURE` | **Yes** | `true` | Security | When `true`, session cookies (`ghms_access`, `ghms_refresh`) are restricted strictly to HTTPS connections. |
| `LOG_LEVEL` | No | `info` | Configuration | Pino logging threshold (`info`, `warn`, `error`). Logs are formatted as structured JSON with PII masking. |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Security | Rate limiting time window in milliseconds (default: 15 minutes = 900,000 ms). |
| `RATE_LIMIT_MAX_REQUESTS`| No | `100` | Security | Maximum allowed HTTP requests per client IP per window. |
| `AUTH_RATE_LIMIT_MAX` | No | `10` | Security | Stricter limit applied specifically to login and registration endpoints to prevent brute-force attacks. |

---

## 4. Secret Generation & Rotation Guide

### 4.1 Generating Strong Cryptographic Secrets
Use system cryptographic random number generators:
```bash
# Generate 64-byte random hex string for JWT_ACCESS_SECRET
openssl rand -hex 64

# Generate 32-character random database password
openssl rand -base64 24 | tr -dc 'A-Za-z0-9!#%&*+,-./:;<=>?@[]^_{|}~' | head -c 24; echo
```

### 4.2 Database Connection String Format
```
mysql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>?connection_limit=30&pool_timeout=15&connect_timeout=10
```
- `<DB_USER>`: Dedicated user account (e.g. `ghms_app`), never `root`.
- `connection_limit`: Configures Prisma connection pool maximum (recommended: 25–40 for a standard hospital server).
- `pool_timeout`: Seconds to wait before failing if all pool connections are busy (default: 15).

### 4.3 Key Rotation Procedure
1. **JWT Secret Rotation:** Generate a new key and update `backend/.env.production`. Restarting the backend will invalidate active access tokens; users' opaque refresh tokens in MySQL remain valid and automatically issue new access tokens upon next API request.
2. **Database Password Rotation:** Update the user password in MySQL via `ALTER USER 'ghms_app'@'127.0.0.1' IDENTIFIED BY 'new_password';`, update `DATABASE_URL` in `backend/.env.production`, and perform a zero-downtime rolling reload via `pm2 reload ghms-backend-api`.
