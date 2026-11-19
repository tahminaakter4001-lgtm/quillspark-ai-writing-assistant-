import { readFile } from "node:fs/promises";
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
  const migrationUrl = new URL("../migrations/001_init.sql", import.meta.url);
  const sql = await readFile(migrationUrl, "utf8");
  await pool.query(sql);
  return true;
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
