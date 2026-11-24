CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY,
  customer_id TEXT NOT NULL,
  product_code TEXT NOT NULL,
  amount_poisha BIGINT NOT NULL CHECK (amount_poisha > 0),
  currency CHAR(3) NOT NULL DEFAULT 'BDT' CHECK (currency = 'BDT'),
  provider TEXT NOT NULL DEFAULT 'bkash' CHECK (provider = 'bkash'),
  merchant_invoice_number TEXT NOT NULL UNIQUE,
  provider_payment_id TEXT UNIQUE,
  provider_transaction_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'pending', 'verification_required', 'succeeded', 'failed', 'cancelled', 'expired')),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payments_customer_created_idx
  ON payments (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payments_status_created_idx
  ON payments (status, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_events (
  id BIGSERIAL PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL CHECK (event_source IN ('system', 'bkash')),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_events_payment_created_idx
  ON payment_events (payment_id, created_at ASC);
