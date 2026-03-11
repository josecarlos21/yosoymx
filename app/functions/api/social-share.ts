type SocialShareEnv = {
  SHARE_EVENTS_WEBHOOK?: string;
};

type SocialSharePayload = {
  action?: string;
  surface?: string;
  status?: "ok" | "fallback" | "error";
  message?: string;
  page?: string;
  channel?: string;
  timestamp?: string;
  url?: string;
  articleId?: string;
  correlationId?: string;
};

function defaultHeaders() {
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  } as const;
}

function normalizePayload(body: unknown): SocialSharePayload {
  if (!body || typeof body !== "object") return {};
  const payload = body as Record<string, unknown>;
  return {
    action: typeof payload.action === "string" ? payload.action : undefined,
    surface: typeof payload.surface === "string" ? payload.surface : undefined,
    status:
      payload.status === "fallback" || payload.status === "error"
        ? payload.status
        : payload.status === "ok"
          ? "ok"
          : undefined,
    message: typeof payload.message === "string" ? payload.message : undefined,
    page: typeof payload.page === "string" ? payload.page : undefined,
    channel: typeof payload.channel === "string" ? payload.channel : undefined,
    timestamp: typeof payload.timestamp === "string" ? payload.timestamp : undefined,
    url: typeof payload.url === "string" ? payload.url : undefined,
    articleId: typeof payload.articleId === "string" ? payload.articleId : undefined,
    correlationId:
      typeof payload.correlationId === "string" ? payload.correlationId : Math.random().toString(16).slice(2),
  };
}

async function forwardToWebhook(
  payload: SocialSharePayload,
  webhook: string
) {
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // La entrega a webhook es opcional.
  }
}

export async function onRequest(context: { request: Request; env: SocialShareEnv }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: defaultHeaders() });
  }

  if (request.method === "GET") {
    return Response.json({ ok: true, endpoint: "social-share", status: "ready" }, { headers: defaultHeaders() });
  }

  if (request.method !== "POST") {
    return Response.json(
      { error: "method-not-allowed", code: "method-not-allowed" },
      { status: 405, headers: defaultHeaders() }
    );
  }

  let payload: SocialSharePayload;
  try {
    const body = await request.json();
    payload = normalizePayload(body);
  } catch {
    return Response.json(
      { error: "invalid-json", code: "invalid-json" },
      { status: 400, headers: defaultHeaders() }
    );
  }

  if (env.SHARE_EVENTS_WEBHOOK) {
    void forwardToWebhook(payload, env.SHARE_EVENTS_WEBHOOK);
  } else {
    console.log("social-share", payload);
  }

  return Response.json({ ok: true, received: true, status: "accepted" }, { headers: defaultHeaders() });
}
