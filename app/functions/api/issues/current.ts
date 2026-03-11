import { ensureCmsSeed, getBrandConfig, getCurrentPublishedIssue, jsonResponse } from "../_shared/cms";

export async function onRequest(context: { request: Request; env: { DB?: unknown } }) {
  const db = context.env.DB;
  if (!db || typeof db !== "object" || !("prepare" in db)) {
    return jsonResponse({ error: "D1 binding no disponible", code: "internal" }, 500);
  }

  try {
    await ensureCmsSeed(db as never);
    const [item, brand] = await Promise.all([getCurrentPublishedIssue(db as never), getBrandConfig(db as never)]);
    return jsonResponse({ item, brand });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
