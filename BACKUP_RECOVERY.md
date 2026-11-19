# Gondar Hospital Management System (GHMS)
## Database Backup, Recovery & Disaster Resilience Plan

**Document Version:** 1.0  
**Effective Date:** November 15, 2026  
**Target Database Engine:** MySQL 8.0+ / MariaDB 10.4+  
**Target Database:** `ghms` (85 Normalized Operational Tables)  
**Classification:** Confidential — Hospital Infrastructure & Data Protection  

---

## 1. Objectives & Compliance Standards

The Gondar Hospital Management System (GHMS) stores sensitive Electronic Health Records (EHR), emergency triage records, clinical consultations, laboratory results, pharmacy inventory, and billing records. 

This Disaster Recovery (DR) plan is engineered to fulfill:
- **Recovery Time Objective (RTO):** $< 15\text{ minutes}$ for service restoration.
- **Recovery Point Objective (RPO):** $< 1\text{ hour}$ maximum data loss window in cold disaster; $< 5\text{ minutes}$ with binary logging.
- **HIPAA / Ethiopian Healthcare Data Regulations:** Complete AES-256 at-rest encryption, write-once verification, and 7-year audit log retention.

---

## 2. Backup Architecture & Tiers

GHMS implements a three-tier hybrid backup strategy:

```
+-----------------------------------------------------------------------------------------+
|                                    BACKUP TIERS                                         |
+-----------------------------------------------------------------------------------------+
| Tier 1: Continuous Binary Logging (Binlog)                                              |
|   - Granular point-in-time recovery (PITR) up to the second of failure                  |
|   - Captured every transaction in real-time                                             |
+-----------------------------------------------------------------------------------------+
| Tier 2: Daily Differential / Logical Hot Dump                                           |
|   - Nightly at 02:00 EAT (UTC+3)                                                        |
|   - Single-transaction, non-blocking snapshot of all 85 tables                          |
|   - Retention: 30 days locally, replicated offsite                                      |
+-----------------------------------------------------------------------------------------+
| Tier 3: Weekly Full Cold Snapshot + Archive                                             |
|   - Sundays at 03:00 EAT (UTC+3)                                                        |
|   - Gzip compressed, AES-256 encrypted, SHA-256 checksummed                            |
|   - Retention: 12 months in secondary hospital data storage; 7 years archived           |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Automated Backup Procedures

### 3.1 Logical Backup via `mysqldump`
To ensure data consistency without locking active clinical or emergency workflows:

```bash
# Set secure execution variables
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/ghms"
DB_NAME="ghms"
BACKUP_FILE="${BACKUP_DIR}/ghms_dump_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"

# 1. Execute single-transaction consistent logical dump with triggers, routines, and events
mysqldump \
  --host=localhost \
  --port=3306 \
  --user=ghms_backup \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  --default-character-set=utf8mb4 \
  "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"

# 2. Encrypt dump using OpenSSL AES-256-CBC with PBKDF2 key derivation
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in "${BACKUP_FILE}" \
  -out "${ENCRYPTED_FILE}" \
  -pass file:/etc/ghms/backup_key.bin

# 3. Securely remove unencrypted plaintext dump
rm -f "${BACKUP_FILE}"

# 4. Generate SHA-256 checksum for tamper-evidence
sha256sum "${ENCRYPTED_FILE}" > "${ENCRYPTED_FILE}.sha256"

# 5. Sync to secondary encrypted offsite storage
rclone sync "${BACKUP_DIR}" remote-dr:ghms-backups/
```

### 3.2 MySQL Binary Logging (Point-In-Time Recovery)
In `/etc/mysql/my.cnf` or `my.ini`:
```ini
[mysqld]
log_bin = /var/log/mysql/mysql-bin.log
expire_logs_days = 7
max_binlog_size = 100M
binlog_format = ROW
sync_binlog = 1
```

---

## 4. Disaster Recovery & Restoration Procedures

### 4.1 Safe Non-Destructive Verification in Staging
Before applying any backup to production, test integrity in an isolated verification instance:

```bash
# 1. Verify SHA-256 Checksum
sha256sum -c "${ENCRYPTED_FILE}.sha256"

# 2. Decrypt the archive
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in "${ENCRYPTED_FILE}" \
  -out "ghms_restore_test.sql.gz" \
  -pass file:/etc/ghms/backup_key.bin

# 3. Create isolated verification database
mysql -u root -e "DROP DATABASE IF EXISTS ghms_verify; CREATE DATABASE ghms_verify CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Ingest dump
gunzip < "ghms_restore_test.sql.gz" | mysql -u root ghms_verify

# 5. Clean up temporary unencrypted file
rm -f "ghms_restore_test.sql.gz"
```

### 4.2 Production Restoration Protocol
In the event of a catastrophic storage failure or severe data corruption:

1. **Halt Application Daemons:**
   ```bash
   pm2 stop ghms-backend ghms-frontend
   ```
2. **Execute Point-in-Time Pre-Recovery Dump:**
   ```bash
   mysqldump --single-transaction ghms > /var/backups/ghms/pre_recovery_state.sql
   ```
3. **Restore Verified Baseline:**
   ```bash
   gunzip < "${DECRYPTED_BACKUP}" | mysql -u root ghms
   ```
4. **Replay Binary Logs up to Incident Timestamp:**
   ```bash
   mysqlbinlog --stop-datetime="2026-11-15 01:45:00" /var/log/mysql/mysql-bin.000* | mysql -u root ghms
   ```
5. **Verify Database Integrity via Automated Verification Script:**
   ```bash
   npx --prefix backend tsx backend/scripts/verify-db-integrity.ts
   ```
6. **Restart Application Services & Validate Health:**
   ```bash
   pm2 restart ghms-backend ghms-frontend
   curl -f http://localhost:4000/api/v1/ready
   ```

---

## 5. Retention & Purge Policy

| Backup Type | Local Storage | Offsite Encrypted DR | Retention Schedule |
| :--- | :--- | :--- | :--- |
| **Binlogs** | 7 Days | Replicated hourly | 7 Days |
| **Daily Hot Dumps** | 14 Days | 30 Days | Expired daily after 30 days |
| **Weekly Full Archives** | 30 Days | 12 Months | Archived monthly |
| **Yearly Milestone Dumps** | — | 7 Years (Cold Storage) | Retained for medical legal compliance |

---

## 6. Access Control & Key Management

- **Database Credentials:** Dedicated backup service user `ghms_backup` restricted to `SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER, RELOAD` privileges.
- **Encryption Key Storage:** `/etc/ghms/backup_key.bin` chmod `0400`, owned strictly by `root`.
- **Audit Trails:** Every backup execution and restoration attempt logs an entry in `/var/log/ghms_backup.log` and alerts system administrators via automated monitoring.
