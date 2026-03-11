import {
  createDraftIssue,
  ensureCmsSeed,
  getCurrentPublishedIssue,
  jsonResponse,
  listIssues,
  logActivity,
  optionsResponse,
  parseJsonBody,
  parseLimit,
  requireAdminAuth,
  sanitizeText,
  updateIssueRecord,
} from "../_shared/cms";

type LegacyEditionPayload = {
  title?: unknown;
  periodType?: unknown;
  periodStart?: unknown;
  periodEnd?: unknown;
  notes?: unknown;
};

function toLegacyEdition(item: Awaited<ReturnType<typeof getCurrentPublishedIssue>>) {
  return {
    id: item.id,
    title: item.label,
    periodType: item.label.toLowerCase().includes("seman") ? "weekly" : "daily",
    periodStart: item.publishedAt ?? item.createdAt,
    periodEnd: item.updatedAt,
    notes: item.themeLine,
    status: item.status,
    createdAt: item.createdAt,
  };
}

export async function onRequest(context: {
  request: Request;
  env: { DB?: unknown; ADMIN_TOKEN?: string };
}) {
  const { request, env } = context;
  const db = env.DB;

  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  if (!db || typeof db !== "object" || !("prepare" in db)) {
    return jsonResponse({ error: "D1 binding no disponible", code: "internal" }, 500);
  }
  if (!requireAdminAuth(request, env.ADMIN_TOKEN)) {
    return jsonResponse({ error: "No autorizado. Requiere token administrativo.", code: "unauthorized" }, 401);
  }

  try {
    await ensureCmsSeed(db as never);

    if (request.method === "GET") {
      const url = new URL(request.url);
      const limit = parseLimit(url.searchParams.get("limit"), 40);
      const requestedStatus = url.searchParams.get("status")?.trim();
      const items = await listIssues(db as never, limit);
      const filtered = requestedStatus
        ? items.filter((item) => item.status === requestedStatus)
        : items;
      return jsonResponse({ items: filtered.map(toLegacyEdition) });
    }

    if (request.method === "POST") {
      const body = await parseJsonBody<LegacyEditionPayload>(request);
      const sourceIssue = await getCurrentPublishedIssue(db as never);
      const created = await createDraftIssue(db as never, sourceIssue);
      const label = sanitizeText(body?.title, 120) || created.label;
      const themeLine = sanitizeText(body?.notes, 160) || created.themeLine;
      const updated = await updateIssueRecord(db as never, created.id, { label, themeLine });
      const item = updated ?? created;
      await logActivity(db as never, "editions-legacy", "create-draft", item.id, {
        title: label,
        periodType: typeof body?.periodType === "string" ? body.periodType : "daily",
      });
      return jsonResponse({ item: toLegacyEdition(item) }, 201);
    }

    return jsonResponse({ error: "method-not-allowed", code: "method-not-allowed" }, 405);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
