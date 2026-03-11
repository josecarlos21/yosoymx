import type { BrandConfig, EditionPayload, MediaAsset } from "@/lib/issue-content";

export type ActivityRecord = {
  id: string;
  scope: string;
  action: string;
  targetId: string;
  summary: Record<string, unknown>;
  createdAt: string;
};

type ApiEnvelope = {
  items?: unknown[];
  item?: unknown;
};

/* eslint-disable no-unused-vars */
type Sanitizer<T> = (input: unknown) => T | null;
/* eslint-enable no-unused-vars */

const API_ROOT = "/api/admin";
const REQUEST_TIMEOUT_MS = 20_000;

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

function extractMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const candidate = payload as { error?: unknown; message?: unknown };
  if (typeof candidate.error === "string") return candidate.error;
  if (typeof candidate.message === "string") return candidate.message;
  return "";
}

async function requestWithTimeout(url: string, init: RequestInit, token: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

export class AdminCmsApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminCmsApiError";
    this.status = status;
  }
}

function ensureToken(token: string) {
  if (!token.trim()) {
    throw new AdminCmsApiError("Token administrativo requerido.", 401);
  }
}

function sanitizeEdition(entry: unknown): EditionPayload | null {
  if (!entry || typeof entry !== "object") return null;
  const candidate = entry as Record<string, unknown>;
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
    id: candidate.id,
    slug: candidate.slug,
    status: candidate.status as EditionPayload["status"],
    version: typeof candidate.version === "number" ? candidate.version : 1,
    publishedAt: typeof candidate.publishedAt === "string" ? candidate.publishedAt : null,
    label: candidate.label,
    location: candidate.location,
    themeLine: candidate.themeLine,
    contentPayload: candidate.contentPayload as EditionPayload["contentPayload"],
    brandOverrides:
      candidate.brandOverrides && typeof candidate.brandOverrides === "object"
        ? (candidate.brandOverrides as Partial<BrandConfig>)
        : null,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(),
  };
}

function sanitizeMedia(entry: unknown): MediaAsset | null {
  if (!entry || typeof entry !== "object") return null;
  const candidate = entry as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.kind !== "string" ||
    typeof candidate.mimeType !== "string" ||
    typeof candidate.r2Key !== "string" ||
    typeof candidate.status !== "string" ||
    typeof candidate.originalFileName !== "string" ||
    typeof candidate.publicUrl !== "string"
  ) {
    return null;
  }
  return {
    id: candidate.id,
    kind: candidate.kind as MediaAsset["kind"],
    mimeType: candidate.mimeType,
    width: typeof candidate.width === "number" ? candidate.width : null,
    height: typeof candidate.height === "number" ? candidate.height : null,
    sizeBytes: typeof candidate.sizeBytes === "number" ? candidate.sizeBytes : null,
    alt: typeof candidate.alt === "string" ? candidate.alt : "",
    caption: typeof candidate.caption === "string" ? candidate.caption : "",
    r2Key: candidate.r2Key,
    variants:
      candidate.variants && typeof candidate.variants === "object"
        ? (candidate.variants as Record<string, string>)
        : {},
    status: candidate.status as MediaAsset["status"],
    originalFileName: candidate.originalFileName,
    publicUrl: candidate.publicUrl,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(),
  };
}

function sanitizeBrand(entry: unknown): BrandConfig | null {
  if (!entry || typeof entry !== "object") return null;
  const candidate = entry as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.siteName !== "string" ||
    typeof candidate.masthead !== "string" ||
    typeof candidate.shortMasthead !== "string" ||
    typeof candidate.themeMode !== "string" ||
    !candidate.supportLinks ||
    typeof candidate.supportLinks !== "object" ||
    !candidate.webIconPack ||
    typeof candidate.webIconPack !== "object"
  ) {
    return null;
  }
  return candidate as unknown as BrandConfig;
}

function sanitizeActivity(entry: unknown): ActivityRecord | null {
  if (!entry || typeof entry !== "object") return null;
  const candidate = entry as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.scope !== "string" ||
    typeof candidate.action !== "string" ||
    typeof candidate.targetId !== "string" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }
  return {
    id: candidate.id,
    scope: candidate.scope,
    action: candidate.action,
    targetId: candidate.targetId,
    summary: candidate.summary && typeof candidate.summary === "object" ? (candidate.summary as Record<string, unknown>) : {},
    createdAt: candidate.createdAt,
  };
}

async function perform<T>(
  path: string,
  token: string,
  init: RequestInit = {},
  mode: "item" | "items" = "item",
  sanitizer?: Sanitizer<T>
): Promise<T | T[]> {
  ensureToken(token);
  const response = await requestWithTimeout(`${API_ROOT}${path}`, init, token);
  if (!responseHasJsonContentType(response)) {
    throw new AdminCmsApiError("Respuesta no válida del servicio.", response.status);
  }

  const payload = (await parseJsonSafe<ApiEnvelope>(response)) ?? {};
  if (!response.ok) {
    throw new AdminCmsApiError(extractMessage(payload) || `Error del servicio (${response.status}).`, response.status);
  }

  if (mode === "items") {
    const items = Array.isArray(payload.items) ? payload.items : [];
    return sanitizer ? items.flatMap((item) => {
      const parsed = sanitizer(item);
      return parsed ? [parsed] : [];
    }) : (items as T[]);
  }

  const item = sanitizer ? sanitizer(payload.item) : (payload.item as T | undefined);
  if (!item) {
    throw new AdminCmsApiError("Respuesta incompleta del servicio.", 500);
  }
  return item;
}

export async function fetchAdminIssues(token: string) {
  return perform("/issues", token, { method: "GET" }, "items", sanitizeEdition) as Promise<EditionPayload[]>;
}

export async function createDraftIssue(token: string, sourceIssueId?: string) {
  return perform(
    "/issues",
    token,
    { method: "POST", body: JSON.stringify({ sourceIssueId: sourceIssueId ?? null }) },
    "item",
    sanitizeEdition
  ) as Promise<EditionPayload>;
}

export async function fetchAdminIssue(token: string, id: string) {
  return perform(`/issues/${encodeURIComponent(id)}`, token, { method: "GET" }, "item", sanitizeEdition) as Promise<EditionPayload>;
}

export async function updateAdminIssue(token: string, issue: EditionPayload) {
  return perform(
    `/issues/${encodeURIComponent(issue.id)}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify({
        slug: issue.slug,
        status: issue.status,
        label: issue.label,
        location: issue.location,
        themeLine: issue.themeLine,
        contentPayload: issue.contentPayload,
        brandOverrides: issue.brandOverrides ?? null,
      }),
    },
    "item",
    sanitizeEdition
  ) as Promise<EditionPayload>;
}

export async function publishAdminIssue(token: string, id: string) {
  return perform(`/issues/${encodeURIComponent(id)}/publish`, token, { method: "POST", body: "{}" }, "item", sanitizeEdition) as Promise<EditionPayload>;
}

export async function archiveAdminIssue(token: string, id: string) {
  return perform(`/issues/${encodeURIComponent(id)}/archive`, token, { method: "POST", body: "{}" }, "item", sanitizeEdition) as Promise<EditionPayload>;
}

export async function fetchAdminMedia(token: string) {
  return perform("/media", token, { method: "GET" }, "items", sanitizeMedia) as Promise<MediaAsset[]>;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No fue posible leer el archivo."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

export async function uploadAdminMedia(
  token: string,
  input: { kind: MediaAsset["kind"]; alt: string; caption: string; file: File }
) {
  const width = await getImageDimension(input.file, "width");
  const height = await getImageDimension(input.file, "height");
  const requestItem = (await perform(
    "/media/upload-request",
    token,
    {
      method: "POST",
      body: JSON.stringify({
        kind: input.kind,
        fileName: input.file.name,
        mimeType: input.file.type || "application/octet-stream",
        sizeBytes: input.file.size,
        width,
        height,
        alt: input.alt,
        caption: input.caption,
      }),
    },
    "item",
    sanitizeMedia
  )) as MediaAsset;

  const fileBase64 = await fileToBase64(input.file);
  return perform(
    "/media/complete",
    token,
    {
      method: "POST",
      body: JSON.stringify({
        id: requestItem.id,
        fileBase64,
        alt: input.alt,
        caption: input.caption,
      }),
    },
    "item",
    sanitizeMedia
  ) as Promise<MediaAsset>;
}

export async function replaceAdminMedia(
  token: string,
  id: string,
  input: { alt?: string; caption?: string; file: File }
) {
  const fileBase64 = await fileToBase64(input.file);
  return perform(
    `/media/${encodeURIComponent(id)}/replace`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        fileBase64,
        mimeType: input.file.type || "application/octet-stream",
        alt: input.alt,
        caption: input.caption,
      }),
    },
    "item",
    sanitizeMedia
  ) as Promise<MediaAsset>;
}

export async function fetchAdminBrand(token: string) {
  return perform("/brand", token, { method: "GET" }, "item", sanitizeBrand) as Promise<BrandConfig>;
}

export async function updateAdminBrand(token: string, brand: BrandConfig) {
  return perform(
    "/brand",
    token,
    {
      method: "PUT",
      body: JSON.stringify(brand),
    },
    "item",
    sanitizeBrand
  ) as Promise<BrandConfig>;
}

export async function fetchAdminActivity(token: string) {
  return perform("/activity", token, { method: "GET" }, "items", sanitizeActivity) as Promise<ActivityRecord[]>;
}

async function getImageDimension(file: File, property: "width" | "height") {
  if (!file.type.startsWith("image/")) return null;
  return new Promise<number | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(property === "width" ? image.width : image.height);
    image.onerror = () => resolve(null);
    image.src = URL.createObjectURL(file);
  });
}
