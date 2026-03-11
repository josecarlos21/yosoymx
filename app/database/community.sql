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

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'review_ready', 'published', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  label TEXT NOT NULL,
  location TEXT NOT NULL,
  theme_line TEXT NOT NULL,
  content_json TEXT NOT NULL,
  brand_overrides_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_issues_status_published
  ON issues (status, published_at DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_issues_updated_at
  ON issues (updated_at DESC);

CREATE TABLE IF NOT EXISTS brand_config (
  id TEXT PRIMARY KEY,
  site_name TEXT NOT NULL,
  masthead TEXT NOT NULL,
  short_masthead TEXT NOT NULL,
  theme_mode TEXT NOT NULL,
  support_links_json TEXT NOT NULL,
  default_og_asset_id TEXT NOT NULL DEFAULT '',
  logo_asset_id TEXT NOT NULL DEFAULT '',
  web_icon_pack_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'og', 'icon', 'logo', 'pdf', 'document')),
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  alt TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  r2_key TEXT NOT NULL,
  variants_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('uploaded', 'processed', 'active', 'replaced')),
  original_file_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_assets_status_updated
  ON media_assets (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_assets_kind_updated
  ON media_assets (kind, updated_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON audit_log (created_at DESC);
