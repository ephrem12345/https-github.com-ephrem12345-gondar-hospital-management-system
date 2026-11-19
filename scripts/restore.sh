#!/usr/bin/env bash
# ==============================================================================
# Gondar Hospital Management System (GHMS) - Database Restoration Script
# ==============================================================================
set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <path_to_backup_file> [target_database_name]"
    echo "Example: $0 /var/backups/ghms/ghms_20261115_020000.sql.gz.enc ghms_test"
    exit 1
fi

BACKUP_FILE="$1"
TARGET_DB="${2:-ghms_restoration_test}"
DB_USER="${DB_USER:-root}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
KEY_FILE="${KEY_FILE:-/etc/ghms/backup_key.bin}"

echo "======================================================================"
echo "GHMS DATABASE RESTORATION & DISASTER RECOVERY DRILL"
echo "======================================================================"
echo "Backup Source: ${BACKUP_FILE}"
echo "Target DB:     ${TARGET_DB}"
echo "Host:          ${DB_HOST}:${DB_PORT}"
echo "======================================================================"

# Verify Backup File Exists
if [[ ! -f "${BACKUP_FILE}" ]]; then
    echo "ERROR: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Verify Checksum if present
if [[ -f "${BACKUP_FILE}.sha256" ]]; then
    echo "--> Verifying SHA-256 checksum..."
    sha256sum -c "${BACKUP_FILE}.sha256"
    echo "SUCCESS: Checksum verified. Backup file has not been altered."
fi

# Decrypt if encrypted
RESTORE_SOURCE="${BACKUP_FILE}"
TMP_DECRYPTED="/tmp/ghms_restore_tmp.sql.gz"

if [[ "${BACKUP_FILE}" == *.enc ]]; then
    echo "--> Decrypting AES-256 encrypted dump..."
    if [[ ! -f "${KEY_FILE}" ]]; then
        echo "ERROR: Encryption key file '${KEY_FILE}' is required to decrypt this archive."
        exit 1
    fi
    openssl enc -d -aes-256-cbc -pbkdf2 \
      -in "${BACKUP_FILE}" \
      -out "${TMP_DECRYPTED}" \
      -pass "file:${KEY_FILE}"
    RESTORE_SOURCE="${TMP_DECRYPTED}"
fi

# Create target database if needed
echo "--> Creating target database '${TARGET_DB}' if it does not exist..."
mysql --host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}" -e \
  "CREATE DATABASE IF NOT EXISTS \`${TARGET_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Execute Import
echo "--> Restoring database structures and table data..."
gunzip < "${RESTORE_SOURCE}" | mysql --host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}" "${TARGET_DB}"

# Cleanup decrypted temp file
rm -f "${TMP_DECRYPTED}"

# Verification Query
TABLE_COUNT=$(mysql --host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}" -N -e \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='${TARGET_DB}';")

echo "======================================================================"
echo "RESTORATION COMPLETED SUCCESSFULLY"
echo "Total Tables Restored in '${TARGET_DB}': ${TABLE_COUNT} tables"
echo "======================================================================"
