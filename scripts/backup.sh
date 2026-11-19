#!/usr/bin/env bash
# ==============================================================================
# Gondar Hospital Management System (GHMS) - Production Database Backup Script
# ==============================================================================
set -euo pipefail

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ghms}"
DB_NAME="${DB_NAME:-ghms}"
DB_USER="${DB_USER:-ghms_backup}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
KEY_FILE="${KEY_FILE:-/etc/ghms/backup_key.bin}"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

RAW_BACKUP="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
ENCRYPTED_BACKUP="${RAW_BACKUP}.enc"
LOG_FILE="${BACKUP_DIR}/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "INFO: Starting automated backup for database '${DB_NAME}'..."

# 1. Consistent Single-Transaction Logical Dump (Non-locking for InnoDB)
mysqldump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --user="${DB_USER}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  --default-character-set=utf8mb4 \
  "${DB_NAME}" | gzip -9 > "${RAW_BACKUP}"

DUMP_SIZE=$(du -h "${RAW_BACKUP}" | cut -f1)
log "SUCCESS: Database dump completed (${DUMP_SIZE})."

# 2. Encrypt dump if key file exists
if [[ -f "${KEY_FILE}" ]]; then
    openssl enc -aes-256-cbc -salt -pbkdf2 \
      -in "${RAW_BACKUP}" \
      -out "${ENCRYPTED_BACKUP}" \
      -pass "file:${KEY_FILE}"
    rm -f "${RAW_BACKUP}"
    TARGET_BACKUP="${ENCRYPTED_BACKUP}"
    log "INFO: Backup successfully encrypted with AES-256-CBC."
else
    TARGET_BACKUP="${RAW_BACKUP}"
    log "WARN: Key file not found; backup saved compressed without encryption."
fi

# 3. Generate SHA-256 Checksum
sha256sum "${TARGET_BACKUP}" > "${TARGET_BACKUP}.sha256"
log "INFO: SHA-256 checksum generated."

# 4. Prune Backups older than RETENTION_DAYS
log "INFO: Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz*" -mtime +"${RETENTION_DAYS}" -exec rm -f {} \;

log "SUCCESS: Automated backup process completed successfully."
