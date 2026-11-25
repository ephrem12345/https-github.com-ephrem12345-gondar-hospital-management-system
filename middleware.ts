/**
 * GHMS Authoritative Next.js Edge Middleware
 * Explicitly forwards to src/middleware.ts to ensure identical, strict RBAC
 * and token expiration enforcement across all Next.js compilation targets.
 */
export { middleware, config } from "./src/middleware";

