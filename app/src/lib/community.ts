export type CommunityKind = "comment" | "history";

export type CommunityPost = {
  id: string;
  kind: CommunityKind;
  displayName: string;
  email: string;
  category?: string;
  content: string;
  approved: boolean;
  source: "local" | "api";
  createdAt: string;
};

export type CommunityFormInput = {
  kind: CommunityKind;
  displayName: string;
  email: string;
  category?: string;
  content: string;
  website?: string;
};

export type CommunityApiPayload = {
  items: CommunityPost[];
};

const COMMUNITY_STORAGE_KEY = "yosoymx.community.posts.v1";
const COMMUNITY_REQUEST_TIMEOUT_MS = 12_000;
const MAX_CHAR_LIMITS = {
  displayName: 80,
  email: 180,
  category: 60,
  content: 1200,
  website: 120,
};
const MIN_MESSAGE_LENGTH = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stripControlCharacters(value: string) {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || (code >= 32 && code !== 127);
    })
    .join("");
}

const COMMUNITY_ERROR_CODES = {
  network: "network-error",
  timeout: "request-timeout",
  validation: "validation-error",
  conflict: "conflict-error",
  unavailable: "service-unavailable",
  unknown: "unknown-error",
} as const;

type CommunityErrorCode = (typeof COMMUNITY_ERROR_CODES)[keyof typeof COMMUNITY_ERROR_CODES];

const communityApiUrl =
  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_COMMUNITY_API_URL
    ? import.meta.env.VITE_COMMUNITY_API_URL
    : "/api/community";
const FORCE_LOCAL_API =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_FORCE_LOCAL_API
    ? String(import.meta.env.VITE_FORCE_LOCAL_API).toLowerCase() === "true"
    : false;

export function sanitizeCommunityText(value: string) {
  return normalizeString(value, 5000);
}

function normalizeString(value: string, maxLength: number) {
  return stripControlCharacters(
    value
      .normalize("NFKC")
      .replace(/\r\n?/g, "\n")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function normalizeCommunityField(value: string, maxLength: number) {
  return normalizeString(value || "", maxLength);
}

function isBrowserStorageAvailable() {
  if (typeof window === "undefined") return false;
  try {
    const test = "__storage_test__";
    window.localStorage.setItem(test, "1");
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function isEmailValid(value: string) {
  return !value || EMAIL_REGEX.test(value);
}

function responseHasJsonContentType(response: Response) {
  return response.headers.get("content-type")?.toLowerCase().includes("application/json") === true;
}

function shouldPreferLocalFallback(url: string) {
  if (FORCE_LOCAL_API || typeof window === "undefined") return false;
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  return isLocalHost && url.startsWith("/api/");
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function parseApiErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const error = (payload as { error?: unknown; message?: unknown }).error;
  const message = (payload as { message?: unknown }).message;
  if (typeof error === "string") return error;
  if (typeof message === "string") return message;
  return "";
}

function pickErrorCode(status: number, message: string) {
  if (status === 409) return COMMUNITY_ERROR_CODES.conflict;
  if (status === 400 || status === 422) return COMMUNITY_ERROR_CODES.validation;
  if (status === 429 || status === 408) return COMMUNITY_ERROR_CODES.conflict;
  if (status >= 500) return COMMUNITY_ERROR_CODES.unavailable;
  if (status === 0) return COMMUNITY_ERROR_CODES.network;
  if (!message) return COMMUNITY_ERROR_CODES.unknown;
  return COMMUNITY_ERROR_CODES.unavailable;
}

export class CommunityApiError extends Error {
  public readonly code: CommunityErrorCode;
  public readonly status?: number;

  constructor(message: string, code: CommunityErrorCode, status?: number) {
    super(message);
    this.name = "CommunityApiError";
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_POSTS: CommunityPost[] = [
  {
    id: "seed-comment-001",
    kind: "comment",
    displayName: "Colectivo Vecinal Norte",
    email: "",
    content:
      "Muy útil la guía de evidencia mínima; la compartiremos en asambleas de colonia para ayudar a más casos.",
    approved: true,
    source: "local",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "seed-history-001",
    kind: "history",
    displayName: "Red de Vivienda Digna",
    email: "",
    category: "Ruta comunitaria",
    content:
      "Una vecina logró respuesta en PAOT y Juzgado en tres semanas con bitácora diaria, grabaciones y reporte único por escrito.",
    approved: true,
    source: "local",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
];

function readFromStorage(): CommunityPost[] {
  if (!isBrowserStorageAvailable()) return DEFAULT_POSTS;
  try {
    const raw = window.localStorage.getItem(COMMUNITY_STORAGE_KEY);
    if (!raw) return DEFAULT_POSTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_POSTS;
    const normalized = parsed.flatMap((entry) => sanitizeApiPost(entry));
    return normalized.length ? normalized : DEFAULT_POSTS;
  } catch {
    return DEFAULT_POSTS;
  }
}

function writeToStorage(posts: CommunityPost[]) {
  if (!isBrowserStorageAvailable()) return;
  try {
    window.localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(posts));
  } catch {
    return;
  }
}

function sanitizeApiPost(entry: unknown): CommunityPost[] {
  if (!entry || typeof entry !== "object") return [];

  const candidate = entry as Partial<CommunityPost>;
  const kind = candidate.kind === "history" ? "history" : candidate.kind === "comment" ? "comment" : undefined;
  const id = typeof candidate.id === "string" ? candidate.id : "";
  const displayName = typeof (candidate as { displayName?: unknown; display_name?: unknown }).displayName === "string"
    ? String((candidate as { displayName?: unknown }).displayName)
    : typeof (candidate as { display_name?: unknown }).display_name === "string"
      ? String((candidate as { display_name?: unknown }).display_name)
      : "";
  const content = typeof candidate.content === "string" ? candidate.content : "";
  const createdAt = typeof candidate.createdAt === "string"
    ? candidate.createdAt
    : typeof (candidate as { created_at?: unknown }).created_at === "string"
      ? String((candidate as { created_at?: unknown }).created_at)
      : "";
  const email = typeof candidate.email === "string" ? candidate.email : "";
  const rawEmail = typeof (candidate as { email_hash?: unknown }).email_hash === "string"
    ? String((candidate as { email_hash?: unknown }).email_hash)
    : email;
  const source = candidate.source === "api" ? "api" : "local";
  const approved =
    candidate.approved === true || candidate.approved === 1 || candidate.approved === "1" || candidate.approved === "true";

  if (!kind || !id.trim() || !displayName.trim() || !content.trim() || !createdAt.trim() || Number.isNaN(Date.parse(createdAt))) {
    return [];
  }

  return [
    {
      id: id.trim(),
      kind,
      displayName: normalizeCommunityField(displayName, MAX_CHAR_LIMITS.displayName),
      email: normalizeCommunityField(rawEmail, MAX_CHAR_LIMITS.email),
      category: normalizeCommunityField(typeof candidate.category === "string" ? candidate.category : "", MAX_CHAR_LIMITS.category),
      content: normalizeCommunityField(content, MAX_CHAR_LIMITS.content),
      approved,
      source,
      createdAt,
    },
  ];
}

function sanitizeApiList(input: unknown): CommunityPost[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((entry) => sanitizeApiPost(entry));
}

function sortPosts(posts: CommunityPost[]) {
  return [...posts].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));
}

function requestWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), COMMUNITY_REQUEST_TIMEOUT_MS);
  return fetch(url, {
    ...init,
    signal: controller.signal,
    headers: { "content-type": "application/json", ...(init.headers || {}) },
  }).finally(() => window.clearTimeout(timeout));
}

async function parseApiError(response: Response) {
  if (!responseHasJsonContentType(response)) {
    return new CommunityApiError("Respuesta no válida del servicio.", COMMUNITY_ERROR_CODES.unavailable, response.status);
  }
  const raw = await parseJsonSafe<{ error?: string; message?: string }>(response);
  const message = parseApiErrorMessage(raw) || `Error del servicio (${response.status})`;
  return new CommunityApiError(message, pickErrorCode(response.status, message), response.status);
}

function normalizePayload(input: CommunityFormInput) {
  const displayName = normalizeCommunityField(input.displayName, MAX_CHAR_LIMITS.displayName).trim();
  const email = normalizeCommunityField(input.email, MAX_CHAR_LIMITS.email).trim();
  const category = normalizeCommunityField(input.category || "", MAX_CHAR_LIMITS.category).trim();
  const content = normalizeCommunityField(input.content, MAX_CHAR_LIMITS.content).trim();
  const website = normalizeCommunityField(input.website || "", MAX_CHAR_LIMITS.website).trim();
  return { displayName, email, category, content, website };
}

function validatePayload(input: CommunityFormInput) {
  const normalized = normalizePayload(input);

  if (normalized.website) {
    throw new CommunityApiError("Señal anti-spam detectada.", COMMUNITY_ERROR_CODES.validation);
  }
  if (normalized.displayName.length < 2) {
    throw new CommunityApiError("Nombre o alias inválido. Usa al menos 2 caracteres.", COMMUNITY_ERROR_CODES.validation);
  }
  if (normalized.content.length < MIN_MESSAGE_LENGTH) {
    throw new CommunityApiError(
      `Escribe al menos ${MIN_MESSAGE_LENGTH} caracteres para hacerlo útil.`,
      COMMUNITY_ERROR_CODES.validation
    );
  }
  if (normalized.content.length > MAX_CHAR_LIMITS.content) {
    throw new CommunityApiError(`Máximo ${MAX_CHAR_LIMITS.content} caracteres.`, COMMUNITY_ERROR_CODES.validation);
  }
  if (!isEmailValid(normalized.email)) {
    throw new CommunityApiError("Correo no válido.", COMMUNITY_ERROR_CODES.validation);
  }
  if (normalized.category.length > MAX_CHAR_LIMITS.category) {
    throw new CommunityApiError(`Máximo ${MAX_CHAR_LIMITS.category} caracteres en tema.`, COMMUNITY_ERROR_CODES.validation);
  }

  return normalized;
}

async function fetchPostsFromApi(kind: CommunityKind, limit: number): Promise<CommunityPost[] | null> {
  if (shouldPreferLocalFallback(communityApiUrl)) {
    return null;
  }

  try {
    const params = new URLSearchParams({ kind, limit: String(limit) });
    const response = await requestWithTimeout(`${communityApiUrl}?${params.toString()}`);
    if (!response.ok || !responseHasJsonContentType(response)) return null;
    const raw = (await parseJsonSafe<{ items?: unknown[] }>(response)) ?? {};
    const items = sanitizeApiList((raw.items ?? []) as unknown[]);
    return sortPosts(items.filter((item) => item.kind === kind && item.approved));
  } catch (error) {
    if (error instanceof TypeError || (error && (error as Error).name === "AbortError")) {
      return null;
    }
    return null;
  }
}

function shouldFallbackLocally(error: unknown) {
  if (!(error instanceof CommunityApiError)) return true;
  return (
    error.code === COMMUNITY_ERROR_CODES.network ||
    error.code === COMMUNITY_ERROR_CODES.timeout ||
    error.code === COMMUNITY_ERROR_CODES.unavailable ||
    error.code === COMMUNITY_ERROR_CODES.unknown
  );
}

function createCommunityPost(input: CommunityFormInput): CommunityPost {
  const valid = validatePayload(input);
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    kind: input.kind,
    displayName: valid.displayName,
    email: valid.email,
    category: valid.category,
    content: valid.content,
    approved: false,
    source: "local",
    createdAt: new Date().toISOString(),
  };
}

function dedupeLocalPosts(posts: CommunityPost[]) {
  const keys = new Map<string, CommunityPost>();

  for (const post of sortPosts(posts)) {
    const fingerprint = `${post.kind}::${post.displayName.toLowerCase()}::${post.content.toLowerCase()}`.slice(0, 1200);
    if (!keys.has(fingerprint)) {
      keys.set(fingerprint, post);
    }
  }

  return Array.from(keys.values());
}

async function postToApi(form: CommunityFormInput): Promise<CommunityPost | null> {
  if (shouldPreferLocalFallback(communityApiUrl)) {
    return null;
  }

  const payload = validatePayload(form);
  const response = await requestWithTimeout(communityApiUrl, {
    method: "POST",
    body: JSON.stringify({
      kind: form.kind,
      displayName: payload.displayName,
      email: payload.email,
      category: payload.category,
      content: payload.content,
      website: payload.website,
    }),
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  if (!responseHasJsonContentType(response)) {
    throw new CommunityApiError("Respuesta no válida del servicio.", COMMUNITY_ERROR_CODES.unavailable, response.status);
  }

  const raw = (await parseJsonSafe<{ item?: unknown }>(response)) ?? {};
  if (raw.item) {
    const normalized = sanitizeApiPost(raw.item);
    return normalized[0] ?? null;
  }
  return null;
}

export async function fetchCommunityPosts(kind: CommunityKind, limit = 20): Promise<CommunityPost[]> {
  const remotePosts = await fetchPostsFromApi(kind, limit);
  if (remotePosts !== null) {
    return remotePosts;
  }

  const localPosts = sortPosts(readFromStorage().filter((post) => post.kind === kind));
  return localPosts.filter((post) => post.approved);
}

export async function submitCommunityPost(input: CommunityFormInput): Promise<CommunityPost> {
  const localPost = createCommunityPost(input);
  try {
    const posted = await postToApi(input);
    if (posted) return { ...posted, source: "api" };
  } catch (error) {
    if (!shouldFallbackLocally(error)) {
      throw error;
    }
  }

  const storedPosts = readFromStorage();
  const merged = dedupeLocalPosts([localPost, ...storedPosts]).slice(0, 250);
  writeToStorage(merged);
  return localPost;
}
