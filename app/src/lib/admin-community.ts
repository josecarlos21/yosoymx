import type { CommunityKind, CommunityPost } from "@/lib/community";

export type CommunityModerationStatus = "pending" | "approved" | "rejected" | "hidden";
export type CommunityModerationAction = "approve" | "reject" | "hide";

export type AdminCommunityPost = CommunityPost & {
  moderationStatus: CommunityModerationStatus;
};

type FetchAdminCommunityOptions = {
  kind?: CommunityKind;
  status?: CommunityModerationStatus;
  limit?: number;
};

type RemoteAdminCommunityResponse = {
  items?: unknown[];
  item?: unknown;
};

const ADMIN_COMMUNITY_API_URL =
  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_ADMIN_COMMUNITY_API_URL
    ? String(import.meta.env.VITE_ADMIN_COMMUNITY_API_URL)
    : "/api/admin/community";

const ADMIN_COMMUNITY_REQUEST_TIMEOUT_MS = 14_000;

function stripControlCharacters(value: string) {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || (code >= 32 && code !== 127);
    })
    .join("");
}

const ADMIN_COMMUNITY_ERRORS = {
  validation: "validation-error",
  unauthorized: "unauthorized",
  network: "network-error",
  timeout: "request-timeout",
  unavailable: "service-unavailable",
  unknown: "unknown-error",
} as const;

type AdminCommunityErrorCode =
  (typeof ADMIN_COMMUNITY_ERRORS)[keyof typeof ADMIN_COMMUNITY_ERRORS];

export class AdminCommunityApiError extends Error {
  public readonly code: AdminCommunityErrorCode;
  public readonly status: number;

  constructor(message: string, code: AdminCommunityErrorCode, status: number) {
    super(message);
    this.name = "AdminCommunityApiError";
    this.code = code;
    this.status = status;
  }
}

function responseHasJsonContentType(response: Response) {
  return response.headers.get("content-type")?.toLowerCase().includes("application/json") === true;
}

function parseJsonSafe<T>(response: Response): Promise<T | null> {
  return response
    .json()
    .then((data) => (data as T) ?? null)
    .catch(() => null);
}

function normalizeText(value: string, maxLength: number) {
  return stripControlCharacters(
    (value || "")
      .normalize("NFKC")
      .replace(/\r\n?/g, "\n")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function extractErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const candidate = payload as { error?: unknown; message?: unknown };
  if (typeof candidate.error === "string") return candidate.error;
  if (typeof candidate.message === "string") return candidate.message;
  return "";
}

function mapErrorCode(status: number) {
  if (status === 401 || status === 403) return ADMIN_COMMUNITY_ERRORS.unauthorized;
  if (status === 400 || status === 404 || status === 422) return ADMIN_COMMUNITY_ERRORS.validation;
  if (status === 408 || status === 429 || status === 503) return ADMIN_COMMUNITY_ERRORS.unavailable;
  if (status >= 500) return ADMIN_COMMUNITY_ERRORS.unavailable;
  return ADMIN_COMMUNITY_ERRORS.unknown;
}

function ensureHasToken(token: string | undefined) {
  if (!token?.trim()) {
    throw new AdminCommunityApiError("Token administrativo requerido.", ADMIN_COMMUNITY_ERRORS.validation, 401);
  }
}

function buildAuthHeaders(adminToken: string) {
  return {
    Authorization: `Bearer ${adminToken}`,
  };
}

async function requestWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ADMIN_COMMUNITY_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers || {}) },
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function sanitizeRemotePost(entry: unknown): AdminCommunityPost | null {
  if (!entry || typeof entry !== "object") return null;
  const candidate = entry as Record<string, unknown>;

  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const kind = candidate.kind === "history" ? "history" : candidate.kind === "comment" ? "comment" : "";
  const displayName = typeof candidate.displayName === "string"
    ? normalizeText(candidate.displayName, 80)
    : typeof candidate.display_name === "string"
      ? normalizeText(String(candidate.display_name), 80)
      : "";
  const email = typeof candidate.email === "string"
    ? normalizeText(candidate.email, 180)
    : typeof candidate.email_hash === "string"
      ? normalizeText(String(candidate.email_hash), 180)
      : "";
  const category = typeof candidate.category === "string" ? normalizeText(candidate.category, 60) : "";
  const content = typeof candidate.content === "string" ? normalizeText(candidate.content, 1200) : "";
  const createdAt = typeof candidate.createdAt === "string"
    ? candidate.createdAt
    : typeof candidate.created_at === "string"
      ? String(candidate.created_at)
      : "";
  const moderationStatus =
    candidate.moderationStatus === "approved" ||
    candidate.moderationStatus === "rejected" ||
    candidate.moderationStatus === "hidden" ||
    candidate.moderationStatus === "pending"
      ? candidate.moderationStatus
      : candidate.moderation_status === "approved" ||
        candidate.moderation_status === "rejected" ||
        candidate.moderation_status === "hidden" ||
        candidate.moderation_status === "pending"
        ? String(candidate.moderation_status)
        : "pending";

  if (!id || !kind || !displayName || !content || !createdAt || Number.isNaN(Date.parse(createdAt))) {
    return null;
  }

  return {
    id,
    kind,
    displayName,
    email,
    category: category || undefined,
    content,
    approved: moderationStatus === "approved",
    source: "api",
    createdAt,
    moderationStatus,
  };
}

function sanitizeRemoteItems(items: unknown[] = []) {
  return items.flatMap((item) => {
    const normalized = sanitizeRemotePost(item);
    return normalized ? [normalized] : [];
  });
}

function sortPosts(posts: AdminCommunityPost[]) {
  return [...posts].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));
}

function toQueryString(options: FetchAdminCommunityOptions) {
  const params = new URLSearchParams();
  if (options.kind) params.set("kind", options.kind);
  if (options.status) params.set("status", options.status);
  params.set("limit", String(Math.min(Math.max(options.limit ?? 60, 1), 200)));
  return params.toString();
}

export async function fetchAdminCommunity(
  adminToken: string,
  options: FetchAdminCommunityOptions = {}
): Promise<AdminCommunityPost[]> {
  ensureHasToken(adminToken);
  const response = await requestWithTimeout(`${ADMIN_COMMUNITY_API_URL}?${toQueryString(options)}`, {
    method: "GET",
    headers: buildAuthHeaders(adminToken),
  });

  if (!responseHasJsonContentType(response)) {
    throw new AdminCommunityApiError("Respuesta no válida del servicio.", ADMIN_COMMUNITY_ERRORS.unavailable, response.status);
  }

  if (!response.ok) {
    const raw = (await parseJsonSafe<Record<string, unknown>>(response)) ?? {};
    const message = extractErrorMessage(raw) || `Error del servicio (${response.status})`;
    throw new AdminCommunityApiError(message, mapErrorCode(response.status), response.status);
  }

  const raw = (await parseJsonSafe<RemoteAdminCommunityResponse>(response)) ?? {};
  return sortPosts(sanitizeRemoteItems(raw.items));
}

export async function moderateAdminCommunityPost(
  id: string,
  action: CommunityModerationAction,
  adminToken: string
): Promise<AdminCommunityPost> {
  ensureHasToken(adminToken);

  const response = await requestWithTimeout(`${ADMIN_COMMUNITY_API_URL}/${encodeURIComponent(id)}/moderate`, {
    method: "POST",
    headers: buildAuthHeaders(adminToken),
    body: JSON.stringify({ action }),
  });

  if (!responseHasJsonContentType(response)) {
    throw new AdminCommunityApiError("Respuesta no válida del servicio.", ADMIN_COMMUNITY_ERRORS.unavailable, response.status);
  }

  if (!response.ok) {
    const raw = (await parseJsonSafe<Record<string, unknown>>(response)) ?? {};
    const message = extractErrorMessage(raw) || `No fue posible moderar (${response.status})`;
    throw new AdminCommunityApiError(message, mapErrorCode(response.status), response.status);
  }

  const raw = (await parseJsonSafe<RemoteAdminCommunityResponse>(response)) ?? {};
  const item = sanitizeRemotePost(raw.item);
  if (!item) {
    throw new AdminCommunityApiError("Respuesta del servidor inválida.", ADMIN_COMMUNITY_ERRORS.unavailable, 500);
  }
  return item;
}
