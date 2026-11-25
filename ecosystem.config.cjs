// ==============================================================================
// Gondar Hospital Management System (GHMS) - PM2 Process Manager Configuration
// ==============================================================================
module.exports = {
  apps: [
    {
      name: "ghms-backend-api",
      script: "./dist/server.js",
      cwd: "./backend",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
    {
      name: "ghms-frontend-web",
      script: "npm",
      args: "run start:frontend",
      cwd: ".",
      instances: 2,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
    },
  ],
};
