import { ensureCmsSeed, getBrandConfig, jsonResponse } from "./_shared/cms";

export async function onRequest(context: { request: Request; env: { DB?: unknown } }) {
  const db = context.env.DB;

  if (!db || typeof db !== "object" || !("prepare" in db)) {
    return jsonResponse({ error: "D1 binding no disponible", code: "internal" }, 500);
  }

  try {
    await ensureCmsSeed(db as never);
    const item = await getBrandConfig(db as never);
    return jsonResponse({ item });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
