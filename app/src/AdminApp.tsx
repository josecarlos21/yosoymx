import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Clock3,
  Copy,
  Eye,
  FileImage,
  FolderSync,
  Newspaper,
  Paintbrush,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  archiveAdminIssue,
  createDraftIssue,
  fetchAdminActivity,
  fetchAdminBrand,
  fetchAdminIssues,
  fetchAdminMedia,
  replaceAdminMedia,
  type ActivityRecord,
  type AdminCmsApiError,
  publishAdminIssue,
  updateAdminBrand,
  updateAdminIssue,
  uploadAdminMedia,
} from "@/lib/admin-cms";
import { fetchAdminCommunity, moderateAdminCommunityPost, type AdminCommunityPost } from "@/lib/admin-community";
import { fallbackBrandConfig, type BrandConfig, type EditionPayload, type MediaAsset } from "@/lib/issue-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };

const ADMIN_TOKEN_STORAGE_KEY = "yosoymx.admin.token";
const LONG_TEXT_KEYS = new Set([
  "summary",
  "text",
  "content",
  "quote",
  "draft",
  "description",
  "caption",
  "alt",
  "leadEditorial",
  "cta",
  "detail",
  "note",
]);

function readStoredToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
}

function writeStoredToken(value: string) {
  if (typeof window === "undefined") return;
  if (value) {
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, value);
    return;
  }
  window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

function titleize(raw: string) {
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatDate(raw: string | null | undefined) {
  if (!raw) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(raw));
  } catch {
    return raw;
  }
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function valueAtPath(value: JsonValue, path: string[]): JsonValue {
  if (path.length === 0) return value;
  const [head, ...tail] = path;
  if (Array.isArray(value)) {
    const index = Number(head);
    return valueAtPath(value[index] as JsonValue, tail);
  }
  if (value && typeof value === "object") {
    return valueAtPath((value as Record<string, JsonValue>)[head], tail);
  }
  return value;
}

function updateValueAtPath(value: JsonValue, path: string[], nextValue: JsonValue): JsonValue {
  if (path.length === 0) return nextValue;
  const [head, ...tail] = path;

  if (Array.isArray(value)) {
    const index = Number(head);
    return value.map((item, currentIndex) =>
      currentIndex === index ? updateValueAtPath(item as JsonValue, tail, nextValue) : item
    ) as JsonValue;
  }

  if (value && typeof value === "object") {
    return {
      ...(value as Record<string, JsonValue>),
      [head]: updateValueAtPath((value as Record<string, JsonValue>)[head], tail, nextValue),
    };
  }

  return value;
}

function addArrayItemAtPath(value: JsonValue, path: string[]): JsonValue {
  const target = valueAtPath(value, path);
  if (!Array.isArray(target)) return value;
  const sample = target[0];
  const nextItem =
    typeof sample === "string"
      ? ""
      : typeof sample === "number"
        ? 0
        : typeof sample === "boolean"
          ? false
          : sample && typeof sample === "object"
            ? cloneValue(sample)
            : "";
  return updateValueAtPath(value, path, [...target, nextItem] as JsonValue);
}

function removeArrayItemAtPath(value: JsonValue, path: string[], index: number): JsonValue {
  const target = valueAtPath(value, path);
  if (!Array.isArray(target)) return value;
  return updateValueAtPath(
    value,
    path,
    target.filter((_, currentIndex) => currentIndex !== index) as JsonValue
  );
}

function matchesQuery(keyPath: string[], value: JsonValue, query: string): boolean {
  if (!query.trim()) return true;
  const haystack = `${keyPath.join(" ")} ${typeof value === "string" ? value : ""}`.toLowerCase();
  if (haystack.includes(query.toLowerCase())) return true;
  if (Array.isArray(value)) {
    return value.some((entry, index) => matchesQuery([...keyPath, String(index)], entry as JsonValue, query));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, child]) => matchesQuery([...keyPath, key], child as JsonValue, query));
  }
  return false;
}

function summarizeActivity(summary: Record<string, unknown>) {
  const entries = Object.entries(summary).slice(0, 2);
  if (!entries.length) return "Sin detalle adicional";
  return entries.map(([key, value]) => `${titleize(key)}: ${String(value)}`).join(" · ");
}

function safeCopy(text: string) {
  if (!navigator?.clipboard?.writeText) {
    window.prompt("Copia este valor:", text);
    return;
  }
  void navigator.clipboard.writeText(text);
}

type MediaRule = {
  label: string;
  hint: string;
  recommendedRatio?: number;
  recommendedSize?: { width: number; height: number };
  minSquare?: number;
  requiresAlt: boolean;
  maxBytes: number;
  accepts: string[];
};

const MEDIA_RULES: Record<MediaAsset["kind"], MediaRule> = {
  image: {
    label: "Imagen editorial",
    hint: "PNG o JPG recomendado. Prioriza imágenes limpias, con buen recorte y alt claro.",
    requiresAlt: true,
    maxBytes: 8_000_000,
    accepts: ["image/png", "image/jpeg", "image/webp"],
  },
  og: {
    label: "OG social",
    hint: "Usa proporción 1200 × 630 para compartir en web y mensajería.",
    recommendedRatio: 1200 / 630,
    recommendedSize: { width: 1200, height: 630 },
    requiresAlt: true,
    maxBytes: 5_000_000,
    accepts: ["image/png", "image/jpeg", "image/webp"],
  },
  icon: {
    label: "Icono web",
    hint: "Usa PNG o SVG cuadrado; para release web conviene partir de 512 × 512 o mayor.",
    minSquare: 512,
    requiresAlt: false,
    maxBytes: 2_000_000,
    accepts: ["image/png", "image/svg+xml"],
  },
  logo: {
    label: "Logo / wordmark",
    hint: "Usa SVG o PNG limpio para masthead y piezas de marca.",
    requiresAlt: false,
    maxBytes: 3_000_000,
    accepts: ["image/png", "image/svg+xml"],
  },
  pdf: {
    label: "PDF",
    hint: "Documento PDF listo para lectura y descarga.",
    requiresAlt: false,
    maxBytes: 25_000_000,
    accepts: ["application/pdf"],
  },
  document: {
    label: "Documento",
    hint: "Archivo documental de soporte. Usa PDF salvo que exista un motivo claro para otro formato.",
    requiresAlt: false,
    maxBytes: 25_000_000,
    accepts: ["application/pdf"],
  },
};

function fileExtension(file: File) {
  const extension = file.name.split(".").pop();
  return extension ? extension.toLowerCase() : "";
}

function looksLikeAcceptedFile(file: File, accepts: string[]) {
  if (file.type && accepts.includes(file.type)) return true;
  const extension = fileExtension(file);
  if (!extension) return false;
  if (accepts.includes("image/svg+xml") && extension === "svg") return true;
  if (accepts.includes("image/png") && extension === "png") return true;
  if (accepts.includes("image/jpeg") && ["jpg", "jpeg"].includes(extension)) return true;
  if (accepts.includes("image/webp") && extension === "webp") return true;
  if (accepts.includes("application/pdf") && extension === "pdf") return true;
  return false;
}

async function readImageDimensions(file: File) {
  if (!file.type.startsWith("image/") && fileExtension(file) !== "svg") {
    return null;
  }

  return await new Promise<{ width: number; height: number } | null>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;
  });
}

async function validateMediaFile(kind: MediaAsset["kind"], file: File, alt: string) {
  const rule = MEDIA_RULES[kind];
  const trimmedAlt = alt.trim();

  if (!looksLikeAcceptedFile(file, rule.accepts)) {
    return `${rule.label}: formato inválido. ${rule.hint}`;
  }

  if (file.size > rule.maxBytes) {
    return `${rule.label}: el archivo es demasiado pesado. Límite sugerido ${Math.round(rule.maxBytes / 1_000_000)} MB.`;
  }

  if (rule.requiresAlt && !trimmedAlt) {
    return `${rule.label}: el campo alt es obligatorio.`;
  }

  const dimensions = await readImageDimensions(file);
  if (rule.minSquare && dimensions && (dimensions.width < rule.minSquare || dimensions.height < rule.minSquare)) {
    return `${rule.label}: usa un archivo cuadrado de al menos ${rule.minSquare}px.`;
  }

  if (rule.recommendedSize && dimensions) {
    const ratio = dimensions.width / Math.max(1, dimensions.height);
    if (Math.abs(ratio - (rule.recommendedRatio ?? ratio)) > 0.03) {
      return `${rule.label}: la proporción esperada es ${rule.recommendedSize.width} × ${rule.recommendedSize.height}.`;
    }
  }

  return "";
}

type AdminPreflightReport = {
  status: "blocked" | "ready" | "caution";
  blockers: string[];
  warnings: string[];
};

function isValidUrlOrPath(value: string) {
  if (!value.trim()) return false;
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function collectTextLeaves(value: unknown, bag: string[] = []) {
  if (typeof value === "string") {
    bag.push(value);
    return bag;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectTextLeaves(entry, bag));
    return bag;
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((entry) => collectTextLeaves(entry, bag));
  }
  return bag;
}

function buildAdminPreflight(
  issue: EditionPayload | null,
  issues: EditionPayload[],
  mediaAssets: MediaAsset[],
  brand: BrandConfig
): AdminPreflightReport {
  if (!issue) {
    return { status: "blocked", blockers: ["Selecciona una edición para revisar su publicación."], warnings: [] };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];
  const content = issue.contentPayload;
  const duplicateSlug = issues.some((entry) => entry.id !== issue.id && entry.slug.trim().toLowerCase() === issue.slug.trim().toLowerCase());
  if (!issue.slug.trim()) blockers.push("Falta slug.");
  if (duplicateSlug) blockers.push("El slug ya existe en otra edición.");
  if (!issue.label.trim()) blockers.push("Falta label editorial.");
  if (!issue.location.trim()) blockers.push("Falta ubicación.");
  if (!issue.themeLine.trim()) blockers.push("Falta línea temática.");
  if (!content.metadata.publishedDateISO || Number.isNaN(Date.parse(content.metadata.publishedDateISO))) blockers.push("La fecha de publicación no es válida.");
  if (!content.share.title.trim()) blockers.push("Falta título de share.");
  if (!content.share.summary.trim()) blockers.push("Falta resumen de share.");
  if (!content.share.quote.trim()) blockers.push("Falta quote de share.");
  if (!content.metadata.heroImage.src.trim() || !isValidUrlOrPath(content.metadata.heroImage.src)) blockers.push("La imagen principal necesita una ruta válida.");
  if (!content.metadata.heroImage.alt.trim()) blockers.push("La imagen principal necesita alt.");
  if (!content.metadata.heroImage.caption.trim()) blockers.push("La imagen principal necesita caption.");
  if (!content.sources.items.length) blockers.push("Falta al menos una fuente visible.");
  if (content.sources.items.some((item) => !item.href?.trim() || !isValidUrlOrPath(item.href))) blockers.push("Todas las fuentes deben tener href válido.");
  if (!content.routes.authorities.length) blockers.push("Falta al menos una autoridad institucional.");
  if (content.routes.authorities.some((item) => !item.href?.trim() || !isValidUrlOrPath(item.href))) blockers.push("Todas las autoridades deben tener href válido.");
  if (!content.resources.pdfs.length) blockers.push("Falta al menos un PDF o recurso documental.");
  if (content.resources.pdfs.some((item) => !item.href?.trim() || !isValidUrlOrPath(item.href))) blockers.push("Todos los recursos PDF deben tener href válido.");
  if (content.gallery.items.some((item) => !item.title?.trim() || !item.description?.trim() || !item.fileName?.trim() || !isValidUrlOrPath(item.fileName))) {
    blockers.push("Las piezas de galería deben tener título, descripción y ruta válida.");
  }

  const socialAssetId = issue.socialAssetId?.trim() || brand.defaultOgAssetId.trim();
  if (!socialAssetId) {
    blockers.push("Falta asset social para miniatura.");
  } else if (!mediaAssets.some((asset) => asset.id === socialAssetId && asset.status !== "replaced")) {
    blockers.push("El asset social seleccionado no existe en la media library.");
  }

  const combinedText = collectTextLeaves(content)
    .join(" \n ")
    .toLowerCase();
  if (["placeholder", "demo", "muestra local", "pendiente"].some((marker) => combinedText.includes(marker))) {
    blockers.push("El contenido todavía contiene marcas de demo o pendiente.");
  }

  if (!content.gallery.items.length) warnings.push("No hay galería visual cargada.");
  warnings.push("La verificación profunda de rutas internas y archivos corre de nuevo al publicar.");

  return {
    status: blockers.length ? "blocked" : warnings.length ? "caution" : "ready",
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
  };
}

/* eslint-disable no-unused-vars */
interface FieldChangeHandler {
  (path: string[], nextValue: JsonValue): void;
}

interface FieldArrayAddHandler {
  (path: string[]): void;
}

interface FieldArrayRemoveHandler {
  (path: string[], index: number): void;
}
/* eslint-enable no-unused-vars */

type FieldEditorProps = {
  value: JsonValue;
  path: string[];
  query: string;
  onChange: FieldChangeHandler;
  onAddArrayItem: FieldArrayAddHandler;
  onRemoveArrayItem: FieldArrayRemoveHandler;
};

function FieldEditor({ value, path, query, onChange, onAddArrayItem, onRemoveArrayItem }: FieldEditorProps) {
  const label = titleize(path[path.length - 1] ?? "contenido");
  const shouldRender = matchesQuery(path, value, query);
  if (!shouldRender) return null;

  if (Array.isArray(value)) {
    return (
      <Card className="rounded-3xl border border-black/10 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">{label}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => onAddArrayItem(path)}>
              Añadir
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {value.map((entry, index) => (
            <div key={`${path.join(".")}.${index}`} className="rounded-2xl border border-black/10 bg-white/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                  {label} {index + 1}
                </span>
                <Button variant="ghost" size="sm" onClick={() => onRemoveArrayItem(path, index)}>
                  Quitar
                </Button>
              </div>
              <FieldEditor
                value={entry as JsonValue}
                path={[...path, String(index)]}
                query={query}
                onChange={onChange}
                onAddArrayItem={onAddArrayItem}
                onRemoveArrayItem={onRemoveArrayItem}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (value && typeof value === "object") {
    return (
      <Card className="rounded-3xl border border-black/10 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{label}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {Object.entries(value).map(([key, child]) => (
            <FieldEditor
              key={`${path.join(".")}.${key}`}
              value={child as JsonValue}
              path={[...path, key]}
              query={query}
              onChange={onChange}
              onAddArrayItem={onAddArrayItem}
              onRemoveArrayItem={onRemoveArrayItem}
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  const inputLabel = titleize(path[path.length - 1] ?? "valor");
  if (typeof value === "string") {
    const isLong = LONG_TEXT_KEYS.has(path[path.length - 1] ?? "") || value.length > 120;
    return (
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-neutral-800">{inputLabel}</span>
        {isLong ? (
          <textarea
            value={value}
            onChange={(event) => onChange(path, event.target.value)}
            className="min-h-24 rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm outline-none focus:border-amber-700"
          />
        ) : (
          <input
            value={value}
            onChange={(event) => onChange(path, event.target.value)}
            className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-700"
          />
        )}
      </label>
    );
  }

  if (typeof value === "number") {
    return (
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-neutral-800">{inputLabel}</span>
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(path, Number(event.target.value))}
          className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-700"
        />
      </label>
    );
  }

  if (typeof value === "boolean") {
    return (
      <label className="flex items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3">
        <span className="text-sm font-semibold text-neutral-800">{inputLabel}</span>
        <input type="checkbox" checked={value} onChange={(event) => onChange(path, event.target.checked)} />
      </label>
    );
  }

  return null;
}

export default function AdminApp() {
  const [tokenDraft, setTokenDraft] = useState("");
  const [token, setToken] = useState("");
  const [issues, setIssues] = useState<EditionPayload[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [editableIssue, setEditableIssue] = useState<EditionPayload | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(fallbackBrandConfig);
  const [pendingPosts, setPendingPosts] = useState<AdminCommunityPost[]>([]);
  const [approvedPosts, setApprovedPosts] = useState<AdminCommunityPost[]>([]);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [fieldQuery, setFieldQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingIssue, setIsSavingIssue] = useState(false);
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [uploadKind, setUploadKind] = useState<MediaAsset["kind"]>("image");
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const selectedIssue = useMemo(
    () => issues.find((item) => item.id === selectedIssueId) ?? editableIssue,
    [editableIssue, issues, selectedIssueId]
  );
  const issueReadOnly = editableIssue?.status === "published" || editableIssue?.status === "archived";
  const publishPreflight = useMemo(
    () => buildAdminPreflight(editableIssue, issues, mediaAssets, brandConfig),
    [editableIssue, issues, mediaAssets, brandConfig]
  );
  const socialMediaOptions = useMemo(
    () => mediaAssets.filter((asset) => asset.status !== "replaced" && (asset.kind === "og" || asset.kind === "image")),
    [mediaAssets]
  );

  useEffect(() => {
    const stored = readStoredToken();
    setToken(stored);
    setTokenDraft(stored);
  }, []);

  useEffect(() => {
    if (!token) return;
    void refreshAll(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const refreshAll = async (activeToken = token) => {
    if (!activeToken) return;
    setIsLoading(true);
    setError("");
    try {
      const [remoteIssues, remoteMedia, remoteBrand, remotePending, remoteApproved, remoteActivity] = await Promise.all([
        fetchAdminIssues(activeToken),
        fetchAdminMedia(activeToken),
        fetchAdminBrand(activeToken),
        fetchAdminCommunity(activeToken, { status: "pending", limit: 80 }),
        fetchAdminCommunity(activeToken, { status: "approved", limit: 40 }),
        fetchAdminActivity(activeToken),
      ]);
      setIssues(remoteIssues);
      setMediaAssets(remoteMedia);
      setBrandConfig(remoteBrand);
      setPendingPosts(remotePending);
      setApprovedPosts(remoteApproved);
      setActivity(remoteActivity);
      const preferred = remoteIssues[0] ?? null;
      setSelectedIssueId((current) => (remoteIssues.some((item) => item.id === current) ? current : preferred?.id ?? ""));
      setEditableIssue((current) => {
        if (current && remoteIssues.some((item) => item.id === current.id)) {
          return cloneValue(remoteIssues.find((item) => item.id === current.id) ?? current);
        }
        return preferred ? cloneValue(preferred) : null;
      });
    } catch (caught) {
      const err = caught as AdminCmsApiError;
      setError(err.message || "No fue posible cargar el panel.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = () => {
    const clean = tokenDraft.trim();
    if (!clean) {
      setError("Ingresa un token administrativo válido.");
      return;
    }
    writeStoredToken(clean);
    setToken(clean);
    setMessage("Token guardado. Cargando consola editorial…");
  };

  const handleLogout = () => {
    writeStoredToken("");
    setToken("");
    setIssues([]);
    setEditableIssue(null);
    setSelectedIssueId("");
    setMediaAssets([]);
    setBrandConfig(fallbackBrandConfig);
    setPendingPosts([]);
    setApprovedPosts([]);
    setActivity([]);
    setMessage("");
    setError("");
  };

  const handleSelectIssue = (issue: EditionPayload) => {
    setSelectedIssueId(issue.id);
    setEditableIssue(cloneValue(issue));
    setMessage("");
    setError("");
  };

  const handleIssueValueChange = (path: string[], nextValue: JsonValue) => {
    setEditableIssue((current) => {
      if (!current) return current;
      return {
        ...current,
        contentPayload: updateValueAtPath(current.contentPayload as unknown as JsonValue, path, nextValue) as EditionPayload["contentPayload"],
      };
    });
  };

  const handleAddArrayItem = (path: string[]) => {
    setEditableIssue((current) => {
      if (!current) return current;
      return {
        ...current,
        contentPayload: addArrayItemAtPath(current.contentPayload as unknown as JsonValue, path) as EditionPayload["contentPayload"],
      };
    });
  };

  const handleRemoveArrayItem = (path: string[], index: number) => {
    setEditableIssue((current) => {
      if (!current) return current;
      return {
        ...current,
        contentPayload: removeArrayItemAtPath(current.contentPayload as unknown as JsonValue, path, index) as EditionPayload["contentPayload"],
      };
    });
  };

  const handleCreateDraft = async () => {
    if (!token) return;
    setError("");
    setMessage("");
    try {
      const item = await createDraftIssue(token, selectedIssue?.id);
      setIssues((current) => [item, ...current]);
      handleSelectIssue(item);
      setMessage("Borrador creado.");
      await refreshAll();
    } catch (caught) {
      setError((caught as Error).message);
    }
  };

  const handleSaveIssue = async (nextStatus?: EditionPayload["status"]) => {
    if (!token || !editableIssue) return;
    setIsSavingIssue(true);
    setError("");
    setMessage("");
    try {
      const payload = nextStatus ? { ...editableIssue, status: nextStatus } : editableIssue;
      const item = await updateAdminIssue(token, payload);
      setEditableIssue(cloneValue(item));
      setIssues((current) => current.map((entry) => (entry.id === item.id ? item : entry)));
      setMessage(
        nextStatus === "review_ready"
          ? "Edición lista para revisión."
          : nextStatus === "draft"
            ? "Borrador guardado."
            : "Edición guardada."
      );
      await refreshAll();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setIsSavingIssue(false);
    }
  };

  const handlePublishIssue = async () => {
    if (!token || !editableIssue) return;
    setIsSavingIssue(true);
    setError("");
    setMessage("");
    try {
      const item = await publishAdminIssue(token, editableIssue.id);
      setEditableIssue(cloneValue(item));
      setMessage("Edición publicada.");
      await refreshAll();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setIsSavingIssue(false);
    }
  };

  const handleArchiveIssue = async () => {
    if (!token || !editableIssue) return;
    setIsSavingIssue(true);
    setError("");
    setMessage("");
    try {
      const item = await archiveAdminIssue(token, editableIssue.id);
      setEditableIssue(cloneValue(item));
      setMessage("Edición archivada.");
      await refreshAll();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setIsSavingIssue(false);
    }
  };

  const handleUploadMedia = async () => {
    if (!token || !uploadFile) return;
    setError("");
    setMessage("");
    const validationMessage = await validateMediaFile(uploadKind, uploadFile, uploadAlt);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    try {
      await uploadAdminMedia(token, {
        kind: uploadKind,
        alt: uploadAlt,
        caption: uploadCaption,
        file: uploadFile,
      });
      setUploadAlt("");
      setUploadCaption("");
      setUploadFile(null);
      setMessage("Asset subido y activado.");
      await refreshAll();
    } catch (caught) {
      setError((caught as Error).message);
    }
  };

  const handleReplaceMedia = async (asset: MediaAsset, file: File) => {
    if (!token) return;
    setError("");
    setMessage("");
    const validationMessage = await validateMediaFile(asset.kind, file, asset.alt);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    try {
      await replaceAdminMedia(token, asset.id, {
        file,
        alt: asset.alt,
        caption: asset.caption,
      });
      setMessage("Asset reemplazado.");
      await refreshAll();
    } catch (caught) {
      setError((caught as Error).message);
    }
  };

  const handleSaveBrand = async () => {
    if (!token) return;
    setIsSavingBrand(true);
    setError("");
    setMessage("");
    try {
      const item = await updateAdminBrand(token, brandConfig);
      setBrandConfig(item);
      setMessage("Brand pack guardado.");
      await refreshAll();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setIsSavingBrand(false);
    }
  };

  const handleModerate = async (post: AdminCommunityPost, action: "approve" | "reject" | "hide") => {
    if (!token) return;
    setError("");
    setMessage("");
    try {
      await moderateAdminCommunityPost(post.id, action, token);
      setMessage("Moderación actualizada.");
      await refreshAll();
    } catch (caught) {
      setError((caught as Error).message);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f7f1e8_0%,#efe5d7_100%)] px-4 py-10 text-[#18120e]">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[36px] border-none bg-[#fff9f1]/85 shadow-[0_24px_80px_rgba(72,40,18,0.12)]">
            <CardHeader className="pb-4">
              <Badge className="w-fit rounded-full bg-amber-100 text-amber-800">Consola editorial</Badge>
              <CardTitle className="text-4xl font-black tracking-tight">Gaceta Tu Espacio</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 text-sm leading-7 text-neutral-700">
              <p>
                Panel interno para operar el periódico completo: edición publicada, media, branding web, moderación de comunidad
                y trazabilidad de cambios.
              </p>
              <div className="grid gap-3">
                <label className="grid gap-2">
                  <span className="font-semibold text-neutral-900">Token administrativo</span>
                  <input
                    value={tokenDraft}
                    onChange={(event) => setTokenDraft(event.target.value)}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-amber-700"
                    placeholder="Ingresa tu token"
                  />
                </label>
                <Button className="w-fit rounded-full bg-[#8f2f1c] text-white hover:bg-[#7a2818]" onClick={handleUnlock}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Desbloquear panel
                </Button>
                {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[36px] border-none bg-[#2a1c12] text-[#fff8ef] shadow-[0_24px_80px_rgba(32,18,8,0.24)]">
            <CardHeader className="pb-4">
              <Badge className="w-fit rounded-full bg-white/15 text-white">Lanzamiento 2026</Badge>
              <CardTitle className="text-3xl font-black">Qué se controla aquí</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm leading-7 text-white/82">
              <p>Ediciones con estado draft, review_ready, published y archived.</p>
              <p>Editor estructurado sobre el contenido canónico compartido entre web e iOS.</p>
              <p>Subida de assets a media library con URL pública estable y reemplazo controlado.</p>
              <p>Brand pack web: masthead, soporte, favicon, apple touch icon y OG por defecto.</p>
              <p>Moderación editorial de comentarios e historial con revisión previa a publicación.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f1e8_0%,#efe5d7_100%)] text-[#18120e]">
      <header className="border-b border-black/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-950">
              <ArrowLeft className="h-4 w-4" />
              Volver al periódico
            </a>
            <div className="hidden h-5 w-px bg-black/10 md:block" />
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-amber-800">Gaceta Tu Espacio</div>
              <div className="text-lg font-black">Consola editorial</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void refreshAll()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refrescar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 md:px-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="grid gap-6">
          <Card className="rounded-[30px] border-black/10 bg-white/85 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Newspaper className="h-5 w-5 text-amber-800" />
                Ediciones
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button className="rounded-full bg-[#8f2f1c] text-white hover:bg-[#7a2818]" onClick={() => void handleCreateDraft()}>
                Nuevo borrador
              </Button>
              {issues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => handleSelectIssue(issue)}
                  className={`grid gap-2 rounded-2xl border px-4 py-3 text-left transition ${
                    issue.id === selectedIssueId ? "border-amber-700 bg-amber-50" : "border-black/10 bg-white/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{issue.label}</span>
                    <Badge variant="secondary" className="capitalize">
                      {issue.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-neutral-500">{issue.slug}</div>
                  <div className="text-xs text-neutral-500">{formatDate(issue.updatedAt)}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border-black/10 bg-white/85 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock3 className="h-5 w-5 text-amber-800" />
                Actividad
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {activity.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-black/10 bg-white/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary">{entry.scope}</Badge>
                    <span className="text-xs text-neutral-500">{formatDate(entry.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{titleize(entry.action)}</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-600">{summarizeActivity(entry.summary)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        <section className="grid gap-6">
          {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div> : null}
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div> : null}
          {isLoading ? <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-6 text-sm">Cargando consola…</div> : null}

          {editableIssue ? (
            <Card className="rounded-[34px] border-black/10 bg-white/88 shadow-none">
              <CardHeader className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
                <div className="grid gap-3">
                  <CardTitle className="text-3xl font-black">Edición seleccionada</CardTitle>
                  {issueReadOnly ? (
                    <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-700">
                      Esta edición ya está <span className="font-semibold">{editableIssue.status}</span> y quedó de solo lectura.
                      Si necesitas corregirla, crea un nuevo borrador desde esta edición.
                    </div>
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold">Slug</span>
                      <input
                        value={editableIssue.slug}
                        onChange={(event) => setEditableIssue((current) => current ? { ...current, slug: event.target.value } : current)}
                        className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                        disabled={issueReadOnly}
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold">Label</span>
                      <input
                        value={editableIssue.label}
                        onChange={(event) => setEditableIssue((current) => current ? { ...current, label: event.target.value } : current)}
                        className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                        disabled={issueReadOnly}
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold">Ubicación</span>
                      <input
                        value={editableIssue.location}
                        onChange={(event) => setEditableIssue((current) => current ? { ...current, location: event.target.value } : current)}
                        className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                        disabled={issueReadOnly}
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold">Miniatura social</span>
                      <select
                        value={editableIssue.socialAssetId ?? ""}
                        onChange={(event) =>
                          setEditableIssue((current) =>
                            current ? { ...current, socialAssetId: event.target.value || null } : current
                          )
                        }
                        className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                        disabled={issueReadOnly}
                      >
                        <option value="">Usar OG por defecto de marca</option>
                        {socialMediaOptions.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.kind.toUpperCase()} · {asset.originalFileName || asset.id}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-neutral-500">
                        Fallback actual de marca: {brandConfig.defaultOgAssetId || "sin asset por defecto"}
                      </span>
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold">Línea temática</span>
                      <input
                        value={editableIssue.themeLine}
                        onChange={(event) => setEditableIssue((current) => current ? { ...current, themeLine: event.target.value } : current)}
                        className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                        disabled={issueReadOnly}
                      />
                    </label>
                    <div className="rounded-2xl border border-black/10 bg-[#faf5ee] px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">Estado editorial</div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {editableIssue.status}
                        </Badge>
                        <span className="text-sm text-neutral-600">
                          {publishPreflight.status === "blocked"
                            ? "Bloqueado"
                            : publishPreflight.status === "caution"
                              ? "Listo con advertencias"
                              : "Listo"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const publicHref =
                        editableIssue.status === "published"
                          ? "/gaceta-eje-central"
                          : editableIssue.status === "archived"
                            ? `/gaceta-eje-central/edicion/${encodeURIComponent(editableIssue.slug)}`
                            : null;
                      if (publicHref) {
                        window.open(publicHref, "_blank", "noopener,noreferrer");
                      }
                    }}
                    disabled={editableIssue.status !== "published" && editableIssue.status !== "archived"}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver publicación
                  </Button>
                  <Button variant="outline" onClick={() => void handleArchiveIssue()} disabled={isSavingIssue}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archivar
                  </Button>
                  <Button variant="outline" onClick={() => void handleSaveIssue("draft")} disabled={isSavingIssue || issueReadOnly}>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar borrador
                  </Button>
                  <Button variant="outline" onClick={() => void handleSaveIssue("review_ready")} disabled={isSavingIssue || issueReadOnly}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {editableIssue.status === "review_ready" ? "Guardar revisión" : "Lista para revisión"}
                  </Button>
                  <Button
                    className="bg-[#8f2f1c] text-white hover:bg-[#7a2818]"
                    onClick={() => void handlePublishIssue()}
                    disabled={isSavingIssue || issueReadOnly || editableIssue.status !== "review_ready" || publishPreflight.blockers.length > 0}
                  >
                    <FolderSync className="mr-2 h-4 w-4" />
                    Publicar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5">
                <div
                  className={`grid gap-3 rounded-2xl border px-4 py-4 ${
                    publishPreflight.status === "blocked"
                      ? "border-red-200 bg-red-50"
                      : publishPreflight.status === "caution"
                        ? "border-amber-200 bg-amber-50"
                        : "border-emerald-200 bg-emerald-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">
                      Preflight editorial {publishPreflight.status === "blocked" ? "bloqueado" : publishPreflight.status === "caution" ? "con advertencias" : "listo"}
                    </div>
                    <div className="text-xs text-neutral-600">
                      Bloqueos: {publishPreflight.blockers.length} · Advertencias: {publishPreflight.warnings.length}
                    </div>
                  </div>
                  {publishPreflight.blockers.length ? (
                    <div className="grid gap-1 text-sm text-red-800">
                      {publishPreflight.blockers.map((item) => (
                        <div key={item}>• {item}</div>
                      ))}
                    </div>
                  ) : null}
                  {publishPreflight.warnings.length ? (
                    <div className="grid gap-1 text-sm text-amber-900">
                      {publishPreflight.warnings.map((item) => (
                        <div key={item}>• {item}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[#faf5ee] px-4 py-3">
                  <Search className="h-4 w-4 text-amber-800" />
                  <input
                    value={fieldQuery}
                    onChange={(event) => setFieldQuery(event.target.value)}
                    placeholder="Buscar campo, sección o texto dentro del contenido"
                    className="w-full bg-transparent text-sm outline-none"
                    disabled={issueReadOnly}
                  />
                </div>
                <div className={`grid gap-4 ${issueReadOnly ? "pointer-events-none opacity-65" : ""}`}>
                  <FieldEditor
                    value={editableIssue.contentPayload as unknown as JsonValue}
                    path={["contentPayload"]}
                    query={fieldQuery}
                    onChange={handleIssueValueChange}
                    onAddArrayItem={handleAddArrayItem}
                    onRemoveArrayItem={handleRemoveArrayItem}
                  />
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                  Cada edición publicada conserva su enlace estable en
                  <span className="mx-1 font-semibold">/gaceta-eje-central/edicion/{editableIssue.slug}</span>.
                  Si publicas una nueva, la anterior se mueve al archivo sin perder su URL, siempre que el slug sea único.
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-[34px] border-black/10 bg-white/88 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <FileImage className="h-5 w-5 text-amber-800" />
                  Media library
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5">
                <div className="grid gap-3 rounded-3xl border border-black/10 bg-[#faf5ee] p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold">Tipo</span>
                      <select value={uploadKind} onChange={(event) => setUploadKind(event.target.value as MediaAsset["kind"])} className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm">
                        <option value="image">Imagen</option>
                        <option value="og">OG</option>
                        <option value="icon">Icono</option>
                        <option value="logo">Logo</option>
                        <option value="pdf">PDF</option>
                        <option value="document">Documento</option>
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold">Archivo</span>
                      <input type="file" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm" />
                    </label>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <div className="font-semibold">{MEDIA_RULES[uploadKind].label}</div>
                    <div className="mt-1 leading-6">{MEDIA_RULES[uploadKind].hint}</div>
                  </div>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Alt</span>
                    <input value={uploadAlt} onChange={(event) => setUploadAlt(event.target.value)} className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm" />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Caption</span>
                    <textarea value={uploadCaption} onChange={(event) => setUploadCaption(event.target.value)} className="min-h-20 rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm" />
                  </label>
                  <Button className="w-fit rounded-full bg-[#8f2f1c] text-white hover:bg-[#7a2818]" disabled={!uploadFile} onClick={() => void handleUploadMedia()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir asset
                  </Button>
                </div>

                <div className="grid gap-3">
                  {mediaAssets.map((asset) => (
                    <div key={asset.id} className="grid gap-3 rounded-3xl border border-black/10 bg-white/76 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{asset.kind}</Badge>
                            <span className="text-xs text-neutral-500">{asset.originalFileName}</span>
                          </div>
                          <div className="mt-2 text-sm font-semibold">{asset.alt || "Sin alt"}</div>
                          <div className="text-xs text-neutral-500">{formatDate(asset.updatedAt)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => safeCopy(asset.publicUrl)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar URL
                          </Button>
                          <a href={asset.publicUrl} target="_blank" rel="noreferrer" className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold">
                            Abrir
                          </a>
                        </div>
                      </div>
                      {asset.mimeType.startsWith("image/") ? (
                        <img src={asset.publicUrl} alt={asset.alt} className="h-44 w-full rounded-2xl object-cover" />
                      ) : null}
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Reemplazar archivo</span>
                        <input
                          type="file"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void handleReplaceMedia(asset, file);
                            }
                          }}
                          className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card className="rounded-[34px] border-black/10 bg-white/88 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Paintbrush className="h-5 w-5 text-amber-800" />
                    Brand pack web
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-3 rounded-3xl border border-black/10 bg-[#faf5ee] p-4 text-sm text-neutral-700">
                    <div className="font-semibold text-neutral-900">Slots web recomendados</div>
                    <div>Favicon PNG: 32 × 32 y 48 × 48.</div>
                    <div>Apple Touch Icon: 180 × 180 PNG.</div>
                    <div>Manifest icon: 512 × 512 PNG.</div>
                    <div>OG por defecto y OG editorial: 1200 × 630.</div>
                    <div>Usa alt/caption en imágenes editoriales y OG para mantener trazabilidad.</div>
                  </div>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Site name</span>
                    <input value={brandConfig.siteName} onChange={(event) => setBrandConfig((current) => ({ ...current, siteName: event.target.value }))} className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm" />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Masthead</span>
                    <input value={brandConfig.masthead} onChange={(event) => setBrandConfig((current) => ({ ...current, masthead: event.target.value }))} className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm" />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Masthead corto</span>
                    <input value={brandConfig.shortMasthead} onChange={(event) => setBrandConfig((current) => ({ ...current, shortMasthead: event.target.value }))} className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm" />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Tema</span>
                    <input value={brandConfig.themeMode} onChange={(event) => setBrandConfig((current) => ({ ...current, themeMode: event.target.value }))} className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm" />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Default OG asset ID</span>
                    <input value={brandConfig.defaultOgAssetId} onChange={(event) => setBrandConfig((current) => ({ ...current, defaultOgAssetId: event.target.value }))} className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm" />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold">Logo asset ID</span>
                    <input value={brandConfig.logoAssetId} onChange={(event) => setBrandConfig((current) => ({ ...current, logoAssetId: event.target.value }))} className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm" />
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    {Object.entries(brandConfig.webIconPack).map(([key, value]) => (
                      <label key={key} className="grid gap-2">
                        <span className="text-sm font-semibold">{titleize(key)}</span>
                        <input
                          value={value}
                          onChange={(event) =>
                            setBrandConfig((current) => ({
                              ...current,
                              webIconPack: {
                                ...current.webIconPack,
                                [key]: event.target.value,
                              },
                            }))
                          }
                          className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                        />
                      </label>
                    ))}
                  </div>
                  <Button className="w-fit rounded-full bg-[#8f2f1c] text-white hover:bg-[#7a2818]" disabled={isSavingBrand} onClick={() => void handleSaveBrand()}>
                    Guardar brand pack
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-[34px] border-black/10 bg-white/88 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-2xl">Moderación de comunidad</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-3">
                    <div className="text-sm font-semibold">Pendientes</div>
                    {pendingPosts.map((post) => (
                      <div key={post.id} className="rounded-2xl border border-black/10 bg-white/80 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{post.displayName}</div>
                            <div className="text-xs text-neutral-500">{formatDate(post.createdAt)}</div>
                          </div>
                          <Badge variant="secondary">{post.kind}</Badge>
                        </div>
                        {post.category ? <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">{post.category}</div> : null}
                        <p className="mt-3 text-sm leading-6 text-neutral-700">{post.content}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => void handleModerate(post, "approve")}>Aprobar</Button>
                          <Button variant="outline" size="sm" onClick={() => void handleModerate(post, "reject")}>Rechazar</Button>
                          <Button variant="outline" size="sm" onClick={() => void handleModerate(post, "hide")}>Ocultar</Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3">
                    <div className="text-sm font-semibold">Aprobados recientes</div>
                    {approvedPosts.map((post) => (
                      <div key={post.id} className="rounded-2xl border border-black/10 bg-white/80 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold">{post.displayName}</div>
                          <Badge variant="secondary">{post.kind}</Badge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-neutral-700">{post.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
