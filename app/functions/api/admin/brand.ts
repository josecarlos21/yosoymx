import {
  ensureCmsSeed,
  getBrandConfig,
  jsonResponse,
  logActivity,
  optionsResponse,
  parseJsonBody,
  requireAdminAuth,
  updateBrandConfig,
} from "../_shared/cms";

type UpdateBrandBody = {
  siteName?: unknown;
  masthead?: unknown;
  shortMasthead?: unknown;
  themeMode?: unknown;
  supportLinks?: unknown;
  defaultOgAssetId?: unknown;
  logoAssetId?: unknown;
  webIconPack?: unknown;
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
      const item = await getBrandConfig(db as never);
      return jsonResponse({ item });
    }

    if (request.method === "PUT") {
      const body = await parseJsonBody<UpdateBrandBody>(request);
      if (!body) {
        return jsonResponse({ error: "invalid-json", code: "validation" }, 400);
      }
      const item = await updateBrandConfig(db as never, {
        siteName: body.siteName as string | undefined,
        masthead: body.masthead as string | undefined,
        shortMasthead: body.shortMasthead as string | undefined,
        themeMode: body.themeMode as string | undefined,
        supportLinks: body.supportLinks as never,
        defaultOgAssetId: body.defaultOgAssetId as string | undefined,
        logoAssetId: body.logoAssetId as string | undefined,
        webIconPack: body.webIconPack as never,
      });
      await logActivity(db as never, "brand", "update", item.id, {
        masthead: item.masthead,
        defaultOgAssetId: item.defaultOgAssetId,
      });
      return jsonResponse({ item });
    }

    return jsonResponse({ error: "method-not-allowed", code: "method-not-allowed" }, 405);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
