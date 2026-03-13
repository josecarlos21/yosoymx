import {
  buildFallbackEditionPayload,
  fallbackBrandConfig,
  type BrandConfig,
  type EditionPayload,
} from "./issue-content.ts";

type CurrentEditionResponse = {
  item?: unknown;
  brand?: unknown;
};

export type PublicIssueSummary = {
  id: string;
  slug: string;
  status: "published" | "archived";
  version: number;
  publishedAt: string | null;
  label: string;
  location: string;
  themeLine: string;
  title: string;
  summary: string;
  articleLabel: string;
};

type IssueArchiveResponse = {
  items?: unknown[];
  brand?: unknown;
};

const CURRENT_ISSUE_API_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_CURRENT_ISSUE_API_URL
    ? String(import.meta.env.VITE_CURRENT_ISSUE_API_URL)
    : "/api/issues/current";

const BRAND_API_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_BRAND_API_URL
    ? String(import.meta.env.VITE_BRAND_API_URL)
    : "/api/brand";

const ISSUE_ARCHIVE_API_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_ISSUE_ARCHIVE_API_URL
    ? String(import.meta.env.VITE_ISSUE_ARCHIVE_API_URL)
    : "/api/issues";

const REQUEST_TIMEOUT_MS = 12_000;
const FORCE_LOCAL_API =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_FORCE_LOCAL_API
    ? String(import.meta.env.VITE_FORCE_LOCAL_API).toLowerCase() === "true"
    : false;

function shouldPreferLocalFallback(url: string) {
  if (FORCE_LOCAL_API || typeof window === "undefined") return false;
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  return isLocalHost && url.startsWith("/api/");
}

export class EditionApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "EditionApiError";
    this.status = status;
  }
}

function responseHasJsonContentType(response: Response) {
  return response.headers.get("content-type")?.toLowerCase().includes("application/json") === true;
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function requestWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
      },
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function sanitizeBrandConfig(input: unknown): BrandConfig | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.siteName !== "string" ||
    typeof candidate.masthead !== "string" ||
    typeof candidate.shortMasthead !== "string" ||
    typeof candidate.themeMode !== "string"
  ) {
    return null;
  }
  return {
    ...fallbackBrandConfig,
    ...candidate,
    supportLinks: {
      ...fallbackBrandConfig.supportLinks,
      ...(candidate.supportLinks as BrandConfig["supportLinks"] | undefined),
    },
    webIconPack: {
      ...fallbackBrandConfig.webIconPack,
      ...(candidate.webIconPack as BrandConfig["webIconPack"] | undefined),
    },
  };
}

function sanitizeEditionPayload(input: unknown): EditionPayload | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Record<string, unknown>;
  const fallback = buildFallbackEditionPayload();

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.slug !== "string" ||
    typeof candidate.status !== "string" ||
    typeof candidate.label !== "string" ||
    typeof candidate.location !== "string" ||
    typeof candidate.themeLine !== "string" ||
    !candidate.contentPayload ||
    typeof candidate.contentPayload !== "object"
  ) {
    return null;
  }

  return {
    ...fallback,
    ...candidate,
    socialAssetId: typeof candidate.socialAssetId === "string" ? candidate.socialAssetId : null,
    contentPayload: candidate.contentPayload as EditionPayload["contentPayload"],
    brandOverrides:
      candidate.brandOverrides && typeof candidate.brandOverrides === "object"
        ? (candidate.brandOverrides as Partial<BrandConfig>)
        : null,
    version:
      typeof candidate.version === "number" && Number.isFinite(candidate.version)
        ? candidate.version
        : fallback.version,
    publishedAt: typeof candidate.publishedAt === "string" ? candidate.publishedAt : null,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : fallback.createdAt,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : fallback.updatedAt,
  };
}

function sanitizeIssueSummary(input: unknown): PublicIssueSummary | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.slug !== "string" ||
    (candidate.status !== "published" && candidate.status !== "archived") ||
    typeof candidate.label !== "string" ||
    typeof candidate.location !== "string" ||
    typeof candidate.themeLine !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.summary !== "string" ||
    typeof candidate.articleLabel !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    slug: candidate.slug,
    status: candidate.status,
    version:
      typeof candidate.version === "number" && Number.isFinite(candidate.version)
        ? candidate.version
        : 1,
    publishedAt: typeof candidate.publishedAt === "string" ? candidate.publishedAt : null,
    label: candidate.label,
    location: candidate.location,
    themeLine: candidate.themeLine,
    title: candidate.title,
    summary: candidate.summary,
    articleLabel: candidate.articleLabel,
  };
}

export async function fetchCurrentEdition() {
  const fallback = {
    item: buildFallbackEditionPayload(),
    brand: fallbackBrandConfig,
  };

  if (shouldPreferLocalFallback(CURRENT_ISSUE_API_URL)) {
    return fallback;
  }

  try {
    const response = await requestWithTimeout(CURRENT_ISSUE_API_URL);
    if (!responseHasJsonContentType(response)) {
      throw new EditionApiError("Respuesta inválida del servicio.", response.status);
    }
    if (!response.ok) {
      throw new EditionApiError(`No fue posible cargar la edición (${response.status}).`, response.status);
    }
    const raw = (await parseJsonSafe<CurrentEditionResponse>(response)) ?? {};
    return {
      item: sanitizeEditionPayload(raw.item) ?? fallback.item,
      brand: sanitizeBrandConfig(raw.brand) ?? fallback.brand,
    };
  } catch {
    return fallback;
  }
}

export async function fetchEditionBySlug(slug: string) {
  const fallback = {
    item: buildFallbackEditionPayload(),
    brand: fallbackBrandConfig,
  };

  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return fallback;
  const requestUrl = `${ISSUE_ARCHIVE_API_URL}/${encodeURIComponent(normalizedSlug)}`;

  if (shouldPreferLocalFallback(requestUrl)) {
    return fallback;
  }

  try {
    const response = await requestWithTimeout(requestUrl);
    if (!responseHasJsonContentType(response)) {
      throw new EditionApiError("Respuesta inválida del servicio.", response.status);
    }
    if (!response.ok) {
      throw new EditionApiError(`No fue posible cargar la edición (${response.status}).`, response.status);
    }
    const raw = (await parseJsonSafe<CurrentEditionResponse>(response)) ?? {};
    return {
      item: sanitizeEditionPayload(raw.item) ?? fallback.item,
      brand: sanitizeBrandConfig(raw.brand) ?? fallback.brand,
    };
  } catch {
    return fallback;
  }
}

export async function fetchIssueArchive(limit = 8) {
  const fallback = {
    items: [
      {
        id: "fallback-current",
        slug: buildFallbackEditionPayload().slug,
        status: "published" as const,
        version: buildFallbackEditionPayload().version,
        publishedAt: buildFallbackEditionPayload().publishedAt,
        label: buildFallbackEditionPayload().label,
        location: buildFallbackEditionPayload().location,
        themeLine: buildFallbackEditionPayload().themeLine,
        title: buildFallbackEditionPayload().contentPayload.share.title,
        summary: buildFallbackEditionPayload().contentPayload.share.summary,
        articleLabel: buildFallbackEditionPayload().contentPayload.metadata.articleLabel,
      },
    ],
    brand: fallbackBrandConfig,
  };

  const requestUrl = `${ISSUE_ARCHIVE_API_URL}?limit=${encodeURIComponent(String(limit))}`;
  if (shouldPreferLocalFallback(requestUrl)) {
    return fallback;
  }

  try {
    const response = await requestWithTimeout(requestUrl);
    if (!responseHasJsonContentType(response)) {
      throw new EditionApiError("Respuesta inválida del servicio.", response.status);
    }
    if (!response.ok) {
      throw new EditionApiError(`No fue posible cargar el archivo (${response.status}).`, response.status);
    }
    const raw = (await parseJsonSafe<IssueArchiveResponse>(response)) ?? {};
    const items = Array.isArray(raw.items)
      ? raw.items.flatMap((entry) => {
          const item = sanitizeIssueSummary(entry);
          return item ? [item] : [];
        })
      : [];
    return {
      items: items.length ? items : fallback.items,
      brand: sanitizeBrandConfig(raw.brand) ?? fallback.brand,
    };
  } catch {
    return fallback;
  }
}

export async function fetchBrandConfig() {
  if (shouldPreferLocalFallback(BRAND_API_URL)) {
    return fallbackBrandConfig;
  }

  try {
    const response = await requestWithTimeout(BRAND_API_URL);
    if (!responseHasJsonContentType(response) || !response.ok) {
      throw new EditionApiError("No fue posible cargar la marca.", response.status);
    }
    const raw = (await parseJsonSafe<{ item?: unknown }>(response)) ?? {};
    return sanitizeBrandConfig(raw.item) ?? fallbackBrandConfig;
  } catch {
    return fallbackBrandConfig;
  }
}

export function applyBrandHead(brand: BrandConfig, edition: EditionPayload) {
  if (typeof document === "undefined") return;
  const routedUrl =
    typeof window !== "undefined" && window.location.pathname !== "/"
      ? new URL(window.location.pathname + window.location.search, window.location.origin).href
      : edition.contentPayload.metadata.canonicalURL;
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const isArchiveLanding = pathname === "/gaceta-eje-central/archivo";
  const isEditionRoute = pathname.startsWith("/gaceta-eje-central/edicion/");
  document.title = isArchiveLanding ? `Archivo editorial · ${brand.masthead}` : `${brand.masthead} · ${edition.label}`;
  const ogAssetId = edition.socialAssetId || brand.defaultOgAssetId;
  const ogImagePath = ogAssetId ? `/api/media/${ogAssetId}` : isEditionRoute ? "/og-edition.png" : "/og-default.png";
  const ogImage = typeof window !== "undefined" ? new URL(ogImagePath, window.location.origin).href : ogImagePath;

  const ensureLink = (rel: string, href: string, type?: string) => {
    let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!element) {
      element = document.createElement("link");
      element.rel = rel;
      document.head.appendChild(element);
    }
    element.href = href;
    if (type) element.type = type;
  };

  ensureLink("icon", brand.webIconPack.faviconSvg, "image/svg+xml");
  ensureLink("apple-touch-icon", brand.webIconPack.appleTouchIcon);
  ensureLink("manifest", "/manifest.webmanifest", "application/manifest+json");
  ensureLink("canonical", routedUrl);

  const ensureMeta = (selector: string, attr: "name" | "property", value: string, content: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(selector);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(attr, value);
      document.head.appendChild(element);
    }
    element.content = content;
  };

  ensureMeta('meta[name="description"]', "name", "description", edition.contentPayload.metadata.description);
  ensureMeta(
    'meta[property="og:description"]',
    "property",
    "og:description",
    isArchiveLanding ? "Consulta ediciones publicadas y conserva enlaces estables para compartir cada nota." : edition.contentPayload.share.summary
  );
  ensureMeta('meta[property="og:title"]', "property", "og:title", edition.contentPayload.share.title);
  ensureMeta('meta[property="og:site_name"]', "property", "og:site_name", brand.siteName);
  ensureMeta('meta[property="og:url"]', "property", "og:url", routedUrl);
  ensureMeta('meta[property="og:image"]', "property", "og:image", ogImage);
  ensureMeta(
    'meta[property="og:image:alt"]',
    "property",
    "og:image:alt",
    isArchiveLanding ? "Archivo editorial de Gaceta Tu Espacio Eje Central." : edition.contentPayload.metadata.heroImage.alt
  );
  ensureMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
  ensureMeta('meta[name="twitter:title"]', "name", "twitter:title", edition.contentPayload.share.title);
  ensureMeta(
    'meta[name="twitter:description"]',
    "name",
    "twitter:description",
    isArchiveLanding ? "Consulta ediciones publicadas y conserva enlaces estables para compartir cada nota." : edition.contentPayload.share.summary
  );
  ensureMeta('meta[name="twitter:url"]', "name", "twitter:url", routedUrl);
  ensureMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage);
  ensureMeta('meta[name="theme-color"]', "name", "theme-color", "#18120e");
}
