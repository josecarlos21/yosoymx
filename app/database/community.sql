CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('comment', 'history')),
  display_name TEXT NOT NULL,
  email_hash TEXT,
  ip_hash TEXT,
  source_fingerprint TEXT,
  category TEXT,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'local',
  moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'hidden')),
  approved INTEGER NOT NULL DEFAULT 1,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_posts_kind_created
  ON community_posts (kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_approved
  ON community_posts (approved);

CREATE INDEX IF NOT EXISTS idx_community_posts_moderation_status
  ON community_posts (moderation_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
  ON community_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_ip_hash_created
  ON community_posts (ip_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_email_hash_created
  ON community_posts (email_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_source_fingerprint
  ON community_posts (source_fingerprint);

CREATE TABLE IF NOT EXISTS admin_editions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_editions_created_at
  ON admin_editions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_editions_status
  ON admin_editions (status);
