import {
  buildIssuePreflightReport,
  ensureCmsSeed,
  getIssueById,
  getBrandConfig,
  IssueWorkflowError,
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
  socialAssetId?: unknown;
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

      const requestedStatus = normalizeEditionStatus(body.status);
      if (requestedStatus === "review_ready") {
        const existing = await getIssueById(db as never, id);
        if (!existing) {
          return jsonResponse({ error: "issue-not-found", code: "not-found" }, 404);
        }
        const reviewCandidate = {
          ...existing,
          slug: typeof body.slug === "string" ? body.slug : existing.slug,
          status: "review_ready" as const,
          label: typeof body.label === "string" ? body.label : existing.label,
          location: typeof body.location === "string" ? body.location : existing.location,
          themeLine: typeof body.themeLine === "string" ? body.themeLine : existing.themeLine,
          socialAssetId: typeof body.socialAssetId === "string" ? body.socialAssetId : existing.socialAssetId,
          contentPayload:
            body.contentPayload && typeof body.contentPayload === "object"
              ? (body.contentPayload as typeof existing.contentPayload)
              : existing.contentPayload,
          brandOverrides:
            body.brandOverrides && typeof body.brandOverrides === "object"
              ? (body.brandOverrides as typeof existing.brandOverrides)
              : existing.brandOverrides,
        };
        const brand = await getBrandConfig(db as never);
        const report = await buildIssuePreflightReport(db as never, request, env, reviewCandidate, brand);
        if (report.blockers.length > 0) {
          throw new IssueWorkflowError("La edición no cumple el preflight editorial.", "preflight-failed", 422, report);
        }
      }

      const item = await updateIssueRecord(db as never, id, {
        slug: body.slug as string | undefined,
        status: requestedStatus || undefined,
        label: body.label as string | undefined,
        location: body.location as string | undefined,
        themeLine: body.themeLine as string | undefined,
        socialAssetId: body.socialAssetId as string | undefined,
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
    if (error instanceof Error && error.message === "slug-conflict") {
      return jsonResponse({ error: "Ese slug ya existe. Usa uno distinto para conservar el historial.", code: "slug-conflict" }, 409);
    }
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
