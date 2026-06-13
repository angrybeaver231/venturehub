-- Task 9: Onboarding backend (PIN + email verification)
-- Adds pin_hash to users and creates email_verification_codes table.

ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash varchar;

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar NOT NULL,
  code_hash varchar NOT NULL,
  expires_at timestamp NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamp,
  created_at timestamp DEFAULT now()
);

ALTER TABLE email_verification_codes ADD COLUMN IF NOT EXISTS consumed_at timestamp;

CREATE INDEX IF NOT EXISTS idx_evc_email ON email_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_evc_email_created_at ON email_verification_codes(email, created_at);
