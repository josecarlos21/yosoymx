export type SharePanelSurface = "header" | "cover" | "mobile-sticky";
export type SharePanelAction =
  | "copy_link"
  | "copy_summary"
  | "copy_quote"
  | "web_share"
  | "facebook"
  | "x"
  | "tiktok";
export type SharePanelStatus = "ok" | "fallback" | "error";

export type SharePanelEvent = {
  action: SharePanelAction;
  surface: SharePanelSurface;
  status: SharePanelStatus;
  message?: string;
};

export type SharePayload = {
  title: string;
  excerpt: string;
  url: string;
  hashtags: string[];
};

export type SharePayloadInput = {
  title: string;
  excerpt: string;
  hashtags?: string[];
  url?: string;
  canonicalUrl?: string;
};

export type SocialShareClipboardResult = {
  status: SharePanelStatus;
};

export type ShareTrackingEnvelope = SharePanelEvent & {
  page: string;
  channel: string;
  timestamp: string;
  url: string;
  articleId?: string;
  correlationId: string;
};

export const SHARE_DEFAULT_HASHTAGS = [
  "AcosoVecinal",
  "RuidoYSalud",
  "DerechoALaVivienda",
  "GentrificacionCDMX",
  "DesplazamientoForzado",
];

export const SHARE_CANONICAL_URL_FALLBACK = "https://yosoymx.com/gaceta-eje-central";
export const SHARE_DEFAULT_TITLE =
  "No es 'pleito de vecinos'. Es violencia que rompe vivienda, sueño y salud mental.";
export const SHARE_DEFAULT_SUMMARY =
  "Acoso vecinal por ruido y vibración en CDMX: se vuelve daño sanitario, barrera económica y presión para salir del hogar. Esto documenta rutas, evidencia y opciones institucionales.";
export const SHARE_DEFAULT_QUOTE =
  '"El acoso por ruido y vibraciones no es una molestia menor: puede dañar la salud mental, romper la convivencia y empujar a las personas fuera de su vivienda. En un contexto de gentrificación extrema donde 20,000 hogares son expulsados anualmente de la CDMX, la ciudad necesita protocolo, medición y respuesta real. No más impunidad para quienes convierten la vivienda en arma de desgaste."';

export const SHARE_REEL_GUIDE = {
  title: "Guion corto (15s)",
  shots: [
    "0-5s: Muestra datos fuertes de contexto (2025, aumento de rentas, impactos).",
    "5-10s: Muestra 1 testimonio visual o evidencia (bitácora, audio, mapa).",
    "10-15s: Cierra con CTA: conoce rutas y comparte esta nota.",
  ],
  cta: "Texto final: 'No normalicemos el ruido que arruina hogares. Comparte y activa red de apoyo.'",
};

export const SOCIAL_SHARE_EVENTS_FALLBACK_ENDPOINT = "/api/social-share";
export const SOCIAL_TRENDS_ENDPOINT = "/api/social-trends";
export const SHARE_ARTICLE_ID = "gaceta-eje-central";

function stripExtraWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, max: number) {
  if (value.length <= max) return value;
  if (max <= 1) return "…";
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function normalizeHashtagForQuery(value: string) {
  return value.replace(/^#+/, "").trim().replace(/\s+/g, "");
}

export function normalizeHashtags(input: string[], fallback: string[] = SHARE_DEFAULT_HASHTAGS) {
  if (!Array.isArray(input)) return [...fallback];
  const sanitized = input
    .map((value) => normalizeHashtagForQuery(typeof value === "string" ? value : ""))
    .filter(Boolean);
  const deduped = Array.from(new Set(sanitized)).slice(0, 12);
  return deduped.length ? deduped : [...fallback];
}

export function buildSharePayload(input: SharePayloadInput) {
  const canonicalUrl = normalizeShareUrl(input.canonicalUrl || SHARE_CANONICAL_URL_FALLBACK);
  return {
    title: stripExtraWhitespace(input.title || SHARE_DEFAULT_TITLE),
    excerpt: stripExtraWhitespace(input.excerpt || SHARE_DEFAULT_SUMMARY),
    hashtags: normalizeHashtags(input.hashtags || SHARE_DEFAULT_HASHTAGS),
    url: normalizeShareUrl(input.url || canonicalUrl, canonicalUrl),
  } as SharePayload;
}

function normalizeShareUrl(value: string, fallback = SHARE_CANONICAL_URL_FALLBACK) {
  if (!value) return fallback;
  try {
    return new URL(value).toString();
  } catch {
    return fallback;
  }
}

export function buildShareText(payload: SharePayload, max: number | null = null) {
  const normalizedHashtags = payload.hashtags
    .map((item) => normalizeHashtagForQuery(item))
    .filter(Boolean)
    .map((item) => `#${item}`)
    .join(" ");

  const baseText = stripExtraWhitespace(`${payload.title}. ${payload.excerpt} ${normalizedHashtags}`).trim();
  const base = baseText.length ? baseText : payload.title;
  if (max === null) return `${base}\n\n${payload.url || ""}`.trim();

  const safeUrlLength = Math.min(payload.url.length, 96);
  const textBudget = Math.max(60, max - safeUrlLength - 1);
  return `${truncateText(base, textBudget)}\n${payload.url || ""}`.trim();
}

export function buildFbShareUrl(url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function buildXShareUrl(payload: SharePayload, hashtagLimit = 4) {
  const hashtags = payload.hashtags
    .map((item) => normalizeHashtagForQuery(item))
    .filter(Boolean)
    .slice(0, hashtagLimit)
    .join(",");
  const text = buildShareText(payload, 280);
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(payload.url)}${hashtags ? `&hashtags=${encodeURIComponent(hashtags)}` : ""}`;
}

export function buildTikTokSearchUrl(tag: string) {
  return `https://www.tiktok.com/search?q=${encodeURIComponent(`#${normalizeHashtagForQuery(tag)}`)}`;
}

export function buildXHashtagUrl(tag: string) {
  return `https://x.com/hashtag/${encodeURIComponent(normalizeHashtagForQuery(tag))}?src=hashtag_click`;
}

export async function copyTextWithFallback(text: string): Promise<SocialShareClipboardResult> {
  if (!text) {
    return { status: "error" };
  }

  if (typeof navigator === "undefined" || !navigator?.clipboard?.writeText) {
    window.prompt("Copia este texto:", text);
    return { status: "fallback" };
  }

  try {
    await navigator.clipboard.writeText(text);
    return { status: "ok" };
  } catch {
    window.prompt("Copia este texto:", text);
    return { status: "fallback" };
  }
}

export function buildShareTrackingEvent(
  event: SharePanelEvent,
  url: string,
  channel = "social_panel",
  page = "gaceta-eje-central"
): ShareTrackingEnvelope {
  return {
    ...event,
    status: event.status || "ok",
    page,
    channel,
    timestamp: new Date().toISOString(),
    url,
    correlationId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
  };
}
