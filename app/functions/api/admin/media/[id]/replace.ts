import {
  ensureCmsSeed,
  jsonResponse,
  logActivity,
  optionsResponse,
  parseJsonBody,
  replaceMediaUpload,
  requireAdminAuth,
} from "../../../_shared/cms";

type ReplaceMediaBody = {
  fileBase64?: unknown;
  mimeType?: unknown;
  alt?: unknown;
  caption?: unknown;
};

export async function onRequest(context: {
  request: Request;
  env: { DB?: unknown; ADMIN_TOKEN?: string; MEDIA_BUCKET?: unknown };
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
    const body = await parseJsonBody<ReplaceMediaBody>(request);
    const fileBase64 = typeof body?.fileBase64 === "string" ? body.fileBase64 : "";
    if (!fileBase64) {
      return jsonResponse({ error: "payload inválido", code: "validation" }, 400);
    }
    const item = await replaceMediaUpload(
      request,
      env as never,
      db as never,
      id,
      fileBase64,
      typeof body?.mimeType === "string" ? body.mimeType : undefined,
      typeof body?.alt === "string" ? body.alt : undefined,
      typeof body?.caption === "string" ? body.caption : undefined
    );
    if (!item) {
      return jsonResponse({ error: "media-not-found", code: "not-found" }, 404);
    }
    await logActivity(db as never, "media", "replace", item.id, {
      kind: item.kind,
      publicUrl: item.publicUrl,
    });
    return jsonResponse({ item });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error instanceof Error ? error.message : "internal-error", code: "internal" }, 500);
  }
}
