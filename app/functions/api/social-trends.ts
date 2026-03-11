type SocialTrendsEnv = {
  SOCIAL_TRENDS_JSON?: string;
};

type SocialTrendsResponse = {
  source: "hardcoded" | "env-json";
  generatedAt: string;
  hashtags: string[];
};

const SOCIAL_TRENDS_FALLBACK = [
  "AcosoVecinal",
  "RuidoYSalud",
  "DerechoALaVivienda",
  "GentrificacionCDMX",
  "DesplazamientoForzado",
];

function headers() {
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "max-age=120, must-revalidate",
  } as const;
}

function sanitizeHashtags(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .map((entry) => {
      if (typeof entry !== "string") return "";
      return entry.replace(/^#+/, "").trim().replace(/\s+/g, "");
    })
    .filter(Boolean);
  const deduped = Array.from(new Set(normalized)).slice(0, 12);
  return deduped.length ? deduped : fallback;
}

function responsePayload(
  hashtags: string[],
  source: "hardcoded" | "env-json",
): Response {
  const body: SocialTrendsResponse = {
    source,
    generatedAt: new Date().toISOString(),
    hashtags,
  };
  return Response.json(body, { headers: headers() });
}

export async function onRequest(context: { request: Request; env: SocialTrendsEnv }) {
  const { request, env } = context;
  const requestHeaders = headers();

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: requestHeaders });
  }

  if (request.method !== "GET") {
    return Response.json(
      { error: "method-not-allowed", code: "method-not-allowed" },
      { status: 405, headers: requestHeaders }
    );
  }

  const fallback = SOCIAL_TRENDS_FALLBACK;
  const raw = env.SOCIAL_TRENDS_JSON;

  if (!raw) {
    return responsePayload(fallback, "hardcoded");
  }

  try {
    const parsed = JSON.parse(raw);
    const rawHashtags =
      Array.isArray(parsed?.hashtags) ? parsed.hashtags : Array.isArray(parsed?.tags) ? parsed.tags : parsed?.tagsList;
    const hashtags = sanitizeHashtags(rawHashtags, fallback);
    return responsePayload(hashtags, "env-json");
  } catch {
    const fallbackFromCsv = raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 12);
    if (fallbackFromCsv.length > 0) {
      return responsePayload(sanitizeHashtags(fallbackFromCsv, fallback), "env-json");
    }
    return responsePayload(fallback, "hardcoded");
  }
}
