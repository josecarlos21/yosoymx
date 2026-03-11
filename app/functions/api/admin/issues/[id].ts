import {
  ensureCmsSeed,
  getIssueById,
  jsonResponse,
  logActivity,
  normalizeEditionStatus,
  optionsResponse,
  parseJsonBody,
  requireAdminAuth,
  updateIssueRecord,
} from "../../_shared/cms";

type UpdateIssueBody = {
  slug?: unknown;
  status?: unknown;
  label?: unknown;
  location?: unknown;
  themeLine?: unknown;
  contentPayload?: unknown;
  brandOverrides?: unknown;
};

export async function onRequest(context: {
  request: Request;
  env: { DB?: unknown; ADMIN_TOKEN?: string };
  params?: { id?: string };
}) {
  const { request, env } = context;
  const db = env.DB;
  const id = typeof context.params?.id === "string" ? context.params.id.trim() : "";

  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  if (!db || typeof db !== "object" || !("prepare" in db)) {
    return jsonResponse({ error: "D1 binding no disponible", code: "internal" }, 500);
  }
  if (!requireAdminAuth(request, env.ADMIN_TOKEN)) {
    return jsonResponse({ error: "No autorizado. Requiere token administrativo.", code: "unauthorized" }, 401);
  }
  if (!id) {
    return jsonResponse({ error: "id inválido", code: "validation" }, 400);
  }

  try {
    await ensureCmsSeed(db as never);

    if (request.method === "GET") {
      const item = await getIssueById(db as never, id);
      if (!item) {
        return jsonResponse({ error: "issue-not-found", code: "not-found" }, 404);
      }
      return jsonResponse({ item });
    }

    if (request.method === "PUT") {
      const body = await parseJsonBody<UpdateIssueBody>(request);
      if (!body) {
        return jsonResponse({ error: "invalid-json", code: "validation" }, 400);
      }

      const item = await updateIssueRecord(db as never, id, {
        slug: body.slug as string | undefined,
        status: normalizeEditionStatus(body.status) || undefined,
        label: body.label as string | undefined,
        location: body.location as string | undefined,
        themeLine: body.themeLine as string | undefined,
        contentPayload: body.contentPayload as never,
        brandOverrides: (body.brandOverrides && typeof body.brandOverrides === "object" ? body.brandOverrides : undefined) as never,
      });

      if (!item) {
        return jsonResponse({ error: "issue-not-found", code: "not-found" }, 404);
      }

      await logActivity(db as never, "issues", "update", item.id, {
        slug: item.slug,
        status: item.status,
        version: item.version,
      });
      return jsonResponse({ item });
    }

    return jsonResponse({ error: "method-not-allowed", code: "method-not-allowed" }, 405);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
