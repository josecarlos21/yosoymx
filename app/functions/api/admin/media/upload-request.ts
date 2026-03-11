import {
  createMediaUploadRecord,
  ensureCmsSeed,
  jsonResponse,
  logActivity,
  optionsResponse,
  parseJsonBody,
  requireAdminAuth,
  type UploadRequestPayload,
} from "../../_shared/cms";

export async function onRequest(context: {
  request: Request;
  env: { DB?: unknown; ADMIN_TOKEN?: string; MEDIA_BUCKET?: unknown };
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
  if (request.method !== "POST") {
    return jsonResponse({ error: "method-not-allowed", code: "method-not-allowed" }, 405);
  }

  try {
    await ensureCmsSeed(db as never);
    const body = await parseJsonBody<UploadRequestPayload>(request);
    if (!body) {
      return jsonResponse({ error: "invalid-json", code: "validation" }, 400);
    }
    const item = await createMediaUploadRecord(request, env as never, db as never, body);
    if (!item) {
      return jsonResponse({ error: "upload-request-failed", code: "internal" }, 500);
    }
    await logActivity(db as never, "media", "upload-request", item.id, {
      kind: item.kind,
      fileName: item.originalFileName,
    });
    return jsonResponse({ item }, 201);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
