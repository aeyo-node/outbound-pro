-- ============================================================
-- Swaram Multi-Tenant Migration
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. BILLING PLANS
CREATE TABLE IF NOT EXISTS billing_plans (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price_inr   INTEGER NOT NULL,
  calls_limit INTEGER NOT NULL,  -- -1 = unlimited
  agents_limit INTEGER NOT NULL, -- -1 = unlimited
  features    JSONB NOT NULL DEFAULT '{}',
  sort_order  INTEGER DEFAULT 0
);

INSERT INTO billing_plans (id, name, price_inr, calls_limit, agents_limit, features, sort_order)
VALUES
  ('starter',    'Starter',    999,   300,   1, '{"campaigns":true,"active_campaigns":2,"recordings":false,"live_monitoring":false,"crm":true,"analytics":"basic","support":"email"}', 1),
  ('growth',     'Growth',     4999,  1500,  3, '{"campaigns":true,"active_campaigns":10,"recordings":true,"live_monitoring":true,"crm":true,"analytics":"full","support":"priority","custom_sip":false}', 2),
  ('enterprise', 'Enterprise', 9999,  5000, -1, '{"campaigns":true,"active_campaigns":-1,"recordings":true,"live_monitoring":true,"crm":true,"analytics":"full","support":"dedicated","custom_sip":true,"api_access":true}', 3)
ON CONFLICT (id) DO UPDATE SET
  price_inr = EXCLUDED.price_inr,
  calls_limit = EXCLUDED.calls_limit,
  agents_limit = EXCLUDED.agents_limit,
  features = EXCLUDED.features;

-- 2. TENANTS (client companies)
CREATE TABLE IF NOT EXISTS tenants (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  plan_id      TEXT REFERENCES billing_plans(id) DEFAULT 'starter',
  status       TEXT NOT NULL DEFAULT 'active',  -- active | suspended | trial
  calls_used   INTEGER DEFAULT 0,
  settings     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the default super-admin tenant (your company)
INSERT INTO tenants (id, name, email, plan_id, status)
VALUES ('system', 'Swaram AI (Super Admin)', 'admin@swaram.io', 'enterprise', 'active')
ON CONFLICT (id) DO NOTHING;

-- 3. USERS
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  tenant_id   TEXT REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  role        TEXT NOT NULL DEFAULT 'admin',  -- superadmin | admin | viewer
  name        TEXT,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert super admin user (password: swaram360@)
-- Hash generated with bcrypt rounds=12 for 'swaram360@'
-- We store as plaintext marker here; auth.py will handle this on first login
INSERT INTO users (id, email, password_hash, tenant_id, role, name)
VALUES (
  'superadmin',
  'admin@swaram.io',
  '$PLAINTEXT$swaram360@',  -- auth.py will re-hash on first login
  'system',
  'superadmin',
  'Super Admin'
)
ON CONFLICT (email) DO NOTHING;

-- 4. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id    TEXT REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  plan_id      TEXT REFERENCES billing_plans(id) NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',  -- active | expired | cancelled
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  payment_ref  TEXT,
  amount_paid  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Super admin has enterprise subscription
INSERT INTO subscriptions (tenant_id, plan_id, status, expires_at)
VALUES ('system', 'enterprise', 'active', '2099-12-31')
ON CONFLICT DO NOTHING;

-- 5. PHONE NUMBERS (per-tenant SIP/Twilio config)
CREATE TABLE IF NOT EXISTS phone_numbers (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id    TEXT REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  label        TEXT NOT NULL DEFAULT 'Primary',
  provider     TEXT NOT NULL DEFAULT 'default',  -- default | sip | twilio
  number       TEXT,
  trunk_id     TEXT,  -- LiveKit SIP trunk ID
  is_active    BOOLEAN DEFAULT true,
  credentials  JSONB DEFAULT '{}',  -- encrypted in production
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SESSION TOKENS (simple auth)
CREATE TABLE IF NOT EXISTS sessions (
  token        TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  tenant_id    TEXT REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  role         TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ADD tenant_id TO EXISTING TABLES
-- (safe: adds column if not exists, defaults to 'system' for existing rows)

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'system';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'system';
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'system';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'system';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'system';
ALTER TABLE incoming_calls ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'system';

-- Update any NULL tenant_ids to 'system'
UPDATE call_logs SET tenant_id = 'system' WHERE tenant_id IS NULL;
UPDATE campaigns SET tenant_id = 'system' WHERE tenant_id IS NULL;
UPDATE agent_profiles SET tenant_id = 'system' WHERE tenant_id IS NULL;
UPDATE contacts SET tenant_id = 'system' WHERE tenant_id IS NULL;
UPDATE appointments SET tenant_id = 'system' WHERE tenant_id IS NULL;
UPDATE incoming_calls SET tenant_id = 'system' WHERE tenant_id IS NULL;

-- 8. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant ON call_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_tenant ON agent_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);

-- Done!
SELECT 'Migration complete! Tables created: billing_plans, tenants, users, subscriptions, phone_numbers, sessions' AS status;
