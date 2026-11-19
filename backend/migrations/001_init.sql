CREATE TABLE IF NOT EXISTS audit_reports (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  document_name TEXT,
  glossary_version TEXT NOT NULL,
  report JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_reports_created_at_idx
  ON audit_reports (created_at DESC);

CREATE TABLE IF NOT EXISTS human_reviews (
  id BIGSERIAL PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES audit_reports(id) ON DELETE CASCADE,
  finding_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject', 'revise', 'defer')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS human_reviews_audit_id_idx
  ON human_reviews (audit_id, created_at ASC);
