import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  AudioWaveform,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  Gavel,
  HeartPulse,
  Home,
  Link2,
  MapPin,
  BookOpen,
  Download,
  FileDown,
  MessageSquareWarning,
  Newspaper,
  Quote,
  Scale,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Waves,
  TrendingUp,
  Users,
  Volume2,
  BarChart3,
  AlertOctagon,
  Camera,
  Menu,
  X
} from "lucide-react";
import { fetchCommunityPosts, sanitizeCommunityText, submitCommunityPost, type CommunityPost } from "@/lib/community";
import { AdminPanelSection } from "@/components/community/AdminPanelSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaGallerySection } from "@/components/media/MediaGallerySection";
import { SocialAuthButtons } from "@/components/community/SocialAuthButtons";
import { SharePanel, type SharePanelEvent } from "@/components/social/SharePanel";
import { buildSharePayload, buildShareTrackingEvent, buildTikTokSearchUrl, buildXHashtagUrl, copyTextWithFallback, normalizeHashtags, normalizeHashtagForQuery, SHARE_CANONICAL_URL_FALLBACK, SHARE_DEFAULT_HASHTAGS, SHARE_DEFAULT_QUOTE, SHARE_DEFAULT_SUMMARY, SHARE_DEFAULT_TITLE, SHARE_ARTICLE_ID, SHARE_REEL_GUIDE, SOCIAL_SHARE_EVENTS_FALLBACK_ENDPOINT, SOCIAL_TRENDS_ENDPOINT, type SharePayload as SharePanelPayload } from "@/lib/share-contract";

// Design Tokens - Editorial Style 2026
const TOKENS = {
  color: {
    ink: "#18120e",
    inkSoft: "#42342b",
    paper: "#f6efe3",
    paper2: "#efe4d1",
    cream: "#fffaf3",
    mist: "#faf5ed",
    line: "rgba(38, 26, 18, 0.12)",
    warm: "#8f2f1c",
    warm2: "#c95e2a",
    cacao: "#241913",
    sand: "#ddc2a1",
  },
  shadow: {
    soft: "0 12px 40px rgba(62, 41, 22, 0.08)",
    deep: "0 18px 60px rgba(34, 23, 16, 0.18)",
    lift: "0 24px 80px rgba(24, 18, 14, 0.12)",
  },
  font: {
    display: '"Fraunces", ui-serif, Georgia, Cambria, "Times New Roman", serif',
    body: '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    editorial: '"Spectral", ui-serif, Georgia, Cambria, "Times New Roman", serif',
  },
  cardBorder: "1px solid rgba(38, 26, 18, 0.12)",
  badgeBg: "rgba(255,255,255,0.7)",
  sectionPad: { paddingTop: "clamp(4.5rem, 8vw, 7rem)", paddingBottom: "clamp(4.5rem, 8vw, 7rem)" },
};

// Navigation sections
const sectionMeta = [
  { id: "portada", label: "Portada", icon: Newspaper },
  { id: "problema", label: "El Problema", icon: AlertTriangle },
  { id: "contexto", label: "Contexto", icon: TrendingUp },
  { id: "impacto", label: "Impacto", icon: HeartPulse },
  { id: "datos", label: "Los Datos", icon: BarChart3 },
  { id: "rutas", label: "Rutas", icon: Building2 },
  { id: "accion", label: "Acción", icon: ScrollText },
  { id: "galeria", label: "Galería", icon: Camera },
  { id: "fuentes", label: "Fuentes", icon: Link2 },
  { id: "recursos", label: "Recursos", icon: BookOpen },
  { id: "comentarios", label: "Comentarios", icon: MessageSquareWarning },
  { id: "historial", label: "Historial", icon: ScrollText },
  { id: "admin", label: "Admin", icon: ShieldCheck },
  { id: "contacto", label: "Contacto", icon: Users },
];


type PdfResource = {
  id: string;
  title: string;
  description: string;
  fileName: string;
  href: string;
};

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

const CONTACT_DATA = {
  email: "contacto@yosoy.mx",
  tiktok: "@joseca_npc",
  tiktokUrl: "https://www.tiktok.com/@joseca_npc",
  site: "https://yosoymx.com",
};

const COVER_EDITORIAL_IMAGE = "/photos/periodico-cover-01.png";

const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 180;
const MAX_COMMENT_MESSAGE_LENGTH = 1200;
const MAX_CATEGORY_LENGTH = 60;
const MAX_WEBSITE_LENGTH = 120;
const MIN_MESSAGE_LENGTH = 12;
const COMMUNITY_COOLDOWN_SECONDS = 25;
const COMMUNITY_COOLDOWN_STORAGE_KEY = "yosoymx.community.cooldown.v1";
const HISTORY_FILTER_ALL = "todos";
type SocialTrendResponse = {
  hashtags?: unknown;
  tags?: unknown;
};

const PDF_RESOURCES: PdfResource[] = [
  {
    id: "ley-condominio",
    title: "Ley de Propiedad en Condominio",
    description: "Marco legal actualizado en la materia condominal que fundamenta derechos y obligaciones.",
    fileName: "ley_propiedad_en_condominio.pdf",
    href: "/pdfs/ley_propiedad_en_condominio.pdf",
  },
  {
    id: "anti-acoso-cdmx",
    title: "Libro completo: Anti Acoso CDMX",
    description: "Manual 2026 exhaustivo sobre prevención y mecanismos de defensa contra el acoso vecinal.",
    fileName: "libro_completo_anti_acoso_cdmx_2026.pdf",
    href: "/pdfs/libro_completo_anti_acoso_cdmx_2026.pdf",
  },
  {
    id: "guia-medidas-proteccion",
    title: "Guía: Medidas de protección (CNPP)",
    description: "Protocolo para medidas de protección bajo el Artículo 137 del Código Nacional de Procedimientos Penales.",
    fileName: "guia_ejecucion_medidas_cnp_137.pdf",
    href: "/pdfs/guia_ejecucion_medidas_cnp_137.pdf",
  },
  {
    id: "acoso-china-cdmx",
    title: "Estudio: Acoso vecinal (China y CDMX)",
    description: "Comparativo de metodologías de acoso y uso de vibraciones en ambos contextos urbanos.",
    fileName: "acoso_vecinal_china_cdmx.pdf",
    href: "/pdfs/acoso_vecinal_china_cdmx.pdf",
  },
];

const DEFAULT_SHARE_PAYLOAD = buildSharePayload({
  title: SHARE_DEFAULT_TITLE,
  excerpt: SHARE_DEFAULT_SUMMARY,
  hashtags: SHARE_DEFAULT_HASHTAGS,
  canonicalUrl: SHARE_CANONICAL_URL_FALLBACK,
});

function extractHashtagsFromTrendPayload(rawPayload: SocialTrendResponse | null) {
  if (!rawPayload || typeof rawPayload !== "object") return SHARE_DEFAULT_HASHTAGS;
  const candidate = rawPayload.hashtags ?? rawPayload.tags;
  return normalizeHashtags(Array.isArray(candidate) ? candidate : [], SHARE_DEFAULT_HASHTAGS);
}

const normalizePdfHref = (path: string) => (path.startsWith("/") ? path : `/${path}`);

const DENUNCIA_ESCRITO = `ASUNTO: Denuncia y solicitud de actuación coordinada por acoso vecinal mediante ruido y vibración estructural.

A quien corresponda:

Por medio del presente expongo que en el inmueble ubicado en [DOMICILIO] se presentan episodios reiterados de vibración y/o ruido de carácter impulsivo, de baja frecuencia o retumbante, principalmente en los horarios [HORARIOS], con una duración aproximada de [DURACIÓN].

La afectación se percibe en piso, techo y/o muros, altera el sueño, la concentración y la estabilidad emocional, y además impacta a otras viviendas del entorno. El patrón no corresponde a una molestia aislada, sino a un hostigamiento persistente con efectos reales sobre la salud mental y la permanencia digna en la vivienda.

SOLICITO:
1. Admisión de la denuncia y asignación de folio.
2. Verificación in situ en los horarios de mayor incidencia.
3. Canalización coordinada según competencia: justicia cívica, vía condominal, vía ambiental, vía penal y/o antidiscriminación.
4. Medidas preventivas y de no repetición.
5. Protección contra represalias.

ADJUNTO:
- Bitácora de hechos.
- Audios, videos y testigos.
- Comunicaciones con administración y autoridades.
- Cualquier constancia médica o psicológica disponible.

ATENTAMENTE
[NOMBRE]
[TELÉFONO / CORREO]
[FECHA]`;

const AUTORIDADES = [
  {
    icon: Waves,
    label: "PAOT",
    title: "Ruido y vibración",
    text: "La PAOT investiga la legalidad de acciones de autoridades y particulares; su canal de denuncia opera por internet 24/7 y también por teléfono o presencial.",
    href: "https://paot.org.mx/micrositios/sabias_que/RUIDO/denuncia.html",
    meta: "Denuncia en línea / teléfono / presencial",
  },
  {
    icon: Building2,
    label: "PROSOC",
    title: "Asesoría y materia condominal",
    text: "PROSOC orienta sobre asuntos administrativos, jurídicos, sociales, inmobiliarios y condominales para hacer valer derechos en la ciudad.",
    href: "https://www.prosoc.cdmx.gob.mx/conoce/asesoria-y-orientacion",
    meta: "Mitla 250 · orientación y trámites",
  },
  {
    icon: ShieldAlert,
    label: "FGJ CDMX",
    title: "Denuncia digital y vía penal",
    text: "La Fiscalía de CDMX ofrece servicios en línea, incluida denuncia digital, además de ruta presencial cuando el caso lo exige.",
    href: "https://www.fgjcdmx.gob.mx/nuestros-servicios/en-linea",
    meta: "Denuncia digital / servicios en línea",
  },
  {
    icon: Scale,
    label: "Juzgado Cívico",
    title: "Justicia cívica",
    text: "Para infracciones contra la tranquilidad por ruido excesivo. Puede presentar queja virtual o acudir presencialmente.",
    href: "https://www.seguridad.cdmx.gob.mx/",
    meta: "Queja virtual / atención presencial",
  },
  {
    icon: Siren,
    label: "Emergencia",
    title: "Seguridad y constancia inmediata",
    text: "Cuando el episodio está ocurriendo con riesgo, amenaza o agresión, la prioridad es seguridad y constancia en tiempo real.",
    href: "tel:911",
    meta: "911 / SSC / atención inmediata",
  },
];

const PROBLEMAS = [
  {
    icon: Home,
    title: "La vivienda deja de ser refugio",
    text: "El golpe real no siempre es el volumen. Es la pérdida de seguridad dentro del propio espacio. Cuando el ruido o la vibración se usan para castigar o desgastar, el daño trasciende la incomodidad.",
  },
  {
    icon: HeartPulse,
    title: "La salud mental sí entra aquí",
    text: "Sueño roto, ansiedad, hipervigilancia, irritabilidad y deterioro emocional son efectos esperables, no sobreactuación. El ruido crónico activa el sistema nervioso de forma sostenida.",
  },
  {
    icon: Gavel,
    title: "La respuesta suele llegar fragmentada",
    text: "Condominio, ruido, ambiente, delito: cuando nadie integra el caso, el acoso se mete por la grieta. La normativa existe, pero la coordinación institucional es débil.",
  },
];

const TIMELINE = [
  { step: "Ruido o conflicto inicial", desc: "El detonante suele ser una molestia que escala", detail: "Puede manifestarse como golpes en muros, música con bajos penetrantes o arrastre pesados a deshoras." },
  { step: "Respuesta institucional insuficiente", desc: "La denuncia no llega o no se atiende", detail: "La administración condominal minimiza el hecho o las patrullas llegan tarde y no pueden actuar." },
  { step: "Represalia acústica o vibratoria", desc: "El conflicto se convierte en hostigamiento", detail: "La queja irrita al generador, quien ahora utiliza el ruido o la vibración de manera deliberada y sistémica." },
  { step: "Escalada y afectación a terceros", desc: "El daño se expande a otros vecinos", detail: "El ruido y sobre todo la vibración comienza a ser percibido por otros departamentos transponiendo losas." },
  { step: "Desgaste, miedo o presión para salir", desc: "La vivienda deja de ser habitable", detail: "El ambiente se vuelve hostil. Hay privación crónica del sueño, estrés y a menudo desplazamiento forzado." },
];

// Helper functions
function shellStyle() {
  return {
    background: `linear-gradient(180deg, ${TOKENS.color.paper} 0%, ${TOKENS.color.paper2} 100%)`,
    color: TOKENS.color.ink,
    fontFamily: TOKENS.font.body,
  } as React.CSSProperties;
}

function paperStyle(dark = false) {
  if (dark) {
    return {
      backgroundColor: TOKENS.color.cacao,
      backgroundImage: "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.04), transparent 30%), radial-gradient(circle at 90% 10%, rgba(255,255,255,0.05), transparent 18%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.06))",
      color: TOKENS.color.cream,
    } as React.CSSProperties;
  }
  return {
    backgroundColor: TOKENS.color.paper,
    backgroundImage: "radial-gradient(circle at 14% 18%, rgba(143,47,28,0.05), transparent 24%), radial-gradient(circle at 85% 8%, rgba(201,94,42,0.05), transparent 18%), linear-gradient(180deg, rgba(255,255,255,0.26), rgba(0,0,0,0.02))",
  } as React.CSSProperties;
}

// Components
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]"
      style={{
        background: TOKENS.badgeBg,
        border: TOKENS.cardBorder,
        color: TOKENS.color.warm,
      }}
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

function StoryCard({ icon: Icon, title, text }: { icon: React.ComponentType<any>; title: string; text: string }) {
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
          style={{ background: `linear-gradient(90deg, ${TOKENS.color.warm2}, ${TOKENS.color.warm})` }}
        />
      </div>
    </div>
  );
}

function AuthorityCard({ icon: Icon, label, title, text, href, meta }: { icon: React.ComponentType<any>; label: string; title: string; text: string; href: string; meta: string }) {
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

function StatCard({ number, label, description, trend }: { number: string; label: string; description: string; trend?: string }) {
  return (
    <div className="rounded-[28px] p-6 md:p-7" style={{ background: "rgba(255,255,255,0.72)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
      <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>{label}</div>
      <div className="mb-3 text-4xl md:text-5xl font-black" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>{number}</div>
      <p className="text-sm leading-6" style={{ color: "rgba(66,52,43,0.78)" }}>{description}</p>
      {trend && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium" style={{ color: TOKENS.color.warm2 }}>
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

function buildHistoryCategoryOptions(posts: CommunityPost[]): CategoryOption[] {
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
    { value: HISTORY_FILTER_ALL, label: "Todos" },
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

// Main App
export default function MicrositioAcosoVecinal2026() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("portada");
  const [readProgress, setReadProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const [pdfDownloadState, setPdfDownloadState] = useState<Record<string, PdfDownloadState>>(
    () => Object.fromEntries(PDF_RESOURCES.map((resource) => [resource.id, { status: "idle" }]))
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
  const [socialAuthMessage, setSocialAuthMessage] = useState("");
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

  // Scroll spy & Progress setup
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setSharePayload((prev) =>
      buildSharePayload({
        title: prev.title,
        excerpt: prev.excerpt,
        hashtags: prev.hashtags,
        url: window.location.href,
        canonicalUrl: SHARE_CANONICAL_URL_FALLBACK,
      })
    );

    const handleVisibilityChange = () => {
      setSharePayload((prev) => {
        const currentUrl = prev.url;
        if (document.visibilityState === "visible" && currentUrl === window.location.href) return prev;
        return buildSharePayload({
          title: prev.title,
          excerpt: prev.excerpt,
          hashtags: prev.hashtags,
          url: window.location.href,
          canonicalUrl: SHARE_CANONICAL_URL_FALLBACK,
        });
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const loadTrends = async () => {
      try {
        const response = await fetch(SOCIAL_TRENDS_ENDPOINT, { signal });
        if (!response.ok) return;
        const payload = (await response.json()) as SocialTrendResponse | null;
        const trendingHashtags = extractHashtagsFromTrendPayload(payload);
        setSharePayload((prev) => {
          const next = buildSharePayload({
            title: prev.title,
            excerpt: prev.excerpt,
            hashtags: trendingHashtags,
            url: prev.url,
            canonicalUrl: SHARE_CANONICAL_URL_FALLBACK,
          });

          if (
            next.hashtags.length === prev.hashtags.length &&
            next.hashtags.every((tag, index) => tag === prev.hashtags[index])
          ) {
            return prev;
          }
          return next;
        });
      } catch {
        // Mantener hashtags curados si no hay endpoint o falla.
      }
    };

    loadTrends();
    return () => controller.abort();
  }, []);

  const trackShareAction = (event: SharePanelEvent) => {
    const payload = buildShareTrackingEvent(event, sharePayload.url, "social_panel", SHARE_ARTICLE_ID);

    if (!analyticsShareEndpoint) {
      return;
    }

    if (!isMountedRef.current) return;

    try {
      if (typeof navigator.sendBeacon === "function") {
        const body = JSON.stringify(payload);
        const blob = new Blob([body], { type: "application/json" });
        const didQueue = navigator.sendBeacon(analyticsShareEndpoint, blob);
        if (didQueue) {
          return;
        }
      }

      void fetch(analyticsShareEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => { });
    } catch {
      // Métrica opcional; no bloquea experiencia.
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRafRef.current !== null) return;

      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const totalScroll = document.documentElement.scrollTop;
        const documentHeight = Math.max(
          1,
          document.documentElement.scrollHeight - document.documentElement.clientHeight
        );
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
      const el = document.getElementById(id);
      if (el) observer.current?.observe(el);
    });

    return () => observer.current?.disconnect();
  }, []);

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    try {
      const result = await copyTextWithFallback(text);
      if (!isMountedRef.current) return;
      if (result.status === "error") {
        console.error("Fallo al copiar");
        return;
      }
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
      setCopied(true);
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Fallo al copiar");
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const checkAvailability = async () => {
      if (!isMountedRef.current) return;
      setPdfDownloadState((prev) => {
        const next: Record<string, PdfDownloadState> = { ...prev };
        PDF_RESOURCES.forEach((resource) => {
          next[resource.id] = { status: "checking" };
        });
        return next;
      });

      const results = await Promise.all(
        PDF_RESOURCES.map(async (resource) => {
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
            return {
              id: resource.id,
              status: "ok" as const,
              message: "Disponible",
              sizeLabel,
            };
          } catch {
            if (signal.aborted) return { id: resource.id, status: "checking" as const };
            return { id: resource.id, status: "error" as const, message: "No se pudo verificar la descarga" };
          }
        })
      );

      setPdfDownloadState((prev) => {
        if (!isMountedRef.current) return prev;
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

    checkAvailability();
    return () => {
      controller.abort();
    };
  }, []);

  const loadCommunity = async () => {
    if (!isMountedRef.current) return;
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
      if (!isMountedRef.current) return;
      console.error("Error cargando comunidad", error);
      setGeneralCommunityError("No se pudo cargar los contenidos comunitarios por ahora.");
    } finally {
      if (isMountedRef.current) setCommunityLoading(false);
    }
  };

  useEffect(() => {
    loadCommunity();
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
        window.localStorage.setItem(
          COMMUNITY_COOLDOWN_STORAGE_KEY,
          JSON.stringify({ ...current, [kind]: until })
        );
      }
      setCooldownFromStorage();
      setSubmitState({ kind: "success", message: kind === "comment" ? "Comentario enviado." : "Historial compartido." });
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
      if (!isMountedRef.current) return;
      console.error("Error al enviar", error);
      const message = error instanceof Error ? error.message : "No fue posible enviar. Intenta de nuevo.";
      setSubmitState({ kind: "error", message });
    }
  };

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitForm("comment", commentForm, setCommentForm, setCommentSubmitState);
  };

  const trackHashtagClick = (tag: string, platform: "x" | "tiktok") => {
    trackShareAction({
      action: platform === "x" ? "x" : "tiktok",
      surface: "cover",
      status: "ok",
      message: `hashtag:${normalizeHashtagForQuery(tag)}`,
    });
  };

  const submitHistory = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitForm("history", historyForm, setHistoryForm, setHistorySubmitState);
  };

  const historyCategories = buildHistoryCategoryOptions(histories);
  const filteredHistories = filterByHistoryCategory(histories, historyFilter);

  useEffect(() => {
    isMountedRef.current = true;
    setCooldownFromStorage();
    cooldownIntervalRef.current = window.setInterval(setCooldownFromStorage, 1000);
    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      if (commentStatusTimeoutRef.current) {
        window.clearTimeout(commentStatusTimeoutRef.current);
        commentStatusTimeoutRef.current = null;
      }
      if (historyStatusTimeoutRef.current) {
        window.clearTimeout(historyStatusTimeoutRef.current);
        historyStatusTimeoutRef.current = null;
      }
      if (cooldownIntervalRef.current) {
        window.clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, []);


  const downloadPdf = async (resource: PdfResource) => {
    const state = pdfDownloadState[resource.id];
    const href = new URL(normalizePdfHref(resource.href), window.location.origin).toString();
    const anchorProbe = document.createElement("a");
    const supportsDownload = "download" in anchorProbe;

    if (state?.status === "missing") {
      setPdfDownloadState((prev) => ({
        ...prev,
        [resource.id]: {
          status: "missing",
          message: "Documento aún no disponible, intenta abrir en nueva pestaña.",
        },
      }));
      window.open(href, "_blank", "noopener");
      return;
    }

    if (state?.status === "error") {
      setPdfDownloadState((prev) => ({
        ...prev,
        [resource.id]: {
          status: "error",
          message: "Si la descarga no funciona, usa abrir para descargar desde navegador.",
        },
      }));
      window.open(href, "_blank", "noopener");
      return;
    }

    try {
      if (state?.status !== "ok") {
        const response = await fetch(href, { method: "HEAD" });
        if (!response.ok) {
          setPdfDownloadState((prev) => ({
            ...prev,
            [resource.id]: {
              status: "missing",
              message: `No disponible (${response.status})`,
            },
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
      link.ariaLabel = `Descargar ${resource.title}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setPdfDownloadState((prev) => ({ ...prev, [resource.id]: { status: "ok", message: "Descarga iniciada." } }));
    } catch (err) {
      console.error("Error descargando PDF", err);
      setPdfDownloadState((prev) => ({
        ...prev,
        [resource.id]: {
          status: "error",
          message: "No se pudo iniciar la descarga automática. Abre el documento en pestaña nueva.",
        },
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

      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: "rgba(246,239,227,0.97)", borderColor: TOKENS.color.line, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        {/* Progress bar */}
        <div className="absolute top-0 left-0 h-[3px] bg-gradient-to-r from-[#c95e2a] to-[#8f2f1c] z-50" style={{ width: `${readProgress * 100}%`, transition: 'width 0.1s ease-out' }} />
        <div className="mx-auto max-w-[1440px] px-4 md:px-6">
          <div className="flex h-14 items-center justify-between">
            <button
              onClick={() => scrollToSection("portada")}
              className="text-base font-black tracking-tight whitespace-nowrap"
              style={{ fontFamily: TOKENS.font.display }}
            >
              <span style={{ color: TOKENS.color.ink }}>Gaceta </span>
              <span style={{ color: TOKENS.color.warm }}>Eje Central <sup className="text-[10px] opacity-70">v2.2</sup></span>
            </button>

            <div className="hidden lg:flex items-center gap-0.5">
              {sectionMeta.slice(0, 9).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="px-2.5 py-1.5 rounded-full text-[13px] font-medium transition-all whitespace-nowrap"
                  style={{
                    color: activeSection === id ? TOKENS.color.warm : TOKENS.color.inkSoft,
                    background: activeSection === id ? "rgba(201,94,42,0.1)" : "transparent"
                  }}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={handlePrint}
                className="ml-2 flex flex-col items-center justify-center p-2 rounded-full hover:bg-black/5 transition-colors print-hide"
                style={{ color: TOKENS.color.warm }}
                title="Imprimir o Guardar PDF"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-full"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ color: TOKENS.color.ink }}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t"
              style={{ background: TOKENS.color.paper, borderColor: TOKENS.color.line }}
            >
              <div className="px-4 py-4 space-y-1">
                {sectionMeta.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-left"
                    style={{ color: TOKENS.color.ink }}
                  >
                    <Icon className="h-5 w-5" style={{ color: TOKENS.color.warm }} />
                    {label}
                  </button>
                ))}
                <button
                  onClick={handlePrint}
                  className="mt-2 flex w-full items-center gap-3 px-4 py-3 rounded-xl text-left print-hide"
                  style={{ color: TOKENS.color.ink }}
                >
                  <Download className="h-5 w-5" />
                  <span>Imprimir página</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Header */}
      <header className="pt-16" style={{ ...paperStyle(false), borderBottom: `1px solid ${TOKENS.color.line}` }}>
        <div className="mx-auto max-w-[1440px] px-4 pt-8 md:px-6 md:pt-12">
          <div className="grid gap-3 border-y py-3 md:grid-cols-3" style={{ borderColor: TOKENS.color.line }}>
            <div className="text-[11px] uppercase tracking-[0.32em]" style={{ color: TOKENS.color.inkSoft }}>
              Ciudad de México · Primera edición
            </div>
            <div className="text-center text-[11px] uppercase tracking-[0.34em]" style={{ color: TOKENS.color.warm }}>
              Artículo · Vivienda / ruido / desplazamiento
            </div>
            <div className="text-left text-[11px] uppercase tracking-[0.32em] md:text-right" style={{ color: TOKENS.color.inkSoft }}>
              11 de marzo de 2026
            </div>
          </div>

          <div className="grid gap-4 py-8 md:grid-cols-[0.24fr_0.52fr_0.24fr] md:items-end">
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Fechado</div>
              <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                Ciudad de México · 11 de marzo de 2026
              </p>
            </div>

            <div className="text-center">
              <div
                className="text-[13px] uppercase tracking-[0.45em]"
                style={{ color: TOKENS.color.warm, fontFamily: TOKENS.font.body }}
              >
                Primera edición
              </div>
              <div
                className="mt-2 text-[clamp(2.4rem,5.6vw,5.2rem)] font-black leading-none tracking-tight"
                style={{ fontFamily: TOKENS.font.display }}
              >
                <span style={{ color: TOKENS.color.ink }}>Gaceta Tu Espacio </span>
                <span style={{ color: TOKENS.color.warm }}>Eje Central</span>
              </div>
              <div
                className="mt-2 text-[13px] uppercase tracking-[0.28em]"
                style={{ color: TOKENS.color.inkSoft }}
              >
                Acoso vecinal · Gentrificación · Desplazamiento
              </div>
            </div>

            <div className="space-y-2 md:text-right">
              <div className="text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Tema central</div>
              <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                Cuando la vivienda deja de ser refugio
              </p>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-4 hidden lg:block px-4 md:px-6">
          <SharePanel
            surface="header"
            sharePayload={sharePayload}
            summaryText={SHARE_DEFAULT_SUMMARY}
            quoteText={SHARE_DEFAULT_QUOTE}
            className="rounded-[20px] border bg-white/84 p-4 shadow-sm"
            onAction={trackShareAction}
          />
        </div>
      </header>

      <main className="print-document">
        {/* PORTADA */}
        <section id="portada" style={{ ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="grid gap-8 xl:grid-cols-[1.12fr_0.88fr]">
              <div className="space-y-6">
                <div className="rounded-[20px] border bg-white/82 p-5 md:p-8" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                  <Eyebrow>Portada · Primera plana</Eyebrow>
                  <h1
                    className="mt-4 max-w-5xl font-black tracking-tight"
                    style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2.5rem, 5vw, 4.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}
                  >
                    No es "pleito de vecinos".
                    <span className="mt-2 block" style={{ color: TOKENS.color.warm }}>
                      Es violencia que rompe vivienda, sueño y salud mental.
                    </span>
                  </h1>
                  <p
                    className="mt-6 max-w-4xl text-lg leading-8 md:text-xl"
                    style={{ fontFamily: TOKENS.font.editorial, color: "rgba(24,18,14,0.92)" }}
                  >
                    En la Ciudad de México, el acoso vecinal por ruido y vibración se entrelaza con procesos de
                    gentrificación que han expulsado a más de <strong>20,000 hogares anuales</strong>. Las rentas
                    aumentaron <strong>46% en cinco años</strong> y las denuncias por ruido crecen sin parar.
                    Este dossier documenta el fenómeno, sus efectos en la salud y las rutas institucionales
                    disponibles.
                  </p>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {[
                      ["Qué es", "Patrones deliberados de ruido, vibración o hostigamiento que trascienden la molestia ordinaria y afectan el derecho a la vivienda digna."],
                      ["Por qué importa", "No sólo altera la convivencia: puede causar ansiedad, insomnio, deterioro emocional y empujar a las personas fuera de sus hogares."],
                      ["Qué hacer", "Documentar, conocer las rutas institucionales (PAOT, PROSOC, FGJ) y exigir respuesta coordinada desde múltiples frentes."],
                    ].map(([title, text]) => (
                      <div key={title} className="rounded-[18px] border bg-[#fffaf3] p-4" style={{ borderColor: TOKENS.color.line }}>
                        <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>{title}</div>
                        <p className="text-sm leading-6" style={{ color: TOKENS.color.inkSoft }}>{text}</p>
                      </div>
                    ))}
                  </div>
                  <figure className="mt-6 overflow-hidden rounded-[20px] border" style={{ borderColor: TOKENS.color.line }}>
                    {coverImageError ? (
                      <div
                        className="flex h-72 w-full items-center justify-center bg-white/92 text-sm"
                        style={{ color: TOKENS.color.inkSoft }}
                      >
                        Imagen de portada pendiente
                      </div>
                    ) : (
                      <img
                        src={COVER_EDITORIAL_IMAGE}
                        alt="Registro de impacto urbano relacionado con acoso vecinal, ruido y vibración."
                        loading="eager"
                        className="h-72 w-full object-cover"
                        onError={() => setCoverImageError(true)}
                      />
                    )}
                    <figcaption
                      className="p-3 text-xs"
                      style={{ color: TOKENS.color.inkSoft, background: "rgba(255,255,255,0.92)" }}
                    >
                      Señales visuales del impacto vecinal: tránsito, ruido recurrente y desgaste comunitario.
                    </figcaption>
                  </figure>
                </div>

                <div className="rounded-[20px] border bg-white/82 p-5 md:p-6" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                  <div className="mb-3 flex items-center gap-3">
                    <Quote className="h-5 w-5" style={{ color: TOKENS.color.warm }} />
                    <div className="text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Lead editorial</div>
                  </div>
                  <p className="text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                    "Cuando el ruido o la vibración se usan para castigar, intimidar o desgastar a una persona
                    dentro de su vivienda, el daño deja de ser una simple incomodidad. La vivienda pierde su
                    función básica de refugio y el conflicto se convierte en un problema de convivencia, salud
                    y permanencia habitacional."
                  </p>
                  <div className="rounded-[22px] border bg-white/84 p-5 md:p-6" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>Hashtags y reel</div>
                        <h3 className="mt-2 text-xl font-black" style={{ fontFamily: TOKENS.font.display }}>Campaña en tiempo real (manual)</h3>
                      </div>
                      <Badge className="rounded-full border-0 shadow-none" style={{ background: "rgba(201,94,42,0.12)", color: TOKENS.color.warm }}>
                        #AcosoVecinal
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
                      <div className="text-xs uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>{SHARE_REEL_GUIDE.title}</div>
                      <ol className="mt-2 list-decimal pl-5 text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>
                        {SHARE_REEL_GUIDE.shots.map((shot) => (
                          <li key={shot}>{shot}</li>
                        ))}
                      </ol>
                      <p className="mt-3 text-sm font-semibold" style={{ color: TOKENS.color.warm }}>{SHARE_REEL_GUIDE.cta}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button variant="outline" size="sm" className="justify-start" onClick={() => copyToClipboard(SHARE_DEFAULT_QUOTE)}>
                        <Quote className="h-4 w-4" />
                        <span className="ml-2">Copiar frase pública</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => copyToClipboard(`Guion 15s: ${SHARE_REEL_GUIDE.shots.join(" | ")}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="ml-2">Copiar guion Reel</span>
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <a
                        href={buildTikTokSearchUrl(primaryHashtag)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 underline decoration-warm-300 underline-offset-4"
                        style={{ color: TOKENS.color.ink }}
                        onClick={() => trackHashtagClick(primaryHashtag, "tiktok")}
                      >
                        Abrir TikTok
                      </a>
                      <a
                        href={buildXHashtagUrl(primaryHashtag)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 underline decoration-warm-300 underline-offset-4"
                        style={{ color: TOKENS.color.ink }}
                        onClick={() => trackHashtagClick(primaryHashtag, "x")}
                      >
                        Ver hashtag base en X
                      </a>
                    </div>
                  </div>
                  <SharePanel
                    surface="cover"
                    sharePayload={sharePayload}
                    summaryText={SHARE_DEFAULT_SUMMARY}
                    quoteText={SHARE_DEFAULT_QUOTE}
                    className="rounded-[20px] border bg-white/84 p-4"
                    onAction={trackShareAction}
                  />
                </div>
              </div>
              <aside className="grid gap-4">
                <div className="rounded-[20px] border p-5 md:p-6" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream, borderColor: "rgba(255,255,255,0.08)", boxShadow: TOKENS.shadow.deep }}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <Volume2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.color.sand }}>Mapa del daño</div>
                      <div className="text-xs" style={{ color: "rgba(255,250,243,0.68)" }}>Impacto del ruido crónico en salud.</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <MetricBar label="Interrupción del sueño" value={92} note="muy alto" dark />
                    <MetricBar label="Estrés / ansiedad" value={88} note="alto" dark />
                    <MetricBar label="Deterioro cognitivo" value={76} note="alto" dark />
                    <MetricBar label="Riesgo de desplazamiento" value={71} note="creciente" dark />
                  </div>
                </div>

                <div className="rounded-[20px] border bg-white/82 p-5 md:p-6" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                  <div className="mb-4 flex items-center gap-3">
                    <BarChart3 className="h-5 w-5" style={{ color: TOKENS.color.warm }} />
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Cifras clave</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: TOKENS.color.line }}>
                      <span className="text-sm" style={{ color: TOKENS.color.inkSoft }}>Denuncias por ruido (2025)</span>
                      <span className="font-bold" style={{ color: TOKENS.color.warm }}>1,178</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: TOKENS.color.line }}>
                      <span className="text-sm" style={{ color: TOKENS.color.inkSoft }}>Aumento rentas 2020-2025</span>
                      <span className="font-bold" style={{ color: TOKENS.color.warm }}>+46%</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: TOKENS.color.line }}>
                      <span className="text-sm" style={{ color: TOKENS.color.inkSoft }}>Hogares expulsados/año</span>
                      <span className="font-bold" style={{ color: TOKENS.color.warm }}>20,000+</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm" style={{ color: TOKENS.color.inkSoft }}>Reportes al 911 por música</span>
                      <span className="font-bold" style={{ color: TOKENS.color.warm }}>83%</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[20px] border bg-white/82 p-5" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                  <div className="mb-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Navegar edición</div>
                  <div className="grid gap-2">
                    {sectionMeta.slice(1).map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => scrollToSection(id)}
                        className="flex items-center justify-between rounded-[14px] border px-4 py-3 text-sm text-left transition-all hover:bg-white"
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

        {/* EL PROBLEMA */}
        <section id="problema" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>01 · El Problema</Eyebrow>
              <h2
                className="mt-4 font-black tracking-tight"
                style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}
              >
                ¿Qué está pasando realmente?
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                Esta nota abre el caso sin rodeos: cuando la vivienda deja de sentirse segura y el daño
                se vuelve sostenido, ya no hablamos de una simple molestia vecinal.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {PROBLEMAS.map((item) => (
                <StoryCard key={item.title} {...item} />
              ))}
            </div>

            <div className="mt-10 rounded-[34px] overflow-hidden" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream, boxShadow: TOKENS.shadow.deep }}>
              <div className="p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <AudioWaveform className="h-6 w-6" style={{ color: TOKENS.color.sand }} />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.sand }}>Cómo escala el conflicto</div>
                </div>
                <div className="grid gap-4 md:grid-cols-5">
                  {TIMELINE.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="relative"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black"
                          style={{ background: TOKENS.color.warm, color: TOKENS.color.cream }}
                        >
                          {i + 1}
                        </div>
                        {i < TIMELINE.length - 1 && (
                          <ChevronRight className="hidden md:block h-4 w-4" style={{ color: TOKENS.color.sand }} />
                        )}
                      </div>
                      <h4 className="font-bold mb-1" style={{ color: TOKENS.color.cream }}>{item.step}</h4>
                      <p className="text-sm leading-5 font-medium mb-1" style={{ color: TOKENS.color.sand }}>{item.desc}</p>
                      <p className="text-xs leading-5" style={{ color: "rgba(255,250,243,0.6)" }}>{item.detail}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTEXTO - GENTRIFICACIÓN */}
        <section id="contexto" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>02 · Contexto</Eyebrow>
              <h2
                className="mt-4 font-black tracking-tight"
                style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}
              >
                Gentrificación y desplazamiento
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                El fenómeno de acoso vecinal no ocurre en el vacío. Se da en un contexto de presión
                inmobiliaria extrema que ha transformado colonias enteras de la Ciudad de México.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
              <StatCard
                number="46%"
                label="Aumento de rentas"
                description="Incremento promedio de rentas en CDMX entre 2020 y 2025"
                trend="De $12,000 a $17,600 mensuales"
              />
              <StatCard
                number="20K"
                label="Hogares expulsados"
                description="Hogares expulsados anualmente por falta de vivienda asequible"
                trend="Según Programa OT 2020-2035"
              />
              <StatCard
                number="$54K"
                label="Renta promedio"
                description="Renta promedio en colonias como Granada (Miguel Hidalgo)"
                trend="Las más caras de la ciudad"
              />
              <StatCard
                number="1,178"
                label="Denuncias 2025"
                description="Denuncias por ruido registradas ante la PAOT"
                trend="Aumento desde 887 en 2019"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[34px] p-6 md:p-8" style={{ background: "rgba(255,255,255,0.72)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                <div className="mb-4 flex items-center gap-3">
                  <MapPin className="h-5 w-5" style={{ color: TOKENS.color.warm }} />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Colonias más afectadas</div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { name: "Roma Norte/Sur", alcaldia: "Cuauhtémoc", desc: "Aumento masivo de rentas, llegada de nómadas digitales, coworkings y tiendas boutique" },
                    { name: "Condesa", alcaldia: "Cuauhtémoc", desc: "Epicentro de protestas anti-gentrificación 2025, rentas sobre $60,000" },
                    { name: "Juárez", alcaldia: "Cuauhtémoc", desc: "Zona Rosa y Paseo de la Reforma: edificios convertidos en residencias de lujo" },
                    { name: "Narvarte", alcaldia: "Benito Juárez", desc: "Colonia tradicionalmente clase media en rápida transformación" },
                    { name: "Escandón", alcaldia: "Miguel Hidalgo", desc: "Cercanía con Condesa ha acelerado cambio de perfil de residentes" },
                    { name: "Santa María la Ribera", alcaldia: "Cuauhtémoc", desc: "Atención de inversionistas por arquitectura histórica y ubicación" },
                  ].map((colonia) => (
                    <div key={colonia.name} className="rounded-[18px] border p-4" style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.9)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold" style={{ color: TOKENS.color.ink }}>{colonia.name}</span>
                        <Badge style={{ background: "rgba(201,94,42,0.1)", color: TOKENS.color.warm }}>{colonia.alcaldia}</Badge>
                      </div>
                      <p className="text-sm leading-5" style={{ color: TOKENS.color.inkSoft }}>{colonia.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[34px] p-6 md:p-8" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream, boxShadow: TOKENS.shadow.deep }}>
                <div className="mb-4 flex items-center gap-3">
                  <Users className="h-5 w-5" style={{ color: TOKENS.color.sand }} />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.sand }}>Protestas 2025</div>
                </div>
                <div className="space-y-4 text-sm leading-7" style={{ color: "rgba(255,250,243,0.84)" }}>
                  <p>
                    En julio de 2025, organizaciones vecinales convocaron la primera protesta masiva contra
                    la gentrificación en CDMX. La marcha recorrió colonias Condesa, Roma y Juárez hasta
                    llegar al Ángel de la Independencia.
                  </p>
                  <p>
                    Consignas como <em>"La gentrificación no es progreso, es despojo"</em> y
                    <em>"¡Fuera gringos!"</em> reflejan la tensión por la llegada masiva de nómadas digitales
                    y expats, principalmente de Estados Unidos.
                  </p>
                  <div className="rounded-[18px] p-4 mt-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="font-semibold mb-2" style={{ color: TOKENS.color.sand }}>Según ONU-Hábitat:</div>
                    <p className="italic">
                      "Cuando los vecindarios urbanos que se regeneran proporcionan espacios de calidad
                      para quienes pueden darse el lujo de vivir en ellos, muchos de sus primeros habitantes
                      se ven obligados a retirarse, convirtiéndose en viajeros cotidianos que viven lejos
                      de sus fuentes de trabajo."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* IMPACTO EN SALUD */}
        <section id="impacto" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(true), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>03 · Impacto</Eyebrow>
              <h2
                className="mt-4 font-black tracking-tight"
                style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.cream }}
              >
                Salud mental: no es una nota al pie
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: "rgba(255,250,243,0.78)", fontFamily: TOKENS.font.editorial }}>
                El daño no depende únicamente de decibeles. Importan la imprevisibilidad, la repetición,
                la sensación de invasión del espacio propio y la imposibilidad de controlar el entorno.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="rounded-[34px] border-0 bg-white/5 shadow-none">
                <CardHeader>
                  <CardTitle className="text-3xl" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.cream }}>Efectos documentados</CardTitle>
                  <CardDescription style={{ color: "rgba(255,250,243,0.68)" }}>Según OMS y estudios científicos recientes.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {[
                    "Alteración del sueño y descanso no reparador",
                    "Ansiedad y estrés sostenido (aumento de cortisol)",
                    "Hipervigilancia y estado de alerta permanente",
                    "Deterioro de concentración y memoria de trabajo",
                    "Irritabilidad y agresividad",
                    "Fatiga mental y agotamiento",
                    "Deterioro de calidad de vida y bienestar",
                  ].map((d, i) => (
                    <motion.div
                      key={d}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 rounded-2xl border px-4 py-3"
                      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
                    >
                      <CheckCircle2 className="h-5 w-5" style={{ color: TOKENS.color.sand }} />
                      <span className="text-sm" style={{ color: "rgba(255,250,243,0.86)" }}>{d}</span>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              <div className="rounded-[34px] p-6 md:p-8" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="mb-6 flex items-center gap-3" style={{ color: TOKENS.color.sand }}>
                  <HeartPulse className="h-6 w-6" />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.26em]">Nota clínica</div>
                </div>
                <div className="space-y-5 text-sm leading-8" style={{ color: "rgba(255,250,243,0.84)" }}>
                  <p>
                    Cuando el episodio es <strong>intermitente, nocturno, impulsivo o vibratorio</strong>,
                    el cuerpo no logra anticiparlo ni adaptarse bien. Eso favorece hipervigilancia, fatiga,
                    irritabilidad y deterioro emocional. El sistema nervioso permanece en estado de alerta
                    permanente.
                  </p>
                  <p>
                    Las <strong>vibraciones de baja frecuencia</strong> son particularmente problemáticas
                    porque viajan a través de estructuras, plataformos y pisos, generando una sensación
                    corporal de inestabilidad que el sistema nervioso no logra ignorar, incluso cuando
                    el sonido no es particularmente fuerte.
                  </p>
                  <div className="rounded-[28px] p-5" style={{ background: "rgba(201,94,42,0.15)", border: "1px solid rgba(201,94,42,0.25)" }}>
                    <div className="mb-3 flex items-center gap-2 font-semibold">
                      <AlertOctagon className="h-5 w-5" />
                      Punto crítico
                    </div>
                    <p className="text-sm leading-7" style={{ color: "rgba(255,243,234,0.9)" }}>
                      Pedir una reacción impecable a alguien que lleva semanas o meses con sueño
                      fragmentado es una tontería administrativa elegante. El impacto psicológico
                      es parte central del caso, no una nota marginal.
                    </p>
                  </div>
                  <SourceLink href="https://www.who.int/tools/compendium-on-health-and-environment/environmental-noise/" dark>
                    Ver guía OMS sobre ruido ambiental
                  </SourceLink>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOS DATOS */}
        <section id="datos" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>04 · Los Datos</Eyebrow>
              <h2
                className="mt-4 font-black tracking-tight"
                style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}
              >
                Estadísticas y marco legal
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                La normativa existe, pero la brecha entre la ley y su aplicación es abismal.
                Aquí los números y las leyes que deberían proteger el derecho a la tranquilidad.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-2 mb-10">
              <div className="rounded-[34px] p-6 md:p-8" style={{ background: "rgba(255,255,255,0.72)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                <div className="mb-6 flex items-center gap-3">
                  <Gavel className="h-6 w-6" style={{ color: TOKENS.color.warm }} />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Marco normativo</div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-[18px] border p-4" style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.9)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold" style={{ color: TOKENS.color.ink }}>Ley de Cultura Cívica CDMX</span>
                      <Badge style={{ background: "rgba(201,94,42,0.1)", color: TOKENS.color.warm }}>Art. 27</Badge>
                    </div>
                    <p className="text-sm leading-6 mb-2" style={{ color: TOKENS.color.inkSoft }}>
                      Sanciona producir ruidos que atenten contra la tranquilidad o representen riesgo a la salud.
                    </p>
                    <div className="text-sm font-medium" style={{ color: TOKENS.color.warm }}>
                      Sanción: 11-40 UMA ($1,244-$4,525) o arresto 13-24 hrs
                    </div>
                  </div>

                  <div className="rounded-[18px] border p-4" style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.9)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold" style={{ color: TOKENS.color.ink }}>Código Penal CDMX</span>
                      <Badge style={{ background: "rgba(201,94,42,0.1)", color: TOKENS.color.warm }}>Art. 346</Badge>
                    </div>
                    <p className="text-sm leading-6 mb-2" style={{ color: TOKENS.color.inkSoft }}>
                      Penaliza emisiones de ruido o vibraciones provenientes de fuentes fijas.
                    </p>
                    <div className="text-sm font-medium" style={{ color: TOKENS.color.warm }}>
                      Sanción: 2-6 años prisión + multa 1,000-5,000 UMA
                    </div>
                  </div>

                  <div className="rounded-[18px] border p-4" style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.9)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold" style={{ color: TOKENS.color.ink }}>Constitución Política de los Estados Unidos Mexicanos</span>
                      <Badge style={{ background: "rgba(201,94,42,0.1)", color: TOKENS.color.warm }}>Art. 4</Badge>
                    </div>
                    <p className="text-sm leading-6" style={{ color: TOKENS.color.inkSoft }}>
                      Toda familia tiene derecho a disfrutar de vivienda digna y decorosa. El Estado debe
                      establecer los instrumentos y apoyos necesarios para alcanzar este objetivo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[34px] p-6 md:p-8" style={{ background: "rgba(255,255,255,0.72)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                <div className="mb-6 flex items-center gap-3">
                  <Volume2 className="h-6 w-6" style={{ color: TOKENS.color.warm }} />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Límites de ruido permitidos</div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 p-4 rounded-[18px]" style={{ background: "rgba(201,94,42,0.08)" }}>
                    <div className="text-center">
                      <div className="text-2xl font-black" style={{ color: TOKENS.color.warm }}>65 dB</div>
                      <div className="text-xs mt-1" style={{ color: TOKENS.color.inkSoft }}>Zona residencial<br />06:00-20:00</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black" style={{ color: TOKENS.color.warm }}>62 dB</div>
                      <div className="text-xs mt-1" style={{ color: TOKENS.color.inkSoft }}>Zona residencial<br />20:00-06:00</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black" style={{ color: TOKENS.color.warm }}>68 dB</div>
                      <div className="text-xs mt-1" style={{ color: TOKENS.color.inkSoft }}>Zona comercial<br />Diurno</div>
                    </div>
                  </div>

                  <div className="text-sm leading-6" style={{ color: TOKENS.color.inkSoft }}>
                    <p className="mb-3">
                      <strong>Norma NADF-005-AMBT-2013:</strong> Establece los límites máximos permisibles
                      de emisiones sonoras para fuentes fijas en la Ciudad de México.
                    </p>
                    <p>
                      La PAOT ha suspendido <strong>10 establecimientos</strong> por exceder niveles de ruido
                      en lo que va de 2025, y ha exhortado a <strong>277</strong> a cumplir la norma.
                    </p>
                  </div>

                  <div className="rounded-[18px] p-4" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream }}>
                    <div className="text-sm font-semibold mb-2" style={{ color: TOKENS.color.sand }}>Dato relevante</div>
                    <p className="text-sm leading-6">
                      En 2017, la OMS clasificó a la CDMX como la <strong>octava ciudad más ruidosa del mundo</strong>,
                      superada solo por ciudades como Guangzhou, Delhi, El Cairo y Mumbai.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RUTAS INSTITUCIONALES */}
        <section id="rutas" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>05 · Rutas institucionales</Eyebrow>
              <h2
                className="mt-4 font-black tracking-tight"
                style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}
              >
                ¿A dónde acudir?
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                La respuesta institucional existe pero está fragmentada. Conocer las rutas y
                la competencia de cada autoridad es el primer paso para exigir atención.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {AUTORIDADES.map((item) => (
                <AuthorityCard key={item.title} {...item} />
              ))}
            </div>

            <div className="mt-10 rounded-[34px] p-6 md:p-8" style={{ background: "rgba(255,255,255,0.72)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
              <div className="mb-6 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6" style={{ color: TOKENS.color.warm }} />
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Checklist de evidencia mínima</div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  "Bitácora diaria con fecha, hora, duración, intensidad percibida y efecto",
                  "Audios o videos con marcas de tiempo y contexto del lugar",
                  "Testigos o vecinos afectados por el mismo episodio",
                  "Capturas de mensajes, oficios o reportes a administración",
                  "Constancias médicas o psicológicas si existe afectación clínica",
                  "Registro de denuncias previas y respuestas recibidas",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.9)", border: TOKENS.cardBorder }}>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: TOKENS.color.warm, color: TOKENS.color.cream }}>
                      {i + 1}
                    </div>
                    <span className="text-sm leading-6" style={{ color: TOKENS.color.inkSoft }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ACCIÓN - ESCRITO */}
        <section id="accion" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>06 · Acción</Eyebrow>
              <h2
                className="mt-4 font-black tracking-tight"
                style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}
              >
                Documento base para adaptar
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                Un formato de denuncia que integra las múltiples aristas del problema: ruido, vibración,
                salud mental y derecho a la vivienda. Adáptalo a tu caso específico.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
              <div className="grid gap-6">
                <div className="rounded-[34px] p-6 md:p-8" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream, boxShadow: TOKENS.shadow.deep }}>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <ScrollText className="h-6 w-6" />
                  </div>
                  <h3 className="mb-3 text-2xl font-black" style={{ fontFamily: TOKENS.font.display }}>Cómo usarlo</h3>
                  <div className="space-y-3 text-sm leading-7" style={{ color: "rgba(255,250,243,0.84)" }}>
                    <p>1. Cambia domicilio, fechas, horarios y síntomas reales.</p>
                    <p>2. Adjunta bitácora, clips, testigos y mensajes.</p>
                    <p>3. Duplica el escrito según autoridad competente.</p>
                    <p>4. Conserva versión firmada y versión digital.</p>
                    <p>5. Solicita folio y seguimiento de tu denuncia.</p>
                  </div>
                </div>

                <div className="rounded-[34px] p-6" style={{ background: "rgba(255,255,255,0.74)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                  <div className="mb-3 flex items-center gap-3" style={{ color: TOKENS.color.warm }}>
                    <MessageSquareWarning className="h-5 w-5" />
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em]">Recomendación</div>
                  </div>
                  <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>
                    Presenta el escrito en múltiples instancias simultáneamente: PROSOC (si es condominio),
                    PAOT (si hay fuentes fijas), Juzgado Cívico (infracción administrativa) y FGJ
                    (si hay elementos penales). La presión coordinada aumenta la probabilidad de respuesta.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-[36px]" style={{ background: "rgba(255,255,255,0.84)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.lift }}>
                <div className="border-b px-6 py-4 md:px-8 flex items-center justify-between" style={{ borderColor: TOKENS.color.line }}>
                  <div className="text-[11px] uppercase tracking-[0.3em]" style={{ color: TOKENS.color.warm }}>Documento base</div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() => copyToClipboard(DENUNCIA_ESCRITO)}
                  >
                    <FileText className="h-3.5 w-3.5 mr-2" />
                    Copiar texto
                    {copied && (
                      <span className="ml-2 font-semibold" style={{ color: TOKENS.color.warm2 }}>
                        · Copiado
                      </span>
                    )}
                  </Button>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap p-6 text-sm leading-7 md:p-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                  {DENUNCIA_ESCRITO}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* FUENTES */}
        <section id="fuentes" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>07 · Fuentes</Eyebrow>
              <h2
                className="mt-4 font-black tracking-tight"
                style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 0.95, color: TOKENS.color.ink }}
              >
                Documentación y referencias
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                Esta investigación se basa en fuentes oficiales, documentos académicos y reportes
                periodísticos verificables.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { group: "Institucional", title: "PAOT CDMX", note: "Procuraduría Ambiental y del Ordenamiento Territorial. Estadísticas de denuncias y suspensiones.", href: "https://paot.org.mx" },
                { group: "Institucional", title: "PROSOC CDMX", note: "Procuraduría Social. Mediación de conflictos condominales y asesoría jurídica.", href: "https://www.prosoc.cdmx.gob.mx" },
                { group: "Institucional", title: "FGJ CDMX", note: "Fiscalía General de Justicia. Denuncia digital y servicios en línea.", href: "https://www.fgjcdmx.gob.mx" },
                { group: "Académico", title: "Informe Iberoamericana 2025", note: "'Travesías Forzadas: Desplazamiento interno en México 2024'. Universidad Iberoamericana.", href: "https://ibero.mx" },
                { group: "Académico", title: "ONU-Hábitat", note: "Definición y análisis de gentrificación urbana.", href: "https://unhabitat.org" },
                { group: "Salud", title: "OMS - Ruido ambiental", note: "Directrices sobre ruido ambiental y su impacto en la salud.", href: "https://www.who.int/tools/compendium-on-health-and-environment/environmental-noise/" },
                { group: "Normativo", title: "Ley de Cultura Cívica CDMX", note: "Artículo 27: infracciones contra la tranquilidad por ruido.", href: "https://paot.org.mx" },
                { group: "Normativo", title: "Código Penal CDMX", note: "Artículo 346: delito de emisiones de ruido o vibraciones.", href: "https://www.congresocdmx.gob.mx" },
                { group: "Periodístico", title: "El Economista - EconoHábitat", note: "Cobertura de gentrificación y precios de vivienda en CDMX.", href: "https://www.eleconomista.com.mx" },
              ].map((fuente) => (
                <div key={fuente.title} className="rounded-[28px] p-5" style={{ background: "rgba(255,255,255,0.66)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Badge className="rounded-full border-0 shadow-none" style={{ background: "rgba(255,255,255,0.9)", color: TOKENS.color.warm }}>
                      {fuente.group}
                    </Badge>
                    <Link2 className="h-4 w-4" style={{ color: TOKENS.color.warm }} />
                  </div>
                  <h3 className="mb-2 text-lg font-black" style={{ fontFamily: TOKENS.font.display }}>{fuente.title}</h3>
                  <p className="mb-4 text-sm leading-6" style={{ color: "rgba(66,52,43,0.8)" }}>{fuente.note}</p>
                  <SourceLink href={fuente.href}>Consultar fuente</SourceLink>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CIERRE */}
        <section style={{ background: TOKENS.color.mist, ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="rounded-[40px] p-6 md:p-10" style={{ background: "rgba(255,255,255,0.82)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.lift }}>
              <div className="mb-6 flex items-center gap-3" style={{ color: TOKENS.color.warm }}>
                <Quote className="h-8 w-8" />
                <div>
                  <h3 className="text-2xl font-black" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>Frase pública sugerida</h3>
                  <p className="text-sm" style={{ color: "rgba(66,52,43,0.6)" }}>Para compartir, citar o adaptar.</p>
                </div>
              </div>
              <blockquote className="rounded-[28px] p-6 md:p-8" style={{ background: TOKENS.color.cream, borderLeft: `5px solid ${TOKENS.color.warm}`, fontFamily: TOKENS.font.editorial, color: TOKENS.color.ink }}>
                <div className="text-xl font-semibold leading-9 md:text-2xl md:leading-[1.5]">
                  "El acoso por ruido y vibraciones no es una molestia menor: puede dañar la salud mental,
                  romper la convivencia y empujar a las personas fuera de su vivienda. En un contexto de
                  gentrificación extrema donde 20,000 hogares son expulsados anualmente de la CDMX,
                  la ciudad necesita protocolo, medición y respuesta real. No más impunidad para quienes
                  convierten la vivienda en arma de desgaste."
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

        {/* RECURSOS / REFERENCIAS */}
        <section id="recursos" className="mx-auto max-w-[1440px] px-4 py-20 md:px-6 lg:py-32">
          <header className="mb-12">
            <div className="mb-6 inline-flex" style={{ color: TOKENS.color.warm, letterSpacing: '0.12em' }}>
              <span className="text-sm font-semibold uppercase">08 · Biblioteca de Recursos</span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black leading-none tracking-tight md:max-w-3xl" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>
              Archivos y Documentos
            </h2>
            <p className="mt-6 max-w-2xl text-lg md:text-xl" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
              Documentación técnica, guías legales y libros de estudio completos disponibles para lectura profunda. Descarga o visualiza directamente.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PDF_RESOURCES.map((resource) => (
              <a
                key={resource.id}
                href={normalizePdfHref(resource.href)}
                download={resource.fileName}
                onClick={(event) => {
                  event.preventDefault();
                  downloadPdf(resource);
                }}
                className="group flex flex-col bg-white rounded-3xl p-8 text-left transition-all hover:-translate-y-1 hover:shadow-xl print-anchor print-avoid"
                rel="noopener"
                aria-label={`Descargar ${resource.title}`}
                style={{ boxShadow: TOKENS.shadow.soft }}
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(201,94,42,0.1)", color: TOKENS.color.warm }}>
                  <FileDown size={28} />
                </div>
                <h3 className="mb-3 text-xl font-bold" style={{ color: TOKENS.color.ink }}>
                  {resource.title}
                </h3>
                <p className="mb-6 flex-1 text-sm leading-relaxed" style={{ color: TOKENS.color.inkSoft }}>
                  {resource.description}
                </p>
                <div className="mt-auto flex items-center font-semibold" style={{ color: TOKENS.color.warm }}>
                  <span>Descargar PDF</span>
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
                {pdfDownloadState[resource.id]?.message && (
                  <p className="mt-4 text-xs" style={{ color: TOKENS.color.inkSoft }}>
                    {pdfDownloadState[resource.id]?.message}
                    {pdfDownloadState[resource.id]?.sizeLabel && ` · ${pdfDownloadState[resource.id]?.sizeLabel}`}
                  </p>
                )}
              </a>
            ))}
          </div>
        </section>

        <MediaGallerySection />

        <section id="comentarios" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="mb-8">
              <Eyebrow>09 · Comentarios</Eyebrow>
              <h2 className="text-[clamp(2rem, 4vw, 3.5rem)] font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>
                Comentarios de comunidad
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                Comparte experiencias, dudas o señales de apoyo. Los mensajes contribuyen a construir un archivo vivo.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <form onSubmit={submitComment} className="rounded-[32px] border p-6 md:p-7 print-hide-form" style={{ background: "rgba(255,255,255,0.82)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                <h3 className="text-xl font-black mb-4" style={{ fontFamily: TOKENS.font.display }}>Déjanos tu mensaje</h3>
                <p className="mb-4 text-sm" style={{ color: TOKENS.color.inkSoft }}>
                  Tu aportación se publica con verificación automática y ayuda a construir una guía viva con casos reales.
                  En caso de caídas del servicio, se mantiene un respaldo local.
                </p>
                <div className="my-4 rounded-[20px] border p-4" style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.7)" }}>
                  <p className="mb-3 text-sm" style={{ color: TOKENS.color.inkSoft }}>
                    Si prefieres, usa autenticación social para asociar tu identidad al envío y reducir ruido de spam.
                  </p>
                  <SocialAuthButtons
                    onMessage={setSocialAuthMessage}
                    onProviderSelected={(provider) => {
                      setSocialAuthMessage(
                        `Autenticación iniciada con ${provider === "x" ? "X" : provider === "facebook" ? "Facebook" : "TikTok"
                        }.`
                      );
                    }}
                  />
                  {socialAuthMessage && (
                    <p
                      className="mt-3 rounded-full border px-3 py-1 text-xs"
                      style={{ borderColor: "rgba(38,26,18,0.16)", color: TOKENS.color.inkSoft }}
                    >
                      {socialAuthMessage}
                    </p>
                  )}
                </div>
                <div className="grid gap-4">
                  <label className="space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>Nombre o alias</span>
                      <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>{commentForm.displayName.length}/{MAX_NAME_LENGTH}</span>
                    </div>
                    <input
                      value={commentForm.displayName}
                      onChange={(event) => updateFormText(setCommentForm, "displayName", event.target.value, MAX_NAME_LENGTH)}
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder="Ej. Ana G."
                      maxLength={MAX_NAME_LENGTH}
                      required
                    />
                    {commentValidationErrors.displayName && (
                      <span className="text-xs text-[#b91c1c]">{commentValidationErrors.displayName}</span>
                    )}
                  </label>
                  <label className="space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>Correo (opcional)</span>
                      <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>{commentForm.email.length}/{MAX_EMAIL_LENGTH}</span>
                    </div>
                    <input
                      value={commentForm.email}
                      onChange={(event) => updateFormText(setCommentForm, "email", event.target.value, MAX_EMAIL_LENGTH)}
                      type="email"
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder="nombre@correo.com"
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
                      <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>Mensaje</span>
                      <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>
                        {commentForm.content.length}/{MAX_COMMENT_MESSAGE_LENGTH}
                      </span>
                    </div>
                    <textarea
                      value={commentForm.content}
                      onChange={(event) => updateFormText(setCommentForm, "content", event.target.value, MAX_COMMENT_MESSAGE_LENGTH)}
                      rows={5}
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder="Qué parte te fue útil y qué falta fortalecer."
                      maxLength={MAX_COMMENT_MESSAGE_LENGTH}
                      required
                    />
                    {commentValidationErrors.content && <span className="text-xs text-[#b91c1c]">{commentValidationErrors.content}</span>}
                  </label>
                  <Button
                    type="submit"
                    className="rounded-full w-full"
                    disabled={commentSubmitState.kind === "loading" || commentCooldownLeft > 0}
                  >
                    {commentSubmitState.kind === "loading"
                      ? "Enviando..."
                      : commentCooldownLeft > 0
                        ? `Espera ${commentCooldownLeft}s`
                        : "Publicar comentario"}
                  </Button>
                  {commentSubmitState.message && (
                    <p className="text-sm" role="status" style={{ color: commentSubmitState.kind === "error" ? "#b91c1c" : TOKENS.color.warm }}>
                      {commentSubmitState.message}
                    </p>
                  )}
                  {commentValidationErrors.submit && <p className="text-sm text-[#b91c1c]">{commentValidationErrors.submit}</p>}
                </div>
              </form>

              <div className="rounded-[32px] border p-6 md:p-7 print-avoid" style={{ background: "rgba(255,255,255,0.72)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-black" style={{ fontFamily: TOKENS.font.display }}>Últimos comentarios</h3>
                  {communityLoading && <span className="text-sm" style={{ color: TOKENS.color.warm }}>Cargando…</span>}
                </div>
                {generalCommunityError && <p className="mb-4 text-sm text-red-700">{generalCommunityError}</p>}
                <div className="space-y-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm" style={{ color: TOKENS.color.inkSoft }}>
                      Últimos aprobados: {comments.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => void loadCommunity()}
                      className="rounded-full border px-3 py-1 text-xs"
                      style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.66)" }}
                      disabled={communityLoading}
                    >
                      {communityLoading ? "Actualizando..." : "Actualizar feed"}
                    </button>
                  </div>
                  {comments.length === 0 ? (
                    <EmptyCommunityState text="Aún no hay comentarios. Sé el primero en compartir una experiencia." />
                  ) : (
                    comments.map((item) => (
                      <article key={item.id} className="rounded-[20px] border p-4" style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.88)" }}>
                        <div className="mb-2 flex items-center justify-between text-xs" style={{ color: TOKENS.color.inkSoft }}>
                          <span className="font-semibold" style={{ color: TOKENS.color.ink }}>{item.displayName}</span>
                          <span>{formatPostDate(item.createdAt)}</span>
                        </div>
                        {item.source === "local" && (
                          <p className="mb-2 text-[11px] font-semibold" style={{ color: TOKENS.color.warm }}>
                            Guardado localmente (visible sin respaldo remoto)
                          </p>
                        )}
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
              <Eyebrow>10 · Historial comunitario</Eyebrow>
              <h2 className="text-[clamp(2rem, 4vw, 3.5rem)] font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>
                Historia compartida
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                Sube experiencias útiles o recomendaciones para fortalecer la ruta común.
              </p>
            </div>

            <form onSubmit={submitHistory} className="mb-6 rounded-[32px] border p-6 md:p-7 print-hide-form" style={{ background: "rgba(255,255,255,0.82)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
              <h3 className="mb-4 text-xl font-black" style={{ fontFamily: TOKENS.font.display }}>Añadir aporte al historial</h3>
              <p className="mb-4 text-sm" style={{ color: TOKENS.color.inkSoft }}>
                Registra rutas de trabajo, documentos útiles o aprendizajes colectivos para fortalecer el historial.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>Nombre o alias</span>
                    <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>{historyForm.displayName.length}/{MAX_NAME_LENGTH}</span>
                  </div>
                  <input
                    value={historyForm.displayName}
                    onChange={(event) => updateFormText(setHistoryForm, "displayName", event.target.value, MAX_NAME_LENGTH)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Ej. Colectivo A."
                    maxLength={MAX_NAME_LENGTH}
                    required
                  />
                  {historyValidationErrors.displayName && (
                    <span className="text-xs text-[#b91c1c]">{historyValidationErrors.displayName}</span>
                  )}
                </label>
                <label className="space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>Correo (opcional)</span>
                    <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>{historyForm.email.length}/{MAX_EMAIL_LENGTH}</span>
                  </div>
                  <input
                    value={historyForm.email}
                    onChange={(event) => updateFormText(setHistoryForm, "email", event.target.value, MAX_EMAIL_LENGTH)}
                    type="email"
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="nombre@correo.com"
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
                    <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>Tema</span>
                    <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>{historyForm.category.length}/{MAX_CATEGORY_LENGTH}</span>
                  </div>
                  <input
                    value={historyForm.category}
                    onChange={(event) => updateFormText(setHistoryForm, "category", event.target.value, MAX_CATEGORY_LENGTH)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Ej. Testimonio · Ruta legal"
                    maxLength={MAX_CATEGORY_LENGTH}
                  />
                  {historyValidationErrors.category && <span className="text-xs text-[#b91c1c]">{historyValidationErrors.category}</span>}
                </label>
                <label className="space-y-1 md:col-span-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: TOKENS.color.ink }}>Aporte</span>
                    <span className="text-xs" style={{ color: TOKENS.color.inkSoft }}>{historyForm.content.length}/{MAX_COMMENT_MESSAGE_LENGTH}</span>
                  </div>
                  <textarea
                    value={historyForm.content}
                    onChange={(event) => updateFormText(setHistoryForm, "content", event.target.value, MAX_COMMENT_MESSAGE_LENGTH)}
                    rows={5}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Comparte información útil o experiencias de ruta y apoyo."
                    maxLength={MAX_COMMENT_MESSAGE_LENGTH}
                    required
                  />
                  {historyValidationErrors.content && <span className="text-xs text-[#b91c1c]">{historyValidationErrors.content}</span>}
                </label>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button
                  type="submit"
                  className="rounded-full"
                  disabled={historySubmitState.kind === "loading" || historyCooldownLeft > 0}
                >
                  {historySubmitState.kind === "loading"
                    ? "Enviando..."
                    : historyCooldownLeft > 0
                      ? `Espera ${historyCooldownLeft}s`
                      : "Compartir aporte"}
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
                      background:
                        historyFilter === category.value ? "rgba(201,94,42,0.16)" : "rgba(255,255,255,0.66)",
                      color: TOKENS.color.inkSoft,
                    }}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {filteredHistories.length === 0 ? (
                  <EmptyCommunityState text="Aún no hay entradas en este filtro. Publica la primera aportación." />
                ) : (
                  filteredHistories.map((item) => (
                    <article key={item.id} className="rounded-[20px] border p-4" style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.9)" }}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: TOKENS.color.inkSoft }}>
                        <span className="font-semibold" style={{ color: TOKENS.color.ink }}>{item.displayName}</span>
                        {item.source === "local" && (
                          <span style={{ color: TOKENS.color.warm }}>Guardado localmente</span>
                        )}
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

        <AdminPanelSection />

        <section id="contacto" className="border-t" style={{ borderColor: TOKENS.color.line, ...paperStyle(false), ...TOKENS.sectionPad }}>
          <div className="mx-auto max-w-[1440px] px-4 md:px-6">
            <div className="rounded-[32px] p-6 md:p-10" style={{ background: TOKENS.color.paper2, border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.lift }}>
              <Eyebrow>11 · Contacto y seguimiento</Eyebrow>
              <h2 className="mt-4 text-[clamp(2rem, 4vw, 3.5rem)] font-black" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>
                ¿tienes duda o quieres saber más?
              </h2>
              <p className="mt-4 text-lg leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                Escríbeme directamente para recibir documentación adicional, reportes o para validar fuentes.
                También puedes seguir avances y piezas nuevas por canales directos.
              </p>
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <a
                  className="rounded-[20px] border p-4 font-semibold transition hover:bg-white print-link-row"
                  style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.88)", color: TOKENS.color.warm }}
                  href={buildContactMailto(CONTACT_DATA.email, "Duda desde la web de Gaceta Tu Espacio")}
                >
                  Enviar correo a contacto@yosoy.mx
                </a>
                <a
                  className="rounded-[20px] border p-4 font-semibold transition hover:bg-white print-link-row"
                  style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.88)", color: TOKENS.color.warm }}
                  href={CONTACT_DATA.tiktokUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  TikTok @joseca_npc
                </a>
                <a
                  className="rounded-[20px] border p-4 font-semibold transition hover:bg-white print-link-row"
                  style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.88)", color: TOKENS.color.warm }}
                  href={CONTACT_DATA.site}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visitar sitio: yosoymx.com
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed bottom-3 left-2 right-2 z-40 md:hidden">
        <SharePanel
          surface="mobile-sticky"
          sharePayload={sharePayload}
          summaryText={SHARE_DEFAULT_SUMMARY}
          quoteText={SHARE_DEFAULT_QUOTE}
          compact
          className="rounded-[20px] border bg-white/96 px-2 py-3 shadow-xl"
          onAction={trackShareAction}
        />
      </div>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: TOKENS.color.line, background: TOKENS.color.paper2 }}>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-10 text-sm md:flex-row md:items-center md:justify-between md:px-6" style={{ color: "rgba(66,52,43,0.68)" }}>
          <div>
            <div className="font-semibold" style={{ color: TOKENS.color.ink }}>Gaceta Tu Espacio Eje Central · Primera edición</div>
            <div>Artículo oficial, archivo real, fuentes verificables visibles.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Artículo oficial", "Fuentes verificables", "Primera edición", "Marzo 2026"].map((x) => (
              <Badge key={x} className="rounded-full border-0 shadow-none" style={{ background: "rgba(255,255,255,0.9)", color: TOKENS.color.inkSoft }}>
                {x}
              </Badge>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
