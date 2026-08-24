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
// HOST unset (or 0.0.0.0) => listen on ALL interfaces. We bind without an
// explicit host so Node uses dual-stack (:: + IPv4), which covers both
// 127.0.0.1 AND ::1 — important because on Windows `localhost` resolves to
// IPv6 ::1 first, and an IPv4-only 0.0.0.0 listener would leave the browser
// hanging. Set HOST=127.0.0.1 to restrict to loopback only.
const host = process.env.HOST && process.env.HOST !== "0.0.0.0" ? process.env.HOST : undefined;

const app = next({ dev: false, dir: webRoot, hostname: host, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = createServer((req, res) => handle(req, res));
    const ready = () => {
      const shown = host || "localhost";
      console.log(`Defter production server ready on http://${shown}:${port}`);
    };
    if (host) {
      server.listen(port, host, ready);
    } else {
      server.listen(port, ready); // all interfaces, dual-stack (IPv4 + IPv6)
    }
  })
  .catch((err) => {
    console.error("Defter failed to start:", err);
    process.exit(1);
  });
