CREATE TABLE IF NOT EXISTS manus_tasks (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  tenant_id TEXT,
  provider_task_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  task_url TEXT,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('queued', 'running', 'waiting', 'completed', 'failed', 'unknown')),
  prompt_digest TEXT,
  result_summary TEXT,
  last_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS manus_tasks_owner_created_idx
  ON manus_tasks (owner_user_id, tenant_id, created_at DESC);
CREATE TABLE IF NOT EXISTS manus_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  provider_task_id TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS manus_webhook_task_idx
  ON manus_webhook_events (provider_task_id, received_at DESC);
