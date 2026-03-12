import {
  buildIssuePreflightReport,
  ensureCmsSeed,
  getBrandConfig,
  getIssueById,
  IssueWorkflowError,
  jsonResponse,
  logActivity,
  optionsResponse,
  publishIssueRecord,
  requireAdminAuth,
} from "../../../_shared/cms";

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
  if (request.method !== "POST") {
    return jsonResponse({ error: "method-not-allowed", code: "method-not-allowed" }, 405);
  }
  if (!id) {
    return jsonResponse({ error: "id inválido", code: "validation" }, 400);
  }

  try {
    await ensureCmsSeed(db as never);
    const existing = await getIssueById(db as never, id);
    if (!existing) {
      return jsonResponse({ error: "issue-not-found", code: "not-found" }, 404);
    }
    const brand = await getBrandConfig(db as never);
    const report = await buildIssuePreflightReport(db as never, request, env, existing, brand);
    if (report.blockers.length > 0) {
      throw new IssueWorkflowError("La edición no cumple el preflight editorial.", "preflight-failed", 422, report);
    }
    const item = await publishIssueRecord(db as never, id);
    if (!item) {
      return jsonResponse({ error: "issue-not-found", code: "not-found" }, 404);
    }
    await logActivity(db as never, "issues", "publish", item.id, {
      slug: item.slug,
      publishedAt: item.publishedAt,
    });
    return jsonResponse({ item });
  } catch (error) {
    if (error instanceof IssueWorkflowError) {
      return jsonResponse(
        {
          error: error.message,
          code: error.code,
          blockers: error.report?.blockers ?? [],
          warnings: error.report?.warnings ?? [],
        },
        error.status
      );
    }
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
