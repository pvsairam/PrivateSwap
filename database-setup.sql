-- PrivateSwap Database Schema
-- Run these commands in your PostgreSQL database before deploying

-- Table: users (for authentication)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

-- Table: faucet_claims (tracks token claims with cooldown)
CREATE TABLE IF NOT EXISTS faucet_claims (
  id SERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  token TEXT NOT NULL,
  amount TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  claimed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for faster lookups by address and claim time
CREATE INDEX IF NOT EXISTS idx_faucet_claims_address_time 
  ON faucet_claims(address, claimed_at DESC);

-- Table: faucet_settings (faucet configuration)
CREATE TABLE IF NOT EXISTS faucet_settings (
  id SERIAL PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  cooldown_hours INTEGER NOT NULL DEFAULT 24,
  pusd_amount TEXT NOT NULL DEFAULT '1000',
  peth_amount TEXT NOT NULL DEFAULT '0.5'
);

-- Insert default faucet settings (only if table is empty)
INSERT INTO faucet_settings (enabled, cooldown_hours, pusd_amount, peth_amount)
SELECT true, 24, '1000', '0.5'
WHERE NOT EXISTS (SELECT 1 FROM faucet_settings LIMIT 1);

-- Verify tables created
SELECT 
  'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 
  'faucet_claims', COUNT(*) FROM faucet_claims
UNION ALL
SELECT 
  'faucet_settings', COUNT(*) FROM faucet_settings;
