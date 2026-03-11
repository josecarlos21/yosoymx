export async function onRequest(context: { request: Request; env: Record<string, unknown> }) {
  const { request, env } = context;
  const db = (env as { DB?: { prepare: (...args: unknown[]) => any } }).DB;

  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
  } as const;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (!db) {
    return Response.json({ error: "D1 binding no disponible", code: "internal" }, { status: 500, headers });
  }

  const maxCategoryLength = 60;
  const maxDisplayNameLength = 80;
  const maxEmailLength = 180;
  const maxContentLength = 1200;
  const minMessageLength = 12;
  const cooldownSeconds = 35;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function normalizeText(value: unknown, maxLength: number) {
    if (typeof value !== "string") return "";
    return value
      .normalize("NFKC")
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F]+/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\r\n?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, maxLength);
  }

  function normalizeKind(kind: unknown) {
    return kind === "history" || kind === "comment" ? kind : null;
  }

  function parseIp() {
    return (
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    );
  }

  async function sha256Hex(value: string) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function parseJsonBody() {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }

  function rowToPost(row: Record<string, unknown>) {
    const createdAt = String(row.created_at ?? "");
    const id = String(row.id ?? "");
    if (!id || !createdAt) return null;
    const createdDate = Date.parse(createdAt);
    if (Number.isNaN(createdDate)) return null;

    const kind = row.kind === "history" ? "history" : row.kind === "comment" ? "comment" : null;
    if (!kind) return null;

    const displayName = String(row.display_name ?? "");
    const content = String(row.content ?? "");
    if (!displayName || !content) return null;

    const approvedRaw = row.approved;
    const approved = approvedRaw === 1 || approvedRaw === true || approvedRaw === "1";

    return {
      id,
      kind,
      displayName,
      email: String((row.email_hash ?? row.email ?? "") as string),
      category: row.category ? String(row.category) : undefined,
      content,
      source: String(row.source ?? "api"),
      approved,
      createdAt,
    };
  }

  function buildValidationError(message: string, code: string, status = 400) {
    return Response.json({ error: message, code }, { status, headers });
  }

  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const kind = normalizeKind(url.searchParams.get("kind"));

      if (!kind) {
        return buildValidationError("kind inválido. Usa comment o history.", "invalid-kind", 400);
      }

      const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
      const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 100);

      const result = await db
        .prepare(
          `
          SELECT id, kind, display_name, email_hash, category, content, source, approved, created_at
          FROM community_posts
          WHERE kind = ? AND approved = 1
          ORDER BY created_at DESC
          LIMIT ?
          `
        )
        .bind(kind, limit)
        .all();

      const items = (result?.results ?? [])
        .map((row: Record<string, unknown>) => rowToPost(row))
        .filter((post): post is NonNullable<ReturnType<typeof rowToPost>> => post !== null);

      return Response.json({ items }, { headers });
    }

    if (request.method === "POST") {
      const body = await parseJsonBody();
      if (!body || typeof body !== "object") {
        return buildValidationError("invalid-json", "invalid-json", 400);
      }

      const rawKind = normalizeKind((body as { kind?: unknown }).kind);
      if (!rawKind) {
        return buildValidationError("invalid-kind", "validation", 400);
      }

      const displayName = normalizeText((body as { displayName?: unknown }).displayName, maxDisplayNameLength);
      const email = normalizeText((body as { email?: unknown }).email, maxEmailLength);
      const category = normalizeText((body as { category?: unknown }).category, maxCategoryLength);
      const content = normalizeText((body as { content?: unknown }).content, maxContentLength);
      const website = normalizeText((body as { website?: unknown }).website, 120);

      if (website) {
        return buildValidationError("spam-detected", "validation", 400);
      }
      if (!displayName) {
        return buildValidationError("name-required", "validation", 400);
      }
      if (displayName.length < 2) {
        return buildValidationError("name-too-short", "validation", 400);
      }
      if (!content) {
        return buildValidationError("content-required", "validation", 400);
      }
      if (content.length < minMessageLength) {
        return buildValidationError("content-too-short", "validation", 400);
      }
      if (email && !emailRegex.test(email)) {
        return buildValidationError("invalid-email", "validation", 400);
      }
      if (category && category.length > maxCategoryLength) {
        return buildValidationError("category-too-long", "validation", 400);
      }
      if (content.length > maxContentLength) {
        return buildValidationError("content-too-long", "validation", 400);
      }

      const ipFingerprint = await sha256Hex(parseIp());
      const normalizedEmail = email.toLowerCase();
      const cooldownThreshold = new Date(Date.now() - cooldownSeconds * 1000).toISOString();
      const recent = await db
        .prepare(
          `
          SELECT 1 AS has_recent
          FROM community_posts
          WHERE kind = ?
            AND display_name = ?
            AND content = ?
            AND created_at >= ?
          LIMIT 1
          `
        )
        .bind(rawKind, displayName, content, cooldownThreshold)
        .first();

      if (recent) {
        return Response.json({ error: "Post duplicado en ventana de tiempo", code: "rate-limited" }, { status: 429, headers });
      }

      const emailHash = normalizedEmail ? await sha256Hex(normalizedEmail) : null;
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      await db
        .prepare(
          `
          INSERT INTO community_posts (
            id, kind, display_name, email_hash, category, content, source, approved, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'api', 1, ?)
          `
        )
        .bind(id, rawKind, displayName, emailHash, category, content, createdAt)
        .run();

      console.log({ event: "community-post-created", kind: rawKind, id, ipFingerprint });

      return Response.json(
        {
          item: {
            id,
            kind: rawKind,
            displayName,
            email: emailHash ?? "",
            category,
            content,
            source: "api",
            approved: true,
            createdAt,
          },
        },
        { status: 201, headers }
      );
    }

    return Response.json({ error: "method-not-allowed", code: "method-not-allowed" }, { status: 405, headers });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "internal-error", code: "internal" }, { status: 500, headers });
  }
}
