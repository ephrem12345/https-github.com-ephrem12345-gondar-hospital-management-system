/**
 * GHMS Safe Build & Cache Cleaner
 * Safely removes isolated development or production build directories
 * without throwing fatal exceptions if Windows file locks are present.
 */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const devDir = path.join(projectRoot, ".next-dev");
const prodDir = path.join(projectRoot, ".next");

function cleanDir(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
    return;
  } catch (err) {
    // If the folder itself is held, attempt cleaning internal items
  }

  try {
    const items = fs.readdirSync(targetPath);
    for (const item of items) {
      const itemPath = path.join(targetPath, item);
      try {
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          fs.rmSync(itemPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(itemPath);
        }
      } catch {
        // Ignored for locked files on Windows
      }
    }
  } catch {
    // Ignored
  }
}

const args = process.argv.slice(2);
const cleanAll = args.includes("--all");
const cleanProd = args.includes("--prod") || cleanAll;
const cleanDev = args.includes("--dev") || (!args.includes("--prod"));

try {
  if (cleanDev) {
    cleanDir(devDir);
  }
  if (cleanProd) {
    cleanDir(prodDir);
  }
} catch (error) {
  // Never crash pre-hooks
}
