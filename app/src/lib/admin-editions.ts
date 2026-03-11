export type EditionPeriod = "daily" | "weekly";

export type EditionStatus = "draft" | "published" | "archived";

export type AdminEdition = {
  id: string;
  title: string;
  periodType: EditionPeriod;
  periodStart: string;
  periodEnd: string;
  status: EditionStatus;
  notes: string;
  createdAt: string;
};

export type CreateAdminEditionInput = {
  title: string;
  periodType: EditionPeriod;
  periodStart: string;
  notes: string;
};

type SanitizedEdition = {
  title: string;
  periodType: EditionPeriod;
  periodStart: string;
  periodEnd: string;
  notes: string;
};

type RemoteAdminResponse = {
  items?: unknown[];
  item?: unknown;
};

const ADMIN_EDITION_API_URL =
  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_ADMIN_EDITION_API_URL
    ? String(import.meta.env.VITE_ADMIN_EDITION_API_URL)
    : "/api/admin/editions";

const ADMIN_EDITION_STORAGE_KEY = "yosoymx.admin.editions.v1";
const ADMIN_EDITION_REQUEST_TIMEOUT_MS = 14_000;
const MAX_EDITION_STORAGE = 120;
const MAX_TITLE_LENGTH = 120;
const MAX_NOTE_LENGTH = 900;

const ADMIN_EDITOR_API_ERRORS = {
  validation: "validation-error",
  conflict: "conflict",
  network: "network-error",
  timeout: "request-timeout",
  unavailable: "service-unavailable",
  unauthorized: "unauthorized",
  unknown: "unknown-error",
} as const;

type AdminEditionErrorCode =
  (typeof ADMIN_EDITOR_API_ERRORS)[keyof typeof ADMIN_EDITOR_API_ERRORS];

const MAX_CACHE_DAYS = 7;

export class AdminEditionApiError extends Error {
  public readonly code: AdminEditionErrorCode;
  public readonly status: number;

  constructor(message: string, code: AdminEditionErrorCode, status: number) {
    super(message);
    this.name = "AdminEditionApiError";
    this.code = code;
    this.status = status;
  }
}

export function buildEditionTitleDefaults(periodType: EditionPeriod, periodStart: string) {
  const date = safeDateToIso(periodStart);
  const label = periodType === "daily" ? "Edición diaria" : "Edición semanal";
  return `${label}${date ? ` (${new Date(date).toLocaleDateString("es-MX")})` : ""}`;
}

function normalizeEditionText(value: string, maxLength: number) {
  return (value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]+/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function isBrowserStorageAvailable() {
  if (typeof window === "undefined") return false;
  try {
    const test = "__admin_storage_test__";
    window.localStorage.setItem(test, "1");
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function parseJsonSafe<T>(response: Response): Promise<T | null> {
  return response
    .json()
    .then((data) => (data as T) ?? null)
    .catch(() => null);
}

function safeDateToIso(date: string) {
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "";
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).toISOString();
}

function addDays(dateIso: string, days: number) {
  const parsed = new Date(dateIso);
  if (!Number.isFinite(parsed.getTime())) return "";
  const next = new Date(parsed);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function buildPeriodFromStart(
  periodStart: string,
  periodType: EditionPeriod
): { periodStart: string; periodEnd: string } {
  const start = safeDateToIso(periodStart);
  if (!start) {
    return { periodStart: "", periodEnd: "" };
  }

  if (periodType === "daily") {
    return { periodStart: start, periodEnd: addDays(start, 1) };
  }

  return {
    periodStart: start,
    periodEnd: addDays(start, 6),
  };
}

function sanitizeInput(input: CreateAdminEditionInput): SanitizedEdition {
  const periodStart = safeDateToIso(input.periodStart) || safeDateToIso(new Date().toISOString());
  const normalizedTitle = normalizeEditionText(
    input.title || buildEditionTitleDefaults(input.periodType, periodStart),
    MAX_TITLE_LENGTH
  );
  const normalizedNotes = normalizeEditionText(input.notes || "", MAX_NOTE_LENGTH);
  const bounds = buildPeriodFromStart(periodStart, input.periodType);

  return {
    title: normalizedTitle,
    periodType: input.periodType,
    notes: normalizedNotes,
    periodStart: bounds.periodStart,
    periodEnd: bounds.periodEnd,
  };
}

function mapErrorCode(status: number, bodyCode?: string) {
  if (status === 401 || status === 403) return ADMIN_EDITOR_API_ERRORS.unauthorized;
  if (status === 409) return ADMIN_EDITOR_API_ERRORS.conflict;
  if (status === 400 || status === 422) return ADMIN_EDITOR_API_ERRORS.validation;
  if (status === 429 || status === 408 || status === 503) return ADMIN_EDITOR_API_ERRORS.unavailable;
  if (status >= 500) return ADMIN_EDITOR_API_ERRORS.unavailable;
  return bodyCode || ADMIN_EDITOR_API_ERRORS.unknown;
}

function isErrorRetryable(status: number, code: AdminEditionErrorCode) {
  return code === ADMIN_EDITOR_API_ERRORS.network || code === ADMIN_EDITOR_API_ERRORS.unavailable || code === ADMIN_EDITOR_API_ERRORS.timeout || status >= 500 || status === 429;
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof AdminEditionApiError)) {
    return true;
  }
  if (error.status === 401 || error.status === 403) return false;
  return isErrorRetryable(error.status, error.code);
}

function isAuthError(error: unknown): error is AdminEditionApiError {
  return error instanceof AdminEditionApiError && (error.status === 401 || error.status === 403);
}

function sanitizeRemoteEdition(row: unknown): AdminEdition | null {
  if (!row || typeof row !== "object") return null;

  const candidate = row as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const title = typeof candidate.title === "string" ? normalizeEditionText(candidate.title, MAX_TITLE_LENGTH) : "";
  const periodStart = typeof candidate.period_start === "string" ? safeDateToIso(candidate.period_start) : "";
  const periodEnd = typeof candidate.period_end === "string" ? safeDateToIso(candidate.period_end) : "";
  const notes = typeof candidate.notes === "string" ? normalizeEditionText(candidate.notes, MAX_NOTE_LENGTH) : "";
  const statusRaw = typeof candidate.status === "string" ? candidate.status : "";

  const periodType = candidate.period_type === "weekly" ? "weekly" : "daily";
  const status = statusRaw === "published" || statusRaw === "archived" ? statusRaw : "draft";
  const createdAt = typeof candidate.created_at === "string" ? candidate.created_at : new Date().toISOString();

  if (!id || !title || !periodStart || !periodEnd) return null;

  return {
    id,
    title,
    periodType,
    periodStart,
    periodEnd,
    notes,
    status,
    createdAt,
  };
}

function sanitizeItems(items: unknown[] = []) {
  return items.flatMap((item) => {
    const normalized = sanitizeRemoteEdition(item);
    return normalized ? [normalized] : [];
  });
}

function readFromStorage(): AdminEdition[] {
  if (!isBrowserStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(ADMIN_EDITION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    const minDate = now - MAX_CACHE_DAYS * 24 * 60 * 60 * 1000;
    return sanitizeItems(parsed)
      .filter((edition) => new Date(edition.createdAt).getTime() >= minDate)
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
      .slice(0, MAX_EDITION_STORAGE);
  } catch {
    return [];
  }
}

function writeToStorage(items: AdminEdition[]) {
  if (!isBrowserStorageAvailable()) return;
  try {
    window.localStorage.setItem(
      ADMIN_EDITION_STORAGE_KEY,
      JSON.stringify(sortEditions(items).slice(0, MAX_EDITION_STORAGE))
    );
  } catch {
    // Silent fail; local cache is optional.
  }
}

function sortEditions(editions: AdminEdition[]) {
  return [...editions].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));
}

async function requestWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ADMIN_EDITION_REQUEST_TIMEOUT_MS);
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

function buildAuthHeaders(adminToken?: string) {
  const headers: Record<string, string> = {};
  if (adminToken) {
    headers.Authorization = `Bearer ${adminToken}`;
  }
  return headers;
}

function extractErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const candidate = payload as { error?: unknown; message?: unknown };
  if (typeof candidate.error === "string") return candidate.error;
  if (typeof candidate.message === "string") return candidate.message;
  return "";
}

function ensureHasToken(token: string | undefined) {
  if (!token?.trim()) {
    throw new AdminEditionApiError("Token administrativo requerido.", ADMIN_EDITOR_API_ERRORS.validation, 401);
  }
}

export async function fetchAdminEditions(
  adminToken: string,
  limit = 40
): Promise<AdminEdition[]> {
  ensureHasToken(adminToken);

  try {
    const params = new URLSearchParams({
      limit: String(Math.min(Math.max(limit, 1), 200)),
    });
    const response = await requestWithTimeout(`${ADMIN_EDITION_API_URL}?${params.toString()}`, {
      method: "GET",
      headers: buildAuthHeaders(adminToken),
    });

    if (!response.ok) {
      const raw = (await parseJsonSafe<Record<string, unknown>>(response)) ?? {};
      const message = extractErrorMessage(raw) || `Error del servicio (${response.status})`;
      const code = mapErrorCode(response.status, typeof raw.code === "string" ? raw.code : undefined);
      throw new AdminEditionApiError(message, code, response.status);
    }

    const raw = (await parseJsonSafe<RemoteAdminResponse>(response)) ?? {};
    const items = sanitizeItems(raw.items);
    return sortEditions(items);
  } catch (error) {
    if (isAuthError(error)) {
      throw error;
    }
    if (!isRetryableError(error)) {
      throw error instanceof Error ? error : new AdminEditionApiError("Error al cargar ediciones.", ADMIN_EDITOR_API_ERRORS.unknown, 500);
    }
    return sortEditions(readFromStorage());
  }
}

export async function createAdminEdition(
  input: CreateAdminEditionInput,
  adminToken: string
): Promise<AdminEdition> {
  ensureHasToken(adminToken);

  const normalized = sanitizeInput(input);
  const payload = {
    title: normalized.title,
    periodType: normalized.periodType,
    periodStart: normalized.periodStart,
    periodEnd: normalized.periodEnd,
    notes: normalized.notes,
  };

  const localFallback = () => {
    const local: AdminEdition = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: payload.title,
      periodType: payload.periodType,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      notes: payload.notes,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    const current = readFromStorage();
    writeToStorage([local, ...current]);
    return local;
  };

  try {
    const response = await requestWithTimeout(ADMIN_EDITION_API_URL, {
      method: "POST",
      headers: buildAuthHeaders(adminToken),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const raw = (await parseJsonSafe<Record<string, unknown>>(response)) ?? {};
      const code = mapErrorCode(response.status, typeof raw.code === "string" ? raw.code : undefined);
      const message = extractErrorMessage(raw) || `No fue posible guardar (${response.status})`;
      const err = new AdminEditionApiError(message, code, response.status);
      if (!isRetryableError(err)) {
        throw err;
      }
      return localFallback();
    }

    const raw = (await parseJsonSafe<RemoteAdminResponse>(response)) ?? {};
    const item = sanitizeRemoteEdition(raw.item);
    if (!item) {
      throw new AdminEditionApiError("Respuesta del servidor inválida.", ADMIN_EDITOR_API_ERRORS.validation, 500);
    }

    writeToStorage([item, ...readFromStorage()]);
    return item;
  } catch (error) {
    if (isAuthError(error)) {
      throw error;
    }
    if (!isRetryableError(error)) {
      throw error instanceof Error ? error : new AdminEditionApiError("No fue posible guardar la edición.", ADMIN_EDITOR_API_ERRORS.unknown, 500);
    }
    return localFallback();
  }
}
