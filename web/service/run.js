/**
 * Defter — production server entrypoint.
 *
 * Single-process Next.js production server, suitable for running under a
 * Windows Service (node-windows). It:
 *   1. pins the working directory to the web root (so .env and .next resolve
 *      even when launched by the Service Control Manager from System32),
 *   2. loads .env / .env.production before anything reads process.env
 *      (Prisma reads DATABASE_URL at import time),
 *   3. starts Next.js in production mode.
 *
 * You can run this directly to test production locally:
 *   npm run build && npm run start:prod
 */
const path = require("path");
const { createServer } = require("http");

const webRoot = path.join(__dirname, "..");
process.chdir(webRoot);

// Load environment variables the same way `next start` would.
require("@next/env").loadEnvConfig(webRoot, false);

const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOST || "0.0.0.0";

const app = next({ dev: false, dir: webRoot, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
      const shown = hostname === "0.0.0.0" ? "localhost" : hostname;
      console.log(`Defter production server ready on http://${shown}:${port}`);
    });
  })
  .catch((err) => {
    console.error("Defter failed to start:", err);
    process.exit(1);
  });
