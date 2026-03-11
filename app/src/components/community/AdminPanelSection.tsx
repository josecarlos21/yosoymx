import {
  CalendarDays,
  CheckCircle2,
  EyeOff,
  MessageSquareWarning,
  RefreshCcw,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchAdminCommunity,
  moderateAdminCommunityPost,
  type AdminCommunityPost,
  type CommunityModerationAction,
} from "@/lib/admin-community";
import {
  type AdminEdition,
  type CreateAdminEditionInput,
  type EditionPeriod,
  buildEditionTitleDefaults,
  createAdminEdition,
  fetchAdminEditions,
} from "@/lib/admin-editions";
import { issueContent } from "@/lib/issue-content";

const ADMIN_TOKEN_STORAGE_KEY = "yosoymx.admin.token";
const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT_NOTE_PLACEHOLDER = "Notas rápidas del enfoque editorial, fuentes nuevas, entrevistas o contexto social.";

function formatDate(raw: string) {
  try {
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(raw));
  } catch {
    return raw;
  }
}

function formatDateTime(raw: string) {
  try {
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(raw));
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

function getKindLabel(kind: AdminCommunityPost["kind"]) {
  return kind === "history" ? "Historial" : "Comentario";
}

function getModerationLabel(status: AdminCommunityPost["moderationStatus"]) {
  if (status === "approved") return "Aprobado";
  if (status === "rejected") return "Rechazado";
  if (status === "hidden") return "Oculto";
  return "Pendiente";
}

export function AdminPanelSection() {
  const adminContent = issueContent.admin;
  const moderationContent = issueContent.community.admin;

  const [adminToken, setAdminToken] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [editions, setEditions] = useState<AdminEdition[]>([]);
  const [pendingPosts, setPendingPosts] = useState<AdminCommunityPost[]>([]);
  const [approvedPosts, setApprovedPosts] = useState<AdminCommunityPost[]>([]);
  const [editing, setEditing] = useState<CreateAdminEditionInput>(getInitialState());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [moderationBusyId, setModerationBusyId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    if (!raw) return;
    setAdminToken(raw);
    setIsUnlocked(true);
  }, []);

  const loadPanel = async (tokenOverride?: string) => {
    const token = tokenOverride || adminToken;
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [remoteEditions, remotePending, remoteApproved] = await Promise.all([
        fetchAdminEditions(token, 40),
        fetchAdminCommunity(token, { status: "pending", limit: 80 }),
        fetchAdminCommunity(token, { status: "approved", limit: 40 }),
      ]);
      setEditions(remoteEditions);
      setPendingPosts(remotePending);
      setApprovedPosts(remoteApproved);
      if (remoteEditions.length === 0) {
        setMessage(adminContent.emptyEditions);
      } else {
        setMessage("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar el panel.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPanel();
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
    void loadPanel(clean);
  };

  const clearToken = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
    setAdminToken("");
    setIsUnlocked(false);
    setEditions([]);
    setPendingPosts([]);
    setApprovedPosts([]);
    setMessage("Sesión cerrada. Ingresa token para continuar.");
    setError("");
  };

  const generateEdition = async () => {
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
      setEditing({ ...getInitialState(), periodType, periodStart: TODAY });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la edición.");
    } finally {
      setLoading(false);
    }
  };

  const handleModeration = async (postId: string, action: CommunityModerationAction) => {
    if (!adminToken) return;
    setModerationBusyId(postId);
    setError("");
    try {
      const updated = await moderateAdminCommunityPost(postId, action, adminToken);
      setPendingPosts((current) => current.filter((item) => item.id !== postId));
      setApprovedPosts((current) => {
        const next = current.filter((item) => item.id !== postId);
        if (updated.moderationStatus === "approved") {
          return [updated, ...next].slice(0, 40);
        }
        return next;
      });
      setMessage(`Aporte ${getModerationLabel(updated.moderationStatus).toLowerCase()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible moderar el aporte.");
    } finally {
      setModerationBusyId("");
    }
  };

  return (
    <section
      id="admin"
      className="border-t"
      style={{
        borderColor: "rgba(38, 26, 18, 0.12)",
        paddingTop: "clamp(4.5rem, 8vw, 7rem)",
        paddingBottom: "clamp(4.5rem, 8vw, 7rem)",
      }}
    >
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">
        <div
          className="grid gap-6 rounded-[34px] p-6 md:p-8"
          style={{
            background: "rgba(255,255,255,0.82)",
            border: "1px solid rgba(38, 26, 18, 0.12)",
            boxShadow: "0 12px 40px rgba(62, 41, 22, 0.08)",
          }}
        >
          <div>
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck className="h-6 w-6" style={{ color: "#8f2f1c" }} />
              <span className="text-[11px] uppercase tracking-[0.28em]" style={{ color: "#8f2f1c" }}>
                {adminContent.eyebrow}
              </span>
            </div>
            <h2
              className="mb-3 text-3xl font-black"
              style={{ fontFamily: "Fraunces, ui-serif, Georgia, Cambria, \"Times New Roman\", serif" }}
            >
              {adminContent.title}
            </h2>
            <p className="max-w-3xl text-sm leading-7" style={{ color: "rgba(66,52,43,0.78)" }}>
              {adminContent.summary}
            </p>
          </div>

          {!isUnlocked ? (
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <label className="space-y-1">
                <span className="text-sm font-semibold" style={{ color: "rgba(24,18,14,0.88)" }}>
                  {adminContent.tokenLabel}
                </span>
                <input
                  value={inputToken}
                  onChange={(event) => setInputToken(event.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder={adminContent.tokenPlaceholder}
                  autoComplete="off"
                />
                <p className="text-xs" style={{ color: "rgba(66,52,43,0.7)" }}>
                  {adminContent.tokenHelp}
                </p>
              </label>
              <Button type="button" onClick={saveToken} className="rounded-full">
                {adminContent.unlockLabel}
              </Button>
            </div>
          ) : (
            <div className="grid gap-8">
              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="grid gap-5">
                  <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                    <label className="space-y-1">
                      <span className="text-sm font-semibold" style={{ color: "rgba(24,18,14,0.88)" }}>
                        {adminContent.titleFieldLabel}
                      </span>
                      <input
                        value={editing.title}
                        onChange={(event) => setEditing((state) => ({ ...state, title: event.target.value }))}
                        className="w-full rounded-xl border px-3 py-2"
                        maxLength={120}
                        placeholder={adminContent.titlePlaceholder}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm font-semibold" style={{ color: "rgba(24,18,14,0.88)" }}>
                        {adminContent.periodLabel}
                      </span>
                      <select
                        className="w-full rounded-xl border bg-white px-3 py-2"
                        value={editing.periodType}
                        onChange={(event) => setEditing((state) => ({ ...state, periodType: event.target.value as EditionPeriod }))}
                      >
                        <option value="daily">{adminContent.periodDailyLabel}</option>
                        <option value="weekly">{adminContent.periodWeeklyLabel}</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm font-semibold" style={{ color: "rgba(24,18,14,0.88)" }}>
                        {adminContent.periodStartLabel}
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
                      {adminContent.notesLabel}
                    </span>
                    <textarea
                      value={editing.notes}
                      onChange={(event) => setEditing((state) => ({ ...state, notes: event.target.value.slice(0, 900) }))}
                      rows={3}
                      className="w-full rounded-xl border px-3 py-2"
                      maxLength={900}
                      placeholder={adminContent.notesPlaceholder}
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={generateEdition} disabled={loading} className="rounded-full">
                      {loading ? "Guardando..." : adminContent.createLabel}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void loadPanel()} disabled={loading} className="rounded-full">
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      {adminContent.refreshLabel}
                    </Button>
                    <Button type="button" variant="ghost" onClick={clearToken} className="rounded-full">
                      {adminContent.logoutLabel}
                    </Button>
                  </div>
                  <p className="text-xs" style={{ color: "rgba(66,52,43,0.72)" }}>
                    {adminContent.operationalHint}
                  </p>
                </div>

                <div className="rounded-[28px] border p-5" style={{ borderColor: "rgba(38,26,18,0.12)", background: "rgba(255,255,255,0.74)" }}>
                  <div className="mb-4 flex items-center gap-3">
                    <CalendarDays className="h-5 w-5" style={{ color: "#8f2f1c" }} />
                    <h3 className="text-lg font-black" style={{ fontFamily: "Fraunces, ui-serif, Georgia, Cambria, \"Times New Roman\", serif" }}>
                      Ediciones recientes
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {editions.length === 0 ? (
                      <p className="rounded-2xl border border-dashed p-4 text-sm" style={{ color: "rgba(66,52,43,0.74)" }}>
                        {adminContent.emptyEditions}
                      </p>
                    ) : (
                      editions.map((edition) => (
                        <article key={edition.id} className="rounded-[20px] border p-4" style={{ borderColor: "rgba(38,26,18,0.12)", background: "rgba(255,255,255,0.88)" }}>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <h4 className="font-bold" style={{ color: "#18120e" }}>{edition.title}</h4>
                            <Badge style={{ background: "rgba(201,94,42,0.12)", color: "#8f2f1c" }}>
                              {getStatusLabel(edition.status)}
                            </Badge>
                          </div>
                          <p className="text-sm" style={{ color: "rgba(66,52,43,0.78)" }}>{formatDateRange(edition)}</p>
                          {edition.notes && (
                            <p className="mt-2 text-sm leading-6" style={{ color: "rgba(66,52,43,0.82)" }}>
                              {edition.notes}
                            </p>
                          )}
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_0.92fr]">
                <div className="rounded-[28px] border p-5" style={{ borderColor: "rgba(38,26,18,0.12)", background: "rgba(255,255,255,0.74)" }}>
                  <div className="mb-4 flex items-center gap-3">
                    <MessageSquareWarning className="h-5 w-5" style={{ color: "#8f2f1c" }} />
                    <h3 className="text-lg font-black" style={{ fontFamily: "Fraunces, ui-serif, Georgia, Cambria, \"Times New Roman\", serif" }}>
                      {moderationContent.pendingTitle}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {pendingPosts.length === 0 ? (
                      <p className="rounded-2xl border border-dashed p-4 text-sm" style={{ color: "rgba(66,52,43,0.74)" }}>
                        {moderationContent.emptyPending}
                      </p>
                    ) : (
                      pendingPosts.map((post) => (
                        <article key={post.id} className="rounded-[20px] border p-4" style={{ borderColor: "rgba(38,26,18,0.12)", background: "rgba(255,255,255,0.88)" }}>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: "rgba(66,52,43,0.68)" }}>
                            <span className="font-semibold" style={{ color: "#18120e" }}>{post.displayName}</span>
                            <span>{formatDateTime(post.createdAt)}</span>
                          </div>
                          <div className="mb-3 flex flex-wrap gap-2">
                            <Badge style={{ background: "rgba(201,94,42,0.12)", color: "#8f2f1c" }}>{getKindLabel(post.kind)}</Badge>
                            <Badge variant="outline">{getModerationLabel(post.moderationStatus)}</Badge>
                            {post.category && <Badge variant="outline">{post.category}</Badge>}
                          </div>
                          <p className="text-sm leading-6" style={{ color: "rgba(66,52,43,0.82)" }}>{post.content}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              onClick={() => void handleModeration(post.id, "approve")}
                              disabled={moderationBusyId === post.id}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              {moderationContent.approveLabel}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              onClick={() => void handleModeration(post.id, "reject")}
                              disabled={moderationBusyId === post.id}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              {moderationContent.rejectLabel}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="rounded-full"
                              onClick={() => void handleModeration(post.id, "hide")}
                              disabled={moderationBusyId === post.id}
                            >
                              <EyeOff className="mr-2 h-4 w-4" />
                              {moderationContent.hideLabel}
                            </Button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border p-5" style={{ borderColor: "rgba(38,26,18,0.12)", background: "rgba(255,255,255,0.74)" }}>
                  <div className="mb-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5" style={{ color: "#8f2f1c" }} />
                    <h3 className="text-lg font-black" style={{ fontFamily: "Fraunces, ui-serif, Georgia, Cambria, \"Times New Roman\", serif" }}>
                      {moderationContent.approvedTitle}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {approvedPosts.length === 0 ? (
                      <p className="rounded-2xl border border-dashed p-4 text-sm" style={{ color: "rgba(66,52,43,0.74)" }}>
                        No hay aportes aprobados todavía.
                      </p>
                    ) : (
                      approvedPosts.map((post) => (
                        <article key={post.id} className="rounded-[20px] border p-4" style={{ borderColor: "rgba(38,26,18,0.12)", background: "rgba(255,255,255,0.88)" }}>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: "rgba(66,52,43,0.68)" }}>
                            <span className="font-semibold" style={{ color: "#18120e" }}>{post.displayName}</span>
                            <span>{formatDateTime(post.createdAt)}</span>
                          </div>
                          <div className="mb-3 flex flex-wrap gap-2">
                            <Badge style={{ background: "rgba(201,94,42,0.12)", color: "#8f2f1c" }}>{getKindLabel(post.kind)}</Badge>
                            {post.category && <Badge variant="outline">{post.category}</Badge>}
                          </div>
                          <p className="text-sm leading-6" style={{ color: "rgba(66,52,43,0.82)" }}>{post.content}</p>
                          <div className="mt-4">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="rounded-full"
                              onClick={() => void handleModeration(post.id, "hide")}
                              disabled={moderationBusyId === post.id}
                            >
                              <EyeOff className="mr-2 h-4 w-4" />
                              {moderationContent.hideLabel}
                            </Button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {message && <p className="text-sm" style={{ color: "#8f2f1c" }}>{message}</p>}
          {error && <p className="text-sm text-[#b91c1c]">{error}</p>}
        </div>
      </div>
    </section>
  );
}
