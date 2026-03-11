/* eslint-disable no-unused-vars */
type D1Statement = {
  bind: (...args: unknown[]) => {
    first: () => Promise<Record<string, unknown> | null>;
    run: () => Promise<unknown>;
  };
};

type AdminCommunityModerationEnv = {
  DB?: {
    prepare: (query: string) => D1Statement;
  };
  ADMIN_TOKEN?: string;
};
/* eslint-enable no-unused-vars */

type CommunityModerationAction = "approve" | "reject" | "hide";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
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

function normalizeAction(value: unknown): CommunityModerationAction | "" {
  return value === "approve" || value === "reject" || value === "hide" ? value : "";
}

function normalizeStatusFromAction(action: CommunityModerationAction) {
  if (action === "approve") return { moderationStatus: "approved", approved: 1 };
  if (action === "hide") return { moderationStatus: "hidden", approved: 0 };
  return { moderationStatus: "rejected", approved: 0 };
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
  const kind = row.kind === "history" ? "history" : row.kind === "comment" ? "comment" : "";
  const createdAt = typeof row.created_at === "string" ? row.created_at : "";
  const moderationStatus = typeof row.moderation_status === "string" ? row.moderation_status : "";
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

async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function onRequest(context: {
  request: Request;
  env: AdminCommunityModerationEnv;
  params?: { id?: string };
}) {
  const { request, env, params } = context;
  const db = env.DB;
  const id = typeof params?.id === "string" ? params.id.trim() : "";

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (!db) {
    return jsonResponse({ error: "D1 binding no disponible", code: "internal" }, 500);
  }

  if (!requireAuth(request, env.ADMIN_TOKEN)) {
    return jsonResponse({ error: "No autorizado. Requiere token administrativo.", code: "unauthorized" }, 401);
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method-not-allowed", code: "method-not-allowed" }, 405);
  }

  if (!id) {
    return jsonResponse({ error: "id inválido", code: "validation" }, 400);
  }

  try {
    const body = await parseJsonBody(request);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "invalid-json", code: "validation" }, 400);
    }

    const action = normalizeAction((body as { action?: unknown }).action);
    if (!action) {
      return jsonResponse({ error: "action inválida", code: "validation" }, 400);
    }

    const nextState = normalizeStatusFromAction(action);
    const reviewedAt = new Date().toISOString();

    await db
      .prepare(
        `
        UPDATE community_posts
        SET moderation_status = ?, approved = ?, reviewed_at = ?
        WHERE id = ?
        `
      )
      .bind(nextState.moderationStatus, nextState.approved, reviewedAt, id)
      .run();

    const row = await db
      .prepare(
        `
        SELECT id, kind, display_name, email_hash, category, content, moderation_status, created_at
        FROM community_posts
        WHERE id = ?
        LIMIT 1
        `
      )
      .bind(id)
      .first();

    const item = row ? rowToPost(row) : null;
    if (!item) {
      return jsonResponse({ error: "post no encontrado", code: "not-found" }, 404);
    }

    return jsonResponse({ item });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
