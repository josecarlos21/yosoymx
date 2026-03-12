import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  AudioWaveform,
  BarChart3,
  BookOpen,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  Gavel,
  HeartPulse,
  Home,
  Link2,
  MapPin,
  Menu,
  MessageSquareWarning,
  Newspaper,
  Quote,
  Scale,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TrendingUp,
  Users,
  Volume2,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import { MediaGallerySection } from "@/components/media/MediaGallerySection";
import { SharePanel, type SharePanelEvent } from "@/components/social/SharePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCommunityPosts, sanitizeCommunityText, submitCommunityPost, type CommunityPost } from "@/lib/community";
import { webThemeTokens } from "@/lib/design-tokens";
import {
  applyBrandHead,
  fetchCurrentEdition,
  fetchEditionBySlug,
  fetchIssueArchive,
  type PublicIssueSummary,
} from "@/lib/edition-api";
import { fallbackBrandConfig, fallbackIssueContent, mergeBrandConfig, normalizePdfHref } from "@/lib/issue-content";
import {
  buildSharePayload,
  buildShareTrackingEvent,
  buildTikTokSearchUrl,
  buildXHashtagUrl,
  copyTextWithFallback,
  normalizeHashtags,
  normalizeHashtagForQuery,
  SHARE_ARTICLE_ID,
  SHARE_DEFAULT_HASHTAGS,
  SOCIAL_SHARE_EVENTS_FALLBACK_ENDPOINT,
  SOCIAL_TRENDS_ENDPOINT,
  type SharePayload as SharePanelPayload,
} from "@/lib/share-contract";

type PdfDownloadState = {
  status: "idle" | "checking" | "ok" | "missing" | "error";
  message?: string;
  sizeLabel?: string;
};

type CommunityFormState = {
  displayName: string;
  email: string;
  content: string;
  category: string;
  website: string;
};

type CommunityRequestState = {
  kind: "idle" | "success" | "error" | "loading";
  message: string;
};

type FieldValidationErrors = {
  displayName: string;
  email: string;
  content: string;
  category: string;
  website: string;
  submit: string;
};

type CategoryOption = {
  value: string;
  label: string;
};

type SocialTrendResponse = {
  hashtags?: unknown;
  tags?: unknown;
};

type SectionMeta = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type CurrentEditionState = Awaited<ReturnType<typeof fetchCurrentEdition>>;
type EditionRouteState = {
  sectionId: string;
  issueSlug: string | null;
  isArchiveLanding: boolean;
};

const TOKENS = webThemeTokens;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 180;
const MAX_COMMENT_MESSAGE_LENGTH = 1200;
const MAX_CATEGORY_LENGTH = 60;
const MAX_WEBSITE_LENGTH = 120;
const MIN_MESSAGE_LENGTH = 12;
const COMMUNITY_COOLDOWN_SECONDS = 25;
const COMMUNITY_COOLDOWN_STORAGE_KEY = "yosoymx.community.cooldown.v1";
const HISTORY_FILTER_ALL = "todos";
const FORCE_LOCAL_API =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_FORCE_LOCAL_API
    ? String(import.meta.env.VITE_FORCE_LOCAL_API).toLowerCase() === "true"
    : false;

const DEFAULT_SHARE_PAYLOAD = buildSharePayload({
  title: fallbackIssueContent.share.title,
  excerpt: fallbackIssueContent.share.summary,
  hashtags: fallbackIssueContent.share.hashtags,
  canonicalUrl: fallbackIssueContent.metadata.canonicalUrl,
});

const iconMap: Record<string, LucideIcon> = {
  "alert-octagon": AlertOctagon,
  "alert-triangle": AlertTriangle,
  "audio-waveform": AudioWaveform,
  "bar-chart-3": BarChart3,
  "book-open": BookOpen,
  "building-2": Building2,
  camera: Camera,
  "check-circle-2": CheckCircle2,
  gavel: Gavel,
  home: Home,
  "heart-pulse": HeartPulse,
  "link-2": Link2,
  "map-pin": MapPin,
  "message-square-warning": MessageSquareWarning,
  newspaper: Newspaper,
  quote: Quote,
  scale: Scale,
  "scroll-text": ScrollText,
  "shield-alert": ShieldAlert,
  "shield-check": ShieldCheck,
  siren: Siren,
  "trending-up": TrendingUp,
  users: Users,
  "volume-2": Volume2,
  waves: Waves,
};

const desktopSectionIds = new Set(["problema", "contexto", "impacto", "datos", "rutas", "accion", "recursos", "comentarios"]);
const mobileQuickJumpIds = new Set(["problema", "rutas", "recursos", "comentarios"]);

function extractHashtagsFromTrendPayload(rawPayload: SocialTrendResponse | null) {
  if (!rawPayload || typeof rawPayload !== "object") return SHARE_DEFAULT_HASHTAGS;
  const candidate = rawPayload.hashtags ?? rawPayload.tags;
  return normalizeHashtags(Array.isArray(candidate) ? candidate : [], SHARE_DEFAULT_HASHTAGS);
}

function responseHasJsonContentType(response: Response) {
  return response.headers.get("content-type")?.toLowerCase().includes("application/json") === true;
}

function shellStyle() {
  return {
    background: `linear-gradient(180deg, ${TOKENS.color.paper} 0%, ${TOKENS.color.paperAlt} 100%)`,
    color: TOKENS.color.ink,
    fontFamily: TOKENS.font.body,
  } as React.CSSProperties;
}

function paperStyle(dark = false) {
  if (dark) {
    return {
      backgroundColor: TOKENS.color.cacao,
      backgroundImage:
        "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.04), transparent 30%), radial-gradient(circle at 90% 10%, rgba(255,255,255,0.05), transparent 18%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.06))",
      color: TOKENS.color.cream,
    } as React.CSSProperties;
  }
  return {
    backgroundColor: TOKENS.color.paper,
    backgroundImage:
      "radial-gradient(circle at 14% 18%, rgba(143,47,28,0.05), transparent 24%), radial-gradient(circle at 85% 8%, rgba(201,94,42,0.05), transparent 18%), linear-gradient(180deg, rgba(255,255,255,0.26), rgba(0,0,0,0.02))",
  } as React.CSSProperties;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]"
      style={{ background: TOKENS.badgeBg, border: TOKENS.cardBorder, color: TOKENS.color.warm }}
    >
      {children}
    </div>
  );
}

function SourceLink({ href, children, dark = false }: { href: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
      style={{ color: dark ? TOKENS.color.cream : TOKENS.color.warm }}
    >
      {children}
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}

function StoryCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  const Icon = iconMap[icon] ?? Newspaper;
  return (
    <Card
      className="rounded-[28px] border-0 shadow-none transition-transform hover:scale-[1.02]"
      style={{
        background: "rgba(255,250,243,0.84)",
        border: TOKENS.cardBorder,
        boxShadow: TOKENS.shadow.soft,
        backdropFilter: "blur(10px)",
      }}
    >
      <CardContent className="p-6 md:p-7">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(201,94,42,0.12)", color: TOKENS.color.warm }}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mb-2 text-xl font-black" style={{ fontFamily: TOKENS.font.display }}>
          {title}
        </h3>
        <p className="text-sm leading-7" style={{ color: "rgba(66,52,43,0.82)" }}>
          {text}
        </p>
      </CardContent>
    </Card>
  );
}

function MetricBar({ label, value, note, dark = false }: { label: string; value: number; note: string; dark?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span style={{ color: dark ? "rgba(255,250,243,0.92)" : "rgba(24,18,14,0.88)" }}>{label}</span>
        <span style={{ color: dark ? TOKENS.color.sand : TOKENS.color.warm }}>{note}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full" style={{ background: dark ? "rgba(255,255,255,0.1)" : "rgba(24,18,14,0.08)" }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${TOKENS.color.warmAlt}, ${TOKENS.color.warm})` }}
        />
      </div>
    </div>
  );
}

function AuthorityCard({
  icon,
  label,
  title,
  text,
  href,
  meta,
}: {
  icon: string;
  label: string;
  title: string;
  text: string;
  href: string;
  meta: string;
}) {
  const Icon = iconMap[icon] ?? Building2;
  return (
    <Card className="rounded-[30px] border-0 shadow-none transition-all hover:shadow-lg" style={{ background: "rgba(255,255,255,0.66)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(201,94,42,0.12)", color: TOKENS.color.warm }}>
            <Icon className="h-6 w-6" />
          </div>
          <Badge className="rounded-full border-0 shadow-none" style={{ background: "rgba(255,255,255,0.9)", color: TOKENS.color.warm }}>
            {label}
          </Badge>
        </div>
        <h3 className="mb-2 text-xl font-black" style={{ fontFamily: TOKENS.font.display }}>{title}</h3>
        <p className="mb-4 text-sm leading-7" style={{ color: "rgba(66,52,43,0.82)" }}>{text}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs" style={{ color: "rgba(66,52,43,0.65)" }}>{meta}</div>
          <SourceLink href={href}>Abrir</SourceLink>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  number,
  label,
  description,
  trend,
}: {
  number: string;
  label: string;
  description: string;
  trend?: string;
}) {
  return (
    <div className="rounded-[28px] p-6 md:p-7" style={{ background: "rgba(255,255,255,0.72)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
      <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>{label}</div>
      <div className="mb-3 text-4xl font-black md:text-5xl" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>{number}</div>
      <p className="text-sm leading-6" style={{ color: "rgba(66,52,43,0.78)" }}>{description}</p>
      {trend && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium" style={{ color: TOKENS.color.warmAlt }}>
          <TrendingUp className="h-3.5 w-3.5" />
          {trend}
        </div>
      )}
    </div>
  );
}

function formatPostDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "Sin fecha";
  }
}

function EmptyCommunityState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed p-4 text-sm" style={{ borderColor: TOKENS.color.line, color: TOKENS.color.inkSoft }}>
      {text}
    </p>
  );
}

function buildHistoryCategoryOptions(posts: CommunityPost[], allLabel: string): CategoryOption[] {
  const categoriesMap = new Map<string, string>();
  for (const post of posts) {
    const normalized = sanitizeCommunityText(post.category || "").trim();
    if (!normalized) continue;
    const value = normalized.toLowerCase();
    if (!categoriesMap.has(value)) {
      categoriesMap.set(value, normalized);
    }
  }

  return [
    { value: HISTORY_FILTER_ALL, label: allLabel },
    ...Array.from(categoriesMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([value, label]) => ({ value, label })),
  ];
}

function filterByHistoryCategory(posts: CommunityPost[], filterValue: string) {
  if (filterValue === HISTORY_FILTER_ALL) return posts;
  return posts.filter((item) => normalizeCategory(item.category || "").toLowerCase() === filterValue);
}

function normalizeCategory(category: string) {
  const normalized = sanitizeCommunityText(category).trim();
  return normalized.slice(0, MAX_CATEGORY_LENGTH);
}

function buildCooldownDefaults() {
  return { comment: 0, history: 0 } as const;
}

function emptyValidationErrors(): FieldValidationErrors {
  return { displayName: "", email: "", content: "", category: "", website: "", submit: "" };
}

function getCooldownStorageValue() {
  if (typeof window === "undefined") return buildCooldownDefaults();
  try {
    const raw = window.localStorage.getItem(COMMUNITY_COOLDOWN_STORAGE_KEY);
    if (!raw) return buildCooldownDefaults();
    const parsed = JSON.parse(raw);
    const now = Date.now();
    return {
      comment: Number.isFinite(Number(parsed?.comment))
        ? Math.max(0, Math.floor((Number(parsed.comment) - now) / 1000))
        : 0,
      history: Number.isFinite(Number(parsed?.history))
        ? Math.max(0, Math.floor((Number(parsed.history) - now) / 1000))
        : 0,
    };
  } catch {
    return buildCooldownDefaults();
  }
}

function validateCommunityForm(form: CommunityFormState, kind: "comment" | "history") {
  const errors = emptyValidationErrors();
  const displayName = sanitizeCommunityText(form.displayName).slice(0, MAX_NAME_LENGTH).trim();
  const email = sanitizeCommunityText(form.email).slice(0, MAX_EMAIL_LENGTH).trim();
  const content = sanitizeCommunityText(form.content).slice(0, MAX_COMMENT_MESSAGE_LENGTH).trim();
  const category = kind === "history" ? normalizeCategory(form.category) : "";

  if (form.website.trim()) {
    errors.submit = "Envio bloqueado por protección anti-spam.";
  }
  if (!displayName) {
    errors.displayName = "El nombre o alias es obligatorio.";
  } else if (displayName.length < 2) {
    errors.displayName = "Usa al menos 2 caracteres.";
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Correo no válido.";
  }
  if (!content) {
    errors.content = "El mensaje es obligatorio.";
  } else if (content.length < MIN_MESSAGE_LENGTH) {
    errors.content = `Escribe al menos ${MIN_MESSAGE_LENGTH} caracteres para hacerlo útil.`;
  } else if (content.length > MAX_COMMENT_MESSAGE_LENGTH) {
    errors.content = `Máximo ${MAX_COMMENT_MESSAGE_LENGTH} caracteres.`;
  }
  if (kind === "history" && form.category && !category) {
    errors.category = "Tema inválido. Ajusta el texto o déjalo vacío.";
  }

  const hasErrors = Object.values(errors).some(Boolean);
  return { hasErrors, errors, payload: { displayName, email, content, category } };
}

function buildContactMailto(baseEmail: string, topic: string) {
  return `mailto:${baseEmail}?subject=${encodeURIComponent(topic)}`;
}

function resolveEditionRoute(pathname: string): EditionRouteState {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  if (normalizedPath === "/" || normalizedPath === "/gaceta-eje-central") {
    return { sectionId: "portada", issueSlug: null, isArchiveLanding: false };
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments[0] !== "gaceta-eje-central") {
    return { sectionId: "portada", issueSlug: null, isArchiveLanding: false };
  }

  if (segments[1] === "edicion" && typeof segments[2] === "string" && segments[2].trim()) {
    return { sectionId: "portada", issueSlug: segments[2].trim(), isArchiveLanding: false };
  }

  switch (segments[1]) {
    case "inicio":
      return { sectionId: "portada", issueSlug: null, isArchiveLanding: false };
    case "ruta":
      return { sectionId: "rutas", issueSlug: null, isArchiveLanding: false };
    case "biblioteca":
      return { sectionId: "recursos", issueSlug: null, isArchiveLanding: false };
    case "comunidad":
      return { sectionId: "comentarios", issueSlug: null, isArchiveLanding: false };
    case "contacto":
      return { sectionId: "contacto", issueSlug: null, isArchiveLanding: false };
    case "archivo":
      return { sectionId: "archivo", issueSlug: null, isArchiveLanding: true };
    case "recurso":
      return { sectionId: "recursos", issueSlug: null, isArchiveLanding: false };
    default:
      return { sectionId: "portada", issueSlug: null, isArchiveLanding: false };
  }
}

function buildEditionHistoryHref(slug: string, isCurrent: boolean) {
  return isCurrent ? "/gaceta-eje-central" : `/gaceta-eje-central/edicion/${encodeURIComponent(slug)}`;
}

function formatEditionDate(raw: string | null) {
  if (!raw) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(new Date(raw));
  } catch {
    return raw;
  }
}

export default function MicrositioAcosoVecinal2026() {
  const routeState = useMemo(
    () => (typeof window === "undefined" ? { sectionId: "portada", issueSlug: null, isArchiveLanding: false } : resolveEditionRoute(window.location.pathname)),
    []
  );
  const [currentEdition, setCurrentEdition] = useState<CurrentEditionState | null>(null);
  const [brandConfig, setBrandConfig] = useState(fallbackBrandConfig);
  const [issueArchive, setIssueArchive] = useState<PublicIssueSummary[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("portada");
  const [readProgress, setReadProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const isMountedRef = useRef(true);

  const issueContent = currentEdition?.item.contentPayload ?? fallbackIssueContent;
  const canonicalUrl = issueContent.metadata.canonicalUrl;
  const issueNavigation = useMemo(() => issueContent.navigation, [issueContent.navigation]);
  const issuePdfResources = useMemo(() => issueContent.resources.pdfs, [issueContent.resources.pdfs]);
  const mergedBrandConfig = useMemo(
    () => (currentEdition?.item.brandOverrides ? mergeBrandConfig(brandConfig, currentEdition.item.brandOverrides) : brandConfig),
    [brandConfig, currentEdition?.item.brandOverrides]
  );
  const sectionMeta: SectionMeta[] = useMemo(
    () =>
      issueNavigation.map((item) => ({
        ...item,
        icon: iconMap[item.icon] ?? Newspaper,
      })),
    [issueNavigation]
  );
  const desktopSectionMeta = useMemo(() => sectionMeta.filter(({ id }) => desktopSectionIds.has(id)), [sectionMeta]);
  const sidebarSectionMeta = useMemo(() => sectionMeta.filter(({ id }) => id !== "portada"), [sectionMeta]);
  const mobileQuickJumpMeta = useMemo(() => sectionMeta.filter(({ id }) => mobileQuickJumpIds.has(id)), [sectionMeta]);

  const [pdfDownloadState, setPdfDownloadState] = useState<Record<string, PdfDownloadState>>(
    () => Object.fromEntries(issuePdfResources.map((resource) => [resource.id, { status: "idle" }]))
  );
  const [communityLoading, setCommunityLoading] = useState(false);
  const [comments, setComments] = useState<CommunityPost[]>([]);
  const [histories, setHistories] = useState<CommunityPost[]>([]);
  const [commentForm, setCommentForm] = useState<CommunityFormState>({ displayName: "", email: "", content: "", category: "", website: "" });
  const [historyForm, setHistoryForm] = useState<CommunityFormState>({ displayName: "", email: "", content: "", category: "", website: "" });
  const [historyFilter, setHistoryFilter] = useState(HISTORY_FILTER_ALL);
  const [commentSubmitState, setCommentSubmitState] = useState<CommunityRequestState>({ kind: "idle", message: "" });
  const [historySubmitState, setHistorySubmitState] = useState<CommunityRequestState>({ kind: "idle", message: "" });
  const [commentValidationErrors, setCommentValidationErrors] = useState<FieldValidationErrors>(emptyValidationErrors());
  const [historyValidationErrors, setHistoryValidationErrors] = useState<FieldValidationErrors>(emptyValidationErrors());
  const [commentCooldownLeft, setCommentCooldownLeft] = useState(0);
  const [historyCooldownLeft, setHistoryCooldownLeft] = useState(0);
  const [generalCommunityError, setGeneralCommunityError] = useState("");
  const [coverImageError, setCoverImageError] = useState(false);
  const commentStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [sharePayload, setSharePayload] = useState<SharePanelPayload>({
    title: DEFAULT_SHARE_PAYLOAD.title,
    excerpt: DEFAULT_SHARE_PAYLOAD.excerpt,
    url: typeof window === "undefined" ? DEFAULT_SHARE_PAYLOAD.url : window.location.href,
    hashtags: DEFAULT_SHARE_PAYLOAD.hashtags,
  });

  const visibleHashtags = sharePayload.hashtags.length ? sharePayload.hashtags : SHARE_DEFAULT_HASHTAGS;
  const primaryHashtag = visibleHashtags[0] || SHARE_DEFAULT_HASHTAGS[0];
  const analyticsShareEndpoint =
    (import.meta.env.VITE_SHARE_EVENTS_ENDPOINT as string | undefined) ||
    (typeof window !== "undefined" &&
      !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
      ? SOCIAL_SHARE_EVENTS_FALLBACK_ENDPOINT
      : "");
  const shouldSkipLiveSocialTrends =
    !FORCE_LOCAL_API && typeof window !== "undefined" && ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

  useEffect(() => {
    let cancelled = false;

    const loadEdition = async () => {
      const next = routeState.issueSlug ? await fetchEditionBySlug(routeState.issueSlug) : await fetchCurrentEdition();
      if (cancelled) return;
      setCurrentEdition(next);
      setBrandConfig(next.brand);
      applyBrandHead(next.brand, next.item);
    };

    void loadEdition();
    return () => {
      cancelled = true;
    };
  }, [routeState.issueSlug]);

  useEffect(() => {
    let cancelled = false;

    const loadArchive = async () => {
      const next = await fetchIssueArchive(8);
      if (cancelled) return;
      setIssueArchive(next.items);
    };

    void loadArchive();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPdfDownloadState(Object.fromEntries(issuePdfResources.map((resource) => [resource.id, { status: "idle" }])));
  }, [issuePdfResources]);

  useEffect(() => {
    setSharePayload((prev) =>
      buildSharePayload({
        title: prev.title,
        excerpt: prev.excerpt,
        hashtags: prev.hashtags,
        url: window.location.href,
        canonicalUrl,
      })
    );

    const handleVisibilityChange = () => {
      setSharePayload((prev) => {
        if (document.visibilityState === "visible" && prev.url === window.location.href) {
          return prev;
        }
        return buildSharePayload({
          title: prev.title,
          excerpt: prev.excerpt,
          hashtags: prev.hashtags,
          url: window.location.href,
          canonicalUrl,
        });
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [canonicalUrl]);

  useEffect(() => {
    if (shouldSkipLiveSocialTrends) return;

    const controller = new AbortController();
    const { signal } = controller;

    const loadTrends = async () => {
      try {
        const response = await fetch(SOCIAL_TRENDS_ENDPOINT, { signal });
        if (!response.ok || !responseHasJsonContentType(response)) return;
        const payload = (await response.json()) as SocialTrendResponse | null;
        const trendingHashtags = extractHashtagsFromTrendPayload(payload);
        setSharePayload((prev) => {
          const next = buildSharePayload({
            title: prev.title,
            excerpt: prev.excerpt,
            hashtags: trendingHashtags,
            url: prev.url,
            canonicalUrl,
          });
          return next.hashtags.join(",") === prev.hashtags.join(",") ? prev : next;
        });
      } catch {
        // Mantener hashtags curados si falla el endpoint.
      }
    };

    void loadTrends();
    return () => controller.abort();
  }, [canonicalUrl, shouldSkipLiveSocialTrends]);

  const trackShareAction = (event: SharePanelEvent) => {
    const payload = buildShareTrackingEvent(event, sharePayload.url, "social_panel", SHARE_ARTICLE_ID);
    if (!analyticsShareEndpoint || !isMountedRef.current) return;

    try {
      if (typeof navigator.sendBeacon === "function") {
        const body = JSON.stringify(payload);
        const blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon(analyticsShareEndpoint, blob)) {
          return;
        }
      }

      void fetch(analyticsShareEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      // Analítica opcional.
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRafRef.current !== null) return;

      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const totalScroll = document.documentElement.scrollTop;
        const documentHeight = Math.max(1, document.documentElement.scrollHeight - document.documentElement.clientHeight);
        const scroll = Math.max(0, Math.min(1, totalScroll / documentHeight));
        setReadProgress(scroll);
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries.filter((entry) => entry.isIntersecting);
        if (visibleSections.length > 0) {
          visibleSections.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          setActiveSection(visibleSections[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sectionMeta.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.current?.observe(element);
    });

    return () => observer.current?.disconnect();
  }, [sectionMeta]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const targetSection = routeState.sectionId;

    const timeout = window.setTimeout(() => {
      const element = document.getElementById(targetSection);
      if (!element) return;
      element.scrollIntoView({ behavior: "auto", block: "start" });
      setActiveSection(targetSection);
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [issueContent.id, routeState.sectionId]);

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    const result = await copyTextWithFallback(text);
    if (!isMountedRef.current || result.status === "error") return;
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    setCopied(true);
    copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const checkAvailability = async () => {
      setPdfDownloadState((prev) => {
        const next = { ...prev };
        issuePdfResources.forEach((resource) => {
          next[resource.id] = { status: "checking" };
        });
        return next;
      });

      const results = await Promise.all(
        issuePdfResources.map(async (resource) => {
          try {
            const response = await fetch(normalizePdfHref(resource.href), { method: "HEAD", signal });
            if (!response.ok) {
              return { id: resource.id, status: "missing" as const, message: `No disponible (${response.status})` };
            }
            const sizeHeader = response.headers.get("content-length");
            const rawSize = sizeHeader ? Number.parseInt(sizeHeader, 10) : Number.NaN;
            const sizeLabel =
              Number.isFinite(rawSize) && rawSize > 0
                ? `${Math.max(1, Math.round((rawSize / 1024 / 1024) * 10) / 10)} MB`
                : undefined;
            return { id: resource.id, status: "ok" as const, message: "Disponible", sizeLabel };
          } catch {
            if (signal.aborted) return { id: resource.id, status: "checking" as const };
            return { id: resource.id, status: "error" as const, message: "No se pudo verificar la descarga" };
          }
        })
      );

      setPdfDownloadState((prev) => {
        const next = { ...prev };
        results.forEach((result) => {
          if (result.status === "checking") return;
          next[result.id] = { status: result.status, message: result.message };
          if (result.status === "ok" && result.sizeLabel) {
            next[result.id].sizeLabel = result.sizeLabel;
          }
        });
        return next;
      });
    };

    void checkAvailability();
    return () => controller.abort();
  }, [issuePdfResources]);

  const loadCommunity = async () => {
    setCommunityLoading(true);
    setGeneralCommunityError("");
    try {
      const [loadedComments, loadedHistory] = await Promise.all([
        fetchCommunityPosts("comment", 20),
        fetchCommunityPosts("history", 20),
      ]);
      if (!isMountedRef.current) return;
      setComments(loadedComments.filter((item) => item.approved));
      setHistories(loadedHistory.filter((item) => item.approved));
    } catch (error) {
      console.error("Error cargando comunidad", error);
      if (!isMountedRef.current) return;
      setGeneralCommunityError("No pudimos actualizar la comunidad ahora. Mostramos la última versión disponible.");
    } finally {
      if (isMountedRef.current) setCommunityLoading(false);
    }
  };

  useEffect(() => {
    void loadCommunity();
  }, []);

  const setCooldownFromStorage = () => {
    const values = getCooldownStorageValue();
    setCommentCooldownLeft(values.comment);
    setHistoryCooldownLeft(values.history);
  };

  const updateFormText = (
    setter: React.Dispatch<React.SetStateAction<CommunityFormState>>,
    field: keyof CommunityFormState,
    value: string,
    limit: number
  ) => {
    const sanitized = sanitizeCommunityText(value).slice(0, limit);
    setter((prev) => ({ ...prev, [field]: sanitized }));
  };

  const submitForm = async (
    kind: "comment" | "history",
    form: CommunityFormState,
    setForm: React.Dispatch<React.SetStateAction<CommunityFormState>>,
    setSubmitState: React.Dispatch<React.SetStateAction<CommunityRequestState>>
  ) => {
    const setErrors = kind === "comment" ? setCommentValidationErrors : setHistoryValidationErrors;
    const cooldownLeft = kind === "comment" ? commentCooldownLeft : historyCooldownLeft;

    if (cooldownLeft > 0) {
      setSubmitState({ kind: "error", message: `Espera ${cooldownLeft} segundos antes de publicar otro.` });
      return;
    }

    const validation = validateCommunityForm(form, kind);
    if (validation.hasErrors) {
      setErrors(validation.errors);
      setSubmitState({ kind: "error", message: validation.errors.submit || "Revisa los campos marcados." });
      return;
    }
    setErrors(emptyValidationErrors());
    setSubmitState({ kind: "loading", message: "Enviando..." });

    try {
      await submitCommunityPost({
        kind,
        displayName: validation.payload.displayName,
        email: validation.payload.email,
        content: validation.payload.content,
        category: validation.payload.category,
        website: form.website,
      });

      setForm({ displayName: "", email: "", content: "", category: "", website: "" });
      const until = Date.now() + COMMUNITY_COOLDOWN_SECONDS * 1000;
      const current = (() => {
        try {
          const raw = window.localStorage.getItem(COMMUNITY_COOLDOWN_STORAGE_KEY);
          return raw ? (JSON.parse(raw) as { comment?: number; history?: number }) : {};
        } catch {
          return {};
        }
      })();

      if (typeof window !== "undefined") {
        window.localStorage.setItem(COMMUNITY_COOLDOWN_STORAGE_KEY, JSON.stringify({ ...current, [kind]: until }));
      }

      setCooldownFromStorage();
      setSubmitState({
        kind: "success",
        message: kind === "comment" ? issueContent.community.comments.reviewMessage : issueContent.community.history.reviewMessage,
      });
      await loadCommunity();

      const resetTimeout = window.setTimeout(() => {
        if (isMountedRef.current) setSubmitState({ kind: "idle", message: "" });
      }, 2800);
      if (kind === "comment") {
        if (commentStatusTimeoutRef.current) window.clearTimeout(commentStatusTimeoutRef.current);
        commentStatusTimeoutRef.current = resetTimeout;
      } else {
        if (historyStatusTimeoutRef.current) window.clearTimeout(historyStatusTimeoutRef.current);
        historyStatusTimeoutRef.current = resetTimeout;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible enviar. Intenta de nuevo.";
      setSubmitState({ kind: "error", message });
    }
  };

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitForm("comment", commentForm, setCommentForm, setCommentSubmitState);
  };

  const submitHistory = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitForm("history", historyForm, setHistoryForm, setHistorySubmitState);
  };

  const trackHashtagClick = (tag: string, platform: "x" | "tiktok") => {
    trackShareAction({
      action: platform === "x" ? "x" : "tiktok",
      surface: "cover",
      status: "ok",
      message: `hashtag:${normalizeHashtagForQuery(tag)}`,
    });
  };

  const historyCategories = useMemo(
    () => buildHistoryCategoryOptions(histories, issueContent.community.history.allFilterLabel),
    [histories, issueContent.community.history.allFilterLabel]
  );
  const filteredHistories = filterByHistoryCategory(histories, historyFilter);

  useEffect(() => {
    setCoverImageError(false);
  }, [issueContent.metadata.heroImage.src]);

  useEffect(() => {
    isMountedRef.current = true;
    setCooldownFromStorage();
    cooldownIntervalRef.current = window.setInterval(setCooldownFromStorage, 1000);
    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
      if (scrollRafRef.current !== null) window.cancelAnimationFrame(scrollRafRef.current);
      if (commentStatusTimeoutRef.current) window.clearTimeout(commentStatusTimeoutRef.current);
      if (historyStatusTimeoutRef.current) window.clearTimeout(historyStatusTimeoutRef.current);
      if (cooldownIntervalRef.current) window.clearInterval(cooldownIntervalRef.current);
    };
  }, []);

  const downloadPdf = async (resource: (typeof issuePdfResources)[number]) => {
    const state = pdfDownloadState[resource.id];
    const href = new URL(normalizePdfHref(resource.href), window.location.origin).toString();
    const anchorProbe = document.createElement("a");
    const supportsDownload = "download" in anchorProbe;

    if (state?.status === "missing" || state?.status === "error") {
      window.open(href, "_blank", "noopener");
      return;
    }

    try {
      if (state?.status !== "ok") {
        const response = await fetch(href, { method: "HEAD" });
        if (!response.ok) {
          setPdfDownloadState((prev) => ({
            ...prev,
            [resource.id]: { status: "missing", message: `No disponible (${response.status})` },
          }));
          window.open(href, "_blank", "noopener");
          return;
        }
      }

      const link = document.createElement("a");
      link.href = href;
      if (supportsDownload) {
        link.download = resource.fileName;
      }
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setPdfDownloadState((prev) => ({ ...prev, [resource.id]: { status: "ok", message: "Descarga iniciada." } }));
    } catch (error) {
      console.error("Error descargando PDF", error);
      setPdfDownloadState((prev) => ({
        ...prev,
        [resource.id]: { status: "error", message: "No se pudo iniciar la descarga automática. Abre el documento en pestaña nueva." },
      }));
      window.open(href, "_blank", "noopener");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen" style={shellStyle()}>
      <style>{`
        html { scroll-behavior: smooth; }
        * { box-sizing: border-box; }
        ::selection { background: rgba(201,94,42,.18); }
        .print-anchor { display: inline-flex; align-items: center; }
      `}</style>

      <nav className="fixed left-0 right-0 top-0 z-50 border-b" style={{ background: "rgba(246,239,227,0.97)", borderColor: TOKENS.color.line, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        <div className="absolute left-0 top-0 z-50 h-[3px] bg-gradient-to-r from-[#c95e2a] to-[#8f2f1c]" style={{ width: `${readProgress * 100}%`, transition: "width 0.1s ease-out" }} />
        <div className="mx-auto max-w-[1440px] px-4 md:px-6">
          <div className="flex h-14 items-center justify-between">
            <button onClick={() => scrollToSection("portada")} className="whitespace-nowrap text-base font-black tracking-tight" style={{ fontFamily: TOKENS.font.display }}>
              <span style={{ color: TOKENS.color.ink }}>{mergedBrandConfig.siteName} </span>
              <span style={{ color: TOKENS.color.warm }}>
                Eje Central <sup className="text-[10px] opacity-70">v{issueContent.metadata.version}</sup>
              </span>
            </button>

            <div className="hidden items-center gap-0.5 lg:flex">
              {desktopSectionMeta.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-all"
                  style={{
                    color: activeSection === id ? TOKENS.color.warm : TOKENS.color.inkSoft,
                    background: activeSection === id ? "rgba(201,94,42,0.1)" : "transparent",
                  }}
                >
                  {label}
                </button>
              ))}
              <button onClick={handlePrint} className="print-hide ml-2 flex flex-col items-center justify-center rounded-full p-2 transition-colors hover:bg-black/5" style={{ color: TOKENS.color.warm }} title="Imprimir o Guardar PDF">
                <Download className="h-5 w-5" />
              </button>
            </div>

            <button className="rounded-full p-2 lg:hidden" onClick={() => setMobileMenuOpen((current) => !current)} style={{ color: TOKENS.color.ink }}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t lg:hidden"
              style={{ background: TOKENS.color.paper, borderColor: TOKENS.color.line }}
            >
              <div className="space-y-1 px-4 py-4">
                {sidebarSectionMeta.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => scrollToSection(id)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left" style={{ color: TOKENS.color.ink }}>
                    <Icon className="h-5 w-5" style={{ color: TOKENS.color.warm }} />
                    {label}
                  </button>
                ))}
                <button onClick={handlePrint} className="print-hide mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left" style={{ color: TOKENS.color.ink }}>
                  <Download className="h-5 w-5" />
                  <span>Imprimir página</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <header className="pt-16" style={{ ...paperStyle(false), borderBottom: `1px solid ${TOKENS.color.line}` }}>
        <div className="mx-auto max-w-[1440px] px-4 pt-8 md:px-6 md:pt-12">
          <div className="grid gap-3 border-y py-3 md:grid-cols-3" style={{ borderColor: TOKENS.color.line }}>
            <div className="text-[11px] uppercase tracking-[0.32em]" style={{ color: TOKENS.color.inkSoft }}>
              {issueContent.metadata.location} · {issueContent.metadata.editionLabel}
            </div>
            <div className="text-center text-[11px] uppercase tracking-[0.34em]" style={{ color: TOKENS.color.warm }}>
              {issueContent.metadata.articleLabel}
            </div>
            <div className="text-left text-[11px] uppercase tracking-[0.32em] md:text-right" style={{ color: TOKENS.color.inkSoft }}>
              {issueContent.metadata.publishedDisplay}
            </div>
          </div>

          <div className="grid gap-4 py-8 md:grid-cols-[0.24fr_0.52fr_0.24fr] md:items-end">
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Fechado</div>
              <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                {issueContent.metadata.location} · {issueContent.metadata.publishedDisplay}
              </p>
            </div>

            <div className="text-center">
              <div className="text-[13px] uppercase tracking-[0.45em]" style={{ color: TOKENS.color.warm, fontFamily: TOKENS.font.body }}>
                {issueContent.metadata.editionLabel}
              </div>
              <div className="mt-2 text-[clamp(2.4rem,5.6vw,5.2rem)] font-black leading-none tracking-tight" style={{ fontFamily: TOKENS.font.display }}>
                <span style={{ color: TOKENS.color.ink }}>{mergedBrandConfig.siteName} </span>
                <span style={{ color: TOKENS.color.warm }}>Eje Central</span>
              </div>
              <div className="mt-2 text-[13px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.inkSoft }}>
                {issueContent.metadata.coverThemeLine}
              </div>
            </div>

            <div className="space-y-2 md:text-right">
              <div className="text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>
                {issueContent.metadata.topicLabel}
              </div>
              <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                {issueContent.metadata.topicValue}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-[1440px] px-4 pb-6 md:px-6">
          <SharePanel
            surface="header"
            sharePayload={sharePayload}
            summaryText={issueContent.share.summary}
            compact
            className="rounded-[20px] border bg-white/84 p-4 shadow-sm"
            onAction={trackShareAction}
          />
        </div>
      </header>

      <main className="print-document">
        <section id="portada" style={{ ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="grid gap-8 xl:grid-cols-[1.12fr_0.88fr]">
              <div className="space-y-6">
                <div className="rounded-[20px] border bg-white/82 p-5 md:p-8" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                  <Eyebrow>{issueContent.cover.eyebrow}</Eyebrow>
                  <h1 className="mt-4 max-w-5xl font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2.5rem, 5vw, 4.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}>
                    {issueContent.cover.title}
                    <span className="mt-2 block" style={{ color: TOKENS.color.warm }}>
                      {issueContent.cover.titleAccent}
                    </span>
                  </h1>
                  <p className="mt-6 max-w-4xl text-lg leading-8 md:text-xl" style={{ fontFamily: TOKENS.font.editorial, color: "rgba(24,18,14,0.92)" }}>
                    {issueContent.cover.summary}
                  </p>

                  {currentEdition?.item.status === "archived" ? (
                    <div
                      className="mt-5 inline-flex max-w-3xl items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
                      style={{ borderColor: TOKENS.color.line, background: "rgba(255,250,243,0.92)", color: TOKENS.color.warm }}
                    >
                      <Archive className="h-4 w-4" />
                      Archivo editorial: esta edición sigue disponible con enlace estable.
                    </div>
                  ) : null}

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {issueContent.cover.quickFacts.map((item) => (
                      <div key={item.title} className="rounded-[18px] border bg-[#fffaf3] p-4" style={{ borderColor: TOKENS.color.line }}>
                        <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>{item.title}</div>
                        <p className="text-sm leading-6" style={{ color: TOKENS.color.inkSoft }}>{item.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 md:hidden">
                    <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>
                      Ruta rápida
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {mobileQuickJumpMeta.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => scrollToSection(id)}
                          className="flex items-center gap-2 rounded-[16px] border px-3 py-3 text-left text-sm font-medium"
                          style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.82)", color: TOKENS.color.ink }}
                        >
                          <Icon className="h-4 w-4" style={{ color: TOKENS.color.warm }} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <figure className="mt-6 overflow-hidden rounded-[20px] border" style={{ borderColor: TOKENS.color.line }}>
                    {coverImageError ? (
                      <div className="flex h-72 w-full items-center justify-center bg-white/92 text-sm" style={{ color: TOKENS.color.inkSoft }}>
                        Imagen de portada pendiente
                      </div>
                    ) : (
                      <img
                        src={issueContent.metadata.heroImage.src}
                        alt={issueContent.metadata.heroImage.alt}
                        loading="eager"
                        className="h-72 w-full object-cover"
                        onError={() => setCoverImageError(true)}
                      />
                    )}
                    <figcaption className="p-3 text-xs" style={{ color: TOKENS.color.inkSoft, background: "rgba(255,255,255,0.92)" }}>
                      {issueContent.metadata.heroImage.caption}
                    </figcaption>
                  </figure>
                </div>

                <div className="rounded-[20px] border bg-white/82 p-5 md:p-6" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                  <div className="mb-3 flex items-center gap-3">
                    <Quote className="h-5 w-5" style={{ color: TOKENS.color.warm }} />
                    <div className="text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Lead editorial</div>
                  </div>
                  <p className="text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                    {issueContent.cover.leadEditorial}
                  </p>

                  <div className="mt-6 rounded-[22px] border bg-white/84 p-5 md:p-6" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>
                          {issueContent.cover.campaign.kicker}
                        </div>
                        <h3 className="mt-2 text-xl font-black" style={{ fontFamily: TOKENS.font.display }}>
                          {issueContent.cover.campaign.title}
                        </h3>
                      </div>
                      <Badge className="rounded-full border-0 shadow-none" style={{ background: "rgba(201,94,42,0.12)", color: TOKENS.color.warm }}>
                        {issueContent.cover.campaign.badge}
                      </Badge>
                    </div>
                    <div className="mb-4 flex flex-wrap gap-2 text-sm">
                      {visibleHashtags.map((tag) => (
                        <a
                          key={tag}
                          href={buildXHashtagUrl(tag)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => trackHashtagClick(tag, "x")}
                          className="rounded-full border px-4 py-1.5 transition hover:bg-white"
                          style={{ borderColor: TOKENS.color.line, color: TOKENS.color.warm }}
                        >
                          #{normalizeHashtagForQuery(tag)}
                        </a>
                      ))}
                    </div>
                    <div className="mb-4 rounded-[16px] border p-4" style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.55)" }}>
                      <div className="text-xs uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>
                        {issueContent.share.reelGuide.title}
                      </div>
                      <ol className="mt-2 list-decimal pl-5 text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>
                        {issueContent.share.reelGuide.shots.map((shot) => (
                          <li key={shot}>{shot}</li>
                        ))}
                      </ol>
                      <p className="mt-3 text-sm font-semibold" style={{ color: TOKENS.color.warm }}>
                        {issueContent.share.reelGuide.cta}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button variant="outline" size="sm" className="justify-start" onClick={() => copyToClipboard(issueContent.share.quote)}>
                        <Quote className="h-4 w-4" />
                        <span className="ml-2">{issueContent.cover.campaign.copyQuoteLabel}</span>
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start" onClick={() => copyToClipboard(`Guion 15s: ${issueContent.share.reelGuide.shots.join(" | ")}`)}>
                        <ExternalLink className="h-4 w-4" />
                        <span className="ml-2">{issueContent.cover.campaign.copyReelLabel}</span>
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <a
                        href={buildTikTokSearchUrl(primaryHashtag)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 underline underline-offset-4"
                        style={{ color: TOKENS.color.ink }}
                        onClick={() => trackHashtagClick(primaryHashtag, "tiktok")}
                      >
                        {issueContent.cover.campaign.openTikTokLabel}
                      </a>
                      <a
                        href={buildXHashtagUrl(primaryHashtag)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 underline underline-offset-4"
                        style={{ color: TOKENS.color.ink }}
                        onClick={() => trackHashtagClick(primaryHashtag, "x")}
                      >
                        {issueContent.cover.campaign.openXLabel}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="grid gap-4">
                <div className="rounded-[20px] border p-5 md:p-6" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream, borderColor: "rgba(255,255,255,0.08)", boxShadow: TOKENS.shadow.deep }}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <Volume2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.color.sand }}>
                        {issueContent.cover.damageMap.title}
                      </div>
                      <div className="text-xs" style={{ color: "rgba(255,250,243,0.68)" }}>{issueContent.cover.damageMap.subtitle}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {issueContent.cover.damageMap.metrics.map((metric) => (
                      <MetricBar key={metric.label} label={metric.label} value={metric.value} note={metric.note} dark />
                    ))}
                  </div>
                </div>

                <div className="rounded-[20px] border bg-white/82 p-5 md:p-6" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                  <div className="mb-4 flex items-center gap-3">
                    <BarChart3 className="h-5 w-5" style={{ color: TOKENS.color.warm }} />
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>
                      {issueContent.cover.keyFigures.title}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {issueContent.cover.keyFigures.items.map((item, index) => (
                      <div key={item.label} className={`flex items-center justify-between py-2 ${index < issueContent.cover.keyFigures.items.length - 1 ? "border-b" : ""}`} style={{ borderColor: TOKENS.color.line }}>
                        <span className="text-sm" style={{ color: TOKENS.color.inkSoft }}>{item.label}</span>
                        <span className="font-bold" style={{ color: TOKENS.color.warm }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[20px] border bg-white/82 p-5" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                  <div className="mb-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>
                    {issueContent.cover.sidebarLabel}
                  </div>
                  <div className="grid gap-2">
                    {sidebarSectionMeta.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => scrollToSection(id)}
                        className="flex items-center justify-between rounded-[14px] border px-4 py-3 text-left text-sm transition-all hover:bg-white"
                        style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.9)", color: TOKENS.color.inkSoft }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Icon className="h-4 w-4" style={{ color: TOKENS.color.warm }} />
                          {label}
                        </span>
                        <ChevronRight className="h-4 w-4" style={{ color: TOKENS.color.warm }} />
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section id="problema" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>{issueContent.problem.eyebrow}</Eyebrow>
              <h2 className="mt-4 font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}>
                {issueContent.problem.title}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                {issueContent.problem.summary}
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {issueContent.problem.cards.map((item) => (
                <StoryCard key={item.title} {...item} />
              ))}
            </div>

            <div className="mt-10 overflow-hidden rounded-[34px]" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream, boxShadow: TOKENS.shadow.deep }}>
              <div className="p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <AudioWaveform className="h-6 w-6" style={{ color: TOKENS.color.sand }} />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.sand }}>
                    {issueContent.problem.timeline.title}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-5">
                  {issueContent.problem.timeline.steps.map((item, index) => (
                    <motion.div key={item.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="relative">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black" style={{ background: TOKENS.color.warm, color: TOKENS.color.cream }}>
                          {index + 1}
                        </div>
                        {index < issueContent.problem.timeline.steps.length - 1 && (
                          <ChevronRight className="hidden h-4 w-4 md:block" style={{ color: TOKENS.color.sand }} />
                        )}
                      </div>
                      <h4 className="mb-1 font-bold" style={{ color: TOKENS.color.cream }}>{item.step}</h4>
                      <p className="mb-1 text-sm font-medium leading-5" style={{ color: TOKENS.color.sand }}>{item.desc}</p>
                      <p className="text-xs leading-5" style={{ color: "rgba(255,250,243,0.6)" }}>{item.detail}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="contexto" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>{issueContent.context.eyebrow}</Eyebrow>
              <h2 className="mt-4 font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}>
                {issueContent.context.title}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                {issueContent.context.summary}
              </p>
            </div>

            <div className="mb-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {issueContent.context.statCards.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[34px] p-6 md:p-8" style={{ background: "rgba(255,255,255,0.72)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                <div className="mb-4 flex items-center gap-3">
                  <MapPin className="h-5 w-5" style={{ color: TOKENS.color.warm }} />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>
                    {issueContent.context.affectedColonies.title}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {issueContent.context.affectedColonies.items.map((colony) => (
                    <div key={colony.name} className="rounded-[18px] border p-4" style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.9)" }}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-bold" style={{ color: TOKENS.color.ink }}>{colony.name}</span>
                        <Badge style={{ background: "rgba(201,94,42,0.1)", color: TOKENS.color.warm }}>{colony.district}</Badge>
                      </div>
                      <p className="text-sm leading-5" style={{ color: TOKENS.color.inkSoft }}>{colony.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[34px] p-6 md:p-8" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream, boxShadow: TOKENS.shadow.deep }}>
                <div className="mb-4 flex items-center gap-3">
                  <Users className="h-5 w-5" style={{ color: TOKENS.color.sand }} />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.sand }}>
                    {issueContent.context.protests.title}
                  </div>
                </div>
                <div className="space-y-4 text-sm leading-7" style={{ color: "rgba(255,250,243,0.84)" }}>
                  {issueContent.context.protests.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  <div className="mt-4 rounded-[18px] p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="mb-2 font-semibold" style={{ color: TOKENS.color.sand }}>{issueContent.context.protests.quoteSource}</div>
                    <p className="italic">{issueContent.context.protests.quote}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="impacto" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(true), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>{issueContent.impact.eyebrow}</Eyebrow>
              <h2 className="mt-4 font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.cream }}>
                {issueContent.impact.title}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: "rgba(255,250,243,0.78)", fontFamily: TOKENS.font.editorial }}>
                {issueContent.impact.summary}
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="rounded-[34px] border-0 bg-white/5 shadow-none">
                <CardHeader>
                  <CardTitle className="text-3xl" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.cream }}>
                    {issueContent.impact.documentedEffectsTitle}
                  </CardTitle>
                  <CardDescription style={{ color: "rgba(255,250,243,0.68)" }}>
                    {issueContent.impact.documentedEffectsSubtitle}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {issueContent.impact.effects.map((effect, index) => (
                    <motion.div
                      key={effect}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 rounded-2xl border px-4 py-3"
                      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
                    >
                      <CheckCircle2 className="h-5 w-5" style={{ color: TOKENS.color.sand }} />
                      <span className="text-sm" style={{ color: "rgba(255,250,243,0.86)" }}>{effect}</span>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              <div className="rounded-[34px] p-6 md:p-8" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="mb-6 flex items-center gap-3" style={{ color: TOKENS.color.sand }}>
                  <HeartPulse className="h-6 w-6" />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.26em]">
                    {issueContent.impact.clinicalNote.title}
                  </div>
                </div>
                <div className="space-y-5 text-sm leading-8" style={{ color: "rgba(255,250,243,0.84)" }}>
                  {issueContent.impact.clinicalNote.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  <div className="rounded-[28px] p-5" style={{ background: "rgba(201,94,42,0.15)", border: "1px solid rgba(201,94,42,0.25)" }}>
                    <div className="mb-3 flex items-center gap-2 font-semibold">
                      <AlertOctagon className="h-5 w-5" />
                      {issueContent.impact.clinicalNote.criticalTitle}
                    </div>
                    <p className="text-sm leading-7" style={{ color: "rgba(255,243,234,0.9)" }}>
                      {issueContent.impact.clinicalNote.criticalText}
                    </p>
                  </div>
                  <SourceLink href={issueContent.impact.clinicalNote.sourceHref} dark>
                    {issueContent.impact.clinicalNote.sourceLabel}
                  </SourceLink>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="datos" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>{issueContent.data.eyebrow}</Eyebrow>
              <h2 className="mt-4 font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}>
                {issueContent.data.title}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                {issueContent.data.summary}
              </p>
            </div>

            <div className="mb-10 grid gap-6 xl:grid-cols-2">
              <div className="rounded-[34px] p-6 md:p-8" style={{ background: "rgba(255,255,255,0.72)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                <div className="mb-6 flex items-center gap-3">
                  <Gavel className="h-6 w-6" style={{ color: TOKENS.color.warm }} />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>
                    {issueContent.data.legalFrame.title}
                  </div>
                </div>
                <div className="space-y-4">
                  {issueContent.data.legalFrame.items.map((item) => (
                    <div key={item.title} className="rounded-[18px] border p-4" style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.9)" }}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-bold" style={{ color: TOKENS.color.ink }}>{item.title}</span>
                        <Badge style={{ background: "rgba(201,94,42,0.1)", color: TOKENS.color.warm }}>{item.badge}</Badge>
                      </div>
                      <p className="text-sm leading-6" style={{ color: TOKENS.color.inkSoft }}>{item.text}</p>
                      {item.sanction && (
                        <div className="mt-2 text-sm font-medium" style={{ color: TOKENS.color.warm }}>
                          {item.sanction}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[34px] p-6 md:p-8" style={{ background: "rgba(255,255,255,0.72)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                <div className="mb-6 flex items-center gap-3">
                  <Volume2 className="h-6 w-6" style={{ color: TOKENS.color.warm }} />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>
                    {issueContent.data.noiseLimits.title}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 rounded-[18px] p-4" style={{ background: "rgba(201,94,42,0.08)" }}>
                    {issueContent.data.noiseLimits.grid.map((item) => (
                      <div key={`${item.value}-${item.label}`} className="text-center">
                        <div className="text-2xl font-black" style={{ color: TOKENS.color.warm }}>{item.value}</div>
                        <div className="mt-1 text-xs" style={{ color: TOKENS.color.inkSoft }}>
                          {item.label}
                          <br />
                          {item.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm leading-6" style={{ color: TOKENS.color.inkSoft }}>
                    {issueContent.data.noiseLimits.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="mb-3 last:mb-0">{paragraph}</p>
                    ))}
                  </div>
                  <div className="rounded-[18px] p-4" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream }}>
                    <div className="mb-2 text-sm font-semibold" style={{ color: TOKENS.color.sand }}>
                      {issueContent.data.noiseLimits.highlightTitle}
                    </div>
                    <p className="text-sm leading-6">{issueContent.data.noiseLimits.highlightText}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="rutas" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>{issueContent.routes.eyebrow}</Eyebrow>
              <h2 className="mt-4 font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}>
                {issueContent.routes.title}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                {issueContent.routes.summary}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {issueContent.routes.authorities.map((item) => (
                <AuthorityCard key={item.title} {...item} />
              ))}
            </div>

            <div className="mt-10 rounded-[34px] p-6 md:p-8" style={{ background: "rgba(255,255,255,0.72)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
              <div className="mb-6 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6" style={{ color: TOKENS.color.warm }} />
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>
                  {issueContent.routes.evidenceChecklist.title}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {issueContent.routes.evidenceChecklist.items.map((item, index) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.9)", border: TOKENS.cardBorder }}>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: TOKENS.color.warm, color: TOKENS.color.cream }}>
                      {index + 1}
                    </div>
                    <span className="text-sm leading-6" style={{ color: TOKENS.color.inkSoft }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="accion" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>{issueContent.action.eyebrow}</Eyebrow>
              <h2 className="mt-4 font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}>
                {issueContent.action.title}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                {issueContent.action.summary}
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
              <div className="grid gap-6">
                <div className="rounded-[34px] p-6 md:p-8" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream, boxShadow: TOKENS.shadow.deep }}>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <ScrollText className="h-6 w-6" />
                  </div>
                  <h3 className="mb-3 text-2xl font-black" style={{ fontFamily: TOKENS.font.display }}>
                    {issueContent.action.howToUse.title}
                  </h3>
                  <div className="space-y-3 text-sm leading-7" style={{ color: "rgba(255,250,243,0.84)" }}>
                    {issueContent.action.howToUse.steps.map((step) => (
                      <p key={step}>{step}</p>
                    ))}
                  </div>
                </div>

                <div className="rounded-[34px] p-6" style={{ background: "rgba(255,255,255,0.74)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                  <div className="mb-3 flex items-center gap-3" style={{ color: TOKENS.color.warm }}>
                    <MessageSquareWarning className="h-5 w-5" />
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em]">
                      {issueContent.action.recommendation.title}
                    </div>
                  </div>
                  <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>
                    {issueContent.action.recommendation.text}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-[36px]" style={{ background: "rgba(255,255,255,0.84)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.lift }}>
                <div className="flex items-center justify-between border-b px-6 py-4 md:px-8" style={{ borderColor: TOKENS.color.line }}>
                  <div className="text-[11px] uppercase tracking-[0.3em]" style={{ color: TOKENS.color.warm }}>
                    {issueContent.action.documentTitle}
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => copyToClipboard(issueContent.action.draft)}>
                    <FileText className="mr-2 h-3.5 w-3.5" />
                    {issueContent.action.copyLabel}
                    {copied && <span className="ml-2 font-semibold" style={{ color: TOKENS.color.warmAlt }}>· Copiado</span>}
                  </Button>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap p-6 text-sm leading-7 md:p-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                  {issueContent.action.draft}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section id="fuentes" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>{issueContent.sources.eyebrow}</Eyebrow>
              <h2 className="mt-4 font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}>
                {issueContent.sources.title}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                {issueContent.sources.summary}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {issueContent.sources.items.map((source) => (
                <div key={source.title} className="rounded-[28px] p-5" style={{ background: "rgba(255,255,255,0.66)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Badge className="rounded-full border-0 shadow-none" style={{ background: "rgba(255,255,255,0.9)", color: TOKENS.color.warm }}>
                      {source.group}
                    </Badge>
                    <Link2 className="h-4 w-4" style={{ color: TOKENS.color.warm }} />
                  </div>
                  <h3 className="mb-2 text-lg font-black" style={{ fontFamily: TOKENS.font.display }}>{source.title}</h3>
                  <p className="mb-4 text-sm leading-6" style={{ color: "rgba(66,52,43,0.8)" }}>{source.note}</p>
                  <SourceLink href={source.href}>Consultar fuente</SourceLink>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: TOKENS.color.mist, ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="rounded-[40px] p-6 md:p-10" style={{ background: "rgba(255,255,255,0.82)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.lift }}>
              <div className="mb-6 flex items-center gap-3" style={{ color: TOKENS.color.warm }}>
                <Quote className="h-8 w-8" />
                <div>
                  <h3 className="text-2xl font-black" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>
                    {issueContent.closing.title}
                  </h3>
                  <p className="text-sm" style={{ color: "rgba(66,52,43,0.6)" }}>{issueContent.closing.subtitle}</p>
                </div>
              </div>
              <blockquote className="rounded-[28px] p-6 md:p-8" style={{ background: TOKENS.color.cream, borderLeft: `5px solid ${TOKENS.color.warm}`, fontFamily: TOKENS.font.editorial, color: TOKENS.color.ink }}>
                <div className="text-xl font-semibold leading-9 md:text-2xl md:leading-[1.5]">
                  {issueContent.share.quote}
                </div>
              </blockquote>
              <div className="mt-8 flex flex-wrap gap-3">
                {visibleHashtags.map((tag) => (
                  <a
                    key={tag}
                    href={buildXHashtagUrl(tag)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackHashtagClick(tag, "x")}
                    className="rounded-full px-4 py-2 text-sm underline underline-offset-2 transition hover:opacity-80"
                    style={{ background: "rgba(201,94,42,0.1)", color: TOKENS.color.warm }}
                  >
                    #{normalizeHashtagForQuery(tag)}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="mx-auto max-w-[1440px] px-4 py-20 md:px-6 lg:py-32">
          <header className="mb-12">
            <div className="mb-6 inline-flex" style={{ color: TOKENS.color.warm, letterSpacing: "0.12em" }}>
              <span className="text-sm font-semibold uppercase">{issueContent.resources.eyebrow}</span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black leading-none tracking-tight md:max-w-3xl" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>
              {issueContent.resources.title}
            </h2>
            <p className="mt-6 max-w-2xl text-lg md:text-xl" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
              {issueContent.resources.summary}
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {issuePdfResources.map((resource) => (
              <a
                key={resource.id}
                href={normalizePdfHref(resource.href)}
                download={resource.fileName}
                onClick={(event) => {
                  event.preventDefault();
                  void downloadPdf(resource);
                }}
                className="print-anchor print-avoid group flex flex-col rounded-3xl bg-white p-8 text-left transition-all hover:-translate-y-1 hover:shadow-xl"
                rel="noopener"
                aria-label={`Descargar ${resource.title}`}
                style={{ boxShadow: TOKENS.shadow.soft }}
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(201,94,42,0.1)", color: TOKENS.color.warm }}>
                  <FileDown size={28} />
                </div>
                <h3 className="mb-3 text-xl font-bold" style={{ color: TOKENS.color.ink }}>{resource.title}</h3>
                <p className="mb-6 flex-1 text-sm leading-relaxed" style={{ color: TOKENS.color.inkSoft }}>{resource.description}</p>
                <div className="mt-auto flex items-center font-semibold" style={{ color: TOKENS.color.warm }}>
                  <span>Descargar PDF</span>
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
                {pdfDownloadState[resource.id]?.message && (
                  <p className="mt-4 text-xs" style={{ color: TOKENS.color.inkSoft }}>
                    {pdfDownloadState[resource.id]?.message}
                    {pdfDownloadState[resource.id]?.sizeLabel ? ` · ${pdfDownloadState[resource.id]?.sizeLabel}` : ""}
                  </p>
                )}
              </a>
            ))}
          </div>
        </section>

        <MediaGallerySection gallery={issueContent.gallery} />

        <section id="comentarios" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>{issueContent.community.comments.eyebrow}</Eyebrow>
              <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>
                {issueContent.community.comments.title}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                {issueContent.community.comments.summary}
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <form onSubmit={submitComment} className="print-hide-form rounded-[32px] border p-6 md:p-7" style={{ background: "rgba(255,255,255,0.82)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                <h3 className="mb-4 text-xl font-black" style={{ fontFamily: TOKENS.font.display }}>
                  {issueContent.community.comments.formTitle}
                </h3>
                <p className="mb-4 text-sm" style={{ color: TOKENS.color.inkSoft }}>
                  {issueContent.community.comments.formIntro}
                </p>
                <div className="mb-4 rounded-[20px] border p-4" style={{ borderColor: TOKENS.color.line, background: "rgba(255,250,243,0.86)" }}>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>
                    Envío abierto
                  </div>
                  <p className="text-sm leading-6" style={{ color: TOKENS.color.inkSoft }}>
                    {issueContent.community.comments.fallbackSocialAuth}
                  </p>
                </div>

                <div className="grid gap-4">
                  <label className="space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>
                        {issueContent.community.comments.nameLabel}
                      </span>
                      <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>{commentForm.displayName.length}/{MAX_NAME_LENGTH}</span>
                    </div>
                    <input
                      value={commentForm.displayName}
                      onChange={(event) => updateFormText(setCommentForm, "displayName", event.target.value, MAX_NAME_LENGTH)}
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder={issueContent.community.comments.namePlaceholder}
                      maxLength={MAX_NAME_LENGTH}
                      required
                    />
                    {commentValidationErrors.displayName && <span className="text-xs text-[#b91c1c]">{commentValidationErrors.displayName}</span>}
                  </label>

                  <label className="space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>
                        {issueContent.community.comments.emailLabel}
                      </span>
                      <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>{commentForm.email.length}/{MAX_EMAIL_LENGTH}</span>
                    </div>
                    <input
                      value={commentForm.email}
                      onChange={(event) => updateFormText(setCommentForm, "email", event.target.value, MAX_EMAIL_LENGTH)}
                      type="email"
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder={issueContent.community.comments.emailPlaceholder}
                      maxLength={MAX_EMAIL_LENGTH}
                    />
                    {commentValidationErrors.email && <span className="text-xs text-[#b91c1c]">{commentValidationErrors.email}</span>}
                  </label>

                  <div className="sr-only">
                    <input
                      aria-hidden="true"
                      tabIndex={-1}
                      autoComplete="off"
                      placeholder="No completar"
                      value={commentForm.website}
                      onChange={(event) => updateFormText(setCommentForm, "website", event.target.value, MAX_WEBSITE_LENGTH)}
                      className="rounded-xl border px-3 py-2"
                    />
                  </div>

                  <label className="space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>
                        {issueContent.community.comments.messageLabel}
                      </span>
                      <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>{commentForm.content.length}/{MAX_COMMENT_MESSAGE_LENGTH}</span>
                    </div>
                    <textarea
                      value={commentForm.content}
                      onChange={(event) => updateFormText(setCommentForm, "content", event.target.value, MAX_COMMENT_MESSAGE_LENGTH)}
                      rows={5}
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder={issueContent.community.comments.messagePlaceholder}
                      maxLength={MAX_COMMENT_MESSAGE_LENGTH}
                      required
                    />
                    {commentValidationErrors.content && <span className="text-xs text-[#b91c1c]">{commentValidationErrors.content}</span>}
                  </label>

                  <Button type="submit" className="w-full rounded-full" disabled={commentSubmitState.kind === "loading" || commentCooldownLeft > 0}>
                    {commentSubmitState.kind === "loading"
                      ? "Enviando..."
                      : commentCooldownLeft > 0
                        ? `Espera ${commentCooldownLeft}s`
                        : issueContent.community.comments.submitLabel}
                  </Button>
                  {commentSubmitState.message && (
                    <p className="text-sm" role="status" style={{ color: commentSubmitState.kind === "error" ? "#b91c1c" : TOKENS.color.warm }}>
                      {commentSubmitState.message}
                    </p>
                  )}
                  {commentValidationErrors.submit && <p className="text-sm text-[#b91c1c]">{commentValidationErrors.submit}</p>}
                </div>
              </form>

              <div className="print-avoid rounded-[32px] border p-6 md:p-7" style={{ background: "rgba(255,255,255,0.72)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-black" style={{ fontFamily: TOKENS.font.display }}>
                    {issueContent.community.comments.feedTitle}
                  </h3>
                  {communityLoading && <span className="text-sm" style={{ color: TOKENS.color.warm }}>Cargando…</span>}
                </div>
                {generalCommunityError && <p className="mb-4 text-sm text-red-700">{generalCommunityError}</p>}
                <div className="space-y-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm" style={{ color: TOKENS.color.inkSoft }}>
                      {issueContent.community.comments.lastApprovedLabel}: {comments.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => void loadCommunity()}
                      className="rounded-full border px-3 py-1 text-xs"
                      style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.66)" }}
                      disabled={communityLoading}
                    >
                      {communityLoading ? "Actualizando..." : issueContent.community.comments.refreshLabel}
                    </button>
                  </div>
                  {comments.length === 0 ? (
                    <EmptyCommunityState text={issueContent.community.comments.feedEmpty} />
                  ) : (
                    comments.map((item) => (
                      <article key={item.id} className="rounded-[20px] border p-4" style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.88)" }}>
                        <div className="mb-2 flex items-center justify-between text-xs" style={{ color: TOKENS.color.inkSoft }}>
                          <span className="font-semibold" style={{ color: TOKENS.color.ink }}>{item.displayName}</span>
                          <span>{formatPostDate(item.createdAt)}</span>
                        </div>
                        <p className="text-sm leading-6" style={{ color: TOKENS.color.inkSoft }}>{item.content}</p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="historial" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>{issueContent.community.history.eyebrow}</Eyebrow>
              <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>
                {issueContent.community.history.title}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                {issueContent.community.history.summary}
              </p>
            </div>

            <form onSubmit={submitHistory} className="print-hide-form mb-6 rounded-[32px] border p-6 md:p-7" style={{ background: "rgba(255,255,255,0.82)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
              <h3 className="mb-4 text-xl font-black" style={{ fontFamily: TOKENS.font.display }}>
                {issueContent.community.history.formTitle}
              </h3>
              <p className="mb-4 text-sm" style={{ color: TOKENS.color.inkSoft }}>
                {issueContent.community.history.formIntro}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>
                      {issueContent.community.history.nameLabel}
                    </span>
                    <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>{historyForm.displayName.length}/{MAX_NAME_LENGTH}</span>
                  </div>
                  <input
                    value={historyForm.displayName}
                    onChange={(event) => updateFormText(setHistoryForm, "displayName", event.target.value, MAX_NAME_LENGTH)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder={issueContent.community.history.namePlaceholder}
                    maxLength={MAX_NAME_LENGTH}
                    required
                  />
                  {historyValidationErrors.displayName && <span className="text-xs text-[#b91c1c]">{historyValidationErrors.displayName}</span>}
                </label>
                <label className="space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>
                      {issueContent.community.history.emailLabel}
                    </span>
                    <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>{historyForm.email.length}/{MAX_EMAIL_LENGTH}</span>
                  </div>
                  <input
                    value={historyForm.email}
                    onChange={(event) => updateFormText(setHistoryForm, "email", event.target.value, MAX_EMAIL_LENGTH)}
                    type="email"
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder={issueContent.community.history.emailPlaceholder}
                    maxLength={MAX_EMAIL_LENGTH}
                  />
                  {historyValidationErrors.email && <span className="text-xs text-[#b91c1c]">{historyValidationErrors.email}</span>}
                </label>
                <div className="sr-only">
                  <input
                    aria-hidden="true"
                    tabIndex={-1}
                    autoComplete="off"
                    placeholder="No completar"
                    value={historyForm.website}
                    onChange={(event) => updateFormText(setHistoryForm, "website", event.target.value, MAX_WEBSITE_LENGTH)}
                    className="rounded-xl border px-3 py-2"
                  />
                </div>
                <label className="space-y-1 md:col-span-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>
                      {issueContent.community.history.topicLabel}
                    </span>
                    <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>{historyForm.category.length}/{MAX_CATEGORY_LENGTH}</span>
                  </div>
                  <input
                    value={historyForm.category}
                    onChange={(event) => updateFormText(setHistoryForm, "category", event.target.value, MAX_CATEGORY_LENGTH)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder={issueContent.community.history.topicPlaceholder}
                    maxLength={MAX_CATEGORY_LENGTH}
                  />
                  {historyValidationErrors.category && <span className="text-xs text-[#b91c1c]">{historyValidationErrors.category}</span>}
                </label>
                <label className="space-y-1 md:col-span-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>
                      {issueContent.community.history.messageLabel}
                    </span>
                    <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>{historyForm.content.length}/{MAX_COMMENT_MESSAGE_LENGTH}</span>
                  </div>
                  <textarea
                    value={historyForm.content}
                    onChange={(event) => updateFormText(setHistoryForm, "content", event.target.value, MAX_COMMENT_MESSAGE_LENGTH)}
                    rows={5}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder={issueContent.community.history.messagePlaceholder}
                    maxLength={MAX_COMMENT_MESSAGE_LENGTH}
                    required
                  />
                  {historyValidationErrors.content && <span className="text-xs text-[#b91c1c]">{historyValidationErrors.content}</span>}
                </label>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button type="submit" className="rounded-full" disabled={historySubmitState.kind === "loading" || historyCooldownLeft > 0}>
                  {historySubmitState.kind === "loading"
                    ? "Enviando..."
                    : historyCooldownLeft > 0
                      ? `Espera ${historyCooldownLeft}s`
                      : issueContent.community.history.submitLabel}
                </Button>
                {historySubmitState.message && (
                  <span className="text-sm" role="status" style={{ color: historySubmitState.kind === "error" ? "#b91c1c" : TOKENS.color.warm }}>
                    {historySubmitState.message}
                  </span>
                )}
                {historyValidationErrors.submit && <span className="text-sm text-[#b91c1c]">{historyValidationErrors.submit}</span>}
              </div>
            </form>

            <div className="rounded-[32px] border p-6 md:p-7" style={{ background: "rgba(255,255,255,0.72)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
              <div className="mb-4 flex flex-wrap gap-2">
                {historyCategories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setHistoryFilter(category.value)}
                    className="rounded-full border px-3 py-1 text-sm"
                    style={{
                      borderColor: TOKENS.color.line,
                      background: historyFilter === category.value ? "rgba(201,94,42,0.16)" : "rgba(255,255,255,0.66)",
                      color: TOKENS.color.inkSoft,
                    }}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {filteredHistories.length === 0 ? (
                  <EmptyCommunityState text={issueContent.community.history.empty} />
                ) : (
                  filteredHistories.map((item) => (
                    <article key={item.id} className="rounded-[20px] border p-4" style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.9)" }}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: TOKENS.color.inkSoft }}>
                        <span className="font-semibold" style={{ color: TOKENS.color.ink }}>{item.displayName}</span>
                        <span>{formatPostDate(item.createdAt)}</span>
                      </div>
                      {item.category && <p className="mb-2 text-xs uppercase tracking-[0.12em]" style={{ color: TOKENS.color.warm }}>{item.category}</p>}
                      <p className="text-sm leading-6" style={{ color: TOKENS.color.inkSoft }}>{item.content}</p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="contacto" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="rounded-[32px] p-6 md:p-10" style={{ background: TOKENS.color.paperAlt, border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.lift }}>
              <Eyebrow>{issueContent.contact.eyebrow}</Eyebrow>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>
                {issueContent.contact.title}
              </h2>
              <p className="mt-4 text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                {issueContent.contact.summary}
              </p>
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <a
                  className="print-link-row rounded-[20px] border p-4 font-semibold transition hover:bg-white"
                  style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.88)", color: TOKENS.color.warm }}
                  href={buildContactMailto(mergedBrandConfig.supportLinks.email || issueContent.contact.email, mergedBrandConfig.supportLinks.mailSubject || issueContent.contact.mailSubject)}
                >
                  {issueContent.contact.mailLabel}
                </a>
                <a
                  className="print-link-row rounded-[20px] border p-4 font-semibold transition hover:bg-white"
                  style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.88)", color: TOKENS.color.warm }}
                  href={mergedBrandConfig.supportLinks.tiktokUrl || issueContent.contact.tiktokUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {issueContent.contact.tiktokLabel}
                </a>
                <a
                  className="print-link-row rounded-[20px] border p-4 font-semibold transition hover:bg-white"
                  style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.88)", color: TOKENS.color.warm }}
                  href={mergedBrandConfig.supportLinks.siteUrl || issueContent.contact.site}
                  target="_blank"
                  rel="noreferrer"
                >
                  {mergedBrandConfig.supportLinks.siteLabel || issueContent.contact.siteLabel}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="archivo" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>Archivo editorial</Eyebrow>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>
                Ediciones publicadas y notas anteriores
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                Cuando se publique una nueva edición, la vigente pasa al archivo con su propio enlace. Así la edición 2 puede salir sin perder la 1.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {issueArchive.map((entry) => {
                const isCurrent = entry.status === "published";
                return (
                  <a
                    key={entry.id}
                    href={buildEditionHistoryHref(entry.slug, isCurrent)}
                    className="rounded-[24px] border p-5 transition hover:-translate-y-0.5 hover:bg-white"
                    style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.84)", boxShadow: TOKENS.shadow.soft }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>
                        {entry.articleLabel || entry.label}
                      </div>
                      <Badge
                        className="rounded-full border-0 shadow-none"
                        style={{
                          background: entry.status === "published" ? "rgba(201,94,42,0.12)" : "rgba(24,18,14,0.08)",
                          color: entry.status === "published" ? TOKENS.color.warm : TOKENS.color.inkSoft,
                        }}
                      >
                        {entry.status === "published" ? "Actual" : "Archivo"}
                      </Badge>
                    </div>
                    <h3 className="mt-3 text-2xl font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>
                      {entry.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>
                      {entry.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                      <span style={{ color: TOKENS.color.inkSoft }}>
                        {entry.location} · {formatEditionDate(entry.publishedAt)}
                      </span>
                      <span className="inline-flex items-center gap-2 font-semibold" style={{ color: TOKENS.color.warm }}>
                        {isCurrent ? "Abrir edición actual" : "Abrir edición"}
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t" style={{ borderColor: TOKENS.color.line, background: TOKENS.color.paperAlt }}>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-10 text-sm md:flex-row md:items-center md:justify-between md:px-6" style={{ color: "rgba(66,52,43,0.68)" }}>
          <div>
            <div className="font-semibold" style={{ color: TOKENS.color.ink }}>
              {mergedBrandConfig.masthead} · {issueContent.metadata.editionLabel}
            </div>
            <div>Artículo oficial, archivo real, fuentes verificables visibles.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="/gaceta-eje-central/archivo" className="rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: TOKENS.color.line, color: TOKENS.color.warm }}>
              Ver archivo
            </a>
            {issueContent.metadata.footerBadges.map((badge) => (
              <Badge key={badge} className="rounded-full border-0 shadow-none" style={{ background: "rgba(255,255,255,0.9)", color: TOKENS.color.inkSoft }}>
                {badge}
              </Badge>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
