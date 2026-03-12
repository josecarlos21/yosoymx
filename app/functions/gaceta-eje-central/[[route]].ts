import {
  ensureCmsSeed,
  getBrandConfig,
  getCurrentPublishedIssue,
  getIssueBySlug,
} from "../api/_shared/cms.ts";

type PagesContext = {
  request: Request;
  env: {
    DB?: unknown;
    ASSETS?: {
      // eslint-disable-next-line no-unused-vars
      fetch: (...args: [RequestInfo | URL]) => Promise<Response>;
    };
  };
  // eslint-disable-next-line no-unused-vars
  next: (...args: [] | [RequestInfo | URL]) => Promise<Response>;
};

type RouteInfo = {
  slug: string | null;
  isArchiveLanding: boolean;
};

function resolveRoute(pathname: string): RouteInfo {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments[0] !== "gaceta-eje-central") {
    return { slug: null, isArchiveLanding: false };
  }
  if (segments[1] === "edicion" && typeof segments[2] === "string" && segments[2].trim()) {
    return { slug: segments[2].trim(), isArchiveLanding: false };
  }
  return { slug: null, isArchiveLanding: segments[1] === "archivo" };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function upsertTitle(html: string, value: string) {
  const tag = `<title>${escapeHtml(value)}</title>`;
  return /<title>[\s\S]*?<\/title>/i.test(html) ? html.replace(/<title>[\s\S]*?<\/title>/i, tag) : html.replace("</head>", `${tag}\n</head>`);
}

function upsertMeta(html: string, selector: "name" | "property", key: string, value: string) {
  const pattern = new RegExp(`<meta[^>]+${selector}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${selector}="${key}" content="${escapeHtml(value)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `${tag}\n</head>`);
}

function upsertLink(html: string, rel: string, href: string) {
  const pattern = new RegExp(`<link[^>]+rel=["']${rel}["'][^>]*>`, "i");
  const tag = `<link rel="${rel}" href="${escapeHtml(href)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `${tag}\n</head>`);
}

async function fetchShell(context: PagesContext) {
  if (context.env.ASSETS?.fetch) {
    return context.env.ASSETS.fetch(new URL("/", context.request.url));
  }
  return context.next("/");
}

export async function onRequest(context: PagesContext) {
  const assetResponse = await fetchShell(context);
  const contentType = assetResponse.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/html")) {
    return assetResponse;
  }

  let html = await assetResponse.text();
  const requestUrl = new URL(context.request.url);
  const db = context.env.DB;

  try {
    if (db && typeof db === "object" && "prepare" in db) {
      await ensureCmsSeed(db as never);
      const route = resolveRoute(requestUrl.pathname);
      const [brand, selectedIssue, currentIssue] = await Promise.all([
        getBrandConfig(db as never),
        route.slug ? getIssueBySlug(db as never, route.slug) : Promise.resolve(null),
        getCurrentPublishedIssue(db as never),
      ]);
      const issue = selectedIssue ?? currentIssue;
      const isEditionRoute = Boolean(route.slug);
      const title = route.isArchiveLanding
        ? `Archivo editorial · ${brand.masthead}`
        : isEditionRoute
          ? `${issue.contentPayload.share.title} · ${brand.masthead}`
          : `${brand.masthead} · ${issue.label}`;
      const description = route.isArchiveLanding
        ? "Consulta ediciones publicadas y conserva enlaces estables para compartir cada nota del periódico."
        : issue.contentPayload.share.summary || issue.contentPayload.metadata.description;
      const ogAssetId = issue.socialAssetId || brand.defaultOgAssetId;
      const ogImagePath = ogAssetId
        ? `/api/media/${ogAssetId}`
        : isEditionRoute
          ? "/og-edition.png"
          : "/og-default.png";
      const ogImage = new URL(ogImagePath, requestUrl.origin).toString();
      const canonicalUrl = requestUrl.toString();
      const publishedAt = issue.publishedAt || issue.contentPayload.metadata.publishedDateISO;
      const ogAlt = route.isArchiveLanding
        ? "Archivo editorial de Gaceta Tu Espacio Eje Central."
        : issue.contentPayload.metadata.heroImage.alt;

      html = upsertTitle(html, title);
      html = upsertLink(html, "canonical", canonicalUrl);
      html = upsertMeta(html, "name", "description", description);
      html = upsertMeta(html, "property", "og:type", route.isArchiveLanding ? "website" : "article");
      html = upsertMeta(html, "property", "og:title", route.isArchiveLanding ? "Archivo editorial" : issue.contentPayload.share.title);
      html = upsertMeta(html, "property", "og:description", description);
      html = upsertMeta(html, "property", "og:site_name", brand.siteName);
      html = upsertMeta(html, "property", "og:url", canonicalUrl);
      html = upsertMeta(html, "property", "og:image", ogImage);
      html = upsertMeta(html, "property", "og:image:alt", ogAlt);
      html = upsertMeta(html, "property", "article:published_time", publishedAt);
      html = upsertMeta(html, "name", "twitter:card", "summary_large_image");
      html = upsertMeta(html, "name", "twitter:title", route.isArchiveLanding ? "Archivo editorial" : issue.contentPayload.share.title);
      html = upsertMeta(html, "name", "twitter:description", description);
      html = upsertMeta(html, "name", "twitter:url", canonicalUrl);
      html = upsertMeta(html, "name", "twitter:image", ogImage);
    }
  } catch (error) {
    console.error("gaceta route shell", error);
  }

  const headers = new Headers(assetResponse.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(html, { status: assetResponse.status, headers });
}
