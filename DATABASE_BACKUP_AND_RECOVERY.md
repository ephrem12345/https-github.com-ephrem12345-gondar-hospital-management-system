# Gondar Hospital Management System (GHMS)
## Database Backup, Restoration and Disaster Recovery Protocol

**Document Version:** 1.0  
**Effective Date:** November 15, 2026  
**Target Engine:** MySQL 8.0+ (InnoDB Storage Engine)  
**Target Database:** `ghms` (85 Normalized Tables)  
**Compliance Standard:** Ethiopian Healthcare Data Standards & HIPAA Security Rule  

---

## 1. Resilience Objectives (RTO & RPO)

Hospital clinical workflows require stringent continuity standards:
- **Recovery Time Objective (RTO):** Under **15 minutes** to restore full service following database failure.
- **Recovery Point Objective (RPO):** Under **5 minutes** of potential data loss via continuous MySQL binary logging (`log_bin`).

---

## 2. Multi-Tier Backup Strategy

```
+-----------------------------------------------------------------------------------------+
|                                    BACKUP TIERS                                         |
+-----------------------------------------------------------------------------------------+
| Tier 1: Real-Time Binary Logging (binlog)                                               |
|   - Captures every SQL commit in real time for point-in-time recovery (PITR)            |
|   - Synced to disk immediately with sync_binlog=1                                       |
+-----------------------------------------------------------------------------------------+
| Tier 2: Nightly Logical Hot Dump                                                        |
|   - Single-transaction, non-blocking snapshot using mysqldump                           |
|   - Executed daily at 02:00 EAT (UTC+3)                                                 |
|   - AES-256 encrypted, compressed, and checksummed                                      |
|   - Retention: 30 days locally on disk                                                  |
+-----------------------------------------------------------------------------------------+
| Tier 3: Offsite Encrypted Archive                                                       |
|   - Nightly rsync / rclone replication to secondary secure hospital facility or cloud    |
|   - Retention: 12 months in secondary storage; 7 years for annual audit snapshots       |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Automated Backup Configuration

### 3.1 Backup Script Installation
The backup script is located in `scripts/backup.sh`. Deploy it to the system binary path:
```bash
sudo cp scripts/backup.sh /usr/local/bin/ghms-backup.sh
sudo chmod 700 /usr/local/bin/ghms-backup.sh
sudo chown root:root /usr/local/bin/ghms-backup.sh
```

### 3.2 Automated Cron Schedule
Configure a system cron job to run the backup daily at 02:00 AM local time:
```bash
sudo crontab -e
```
Add the following entry:
```cron
0 2 * * * /usr/local/bin/ghms-backup.sh >> /var/log/ghms_backup_cron.log 2>&1
```

### 3.3 Backup Encryption Key Management
Generate a dedicated 256-bit symmetric encryption key:
```bash
sudo mkdir -p /etc/ghms
sudo openssl rand -base64 32 > /etc/ghms/backup_key.bin
sudo chmod 400 /etc/ghms/backup_key.bin
sudo chown root:root /etc/ghms/backup_key.bin
```
*Store an offline physical copy of `/etc/ghms/backup_key.bin` in the hospital security vault.*

---

## 4. Disaster Recovery & Restoration Procedures

### 4.1 Regular Restoration Test Drill
Hospital administrators must verify backup integrity monthly by restoring an archive into an isolated test database:
```bash
# Run test restoration into isolated schema 'ghms_drill_test'
sudo bash scripts/restore.sh /var/backups/ghms/ghms_20261115_020000.sql.gz.enc ghms_drill_test
```

### 4.2 Disaster Scenario 1: Accidental Data Corruption or Table Deletion
1. Stop the application services to prevent conflicting writes:
   ```bash
   sudo pm2 stop all
   ```
2. Locate the most recent valid backup:
   ```bash
   ls -lt /var/backups/ghms/*.sql.gz.enc | head -n 5
   ```
3. Restore the backup into the production database:
   ```bash
   sudo bash scripts/restore.sh /var/backups/ghms/<selected_backup_file> ghms
   ```
4. If point-in-time recovery is required, replay the binary logs up to the exact timestamp of corruption:
   ```bash
   mysqlbinlog --stop-datetime="2026-11-15 14:32:00" /var/log/mysql/mysql-bin.000* | mysql -u root -p ghms
   ```
5. Restart the application:
   ```bash
   sudo pm2 restart all
   ```

### 4.3 Disaster Scenario 2: Complete Hardware Loss (Server Failure)
1. Provision a standby server following `PRODUCTION_SETUP.md`.
2. Retrieve the latest encrypted backup archive and encryption key from offsite replica storage.
3. Decrypt and restore the database schema and table rows.
4. Update DNS records to route traffic to the standby server's IP address.
5. Verify health check: `curl -I https://api.gondar-hospital.et/api/v1/health`.

---

## 5. Security & Protection of Backup Files

- **Access Restriction:** The backup directory `/var/backups/ghms` is set with permissions `0700` owned strictly by `root`.
- **At-Rest Encryption:** Dumps are encrypted using **AES-256-CBC with PBKDF2** key derivation before being saved or transmitted.
- **Tamper Evidence:** Every backup archive is paired with an immutable SHA-256 checksum file (`.sha256`).
- **Zero Plaintext Exposure:** Unencrypted dumps are scrubbed from disk immediately following encryption.
