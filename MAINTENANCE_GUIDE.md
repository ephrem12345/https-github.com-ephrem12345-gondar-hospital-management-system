# Gondar Hospital Management System (GHMS)
## System Maintenance & Operations Guide

**Document Version:** 1.0  
**Effective Date:** November 15, 2026  
**Audience:** Hospital IT System Administrators & DevOps Engineers  

---

## 1. System Health Monitoring

### 1.1 Automated Health Check Endpoints

| Endpoint | Method | Scope | Expected Status |
| :--- | :--- | :--- | :--- |
| `/api/v1/health` | `GET` | Process Liveness | HTTP 200 `{"status":"ok","timestamp":"..."}` |
| `/api/v1/ready` | `GET` | Database & Dependency Readiness | HTTP 200 `{"status":"ready","database":"connected"}` |

### 1.2 Monitoring Commands
```bash
# Check PM2 application cluster status
pm2 status

# Monitor real-time CPU and memory usage per worker
pm2 monit

# Inspect live structured logs
pm2 logs --lines 100

# Inspect Nginx access and error logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 2. Disk Space & Resource Thresholds

Hospital systems generate continuous audit logs, binary logs, and diagnostic records. Monitor storage capacity regularly:

```bash
# Inspect disk usage
df -h /
df -h /var/lib/mysql
df -h /var/backups/ghms
```

### Alert Thresholds
- **Disk Usage > 80%:** Warning — Trigger log pruning and review backup retention.
- **Disk Usage > 90%:** Critical — Immediate action required: rotate MySQL binary logs and offload older backups.
- **Memory Usage > 85%:** Review PM2 worker memory limits and MySQL buffer pool allocation.

---

## 3. Log Rotation Configuration

To prevent disk saturation from continuous logging, configure `logrotate`:

Create `/etc/logrotate.d/ghms`:
```ini
/var/log/ghms/*.log /home/ghms/.pm2/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ghms ghms
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 4. Routine Application Updates & Safe Database Migrations

### 4.1 Update Procedure
To deploy a software update without disrupting hospital workflows:

1. **Pull the latest verified release tag:**
   ```bash
   cd /var/www/ghms
   sudo -u ghms git fetch --tags
   sudo -u ghms git checkout tags/v1.1.0
   ```
2. **Install dependencies:**
   ```bash
   sudo -u ghms npm ci --omit=dev
   sudo -u ghms npm --prefix backend ci --omit=dev
   ```
3. **Execute safe database migrations:**
   ```bash
   # IMPORTANT: NEVER use 'prisma db push' in production.
   # Always use 'prisma migrate deploy' to apply pre-tested migration scripts.
   sudo -u ghms npx --prefix backend prisma migrate deploy
   ```
4. **Compile production assets:**
   ```bash
   sudo -u ghms npm --prefix backend run build
   sudo -u ghms npm run build
   ```
5. **Zero-downtime rolling reload:**
   ```bash
   sudo -u ghms pm2 reload ecosystem.config.cjs --update-env
   ```
6. **Verify health:**
   ```bash
   curl -s https://api.gondar-hospital.et/api/v1/health | grep '"status":"ok"'
   ```

---

## 5. SSL / TLS Certificate Maintenance

Certbot automatically schedules certificate renewal via systemd timer. To test and verify manual renewal:

```bash
# Dry-run renewal test
sudo certbot renew --dry-run

# Force renewal if within 30 days of expiration
sudo certbot renew --post-hook "systemctl reload nginx"
```

---

## 6. Incident Response & Troubleshooting Playbook

### Scenario A: API Responds with HTTP 502 Bad Gateway
- **Cause:** Backend Node.js process crashed or stopped listening on port 4000.
- **Remedy:**
  ```bash
  pm2 status ghms-backend-api
  pm2 logs ghms-backend-api --lines 50
  pm2 restart ghms-backend-api
  ```

### Scenario B: Database Connection Errors (HTTP 500 / "Can't reach database")
- **Cause:** MySQL service down, max connections exceeded, or credentials altered.
- **Remedy:**
  ```bash
  sudo systemctl status mysql
  sudo mysqladmin -u root -p status
  # If stalled:
  sudo systemctl restart mysql
  pm2 reload ghms-backend-api
  ```

### Scenario C: Emergency Rollback
If an updated release causes operational instability:
```bash
sudo -u ghms git checkout <previous_stable_tag>
sudo -u ghms npm --prefix backend run build
sudo -u ghms npm run build
sudo -u ghms pm2 reload ecosystem.config.cjs
```
