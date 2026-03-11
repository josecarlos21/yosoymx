import {
  createDraftIssue,
  ensureCmsSeed,
  getCurrentPublishedIssue,
  getIssueById,
  jsonResponse,
  listIssues,
  logActivity,
  optionsResponse,
  parseJsonBody,
  parseLimit,
  requireAdminAuth,
} from "../_shared/cms";

type CreateDraftBody = {
  sourceIssueId?: unknown;
};

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
      const items = await listIssues(db as never, parseLimit(url.searchParams.get("limit"), 40));
      return jsonResponse({ items });
    }

    if (request.method === "POST") {
      const body = await parseJsonBody<CreateDraftBody>(request);
      const sourceId = typeof body?.sourceIssueId === "string" ? body.sourceIssueId.trim() : "";
      const sourceIssue = sourceId ? await getIssueById(db as never, sourceId) : await getCurrentPublishedIssue(db as never);
      const item = await createDraftIssue(db as never, sourceIssue);
      await logActivity(db as never, "issues", "create-draft", item.id, {
        sourceIssueId: sourceIssue?.id ?? null,
        label: item.label,
      });
      return jsonResponse({ item }, 201);
    }

    return jsonResponse({ error: "method-not-allowed", code: "method-not-allowed" }, 405);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
