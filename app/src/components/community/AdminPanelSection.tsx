import { CalendarDays, ChevronRight, RefreshCcw, ShieldCheck, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type AdminEdition,
  type CreateAdminEditionInput,
  type EditionPeriod,
  buildEditionTitleDefaults,
  createAdminEdition,
  fetchAdminEditions,
} from "@/lib/admin-editions";

const ADMIN_TOKEN_STORAGE_KEY = "yosoymx.admin.token";

const TODAY = new Date().toISOString().slice(0, 10);

const DEFAULT_NOTE_PLACEHOLDER = "Notas rápidas del enfoque editorial, fuentes nuevas, entrevistas o contexto social.";

function formatDate(raw: string) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
    }).format(new Date(raw));
  } catch {
    return raw;
  }
}

function formatDateRange(edition: AdminEdition) {
  return `${formatDate(edition.periodStart)} → ${formatDate(edition.periodEnd)}`;
}

function getStatusLabel(status: AdminEdition["status"]) {
  if (status === "published") return "Publicada";
  if (status === "archived") return "Archivada";
  return "Borrador";
}

function getInitialState(): CreateAdminEditionInput {
  return {
    title: "",
    periodType: "daily",
    periodStart: TODAY,
    notes: "",
  };
}

export function AdminPanelSection() {
  const [adminToken, setAdminToken] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [editions, setEditions] = useState<AdminEdition[]>([]);
  const [editing, setEditing] = useState<CreateAdminEditionInput>(getInitialState());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLockLoading, setIsLockLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    if (!raw) return;
    setAdminToken(raw);
    setIsUnlocked(true);
  }, []);

  const loadEditions = async () => {
    if (!adminToken) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const remote = await fetchAdminEditions(adminToken, 40);
      setEditions(remote);
      if (remote.length === 0) {
        setMessage("No hay ediciones registradas todavía.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar el panel.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEditions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  const saveToken = () => {
    const clean = inputToken.trim();
    if (!clean) {
      setError("La clave no puede quedar vacía.");
      return;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, clean);
    }
    setAdminToken(clean);
    setIsUnlocked(true);
    setMessage("Token guardado en este navegador. Cargando panel...");
    setInputToken("");
    void loadEditions();
  };

  const clearToken = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
    setAdminToken("");
    setIsUnlocked(false);
    setEditions([]);
    setMessage("Sesión cerrada. Ingresa token para continuar.");
    setError("");
  };

  const generateEdition = async () => {
    setIsLockLoading(true);
    setError("");
    setMessage("");
    if (!adminToken) {
      setError("Autorización de admin requerida.");
      return;
    }
    const trimmed = {
      ...editing,
      title: editing.title.trim(),
      notes: editing.notes.trim(),
    };
    const periodType = trimmed.periodType as EditionPeriod;
    const normalizedTitle = trimmed.title || buildEditionTitleDefaults(periodType, trimmed.periodStart);
    const payload: CreateAdminEditionInput = {
      ...trimmed,
      title: normalizedTitle || `Edición ${periodType === "daily" ? "diaria" : "semanal"}`,
      periodType,
      notes: trimmed.notes || DEFAULT_NOTE_PLACEHOLDER,
    };

    setLoading(true);
    try {
      const created = await createAdminEdition(payload, adminToken);
      setEditions((current) => [created, ...current].slice(0, 40));
      setMessage(`Edición creada: ${created.title}`);
      setEditing({ ...getInitialState(), periodType: periodType, periodStart: TODAY });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la edición.");
    } finally {
      setLoading(false);
      setIsLockLoading(false);
    }
  };

  return (
    <section id="admin" className="border-t" style={{ borderColor: "rgba(38, 26, 18, 0.12)", paddingTop: "clamp(4.5rem, 8vw, 7rem)", paddingBottom: "clamp(4.5rem, 8vw, 7rem)" }}>
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">
        <div className="mb-8 rounded-[34px] p-6 md:p-8" style={{ background: "rgba(255,255,255,0.82)", border: "1px solid rgba(38, 26, 18, 0.12)", boxShadow: "0 12px 40px rgba(62, 41, 22, 0.08)" }}>
          <div className="mb-3 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6" style={{ color: "#8f2f1c" }} />
            <span className="text-[11px] uppercase tracking-[0.28em]" style={{ color: "#8f2f1c" }}>
              Panel administrativo
            </span>
          </div>
          <h2 className="mb-3 text-3xl font-black" style={{ fontFamily: "Fraunces, ui-serif, Georgia, Cambria, \"Times New Roman\", serif" }}>
            Editorial de la semana / edición diaria
          </h2>
          <p className="mb-4 max-w-3xl text-sm leading-7" style={{ color: "rgba(66,52,43,0.78)" }}>
            Genera ediciones por bloque temporal para publicar recorridos comunitarios, cápsulas históricas o reportes.
            Esta versión permite crear lotes con rango diario o semanal y dejar trazabilidad para revisión.
          </p>

          {!isUnlocked ? (
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <label className="space-y-1">
                <span className="text-sm font-semibold" style={{ color: "rgba(24,18,14,0.88)" }}>
                  Clave de administrador
                </span>
                <input
                  value={inputToken}
                  onChange={(event) => setInputToken(event.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="Ingresa tu clave de acceso"
                  autoComplete="off"
                />
                <p className="text-xs" style={{ color: "rgba(66,52,43,0.7)" }}>
                  Solo administradores autorizados. La clave se guarda localmente en este navegador.
                </p>
              </label>
              <Button
                type="button"
                onClick={saveToken}
                className="rounded-full"
              >
                Desbloquear
              </Button>
            </div>
          ) : (
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                <label className="space-y-1">
                  <span className="text-sm font-semibold" style={{ color: "rgba(24,18,14,0.88)" }}>
                    Título de edición
                  </span>
                  <input
                    value={editing.title}
                    onChange={(event) => setEditing((state) => ({ ...state, title: event.target.value }))}
                    className="w-full rounded-xl border px-3 py-2"
                    maxLength={120}
                    placeholder="Edición diaria · Marzo 2026"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold" style={{ color: "rgba(24,18,14,0.88)" }}>
                    Tipo de edición
                  </span>
                  <select
                    className="w-full rounded-xl border px-3 py-2 bg-white"
                    value={editing.periodType}
                    onChange={(event) => setEditing((state) => ({ ...state, periodType: event.target.value as EditionPeriod }))}
                  >
                    <option value="daily">Diaria</option>
                    <option value="weekly">Semanal</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold" style={{ color: "rgba(24,18,14,0.88)" }}>
                    Inicio del periodo
                  </span>
                  <input
                    type="date"
                    className="w-full rounded-xl border px-3 py-2"
                    value={editing.periodStart}
                    onChange={(event) => setEditing((state) => ({ ...state, periodStart: event.target.value }))}
                  />
                </label>
              </div>
              <label className="space-y-1">
                <span className="text-sm font-semibold" style={{ color: "rgba(24,18,14,0.88)" }}>
                  Notas de edición
                </span>
                <textarea
                  value={editing.notes}
                  onChange={(event) => setEditing((state) => ({ ...state, notes: event.target.value.slice(0, 900) }))}
                  rows={3}
                  className="w-full rounded-xl border px-3 py-2"
                  maxLength={900}
                  placeholder="Objetivo narrativo y cambios de la edición."
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={generateEdition}
                  disabled={loading}
                  className="rounded-full"
                >
                  {loading ? "Guardando..." : "Generar nueva edición"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadEditions()}
                  className="rounded-full"
                  disabled={loading}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearToken}
                  className="rounded-full"
                  disabled={isLockLoading}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Cerrar sesión admin
                </Button>
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm" style={{ color: "#b91c1c" }}>{error}</p>}
          {message && <p className="mt-4 text-sm" style={{ color: "#8f2f1c" }}>{message}</p>}
        </div>

        <div className="space-y-3">
          {editions.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-4" style={{ borderColor: "rgba(38, 26, 18, 0.14)", color: "rgba(24,18,14,0.7)" }}>
              No hay ediciones programadas. Crea una edición para activar la publicación semanal o diaria.
            </p>
          ) : (
            editions.map((edition) => (
              <article
                key={edition.id}
                className="rounded-[24px] border p-4 md:p-5"
                style={{ borderColor: "rgba(38, 26, 18, 0.16)", background: "rgba(255,255,255,0.86)" }}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-black" style={{ fontFamily: "Fraunces, ui-serif, Georgia, Cambria, \"Times New Roman\", serif" }}>
                    {edition.title}
                  </h3>
                  <span className="text-sm">
                    <Badge className="rounded-full" style={{ background: "rgba(201,94,42,0.16)", color: "#8f2f1c" }}>
                      {edition.periodType === "daily" ? "Diaria" : "Semanal"}
                    </Badge>
                    <Badge className="ml-2 rounded-full" style={{ background: "rgba(36,25,19,0.12)", color: "#241913" }}>
                      {getStatusLabel(edition.status)}
                    </Badge>
                  </span>
                </div>
                <p className="mb-2 text-sm" style={{ color: "rgba(66,52,43,0.74)" }}>
                  {formatDateRange(edition)}
                </p>
                {edition.notes ? (
                  <p className="text-sm leading-7" style={{ color: "rgba(24,18,14,0.74)" }}>{edition.notes}</p>
                ) : (
                  <p className="text-sm italic" style={{ color: "rgba(66,52,43,0.55)" }}>Sin notas.</p>
                )}
                <div className="mt-3 text-xs" style={{ color: "rgba(66,52,43,0.68)" }}>
                  Creada: {formatDate(edition.createdAt)}
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 text-sm" style={{ color: "rgba(66,52,43,0.66)" }}>
          <CalendarDays className="h-4 w-4" />
          <span>Sugerencia operativa: si decides publicar por semana, inicia en lunes para mantener consistencia.</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </section>
  );
}
