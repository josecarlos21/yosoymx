import fallbackBrandConfigJson from "../../shared/content/brand-config.json" with { type: "json" };
import fallbackIssueContentJson from "../../shared/content/issue-content.json" with { type: "json" };

export type NavigationItem = {
  id: string;
  label: string;
  icon: string;
};

export type PdfResource = {
  id: string;
  title: string;
  description: string;
  fileName: string;
  href: string;
};

export type CommunityKind = "comment" | "history";
export type EditionStatus = "draft" | "review_ready" | "published" | "archived";
export type MediaAssetStatus = "uploaded" | "processed" | "active" | "replaced";
export type MediaAssetKind = "image" | "og" | "icon" | "logo" | "pdf" | "document";

export type IssueContent = typeof fallbackIssueContentJson;

export type MediaAsset = {
  id: string;
  kind: MediaAssetKind;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  alt: string;
  caption: string;
  r2Key: string;
  variants: Record<string, string>;
  status: MediaAssetStatus;
  originalFileName: string;
  publicUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type BrandConfig = {
  id: string;
  siteName: string;
  masthead: string;
  shortMasthead: string;
  themeMode: string;
  supportLinks: {
    email: string;
    mailSubject: string;
    tiktokUrl: string;
    tiktokLabel: string;
    siteUrl: string;
    siteLabel: string;
  };
  defaultOgAssetId: string;
  logoAssetId: string;
  webIconPack: {
    faviconSvg: string;
    favicon32: string;
    favicon48: string;
    appleTouchIcon: string;
    manifestIcon: string;
    maskIcon: string;
  };
};

export type EditionPayload = {
  id: string;
  slug: string;
  status: EditionStatus;
  version: number;
  publishedAt: string | null;
  label: string;
  location: string;
  themeLine: string;
  socialAssetId?: string | null;
  contentPayload: IssueContent;
  brandOverrides?: Partial<BrandConfig> | null;
  createdAt: string;
  updatedAt: string;
};

export const fallbackIssueContent = fallbackIssueContentJson as IssueContent;
export const fallbackBrandConfig = fallbackBrandConfigJson as BrandConfig;

export const issueContent = fallbackIssueContent;
export const issueNavigation = fallbackIssueContent.navigation as NavigationItem[];
export const issuePdfResources = fallbackIssueContent.resources.pdfs as PdfResource[];

export function buildFallbackEditionPayload(content: IssueContent = fallbackIssueContent): EditionPayload {
  return {
    id: content.id,
    slug: content.id,
    status: "published",
    version: Number.parseInt(content.metadata.version.split(".")[0] ?? "1", 10) || 1,
    publishedAt: content.metadata.publishedDateISO || null,
    label: content.metadata.editionLabel,
    location: content.metadata.location,
    themeLine: content.metadata.coverThemeLine,
    socialAssetId: null,
    contentPayload: content,
    brandOverrides: null,
    createdAt: content.metadata.publishedDateISO,
    updatedAt: content.metadata.publishedDateISO,
  };
}

export function normalizePdfHref(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function mergeBrandConfig(base: BrandConfig, overrides?: Partial<BrandConfig> | null): BrandConfig {
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    supportLinks: {
      ...base.supportLinks,
      ...(overrides.supportLinks ?? {}),
    },
    webIconPack: {
      ...base.webIconPack,
      ...(overrides.webIconPack ?? {}),
    },
  };
}
