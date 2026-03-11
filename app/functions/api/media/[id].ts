import { ensureCmsSeed, readMediaAssetResponse } from "../_shared/cms";

export async function onRequest(context: {
  request: Request;
  env: { DB?: unknown; MEDIA_BUCKET?: unknown };
  params?: { id?: string };
}) {
  const db = context.env.DB;
  const id = typeof context.params?.id === "string" ? context.params.id.trim() : "";

  if (!db || typeof db !== "object" || !("prepare" in db)) {
    return new Response("D1 binding no disponible", { status: 500 });
  }

  if (!id) {
    return new Response("ID inválido", { status: 400 });
  }

  try {
    await ensureCmsSeed(db as never);
    return await readMediaAssetResponse(context.request, context.env as never, db as never, id);
  } catch (error) {
    console.error(error);
    return new Response("internal-error", { status: 500 });
  }
}
