/* eslint-disable no-unused-vars */
type D1Statement = {
  bind: (...args: unknown[]) => {
    all: () => Promise<{ results?: Record<string, unknown>[] }>;
    first: () => Promise<Record<string, unknown> | null>;
    run: () => Promise<unknown>;
  };
};

type CommunityFunctionEnv = {
  DB?: {
    prepare: (query: string) => D1Statement;
  };
};
/* eslint-enable no-unused-vars */
const headers = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
} as const;

const MAX_CATEGORY_LENGTH = 60;
const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 180;
const MAX_CONTENT_LENGTH = 1200;
const MIN_MESSAGE_LENGTH = 12;
const COOLDOWN_SECONDS = 35;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stripControlCharacters(value: string) {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || (code >= 32 && code !== 127);
    })
    .join("");
}

function jsonResponse(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers });
}

function normalizeText(value: unknown, maxLength: number) {
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

function normalizeKind(kind: unknown) {
  return kind === "history" || kind === "comment" ? kind : null;
}

function parseIp(request: Request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function rowToPost(row: Record<string, unknown>) {
  const createdAt = String(row.created_at ?? "");
  const id = String(row.id ?? "");
  const kind = normalizeKind(row.kind);
  const displayName = String(row.display_name ?? "");
  const content = String(row.content ?? "");

  if (!id || !kind || !displayName || !content || !createdAt || Number.isNaN(Date.parse(createdAt))) {
    return null;
  }

  const moderationStatus = String(row.moderation_status ?? row.moderationStatus ?? "approved");
  const approved =
    row.approved === 1 ||
    row.approved === true ||
    row.approved === "1" ||
    moderationStatus === "approved";

  return {
    id,
    kind,
    displayName,
    email: String((row.email_hash ?? row.email ?? "") as string),
    category: row.category ? String(row.category) : undefined,
    content,
    source: String(row.source ?? "api"),
    approved,
    moderationStatus,
    createdAt,
  };
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function onRequest(context: { request: Request; env: CommunityFunctionEnv }) {
  const { request, env } = context;
  const db = env.DB;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (!db) {
    return jsonResponse({ error: "D1 binding no disponible", code: "internal" }, 500);
  }

  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const kind = normalizeKind(url.searchParams.get("kind"));
      if (!kind) {
        return jsonResponse({ error: "kind inválido. Usa comment o history.", code: "invalid-kind" }, 400);
      }

      const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
      const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 100);

      const result = await db
        .prepare(
          `
          SELECT id, kind, display_name, email_hash, category, content, source, approved, moderation_status, created_at
          FROM community_posts
          WHERE kind = ? AND approved = 1 AND moderation_status = 'approved'
          ORDER BY created_at DESC
          LIMIT ?
          `
        )
        .bind(kind, limit)
        .all();

      const items = (result.results ?? [])
        .map((row) => rowToPost(row))
        .filter((item): item is NonNullable<ReturnType<typeof rowToPost>> => item !== null);

      return jsonResponse({ items });
    }

    if (request.method === "POST") {
      if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
        return jsonResponse({ error: "content-type inválido", code: "invalid-content-type" }, 415);
      }

      const body = await parseJsonBody(request);
      if (!body || typeof body !== "object") {
        return jsonResponse({ error: "invalid-json", code: "invalid-json" }, 400);
      }

      const kind = normalizeKind((body as { kind?: unknown }).kind);
      const displayName = normalizeText((body as { displayName?: unknown }).displayName, MAX_DISPLAY_NAME_LENGTH);
      const email = normalizeText((body as { email?: unknown }).email, MAX_EMAIL_LENGTH).toLowerCase();
      const category = normalizeText((body as { category?: unknown }).category, MAX_CATEGORY_LENGTH);
      const content = normalizeText((body as { content?: unknown }).content, MAX_CONTENT_LENGTH);
      const website = normalizeText((body as { website?: unknown }).website, 120);

      if (!kind) {
        return jsonResponse({ error: "invalid-kind", code: "validation" }, 400);
      }
      if (website) {
        return jsonResponse({ error: "spam-detected", code: "validation" }, 400);
      }
      if (!displayName || displayName.length < 2) {
        return jsonResponse({ error: "name-invalid", code: "validation" }, 400);
      }
      if (!content || content.length < MIN_MESSAGE_LENGTH) {
        return jsonResponse({ error: "content-too-short", code: "validation" }, 400);
      }
      if (email && !EMAIL_REGEX.test(email)) {
        return jsonResponse({ error: "invalid-email", code: "validation" }, 400);
      }

      const createdAt = new Date().toISOString();
      const cooldownThreshold = new Date(Date.now() - COOLDOWN_SECONDS * 1000).toISOString();
      const ipHash = await sha256Hex(parseIp(request));
      const emailHash = email ? await sha256Hex(email) : null;
      const sourceFingerprint = await sha256Hex(`${kind}:${displayName.toLowerCase()}:${content.toLowerCase()}`);

      const recent = await db
        .prepare(
          `
          SELECT id
          FROM community_posts
          WHERE created_at >= ?
            AND (
              source_fingerprint = ?
              OR ip_hash = ?
              OR (? IS NOT NULL AND email_hash = ?)
            )
          LIMIT 1
          `
        )
        .bind(cooldownThreshold, sourceFingerprint, ipHash, emailHash, emailHash)
        .first();

      if (recent) {
        return jsonResponse({ error: "Post duplicado o en enfriamiento", code: "rate-limited" }, 429);
      }

      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      await db
        .prepare(
          `
          INSERT INTO community_posts (
            id,
            kind,
            display_name,
            email_hash,
            ip_hash,
            source_fingerprint,
            category,
            content,
            source,
            moderation_status,
            approved,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'api', 'pending', 0, ?)
          `
        )
        .bind(id, kind, displayName, emailHash, ipHash, sourceFingerprint, category, content, createdAt)
        .run();

      console.log({ event: "community-post-created", kind, id, moderationStatus: "pending" });

      return jsonResponse(
        {
          item: {
            id,
            kind,
            displayName,
            email: emailHash ?? "",
            category,
            content,
            source: "api",
            approved: false,
            moderationStatus: "pending",
            createdAt,
          },
        },
        201
      );
    }

    return jsonResponse({ error: "method-not-allowed", code: "method-not-allowed" }, 405);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
