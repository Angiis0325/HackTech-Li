const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const env = require("../src/config/env");
const { freePort } = require("./free-port");

async function main() {
  const pids = await freePort(env.port);

  if (pids.length) {
    console.log(`[dev] Freed port ${env.port} (stopped PID: ${pids.join(", ")})`);
  } else {
    console.log(`[dev] Port ${env.port} is already free`);
  }

  const nodemonJs = path.resolve(
    __dirname,
    "..",
    "node_modules",
    "nodemon",
    "bin",
    "nodemon.js"
  );

  if (!fs.existsSync(nodemonJs)) {
    throw new Error("nodemon is not installed. Run npm install first.");
  }

  const child = spawn(process.execPath, [nodemonJs, "src/server.js"], {
    stdio: "inherit",
    env: process.env
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

main().catch((error) => {
  console.error("[dev] Failed to start development server:", error);
  process.exit(1);
});
