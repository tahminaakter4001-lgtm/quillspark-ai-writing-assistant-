import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    })
  : null;

export async function migrateDatabase() {
  if (!pool) return false;

  const migrationsUrl = new URL("../migrations/", import.meta.url);
  const migrationFiles = (await readdir(migrationsUrl))
    .filter((file) => /^\d+_[a-z0-9_-]+\.sql$/i.test(file))
    .sort();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize startup migrations across multiple app instances.
    await client.query("SELECT pg_advisory_xact_lock(731904221)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const file of migrationFiles) {
      const alreadyApplied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE migration_name = $1",
        [file]
      );
      if (alreadyApplied.rowCount) continue;

      const sql = await readFile(new URL(file, migrationsUrl), "utf8");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (migration_name) VALUES ($1)",
        [file]
      );
    }

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function saveAudit(report, documentName) {
  if (!pool) return false;
  await pool.query(
    `INSERT INTO audit_reports (id, document_name, glossary_version, report)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [report.audit_id, documentName || null, report.glossary.version, JSON.stringify(report)]
  );
  return true;
}

export async function getAudit(auditId) {
  if (!pool) return null;
  const result = await pool.query(
    "SELECT report FROM audit_reports WHERE id = $1",
    [auditId]
  );
  return result.rows[0]?.report || null;
}

export async function saveReview({ auditId, findingId, reviewerId, decision, note }) {
  if (!pool) {
    const error = new Error("Persistent human review requires DATABASE_URL.");
    error.code = "DATABASE_NOT_CONFIGURED";
    throw error;
  }
  const result = await pool.query(
    `INSERT INTO human_reviews (audit_id, finding_id, reviewer_id, decision, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, audit_id, finding_id, reviewer_id, decision, note, created_at`,
    [auditId, findingId, reviewerId, decision, note || null]
  );
  return result.rows[0];
}

export async function listReviews(auditId) {
  if (!pool) return null;
  const result = await pool.query(
    `SELECT id, audit_id, finding_id, reviewer_id, decision, note, created_at
     FROM human_reviews WHERE audit_id = $1 ORDER BY created_at ASC, id ASC`,
    [auditId]
  );
  return result.rows;
}
