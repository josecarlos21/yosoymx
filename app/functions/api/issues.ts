import { ensureCmsSeed, getBrandConfig, jsonResponse, listPublicIssues, parseLimit } from "./_shared/cms.ts";

export async function onRequest(context: {
  request: Request;
  env: { DB?: unknown };
}) {
  const { request, env } = context;
  const db = env.DB;

  if (!db || typeof db !== "object" || !("prepare" in db)) {
    return jsonResponse({ error: "D1 binding no disponible", code: "internal" }, 500);
  }

  if (request.method !== "GET") {
    return jsonResponse({ error: "method-not-allowed", code: "method-not-allowed" }, 405);
  }

  try {
    await ensureCmsSeed(db as never);
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"), 12, 1, 30);
    const [items, brand] = await Promise.all([listPublicIssues(db as never, limit), getBrandConfig(db as never)]);
    return jsonResponse({ items, brand });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
