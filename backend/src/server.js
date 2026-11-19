import app from "./app.js";
import { migrateDatabase, pool } from "./db.js";

const required = ["QUILLSPARK_API_TOKEN"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}
if (process.env.QUILLSPARK_API_TOKEN.length < 32) {
  throw new Error("QUILLSPARK_API_TOKEN must contain at least 32 characters.");
}

const port = Number(process.env.PORT || 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}

if (pool) {
  await migrateDatabase();
  console.info("QuillSpark database migrations are ready.");
} else {
  console.warn("DATABASE_URL is not set; audit history and human-review persistence are disabled.");
}

const server = app.listen(port, "0.0.0.0", () => {
  console.info(`QuillSpark API listening on port ${port}.`);
});

async function shutdown(signal) {
  console.info(`Received ${signal}; shutting down.`);
  server.close(async () => {
    if (pool) await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
