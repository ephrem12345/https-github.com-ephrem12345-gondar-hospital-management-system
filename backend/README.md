# GHMS backend

## Current implementation

The backend is an Express, TypeScript, Prisma, and MySQL application. It currently exposes:

- `GET /api/v1/health` and `GET /api/v1/ready`
- Partial authentication APIs: login, patient self-registration, logout, refresh, change password, and current user
- Appointment, doctor schedule/availability, and queue APIs
- Emergency registration, triage history, workflow transitions, emergency reports, and resource assignments
- Specialist department assignment, workflow-record, and report APIs
- Patient portal APIs: dashboard bundle, profile (read + contact-only update), own appointments (request, reschedule, cancel), visits, released records (diagnoses and released laboratory results), billing, notifications (list, unread count, mark one/all read), announcements, and support requests. Every portal endpoint is scoped to the authenticated patient record; staff roles receive 403.
- In-app notification delivery writes `PortalNotification` rows. Email and SMS channels are prepared stubs that report `PROVIDER_NOT_CONFIGURED` until a provider is configured.

Protected APIs require a valid access token or `ghms_access` HttpOnly cookie. Login and refresh issue short-lived JWT access cookies and rotate opaque, hashed refresh tokens. Public registration always creates a pending `PATIENT` account; a hospital administrator must activate it before login. Password reset is intentionally unavailable (HTTP 503) until a verified email/SMS delivery provider is configured. User administration/activation, profile updates, and broader frontend integration are not implemented.

The Prisma schema contains additional clinical, laboratory, radiology, blood bank, finance, HR, and portal models. Their CRUD services and routes are not implemented yet; model presence does not mean those modules are operational.

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to a MySQL database.
2. Set `JWT_ACCESS_SECRET` to a private random value of at least 32 characters.
3. Install dependencies with `npm install`.
4. Validate and generate the Prisma client:

   ```powershell
   npx prisma validate
   npx prisma generate
   ```

5. Apply a reviewed migration before serving requests:

   ```powershell
   npx prisma migrate dev --name backend-foundation
   ```

6. Run `npm run dev`, then check `http://localhost:4000/api/v1/health` and `/api/v1/ready`.

The migration has not been applied and the application has not been verified against a running MySQL database. Review the schema and migration plan before applying it to any database with existing data.

## Validation

`npm run typecheck` compiles the current backend source. `npm test` runs backend Vitest tests. These checks do not replace database-backed integration tests, authentication tests, security review, or clinical workflow approval.
