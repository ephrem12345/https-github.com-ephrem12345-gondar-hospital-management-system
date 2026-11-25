# Gondar Hospital Management System (GHMS)
## Stage 3: Database Setup & Operations Guide

This guide describes how to configure, migrate, seed, and verify the MySQL database for GHMS.

---

## 1. Prerequisites
- **MySQL Server:** Version 8.0 or newer (or MariaDB 10.5+).
- **Node.js:** v18.x or v20+ (tested with Node.js v24 LTS).
- **XAMPP / Standalone MySQL:** Running and listening on `localhost:3306`.

---

## 2. Environment Configuration
Verify or create `backend/.env` with the following variables:

```ini
NODE_ENV=development
PORT=4000
WEB_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://127.0.0.1:3002
DATABASE_URL="mysql://ghms_user:<db-password>@localhost:3306/ghms?connection_limit=20&pool_timeout=10"
JWT_ACCESS_SECRET="<generate-secure-random-64-character-secret>"
JWT_ACCESS_TTL_SECONDS=900
COOKIE_SECURE=false
LOG_LEVEL=warn
GHMS_SEED_STAFF_PASSWORD="<choose-secure-staff-password>"
GHMS_SEED_PATIENT_PASSWORD="<choose-secure-patient-password>"
```

---

## 3. Database Initialization & User Setup

If starting from a fresh MySQL installation, create the database and user:

```sql
CREATE DATABASE IF NOT EXISTS ghms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'ghms_user'@'localhost' IDENTIFIED BY '<secure-db-password>';
GRANT ALL PRIVILEGES ON ghms.* TO 'ghms_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 4. Migration Execution

To apply all migrations to the database:

```bash
# In the project root (DATABASE_URL is read from backend/.env):
npx --prefix backend prisma migrate deploy --schema backend/prisma/schema.prisma
```

To generate the Prisma client after schema changes:

```bash
npx --prefix backend prisma generate --schema backend/prisma/schema.prisma
```

---

## 5. Synthetic Database Seeding

Populate the database with verified roles, departments, test accounts, clinical wards, beds, pharmacy catalog, batches, and operations data. Seed passwords are read from `GHMS_SEED_STAFF_PASSWORD` and `GHMS_SEED_PATIENT_PASSWORD` in `backend/.env` (if not set in development, cryptographically secure random passwords will be generated and printed once to stdout):

```bash
npx --prefix backend tsx backend/prisma/seed.ts
```

### Verified Test Accounts Seeded:
| Role | Email / Identifier | Password | Dashboard Redirect |
| :--- | :--- | :--- | :--- |
| **Administrator** | `abebe.bekele@gondar-hospital.et` (`admin`) | `<GHMS_SEED_STAFF_PASSWORD>` | `/overview` |
| **Doctor** | `selam.girma@gondar-hospital.et` (`selam.girma`) | `<GHMS_SEED_STAFF_PASSWORD>` | `/clinical/consultations` |
| **Nurse** | `tigist.alemu@gondar-hospital.et` (`tigist.alemu`) | `<GHMS_SEED_STAFF_PASSWORD>` | `/clinical/nursing-station` |
| **Laboratory** | `getu.assefa@gondar-hospital.et` (`getu.assefa`) | `<GHMS_SEED_STAFF_PASSWORD>` | `/diagnostics/laboratory` |
| **Pharmacist** | `liya.tesfaye@gondar-hospital.et` (`liya.tesfaye`) | `<GHMS_SEED_STAFF_PASSWORD>` | `/pharmacy/dispensary` |
| **Receptionist** | `receptionist@gondar-hospital.et` (`receptionist`) | `<GHMS_SEED_STAFF_PASSWORD>` | `/appointments/queue` |
| **Finance** | `hanif.jemal@gondar-hospital.et` (`hanif.jemal`) | `<GHMS_SEED_STAFF_PASSWORD>` | `/finance/invoicing` |
| **Patient** | `patient@gondar-hospital.et` (`patient`) | `<GHMS_SEED_PATIENT_PASSWORD>` | `/patient-portal` |

---

## 6. Verification and Audit Suite

Execute the database verification suite to test connectivity, referential integrity, constraints, ACID transactions, and query latency:

```bash
npx --prefix backend tsx backend/scripts/verify-db-integrity.ts
```

Expected result:
```
==================================================
VERIFICATION SUMMARY: 15 PASSED, 0 FAILED
==================================================
```

---

## 7. Starting the Application

```bash
# Terminal 1: Backend Server (Port 4000)
npm --prefix backend run dev

# Terminal 2: Frontend Server (Port 3002)
npx next dev -p 3002
```

Navigate to [http://localhost:3002](http://localhost:3002) in your browser.
