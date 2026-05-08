ALTER TABLE sent_logs
  ADD COLUMN IF NOT EXISTS resend_email_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sent_logs_resend_email_id ON sent_logs(resend_email_id);
