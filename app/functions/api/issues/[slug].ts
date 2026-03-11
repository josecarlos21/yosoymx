import { ensureCmsSeed, getBrandConfig, getIssueBySlug, jsonResponse } from "../_shared/cms";

export async function onRequest(context: {
  request: Request;
  env: { DB?: unknown };
  params?: { slug?: string };
}) {
  const db = context.env.DB;
  const slug = typeof context.params?.slug === "string" ? context.params.slug.trim() : "";

  if (!db || typeof db !== "object" || !("prepare" in db)) {
    return jsonResponse({ error: "D1 binding no disponible", code: "internal" }, 500);
  }
  if (!slug) {
    return jsonResponse({ error: "slug inválido", code: "validation" }, 400);
  }

  try {
    await ensureCmsSeed(db as never);
    const item = await getIssueBySlug(db as never, slug);
    if (!item) {
      return jsonResponse({ error: "issue-not-found", code: "not-found" }, 404);
    }
    const brand = await getBrandConfig(db as never);
    return jsonResponse({ item, brand });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "internal-error", code: "internal" }, 500);
  }
}
