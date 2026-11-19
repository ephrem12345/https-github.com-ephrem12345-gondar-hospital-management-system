import { createApp, env } from "./app.js";
import { logger } from "./config/logger.js";
import { prisma } from "./config/prisma.js";
import { startSubscriptionJobs } from "./modules/saas/jobs.js";

let app: ReturnType<typeof createApp>;
try {
  app = createApp(prisma);
} catch (error) {
  logger.fatal({ err: error }, "GHMS Backend failed during application initialization");
  console.error("[GHMS] Fatal: the API could not be initialized. See the error above.");
  process.exit(1);
}

const stopJobs = startSubscriptionJobs(prisma);
const server = app.listen(env.PORT);

server.on("listening", () => {
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : env.PORT;
  const apiUrl = `http://localhost:${port}/api/v1`;

  logger.info({ port, environment: env.NODE_ENV }, "GHMS Backend Started Successfully");

  // The banner is intentionally written with console.log so it is always
  // visible, even when LOG_LEVEL is configured above "info".
  console.log(
    [
      "",
      "============================================================",
      " GHMS Backend Started Successfully",
      ` Environment: ${env.NODE_ENV}`,
      ` Port: ${port}`,
      ` API: ${apiUrl}`,
      ` Health: ${apiUrl}/health`,
      ` Readiness: ${apiUrl}/ready`,
      "============================================================",
      "",
    ].join("\n"),
  );
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    logger.error(
      { err: error, port: env.PORT },
      `GHMS Backend cannot start: port ${env.PORT} is already in use. Stop the process using it or set a different PORT in backend/.env.`,
    );
    console.error(
      `[GHMS] Fatal: port ${env.PORT} is already in use. ` +
        `Run "Get-NetTCPConnection -LocalPort ${env.PORT}" to find the process.`,
    );
  } else if (error.code === "EACCES") {
    logger.error(
      { err: error, port: env.PORT },
      `GHMS Backend cannot bind to port ${env.PORT}: permission denied.`,
    );
    console.error(`[GHMS] Fatal: permission denied binding to port ${env.PORT}.`);
  } else {
    logger.error({ err: error, port: env.PORT }, "GHMS Backend failed to start");
    console.error(`[GHMS] Fatal: ${error.message}`);
  }

  void prisma.$disconnect().finally(() => process.exit(1));
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down GHMS API");
  stopJobs();
  server.close(async (error) => {
    if (error) logger.error({ err: error }, "HTTP server close failed");
    await prisma.$disconnect();
    process.exit(error ? 1 : 0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception - shutting down GHMS Backend");
  console.error(`[GHMS] Fatal uncaught exception: ${error.message}`);
  void prisma.$disconnect().finally(() => process.exit(1));
});
