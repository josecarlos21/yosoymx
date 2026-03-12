/* eslint-disable no-unused-vars */
import fallbackBrandConfigJson from "../../../shared/content/brand-config.json" with { type: "json" };
import fallbackIssueContentJson from "../../../shared/content/issue-content.json" with { type: "json" };

type D1RunResult = { success?: boolean };

type D1BoundStatement = {
  all: () => Promise<{ results?: Record<string, unknown>[] }>;
  first: () => Promise<Record<string, unknown> | null>;
  run: () => Promise<D1RunResult>;
};

type D1Database = {
  prepare: (query: string) => {
    bind: (...args: unknown[]) => D1BoundStatement;
  };
};

type R2ObjectBody = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
  writeHttpMetadata?: (headers: Headers) => void;
};

type R2BucketBinding = {
  get: (key: string) => Promise<R2ObjectBody | null>;
  put: (
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }
  ) => Promise<void>;
};

export type CmsEnv = {
  DB?: D1Database;
  MEDIA_BUCKET?: R2BucketBinding;
  ADMIN_TOKEN?: string;
  ORIGIN_SITE?: string;
};

export type CommunityKind = "comment" | "history";
export type EditionStatus = "draft" | "review_ready" | "published" | "archived";
export type MediaAssetStatus = "uploaded" | "processed" | "active" | "replaced";
export type MediaAssetKind = "image" | "og" | "icon" | "logo" | "pdf" | "document";

export type IssueContent = typeof fallbackIssueContentJson;
export type BrandConfig = typeof fallbackBrandConfigJson;

export type EditionRecord = {
  id: string;
  slug: string;
  status: EditionStatus;
  version: number;
  publishedAt: string | null;
  label: string;
  location: string;
  themeLine: string;
  socialAssetId: string | null;
  contentPayload: IssueContent;
  brandOverrides: Partial<BrandConfig> | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicIssueSummary = {
  id: string;
  slug: string;
  status: Extract<EditionStatus, "published" | "archived">;
  version: number;
  publishedAt: string | null;
  label: string;
  location: string;
  themeLine: string;
  title: string;
  summary: string;
  articleLabel: string;
};

export type IssuePreflightReport = {
  blockers: string[];
  warnings: string[];
};

export class IssueWorkflowError extends Error {
  readonly code: string;
  readonly status: number;
  readonly report?: IssuePreflightReport;

  constructor(message: string, code: string, status = 400, report?: IssuePreflightReport) {
    super(message);
    this.name = "IssueWorkflowError";
    this.code = code;
    this.status = status;
    this.report = report;
  }
}

export type MediaAssetRecord = {
  id: string;
  kind: MediaAssetKind;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  alt: string;
  caption: string;
  r2Key: string;
  variants: Record<string, string>;
  status: MediaAssetStatus;
  originalFileName: string;
  publicUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityRecord = {
  id: string;
  scope: string;
  action: string;
  targetId: string;
  summary: Record<string, unknown>;
  createdAt: string;
};

export type UploadRequestPayload = {
  fileName?: unknown;
  mimeType?: unknown;
  kind?: unknown;
  width?: unknown;
  height?: unknown;
  sizeBytes?: unknown;
  alt?: unknown;
  caption?: unknown;
};

const headers = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "cache-control": "no-store",
} as const;

const fallbackIssueContent = fallbackIssueContentJson as IssueContent;
const fallbackBrandConfig = fallbackBrandConfigJson as BrandConfig;

const MAX_SLUG_LENGTH = 120;
const MAX_LABEL_LENGTH = 120;
const MAX_LOCATION_LENGTH = 120;
const MAX_THEME_LINE_LENGTH = 160;
const MAX_FILE_NAME_LENGTH = 180;
const MAX_ALT_LENGTH = 220;
const MAX_CAPTION_LENGTH = 280;
const MAX_ACTIVITY_LIMIT = 80;
/* eslint-enable no-unused-vars */

function stripControlCharacters(value: string) {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || (code >= 32 && code !== 127);
    })
    .join("");
}

export function jsonResponse(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers });
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers });
}

export function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return "";
}

export function requireAdminAuth(request: Request, expectedToken?: string) {
  return Boolean(expectedToken && extractBearerToken(request) === expectedToken);
}

export function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return stripControlCharacters(
    value
      .normalize("NFKC")
      .replace(/\r\n?/g, "\n")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

export function normalizeSlug(value: unknown, fallback = fallbackIssueContent.id) {
  const raw = sanitizeText(value, MAX_SLUG_LENGTH)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return raw || fallback;
}

export function normalizeEditionStatus(value: unknown): EditionStatus | "" {
  return value === "draft" || value === "review_ready" || value === "published" || value === "archived" ? value : "";
}

function normalizeOptionalAssetId(value: unknown) {
  const normalized = sanitizeText(value, 120);
  return normalized || null;
}

export function normalizeMediaKind(value: unknown): MediaAssetKind | "" {
  return value === "image" ||
    value === "og" ||
    value === "icon" ||
    value === "logo" ||
    value === "pdf" ||
    value === "document"
    ? value
    : "";
}

export function normalizeMediaStatus(value: unknown): MediaAssetStatus | "" {
  return value === "uploaded" || value === "processed" || value === "active" || value === "replaced" ? value : "";
}

export function parseLimit(raw: string | null, fallback: number, min = 1, max = 200) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") return null;
    return body as T;
  } catch {
    return null;
  }
}

function safeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isPathOrHttpUrl(value: string) {
  return value.startsWith("/") || isHttpUrl(value);
}

function collectStrings(value: unknown, bag: string[] = []) {
  if (typeof value === "string") {
    bag.push(value);
    return bag;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectStrings(entry, bag));
    return bag;
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((entry) => collectStrings(entry, bag));
  }
  return bag;
}

function containsPlaceholderContent(content: IssueContent) {
  const haystack = collectStrings(content)
    .join(" \n ")
    .toLowerCase();
  return ["placeholder", "demo", "muestra local", "pendiente"].some((marker) => haystack.includes(marker));
}

function nextId(prefix: string) {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${randomPart}`;
}

function originSiteFromRequest(request: Request, env: CmsEnv) {
  if (env.ORIGIN_SITE?.trim()) return env.ORIGIN_SITE.trim().replace(/\/+$/, "");
  return new URL(request.url).origin;
}

function mediaPublicUrl(request: Request, env: CmsEnv, assetId: string) {
  return `${originSiteFromRequest(request, env)}/api/media/${assetId}`;
}

function fallbackEditionRecord(): EditionRecord {
  const publishedAt = fallbackIssueContent.metadata.publishedDateISO || null;
  return {
    id: fallbackIssueContent.id,
    slug: fallbackIssueContent.id,
    status: "published",
    version: Number.parseInt(fallbackIssueContent.metadata.version.split(".")[0] ?? "1", 10) || 1,
    publishedAt,
    label: fallbackIssueContent.metadata.editionLabel,
    location: fallbackIssueContent.metadata.location,
    themeLine: fallbackIssueContent.metadata.coverThemeLine,
    socialAssetId: null,
    contentPayload: fallbackIssueContent,
    brandOverrides: null,
    createdAt: publishedAt ?? nowIso(),
    updatedAt: publishedAt ?? nowIso(),
  };
}

function mergeBrandConfig(base: BrandConfig, overrides: Partial<BrandConfig> | null) {
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    supportLinks: {
      ...base.supportLinks,
      ...(overrides.supportLinks ?? {}),
    },
    webIconPack: {
      ...base.webIconPack,
      ...(overrides.webIconPack ?? {}),
    },
  };
}

function toPublicIssueSummary(item: EditionRecord): PublicIssueSummary {
  return {
    id: item.id,
    slug: item.slug,
    status: item.status === "published" ? "published" : "archived",
    version: item.version,
    publishedAt: item.publishedAt,
    label: item.label,
    location: item.location,
    themeLine: item.themeLine,
    title: sanitizeText(item.contentPayload.share?.title, 220) || sanitizeText(item.contentPayload.cover?.title, 220) || item.label,
    summary:
      sanitizeText(item.contentPayload.share?.summary, 420) ||
      sanitizeText(item.contentPayload.cover?.summary, 420) ||
      sanitizeText(item.contentPayload.metadata?.description, 420),
    articleLabel: sanitizeText(item.contentPayload.metadata?.articleLabel, 160),
  };
}

export function fallbackBrandRecord() {
  return fallbackBrandConfig;
}

async function ensureIssuesSchema(db: D1Database) {
  const result = await db.prepare("PRAGMA table_info(issues)").bind().all();
  const columns = new Set(
    (result.results ?? [])
      .map((row) => (typeof row.name === "string" ? row.name : ""))
      .filter(Boolean)
  );

  if (!columns.has("social_asset_id")) {
    await db.prepare("ALTER TABLE issues ADD COLUMN social_asset_id TEXT").bind().run();
  }
}

export async function ensureCmsSeed(db: D1Database) {
  await ensureIssuesSchema(db);
  const issuesCount = await db.prepare("SELECT COUNT(*) AS count FROM issues").bind().first();
  const brandCount = await db.prepare("SELECT COUNT(*) AS count FROM brand_config").bind().first();

  const totalIssues = safeNumber(issuesCount?.count) ?? 0;
  const totalBrands = safeNumber(brandCount?.count) ?? 0;

  if (totalIssues <= 0) {
    const seed = fallbackEditionRecord();
    await db
      .prepare(
        `
        INSERT INTO issues (
          id,
          slug,
          status,
          version,
          published_at,
          label,
          location,
          theme_line,
          social_asset_id,
          content_json,
          brand_overrides_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        seed.id,
        seed.slug,
        seed.status,
        seed.version,
        seed.publishedAt,
        seed.label,
        seed.location,
        seed.themeLine,
        seed.socialAssetId,
        JSON.stringify(seed.contentPayload),
        JSON.stringify(seed.brandOverrides),
        seed.createdAt,
        seed.updatedAt
      )
      .run();
  }

  if (totalBrands <= 0) {
    await db
      .prepare(
        `
        INSERT INTO brand_config (
          id,
          site_name,
          masthead,
          short_masthead,
          theme_mode,
          support_links_json,
          default_og_asset_id,
          logo_asset_id,
          web_icon_pack_json,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        fallbackBrandConfig.id,
        fallbackBrandConfig.siteName,
        fallbackBrandConfig.masthead,
        fallbackBrandConfig.shortMasthead,
        fallbackBrandConfig.themeMode,
        JSON.stringify(fallbackBrandConfig.supportLinks),
        fallbackBrandConfig.defaultOgAssetId,
        fallbackBrandConfig.logoAssetId,
        JSON.stringify(fallbackBrandConfig.webIconPack),
        nowIso()
      )
      .run();
  }
}

function mapEditionRow(row: Record<string, unknown>): EditionRecord | null {
  const id = sanitizeText(row.id, 120);
  const slug = normalizeSlug(row.slug, "");
  const status = normalizeEditionStatus(row.status);
  const version = safeNumber(row.version) ?? 1;
  const label = sanitizeText(row.label, MAX_LABEL_LENGTH);
  const location = sanitizeText(row.location, MAX_LOCATION_LENGTH);
  const themeLine = sanitizeText(row.theme_line, MAX_THEME_LINE_LENGTH);
  const socialAssetId = normalizeOptionalAssetId(row.social_asset_id);
  const createdAt = typeof row.created_at === "string" ? row.created_at : "";
  const updatedAt = typeof row.updated_at === "string" ? row.updated_at : createdAt;
  const publishedAt = typeof row.published_at === "string" && row.published_at ? row.published_at : null;
  const contentPayload = parseJsonValue<IssueContent>(row.content_json, fallbackIssueContent);
  const brandOverrides = parseJsonValue<Partial<BrandConfig> | null>(row.brand_overrides_json, null);

  if (!id || !slug || !status || !label || !location || !themeLine || !createdAt || Number.isNaN(Date.parse(createdAt))) {
    return null;
  }

  return {
    id,
    slug,
    status,
    version,
    publishedAt,
    label,
    location,
    themeLine,
    socialAssetId,
    contentPayload,
    brandOverrides,
    createdAt,
    updatedAt,
  };
}

function mapBrandRow(row: Record<string, unknown>): BrandConfig | null {
  const id = sanitizeText(row.id, 80);
  const siteName = sanitizeText(row.site_name, 120);
  const masthead = sanitizeText(row.masthead, 160);
  const shortMasthead = sanitizeText(row.short_masthead, 80);
  const themeMode = sanitizeText(row.theme_mode, 80);
  const supportLinks = parseJsonValue<BrandConfig["supportLinks"]>(row.support_links_json, fallbackBrandConfig.supportLinks);
  const webIconPack = parseJsonValue<BrandConfig["webIconPack"]>(row.web_icon_pack_json, fallbackBrandConfig.webIconPack);
  const defaultOgAssetId = sanitizeText(row.default_og_asset_id, 120);
  const logoAssetId = sanitizeText(row.logo_asset_id, 120);

  if (!id || !siteName || !masthead || !shortMasthead || !themeMode) {
    return null;
  }

  return {
    id,
    siteName,
    masthead,
    shortMasthead,
    themeMode,
    supportLinks,
    defaultOgAssetId,
    logoAssetId,
    webIconPack,
  };
}

function mapMediaRow(request: Request, env: CmsEnv, row: Record<string, unknown>): MediaAssetRecord | null {
  const id = sanitizeText(row.id, 120);
  const kind = normalizeMediaKind(row.kind);
  const mimeType = sanitizeText(row.mime_type, 120);
  const alt = sanitizeText(row.alt, MAX_ALT_LENGTH);
  const caption = sanitizeText(row.caption, MAX_CAPTION_LENGTH);
  const r2Key = sanitizeText(row.r2_key, 240);
  const status = normalizeMediaStatus(row.status);
  const originalFileName = sanitizeText(row.original_file_name, MAX_FILE_NAME_LENGTH);
  const createdAt = typeof row.created_at === "string" ? row.created_at : "";
  const updatedAt = typeof row.updated_at === "string" ? row.updated_at : createdAt;
  if (!id || !kind || !mimeType || !r2Key || !status || !createdAt) return null;

  return {
    id,
    kind,
    mimeType,
    width: safeNumber(row.width),
    height: safeNumber(row.height),
    sizeBytes: safeNumber(row.size_bytes),
    alt,
    caption,
    r2Key,
    variants: parseJsonValue<Record<string, string>>(row.variants_json, {}),
    status,
    originalFileName,
    publicUrl: mediaPublicUrl(request, env, id),
    createdAt,
    updatedAt,
  };
}

function mapActivityRow(row: Record<string, unknown>): ActivityRecord | null {
  const id = sanitizeText(row.id, 120);
  const scope = sanitizeText(row.scope, 80);
  const action = sanitizeText(row.action, 80);
  const targetId = sanitizeText(row.target_id, 120);
  const createdAt = typeof row.created_at === "string" ? row.created_at : "";
  if (!id || !scope || !action || !targetId || !createdAt) return null;
  return {
    id,
    scope,
    action,
    targetId,
    summary: parseJsonValue<Record<string, unknown>>(row.summary_json, {}),
    createdAt,
  };
}

export async function listIssues(db: D1Database, limit = 40) {
  const result = await db
    .prepare(
      `
      SELECT id, slug, status, version, published_at, label, location, theme_line, social_asset_id, content_json, brand_overrides_json, created_at, updated_at
      FROM issues
      ORDER BY
        CASE status WHEN 'published' THEN 0 WHEN 'review_ready' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,
        updated_at DESC
      LIMIT ?
      `
    )
    .bind(limit)
    .all();

  return (result.results ?? [])
    .map((row) => mapEditionRow(row))
    .filter((row): row is EditionRecord => row !== null);
}

export async function getIssueById(db: D1Database, id: string) {
  const row = await db
    .prepare(
      `
      SELECT id, slug, status, version, published_at, label, location, theme_line, social_asset_id, content_json, brand_overrides_json, created_at, updated_at
      FROM issues
      WHERE id = ?
      LIMIT 1
      `
    )
    .bind(id)
    .first();

  return row ? mapEditionRow(row) : null;
}

export async function getIssueBySlug(db: D1Database, slug: string) {
  const row = await db
    .prepare(
      `
      SELECT id, slug, status, version, published_at, label, location, theme_line, social_asset_id, content_json, brand_overrides_json, created_at, updated_at
      FROM issues
      WHERE slug = ? AND (
        status = 'published' OR
        (status = 'archived' AND published_at IS NOT NULL)
      )
      ORDER BY
        CASE status WHEN 'published' THEN 0 ELSE 1 END,
        published_at DESC,
        updated_at DESC
      LIMIT 1
      `
    )
    .bind(slug)
    .first();

  return row ? mapEditionRow(row) : null;
}

export async function listPublicIssues(db: D1Database, limit = 12) {
  const result = await db
    .prepare(
      `
      SELECT id, slug, status, version, published_at, label, location, theme_line, social_asset_id, content_json, brand_overrides_json, created_at, updated_at
      FROM issues
      WHERE status = 'published' OR (status = 'archived' AND published_at IS NOT NULL)
      ORDER BY
        CASE status WHEN 'published' THEN 0 ELSE 1 END,
        published_at DESC,
        updated_at DESC
      LIMIT ?
      `
    )
    .bind(limit)
    .all();

  return (result.results ?? [])
    .map((row) => mapEditionRow(row))
    .filter((row): row is EditionRecord => row !== null)
    .map((row) => toPublicIssueSummary(row));
}

export async function getCurrentPublishedIssue(db: D1Database) {
  const row = await db
    .prepare(
      `
      SELECT id, slug, status, version, published_at, label, location, theme_line, social_asset_id, content_json, brand_overrides_json, created_at, updated_at
      FROM issues
      WHERE status = 'published'
      ORDER BY published_at DESC, updated_at DESC
      LIMIT 1
      `
    )
    .bind()
    .first();

  return row ? mapEditionRow(row) : fallbackEditionRecord();
}

export async function createDraftIssue(db: D1Database, sourceIssue: EditionRecord | null) {
  const base = sourceIssue ?? fallbackEditionRecord();
  const createdAt = nowIso();
  const id = nextId("issue");
  const slug = normalizeSlug(`${base.slug}-draft-${createdAt.slice(0, 10)}`);
  const created: EditionRecord = {
    ...base,
    id,
    slug,
    status: "draft",
    version: Math.max(base.version + 1, 1),
    publishedAt: null,
    label: `${base.label} · borrador`,
    createdAt,
    updatedAt: createdAt,
  };

  await db
    .prepare(
      `
      INSERT INTO issues (
        id, slug, status, version, published_at, label, location, theme_line, social_asset_id, content_json, brand_overrides_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      created.id,
      created.slug,
      created.status,
      created.version,
      created.publishedAt,
      created.label,
      created.location,
      created.themeLine,
      created.socialAssetId,
      JSON.stringify(created.contentPayload),
      JSON.stringify(created.brandOverrides),
      created.createdAt,
      created.updatedAt
    )
    .run();

  return created;
}

async function mediaAssetExists(db: D1Database, id: string) {
  const row = await db
    .prepare(
      `
      SELECT id
      FROM media_assets
      WHERE id = ? AND status <> 'replaced'
      LIMIT 1
      `
    )
    .bind(id)
    .first();
  return Boolean(row?.id);
}

function collectInternalAssetPaths(issue: EditionRecord) {
  const paths = new Set<string>();
  const pushIfInternal = (value: unknown) => {
    if (typeof value === "string" && value.startsWith("/")) {
      paths.add(value);
    }
  };

  pushIfInternal(issue.contentPayload.metadata.heroImage?.src);
  issue.contentPayload.resources?.pdfs?.forEach((resource) => pushIfInternal(resource.href));
  issue.contentPayload.gallery?.items?.forEach((item) => pushIfInternal(item.fileName));
  return Array.from(paths);
}

async function isReachableResource(url: URL) {
  try {
    let response = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, { method: "GET", redirect: "follow" });
    }
    return response.ok;
  } catch {
    return false;
  }
}

export async function buildIssuePreflightReport(
  db: D1Database,
  request: Request,
  env: CmsEnv,
  issue: EditionRecord,
  brand: BrandConfig
): Promise<IssuePreflightReport> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const { contentPayload } = issue;

  if (!issue.slug.trim()) blockers.push("Define un slug único para la edición.");
  if (!issue.label.trim()) blockers.push("La edición necesita un label visible.");
  if (!issue.location.trim()) blockers.push("La edición necesita ubicación.");
  if (!issue.themeLine.trim()) blockers.push("La edición necesita línea temática.");
  if (!contentPayload.metadata.publishedDateISO || Number.isNaN(Date.parse(contentPayload.metadata.publishedDateISO))) {
    blockers.push("La fecha de publicación no es válida.");
  }
  if (!contentPayload.share?.title?.trim()) blockers.push("Falta el título de share.");
  if (!contentPayload.share?.summary?.trim()) blockers.push("Falta el resumen de share.");
  if (!contentPayload.share?.quote?.trim()) blockers.push("Falta la cita principal para share.");

  const hero = contentPayload.metadata.heroImage;
  if (!hero?.src?.trim() || !isPathOrHttpUrl(hero.src)) blockers.push("La portada necesita una imagen principal válida.");
  if (!hero?.alt?.trim()) blockers.push("La imagen principal necesita texto alt.");
  if (!hero?.caption?.trim()) blockers.push("La imagen principal necesita caption.");

  if (!contentPayload.sources?.items?.length) {
    blockers.push("Incluye al menos una fuente visible.");
  } else {
    contentPayload.sources.items.forEach((item, index) => {
      if (!item.href?.trim() || !isPathOrHttpUrl(item.href)) {
        blockers.push(`La fuente ${index + 1} necesita un enlace válido.`);
      }
    });
  }

  if (!contentPayload.routes?.authorities?.length) {
    blockers.push("Incluye al menos una autoridad o ruta institucional.");
  } else {
    contentPayload.routes.authorities.forEach((item, index) => {
      if (!item.href?.trim() || !isPathOrHttpUrl(item.href)) {
        blockers.push(`La autoridad ${index + 1} necesita un enlace válido.`);
      }
    });
  }

  if (!contentPayload.resources?.pdfs?.length) {
    blockers.push("Incluye al menos un recurso PDF o documental.");
  } else {
    contentPayload.resources.pdfs.forEach((item, index) => {
      if (!item.href?.trim() || !isPathOrHttpUrl(item.href)) {
        blockers.push(`El recurso ${index + 1} necesita una ruta válida.`);
      }
    });
  }

  if (!contentPayload.gallery?.items?.length) {
    warnings.push("La galería no tiene piezas visuales asociadas.");
  } else {
    contentPayload.gallery.items.forEach((item, index) => {
      if (!item.title?.trim() || !item.description?.trim() || !item.fileName?.trim()) {
        blockers.push(`La pieza visual ${index + 1} está incompleta.`);
      } else if (!isPathOrHttpUrl(item.fileName)) {
        blockers.push(`La pieza visual ${index + 1} necesita una ruta válida.`);
      }
    });
  }

  if (containsPlaceholderContent(contentPayload)) {
    blockers.push("El contenido todavía contiene marcas de placeholder, demo o pendiente.");
  }

  const effectiveSocialAssetId = issue.socialAssetId || brand.defaultOgAssetId || "";
  if (!effectiveSocialAssetId) {
    blockers.push("Falta un asset social de miniatura para compartir la edición.");
  } else if (!(await mediaAssetExists(db, effectiveSocialAssetId))) {
    blockers.push("El asset social configurado no existe o ya no está activo.");
  }

  const internalPaths = collectInternalAssetPaths(issue);
  const origin = originSiteFromRequest(request, env);
  for (const path of internalPaths) {
    const reachable = await isReachableResource(new URL(path, origin));
    if (!reachable) {
      blockers.push(`No se pudo verificar el recurso interno ${path}.`);
    }
  }

  const externalLinks = [
    ...contentPayload.sources.items.map((item) => item.href),
    ...contentPayload.routes.authorities.map((item) => item.href),
  ].filter((href): href is string => typeof href === "string" && href.startsWith("http"));
  if (externalLinks.length) {
    warnings.push("Los enlaces externos quedan marcados como verificación manual al momento de publicar.");
  }

  return {
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
  };
}

export async function updateIssueRecord(db: D1Database, id: string, payload: Partial<EditionRecord>) {
  const existing = await getIssueById(db, id);
  if (!existing) return null;
  if (existing.status === "published" || existing.status === "archived") {
    throw new IssueWorkflowError(
      "Las ediciones publicadas o archivadas son de solo lectura. Crea un borrador para corregirlas.",
      "immutable-edition",
      409
    );
  }

  const nextContent =
    payload.contentPayload && typeof payload.contentPayload === "object"
      ? (payload.contentPayload as IssueContent)
      : existing.contentPayload;

  const nextStatusRaw = normalizeEditionStatus(payload.status);
  if (nextStatusRaw === "published" || nextStatusRaw === "archived") {
    throw new IssueWorkflowError(
      "Usa las acciones específicas de publicar o archivar; no cambies ese estado desde guardar.",
      "status-transition-not-allowed",
      409
    );
  }

  const next: EditionRecord = {
    ...existing,
    slug: normalizeSlug(payload.slug ?? existing.slug, existing.slug),
    status: nextStatusRaw || existing.status,
    label: sanitizeText(payload.label ?? existing.label, MAX_LABEL_LENGTH) || existing.label,
    location: sanitizeText(payload.location ?? existing.location, MAX_LOCATION_LENGTH) || existing.location,
    themeLine: sanitizeText(payload.themeLine ?? existing.themeLine, MAX_THEME_LINE_LENGTH) || existing.themeLine,
    socialAssetId: normalizeOptionalAssetId(payload.socialAssetId) ?? existing.socialAssetId,
    contentPayload: nextContent,
    brandOverrides:
      payload.brandOverrides && typeof payload.brandOverrides === "object"
        ? (payload.brandOverrides as Partial<BrandConfig>)
        : existing.brandOverrides,
    updatedAt: nowIso(),
  };

  const slugConflict = await db
    .prepare(
      `
      SELECT id
      FROM issues
      WHERE slug = ? AND id <> ?
      LIMIT 1
      `
    )
    .bind(next.slug, id)
    .first();

  if (slugConflict?.id) {
    throw new Error("slug-conflict");
  }

  await db
    .prepare(
      `
      UPDATE issues
      SET slug = ?, status = ?, label = ?, location = ?, theme_line = ?, social_asset_id = ?, content_json = ?, brand_overrides_json = ?, updated_at = ?
      WHERE id = ?
      `
    )
    .bind(
      next.slug,
      next.status,
      next.label,
      next.location,
      next.themeLine,
      next.socialAssetId,
      JSON.stringify(next.contentPayload),
      JSON.stringify(next.brandOverrides),
      next.updatedAt,
      id
    )
    .run();

  return next;
}

export async function publishIssueRecord(db: D1Database, id: string) {
  const existing = await getIssueById(db, id);
  if (!existing) return null;
  if (existing.status !== "review_ready") {
    throw new IssueWorkflowError(
      "La edición debe quedar marcada como lista para revisión antes de publicarse.",
      "review-ready-required",
      409
    );
  }

  const publishedAt = nowIso();

  await db
    .prepare("UPDATE issues SET status = 'archived', updated_at = ? WHERE status = 'published' AND id <> ?")
    .bind(publishedAt, id)
    .run();

  await db
    .prepare("UPDATE issues SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?")
    .bind(publishedAt, publishedAt, id)
    .run();

  return getIssueById(db, id);
}

export async function archiveIssueRecord(db: D1Database, id: string) {
  await db
    .prepare("UPDATE issues SET status = 'archived', updated_at = ? WHERE id = ?")
    .bind(nowIso(), id)
    .run();
  return getIssueById(db, id);
}

export async function getBrandConfig(db: D1Database) {
  const row = await db
    .prepare(
      `
      SELECT id, site_name, masthead, short_masthead, theme_mode, support_links_json, default_og_asset_id, logo_asset_id, web_icon_pack_json, updated_at
      FROM brand_config
      WHERE id = 'default'
      LIMIT 1
      `
    )
    .bind()
    .first();
  return row ? mapBrandRow(row) ?? fallbackBrandConfig : fallbackBrandConfig;
}

export async function updateBrandConfig(db: D1Database, payload: Partial<BrandConfig>) {
  const current = await getBrandConfig(db);
  const next = mergeBrandConfig(current, payload ?? null);
  await db
    .prepare(
      `
      UPDATE brand_config
      SET site_name = ?, masthead = ?, short_masthead = ?, theme_mode = ?, support_links_json = ?, default_og_asset_id = ?, logo_asset_id = ?, web_icon_pack_json = ?, updated_at = ?
      WHERE id = 'default'
      `
    )
    .bind(
      next.siteName,
      next.masthead,
      next.shortMasthead,
      next.themeMode,
      JSON.stringify(next.supportLinks),
      next.defaultOgAssetId,
      next.logoAssetId,
      JSON.stringify(next.webIconPack),
      nowIso()
    )
    .run();
  return next;
}

export async function listMediaAssets(request: Request, env: CmsEnv, db: D1Database, limit = 120) {
  const result = await db
    .prepare(
      `
      SELECT id, kind, mime_type, width, height, size_bytes, alt, caption, r2_key, variants_json, status, original_file_name, created_at, updated_at
      FROM media_assets
      WHERE status <> 'replaced'
      ORDER BY updated_at DESC
      LIMIT ?
      `
    )
    .bind(limit)
    .all();
  return (result.results ?? [])
    .map((row) => mapMediaRow(request, env, row))
    .filter((row): row is MediaAssetRecord => row !== null);
}

export async function createMediaUploadRecord(
  request: Request,
  env: CmsEnv,
  db: D1Database,
  payload: UploadRequestPayload
) {
  const kind = normalizeMediaKind(payload.kind) || "image";
  const mimeType = sanitizeText(payload.mimeType, 120) || "application/octet-stream";
  const originalFileName = sanitizeText(payload.fileName, MAX_FILE_NAME_LENGTH) || `${kind}-${Date.now()}`;
  const alt = sanitizeText(payload.alt, MAX_ALT_LENGTH);
  const caption = sanitizeText(payload.caption, MAX_CAPTION_LENGTH);
  const width = safeNumber(payload.width);
  const height = safeNumber(payload.height);
  const sizeBytes = safeNumber(payload.sizeBytes);
  const id = nextId("media");
  const extension = originalFileName.includes(".") ? originalFileName.split(".").pop()?.toLowerCase() ?? "bin" : "bin";
  const r2Key = `media/${id}.${extension}`;
  const createdAt = nowIso();

  await db
    .prepare(
      `
      INSERT INTO media_assets (
        id, kind, mime_type, width, height, size_bytes, alt, caption, r2_key, variants_json, status, original_file_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploaded', ?, ?, ?)
      `
    )
    .bind(
      id,
      kind,
      mimeType,
      width,
      height,
      sizeBytes,
      alt,
      caption,
      r2Key,
      JSON.stringify({}),
      originalFileName,
      createdAt,
      createdAt
    )
    .run();

  const item = await getMediaAssetById(request, env, db, id);
  return item;
}

export async function getMediaAssetById(request: Request, env: CmsEnv, db: D1Database, id: string) {
  const row = await db
    .prepare(
      `
      SELECT id, kind, mime_type, width, height, size_bytes, alt, caption, r2_key, variants_json, status, original_file_name, created_at, updated_at
      FROM media_assets
      WHERE id = ?
      LIMIT 1
      `
    )
    .bind(id)
    .first();
  return row ? mapMediaRow(request, env, row) : null;
}

function base64ToBytes(raw: string) {
  const normalized = raw.replace(/^data:[^;]+;base64,/, "").trim();
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function completeMediaUpload(
  request: Request,
  env: CmsEnv,
  db: D1Database,
  id: string,
  fileBase64: string,
  alt?: string,
  caption?: string
) {
  if (!env.MEDIA_BUCKET) {
    throw new Error("R2 binding no disponible.");
  }

  const asset = await getMediaAssetById(request, env, db, id);
  if (!asset) {
    return null;
  }

  const bytes = base64ToBytes(fileBase64);
  await env.MEDIA_BUCKET.put(asset.r2Key, bytes, {
    httpMetadata: {
      contentType: asset.mimeType,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  const updatedAt = nowIso();
  await db
    .prepare(
      `
      UPDATE media_assets
      SET alt = ?, caption = ?, size_bytes = ?, status = 'active', updated_at = ?
      WHERE id = ?
      `
    )
    .bind(
      sanitizeText(alt ?? asset.alt, MAX_ALT_LENGTH),
      sanitizeText(caption ?? asset.caption, MAX_CAPTION_LENGTH),
      bytes.byteLength,
      updatedAt,
      id
    )
    .run();

  return getMediaAssetById(request, env, db, id);
}

export async function replaceMediaUpload(
  request: Request,
  env: CmsEnv,
  db: D1Database,
  id: string,
  fileBase64: string,
  mimeType?: string,
  alt?: string,
  caption?: string
) {
  if (!env.MEDIA_BUCKET) {
    throw new Error("R2 binding no disponible.");
  }

  const asset = await getMediaAssetById(request, env, db, id);
  if (!asset) return null;

  const bytes = base64ToBytes(fileBase64);
  const nextMimeType = sanitizeText(mimeType ?? asset.mimeType, 120) || asset.mimeType;
  await env.MEDIA_BUCKET.put(asset.r2Key, bytes, {
    httpMetadata: {
      contentType: nextMimeType,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  await db
    .prepare(
      `
      UPDATE media_assets
      SET mime_type = ?, alt = ?, caption = ?, size_bytes = ?, status = 'active', updated_at = ?
      WHERE id = ?
      `
    )
    .bind(
      nextMimeType,
      sanitizeText(alt ?? asset.alt, MAX_ALT_LENGTH),
      sanitizeText(caption ?? asset.caption, MAX_CAPTION_LENGTH),
      bytes.byteLength,
      nowIso(),
      id
    )
    .run();

  return getMediaAssetById(request, env, db, id);
}

export async function readMediaAssetResponse(request: Request, env: CmsEnv, db: D1Database, id: string) {
  if (!env.MEDIA_BUCKET) {
    return new Response("R2 binding no disponible", { status: 500 });
  }

  const asset = await getMediaAssetById(request, env, db, id);
  if (!asset || asset.status === "replaced") {
    return new Response("Asset no encontrado", { status: 404 });
  }

  const object = await env.MEDIA_BUCKET.get(asset.r2Key);
  if (!object) {
    return new Response("Archivo no encontrado", { status: 404 });
  }

  const responseHeaders = new Headers({
    "cache-control": "public, max-age=31536000, immutable",
    "content-type": asset.mimeType,
  });
  object.writeHttpMetadata?.(responseHeaders);
  return new Response(await object.arrayBuffer(), { headers: responseHeaders });
}

export async function logActivity(
  db: D1Database,
  scope: string,
  action: string,
  targetId: string,
  summary: Record<string, unknown>
) {
  await db
    .prepare(
      `
      INSERT INTO audit_log (id, scope, action, target_id, summary_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .bind(nextId("audit"), scope, action, targetId, JSON.stringify(summary), nowIso())
    .run();
}

export async function listActivity(db: D1Database, limit = MAX_ACTIVITY_LIMIT) {
  const result = await db
    .prepare(
      `
      SELECT id, scope, action, target_id, summary_json, created_at
      FROM audit_log
      ORDER BY created_at DESC
      LIMIT ?
      `
    )
    .bind(limit)
    .all();
  return (result.results ?? [])
    .map((row) => mapActivityRow(row))
    .filter((row): row is ActivityRecord => row !== null);
}
