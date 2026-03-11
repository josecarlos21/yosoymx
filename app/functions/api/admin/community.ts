/* eslint-disable no-unused-vars */
type D1Statement = {
  bind: (...args: unknown[]) => {
    all: () => Promise<{ results?: Record<string, unknown>[] }>;
  };
};

type AdminCommunityEnv = {
  DB?: {
    prepare: (query: string) => D1Statement;
  };
  ADMIN_TOKEN?: string;
};
/* eslint-enable no-unused-vars */

type CommunityKind = "comment" | "history";
type CommunityModerationStatus = "pending" | "approved" | "rejected" | "hidden";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "cache-control": "no-store",
} as const;

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

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return "";
}

function requireAuth(request: Request, expectedToken?: string) {
  return Boolean(expectedToken && extractBearerToken(request) === expectedToken);
}

function normalizeKind(value: unknown): CommunityKind | "" {
  return value === "comment" || value === "history" ? value : "";
}

function normalizeStatus(value: unknown): CommunityModerationStatus | "" {
  return value === "pending" || value === "approved" || value === "rejected" || value === "hidden" ? value : "";
}

function sanitizeText(value: unknown, maxLength: number) {
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

function rowToPost(row: Record<string, unknown>) {
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const kind = normalizeKind(row.kind);
  const createdAt = typeof row.created_at === "string" ? row.created_at : "";
  const moderationStatus = normalizeStatus(row.moderation_status);
  const displayName = sanitizeText(row.display_name, 80);
  const content = sanitizeText(row.content, 1200);
  const email = typeof row.email_hash === "string" ? sanitizeText(row.email_hash, 180) : "";
  const category = typeof row.category === "string" ? sanitizeText(row.category, 60) : "";

  if (!id || !kind || !createdAt || !moderationStatus || !displayName || !content || Number.isNaN(Date.parse(createdAt))) {
    return null;
  }

  return {
    id,
    kind,
    displayName,
    email,
    category: category || undefined,
    content,
    source: "api",
    approved: moderationStatus === "approved",
    moderationStatus,
    createdAt,
  };
}

function parseLimit(raw: string | null, fallback: number, min = 1, max = 200) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export async function onRequest(context: { request: Request; env: AdminCommunityEnv }) {
  const { request, env } = context;
  const db = env.DB;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (!db) {
    return jsonResponse({ error: "D1 binding no disponible", code: "internal" }, 500);
  }

  if (!requireAuth(request, env.ADMIN_TOKEN)) {
    return jsonResponse({ error: "No autorizado. Requiere token administrativo.", code: "unauthorized" }, 401);
  }

  if (request.method !== "GET") {
    return jsonResponse({ error: "method-not-allowed", code: "method-not-allowed" }, 405);
  }

  try {
    const url = new URL(request.url);
    const kind = normalizeKind(url.searchParams.get("kind"));
    const status = normalizeStatus(url.searchParams.get("status"));
    const limit = parseLimit(url.searchParams.get("limit"), 60);

    const clauses = [];
    const bindings: unknown[] = [];

    if (kind) {
      clauses.push("kind = ?");
      bindings.push(kind);
    }
    if (status) {
      clauses.push("moderation_status = ?");
      bindings.push(status);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const query = `
      SELECT id, kind, display_name, email_hash, category, content, moderation_status, created_at
      FROM community_posts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const result = await db.prepare(query).bind(...bindings, limit).all();
    const items = (result.results ?? [])
      .map((row) => rowToPost(row))
      .filter((item): item is NonNullable<ReturnType<typeof rowToPost>> => item !== null);

    return jsonResponse({ items });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
