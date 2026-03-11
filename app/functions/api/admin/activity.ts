import {
  ensureCmsSeed,
  jsonResponse,
  listActivity,
  optionsResponse,
  parseLimit,
  requireAdminAuth,
} from "../_shared/cms";

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
  if (request.method !== "GET") {
    return jsonResponse({ error: "method-not-allowed", code: "method-not-allowed" }, 405);
  }

  try {
    await ensureCmsSeed(db as never);
    const url = new URL(request.url);
    const items = await listActivity(db as never, parseLimit(url.searchParams.get("limit"), 60, 1, 120));
    return jsonResponse({ items });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
