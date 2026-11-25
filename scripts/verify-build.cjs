/**
 * GHMS Production Build Verifier
 * Verifies that a complete, successful Next.js production build exists
 * before `npm run start` or production launchers execute.
 */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const prodDir = path.join(projectRoot, ".next");
const buildIdFile = path.join(prodDir, "BUILD_ID");
const buildManifest = path.join(prodDir, "build-manifest.json");
const serverDir = path.join(prodDir, "server");

if (!fs.existsSync(prodDir) || !fs.existsSync(buildIdFile) || !fs.existsSync(buildManifest) || !fs.existsSync(serverDir)) {
  console.error("\x1b[31m[ERROR] No valid production build found in '.next' directory.\x1b[0m");
  console.error("\x1b[33mPlease execute 'npm run build' to generate the production build artifacts before starting the production server.\x1b[0m");
  process.exit(1);
}

try {
  const buildId = fs.readFileSync(buildIdFile, "utf8").trim();
  if (!buildId) {
    console.error("\x1b[31m[ERROR] Corrupted BUILD_ID found in '.next'. Run 'npm run build' to rebuild.\x1b[0m");
    process.exit(1);
  }
} catch {
  console.error("\x1b[31m[ERROR] Unable to verify BUILD_ID in '.next'.\x1b[0m");
  process.exit(1);
}

console.log("\x1b[32m[OK] Verified production build artifacts in '.next'.\x1b[0m");
