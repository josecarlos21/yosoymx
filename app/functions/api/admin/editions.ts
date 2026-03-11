/* eslint-disable no-unused-vars */
type AdminFunctionEnv = {
  DB?: {
    prepare: (
      ...args: unknown[]
    ) => {
      bind: (...args: unknown[]) => {
        all: () => Promise<{ results?: Record<string, unknown>[] }>;
        run: () => Promise<unknown>;
      };
    };
  };
  ADMIN_TOKEN?: string;
};
/* eslint-enable no-unused-vars */

type AdminEditionRecord = {
  id: string;
  title: string;
  periodType: "daily" | "weekly";
  periodStart: string;
  periodEnd: string;
  notes: string;
  status: "draft" | "published" | "archived";
  createdAt: string;
};

type AdminEditionPayload = {
  title?: unknown;
  periodType?: unknown;
  periodStart?: unknown;
  periodEnd?: unknown;
  notes?: unknown;
};

type AdminEditionErrorCode = "validation" | "unauthorized" | "internal";

const ADMIN_ERROR_MESSAGES = {
  unauthorized: "No autorizado. Requiere token administrativo.",
  invalidMethod: "Método no soportado.",
  invalidPayload: "Datos inválidos para crear la edición.",
  invalidPeriod: "El rango de fechas no es válido.",
  missingDatabase: "D1 binding no disponible",
  internal: "Error interno del servidor.",
} as const;

const MAX_TITLE_LENGTH = 120;
const MAX_NOTE_LENGTH = 900;

function stripControlCharacters(value: string) {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || (code >= 32 && code !== 127);
    })
    .join("");
}

function jsonResponse(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
      "cache-control": "no-store",
    },
  });
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

function normalizePeriodType(value: unknown): "daily" | "weekly" | "" {
  return value === "weekly" ? "weekly" : value === "daily" ? "daily" : "";
}

function normalizeStatus(value: unknown): "draft" | "published" | "archived" | "" {
  if (value !== "draft" && value !== "published" && value !== "archived") return "";
  return value;
}

function toIsoDate(value: unknown) {
  if (typeof value !== "string") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function calculateEndDate(startIso: string, periodType: "daily" | "weekly") {
  const base = new Date(startIso);
  const end = new Date(base);
  end.setDate(end.getDate() + (periodType === "daily" ? 1 : 6));
  return end.toISOString();
}

function parseLimit(raw: string | null, fallback: number, min = 1, max = 200) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  const safe = Math.min(Math.max(parsed, min), max);
  return safe;
}

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return "";
}

async function parseJsonBody(request: Request): Promise<AdminEditionPayload | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") return null;
    return body as AdminEditionPayload;
  } catch {
    return null;
  }
}

function parseError(code: AdminEditionErrorCode, status: number, message: string) {
  return jsonResponse({ error: message, code }, status);
}

function sanitizeEditionRow(row: Record<string, unknown>): AdminEditionRecord | null {
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const title = sanitizeText(row.title, MAX_TITLE_LENGTH);
  const notes = sanitizeText(row.notes, MAX_NOTE_LENGTH);
  const periodStart = toIsoDate(row.period_start);
  const periodEnd = toIsoDate(row.period_end);
  const createdAt = toIsoDate(row.created_at);
  const statusRaw = normalizeStatus(row.status);
  const periodType = normalizePeriodType(row.period_type);

  if (!id || !title || !createdAt || !periodStart || !periodEnd || !periodType) return null;
  if (new Date(periodEnd).getTime() < new Date(periodStart).getTime()) return null;

  return {
    id,
    title,
    periodType,
    periodStart,
    periodEnd,
    notes,
    status: statusRaw || "draft",
    createdAt,
  };
}

function requireAuth(request: Request, expectedToken?: string) {
  if (!expectedToken) {
    return false;
  }
  const provided = extractBearerToken(request);
  if (!provided || provided !== expectedToken) {
    return false;
  }
  return true;
}

export async function onRequest(context: { request: Request; env: AdminFunctionEnv }) {
  const { request, env } = context;
  const db = env?.DB;
  const token = env?.ADMIN_TOKEN;

  if (request.method === "OPTIONS") {
    return jsonResponse({}, 204);
  }

  if (!db) {
    return parseError("internal", 500, ADMIN_ERROR_MESSAGES.missingDatabase);
  }

  if (!requireAuth(request, token)) {
    return parseError("unauthorized", 401, ADMIN_ERROR_MESSAGES.unauthorized);
  }

  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const limit = parseLimit(url.searchParams.get("limit"), 40);
      const requestedStatus = normalizeStatus(url.searchParams.get("status"));

      const query = requestedStatus
        ? "SELECT id, title, period_type, period_start, period_end, notes, status, created_at FROM admin_editions WHERE status = ? ORDER BY created_at DESC LIMIT ?"
        : "SELECT id, title, period_type, period_start, period_end, notes, status, created_at FROM admin_editions ORDER BY created_at DESC LIMIT ?";

      const statement = db.prepare(query);
      const result = requestedStatus
        ? await statement.bind(requestedStatus, limit).all()
        : await statement.bind(limit).all();

      const items = (result?.results ?? []).flatMap((row) => {
        const item = sanitizeEditionRow(row as Record<string, unknown>);
        return item ? [item] : [];
      });

      return jsonResponse({ items });
    }

    if (request.method === "POST") {
      const payload = await parseJsonBody(request);
      if (!payload) {
        return parseError("validation", 400, ADMIN_ERROR_MESSAGES.invalidPayload);
      }

      const title = sanitizeText(payload.title, MAX_TITLE_LENGTH);
      const periodType = normalizePeriodType(payload.periodType);
      const periodStartRaw = toIsoDate(payload.periodStart);
      const periodEndRaw = toIsoDate(payload.periodEnd);
      const notes = sanitizeText(payload.notes, MAX_NOTE_LENGTH);

      if (!title || !periodType || !periodStartRaw) {
        return parseError("validation", 400, ADMIN_ERROR_MESSAGES.invalidPayload);
      }

      const periodStart = periodStartRaw;
      const periodEnd = periodEndRaw || calculateEndDate(periodStartRaw, periodType);
      if (new Date(periodEnd).getTime() < new Date(periodStart).getTime()) {
        return parseError("validation", 400, ADMIN_ERROR_MESSAGES.invalidPeriod);
      }

      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const createdAt = new Date().toISOString();
      const status = "draft" as const;

      await db
        .prepare(
          `
          INSERT INTO admin_editions (id, title, period_type, period_start, period_end, notes, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .bind(id, title, periodType, periodStart, periodEnd, notes, status, createdAt)
        .run();

      const item: AdminEditionRecord = {
        id,
        title,
        periodType,
        periodStart,
        periodEnd,
        notes,
        status,
        createdAt,
      };

      return jsonResponse({ item }, 201);
    }

    return parseError("internal", 405, ADMIN_ERROR_MESSAGES.invalidMethod);
  } catch (error) {
    const normalizedError = error instanceof Error ? error.message : ADMIN_ERROR_MESSAGES.internal;
    return parseError("internal", 500, normalizedError);
  }
}
