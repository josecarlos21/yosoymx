import {
  completeMediaUpload,
  ensureCmsSeed,
  jsonResponse,
  logActivity,
  optionsResponse,
  parseJsonBody,
  requireAdminAuth,
} from "../../_shared/cms";

type CompleteMediaBody = {
  id?: unknown;
  fileBase64?: unknown;
  alt?: unknown;
  caption?: unknown;
};

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
    const body = await parseJsonBody<CompleteMediaBody>(request);
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const fileBase64 = typeof body?.fileBase64 === "string" ? body.fileBase64 : "";
    if (!id || !fileBase64) {
      return jsonResponse({ error: "payload inválido", code: "validation" }, 400);
    }
    const item = await completeMediaUpload(
      request,
      env as never,
      db as never,
      id,
      fileBase64,
      typeof body?.alt === "string" ? body.alt : undefined,
      typeof body?.caption === "string" ? body.caption : undefined
    );
    if (!item) {
      return jsonResponse({ error: "media-not-found", code: "not-found" }, 404);
    }
    await logActivity(db as never, "media", "complete-upload", item.id, {
      kind: item.kind,
      publicUrl: item.publicUrl,
    });
    return jsonResponse({ item });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error instanceof Error ? error.message : "internal-error", code: "internal" }, 500);
  }
}
