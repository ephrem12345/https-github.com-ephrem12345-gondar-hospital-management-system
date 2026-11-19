# Gondar Hospital Management System (GHMS)
## Stage 6: Production Deployment Plan

**Document Version:** 1.0  
**Effective Date:** November 15, 2026  
**Author:** Senior DevOps & Production Deployment Specialist  
**System Scope:** Next.js 15 (Port 3000/3002), Express 5 API (Port 4000), MySQL 8.0 (85 Tables), Nginx Edge Reverse Proxy  
**Classification:** Confidential — Hospital Infrastructure & Deployment Operations  

---

## 1. Executive Summary & Objective

This Deployment Plan establishes the operational blueprint for transitioning the Gondar Hospital Management System from staging/integration into a high-availability, HIPAA-compliant, and secure production hospital environment.

The system serves eight core hospital roles:
- Administrator
- Doctor
- Nurse
- Laboratory Technologist
- Pharmacist
- Receptionist
- Finance Officer
- Patient

---

## 2. Architecture & Runtime Requirements

### 2.1 Technology Stack & Versions
- **Frontend Presentation Layer:** Next.js 15.5+ (React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons).
- **Backend Application Layer:** Node.js v22 LTS / v24 (Express 5, TypeScript, Zod 4, Helmet, Pino, JWT, Bcrypt 12).
- **Database Layer:** MySQL 8.0+ (InnoDB Storage Engine, `utf8mb4_unicode_ci` collation, 85 normalized tables, Prisma ORM).
- **Edge / Reverse Proxy:** Nginx 1.25+ (TLS 1.3, HTTP/2, Let's Encrypt / Hospital CA Certificates).
- **Process Management:** Docker / Docker Compose or PM2 (Cluster Mode).

### 2.2 Sizing & Infrastructure Requirements

| Deployment Target | Expected Concurrent Users | vCPU | RAM | Storage (SSD / NVMe) | Network |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Minimum Production (Single Clinic / Ward)** | Up to 150 concurrent | 4 vCPUs | 8 GB | 100 GB NVMe | 100 Mbps symmetric |
| **Standard Referral Hospital (Gondar Central)** | 500 – 1,500 concurrent | 8 vCPUs | 16 GB | 250 GB NVMe | 1 Gbps symmetric |
| **Regional Multi-Hospital Cluster** | 2,000+ concurrent | 16 vCPUs | 32 GB | 500 GB+ NVMe (RAID-10) | Redundant fiber links |

---

## 3. Hosting Options & Recommendations

### Option A: On-Premise Hospital Data Center Server (Recommended for Gondar Hospital)
- **Rationale:** Ensures 100% operational continuity and zero downtime for emergency triage, pharmacy dispensing, and surgical theaters even during WAN/Internet outages.
- **Hardware:** Dedicated 1U/2U Rackmount Server (e.g. Dell PowerEdge R650 / HP ProLiant DL360) configured with ECC RAM and hardware RAID-10 SSDs.
- **OS:** Ubuntu Server 24.04 LTS (HWE kernel).
- **Network:** Hospital internal LAN/VLAN (isolated clinical and patient VLANs) with DMZ for the external patient portal.

### Option B: Dedicated Cloud / Linux VPS (Ethio Telecom Cloud / DigitalOcean / AWS / GCP)
- **Rationale:** Ideal for remote patient portal accessibility, telemedicine follow-ups, and automated offsite disaster recovery replication.
- **Architecture:** Containerized deployment using `docker-compose.prod.yml` or managed Kubernetes / ECS with Cloud SQL / Managed MySQL.

### Option C: Hybrid Deployment (Optimal Balanced Model)
- **Core Clinical & Emergency Operations:** On-premise hospital local server.
- **Patient Portal & Tele-Appointments:** Cloud DMZ replica synced over encrypted WireGuard / IPsec VPN tunnel.

---

## 4. Network Topology & Traffic Routing

```
                         INTERNET / HOSPITAL WAN
                                    |
                                    v
+-----------------------------------------------------------------------+
| EDGE FIREWALL / WAF: Port 80 (HTTP Redirect) / Port 443 (HTTPS Only)  |
+-----------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
| NGINX REVERSE PROXY (TLS 1.3 Termination, Rate Limiting, Security)     |
|   - https://gondar-hospital.et       --> http://127.0.0.1:3000 (Web)  |
|   - https://api.gondar-hospital.et   --> http://127.0.0.1:4000 (API)  |
+-----------------------------------------------------------------------+
                |                                       |
                v                                       v
+-------------------------------+       +-------------------------------+
| FRONTEND SERVICE (Port 3000)  |       | BACKEND REST API (Port 4000)  |
|   Next.js 15 SSR / Client     |       |   Express 5 + Prisma ORM      |
+-------------------------------+       +-------------------------------+
                                                        |
                                                        v
                                        +-------------------------------+
                                        | DATABASE (MySQL 8.0, Port 3306)|
                                        |   Bound strictly to 127.0.0.1 |
                                        |   85 Tables / InnoDB Engine   |
                                        +-------------------------------+
```

---

## 5. Phased Deployment Roadmap

### Phase 1: Environment Provisioning (Days 1–2)
1. Provision Ubuntu 24.04 LTS server with static IP and dual power supplies.
2. Configure UFW firewall (open 80, 443, and restricted SSH port).
3. Install Node.js 22 LTS, MySQL 8.0, Nginx, and Docker.
4. Establish non-root service accounts (`ghmsuser`, `ghms_backup`).

### Phase 2: Database Initialization & Verification (Day 3)
1. Initialize MySQL database `ghms` with `utf8mb4` character set.
2. Create dedicated application user `ghms_app` with restricted privileges:
   ```sql
   CREATE USER 'ghms_app'@'127.0.0.1' IDENTIFIED BY '<STRONG_PASSWORD>';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, REFERENCES ON ghms.* TO 'ghms_app'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```
3. Run safe migration: `npx prisma migrate deploy`.
4. Verify table count: 85 tables confirmed.

### Phase 3: Application Build & Service Setup (Day 4)
1. Configure production environment files: `.env.production` and `backend/.env.production`.
2. Build frontend: `npm run build` (Next.js optimized standalone package).
3. Build backend: `npm --prefix backend run build` (TypeScript compilation to `dist/`).
4. Configure process manager (Docker Compose or PM2 cluster).

### Phase 4: Edge Proxy & TLS Security (Day 5)
1. Configure DNS records:
   - `A gondar-hospital.et -> <SERVER_IP>`
   - `A api.gondar-hospital.et -> <SERVER_IP>`
2. Provision Let's Encrypt certificates via Certbot, or install hospital SAN certificates.
3. Apply hardened Nginx configuration (`nginx/nginx.conf`).

### Phase 5: Backup & Disaster Recovery Verification (Day 6)
1. Deploy `scripts/backup.sh` to `/usr/local/bin/ghms-backup.sh`.
2. Add cron job for daily midnight backups: `0 2 * * * /usr/local/bin/ghms-backup.sh`.
3. Test full database restoration into `ghms_restoration_test` using `scripts/restore.sh`.
4. Confirm 100% table restoration and checksum verification.

### Phase 6: Clinical Acceptance & Go-Live (Day 7)
1. Hospital leadership and Chief Medical Officer authorization.
2. Production smoke tests across all 8 roles.
3. Transition hospital intake desks to live system.

---

## 6. Rollback & Contingency Plan

If an unexpected critical failure occurs during deployment:
1. **Immediate Service Isolation:** Switch Nginx to temporary static maintenance mode page (`/maintenance`).
2. **Database Rollback:** Execute `scripts/restore.sh` using the pre-deployment snapshot created immediately before migration.
3. **Application Rollback:** Revert PM2 or Docker images to the previously tagged stable release.
4. **Post-Mortem & Incident Log:** Record root-cause analysis in `/var/log/ghms/incident_reports.log`.
