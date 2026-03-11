import { issueContent } from "@/lib/issue-content";

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

export const SHARE_DEFAULT_HASHTAGS = [...issueContent.share.hashtags];

export const SHARE_CANONICAL_URL_FALLBACK = issueContent.metadata.canonicalUrl;
export const SHARE_DEFAULT_TITLE = issueContent.share.title;
export const SHARE_DEFAULT_SUMMARY = issueContent.share.summary;
export const SHARE_DEFAULT_QUOTE = issueContent.share.quote;

export const SHARE_REEL_GUIDE = {
  title: issueContent.share.reelGuide.title,
  shots: [...issueContent.share.reelGuide.shots],
  cta: issueContent.share.reelGuide.cta,
};

export const SOCIAL_SHARE_EVENTS_FALLBACK_ENDPOINT = "/api/social-share";
export const SOCIAL_TRENDS_ENDPOINT = "/api/social-trends";
export const SHARE_ARTICLE_ID = issueContent.id;

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
