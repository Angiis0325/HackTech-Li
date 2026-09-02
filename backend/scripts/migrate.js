const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const env = require("../src/config/env");

const migrations = [
  path.resolve(__dirname, "..", "database", "001_init_backend.sql"),
  path.resolve(__dirname, "..", "database", "002_audit_and_integrations.sql"),
  path.resolve(__dirname, "..", "database", "003_token_revocations.sql"),
  path.resolve(__dirname, "..", "database", "004_staff_channels_and_log_links.sql")
];

async function runMigration(client, migrationPath) {
  const sql = fs.readFileSync(migrationPath, "utf8");
  await client.query(sql);
  console.log(`[migrate] OK: ${path.basename(migrationPath)}`);
}

async function main() {
  const client = new Client({
    connectionString: env.databaseUrl
  });

  await client.connect();

  try {
    for (const migrationPath of migrations) {
      await runMigration(client, migrationPath);
    }
  } finally {
    await client.end();
  }

  console.log("[migrate] All migrations completed");
}

main().catch((error) => {
  console.error("[migrate] Failed:", error.message);
  process.exit(1);
});