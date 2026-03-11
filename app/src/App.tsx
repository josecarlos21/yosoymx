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
  Siren,
  Waves,
  TrendingUp,
  Users,
  Volume2,
  BarChart3,
  AlertOctagon,
  Menu,
  X
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  { id: "fuentes", label: "Fuentes", icon: Link2 },
  { id: "recursos", label: "Recursos", icon: BookOpen },
];

type PdfResource = {
  id: string;
  title: string;
  description: string;
  fileName: string;
  href: string;
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

// Main App
export default function MicrositioAcosoVecinal2026() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("portada");
  const [readProgress, setReadProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRafRef = useRef<number | null>(null);

  // Scroll spy & Progress setup
  const observer = useRef<IntersectionObserver | null>(null);

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
    try {
      await navigator.clipboard.writeText(text);
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
      setCopied(true);
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Fallo al copiar", err);
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  const downloadEscrito = (text: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "denuncia_acoso_vecinal.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPdf = (resource: PdfResource) => {
    const href = new URL(normalizePdfHref(resource.href), window.location.origin).toString();
    try {
      const link = document.createElement("a");
      link.href = href;
      link.download = resource.fileName;
      link.rel = "noopener";
      link.style.display = "none";
      link.ariaLabel = `Descargar ${resource.title}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error descargando PDF", err);
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

        @media print {
          @page {
            margin: 2cm;
            size: letter;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          body {
            background: #f6efe3 !important;
            color: black !important;
            font-size: 11pt;
          }

          nav, .print-hide, .framer-motion-container {
            display: none !important;
          }

          .print-document {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-document section {
            font-size: 10.8pt;
            page-break-inside: auto;
            break-inside: auto;
            border-top: 1px solid #ddd !important;
            padding-top: 2cm !important;
            margin-top: 1cm !important;
          }

          h1, h2, h3 {
            page-break-after: avoid;
            page-break-before: avoid;
            color: #18120e !important;
          }

          h4, h5, p, ul, ol, li, blockquote {
            page-break-inside: avoid;
          }

          p, div {
            color: #2b2219 !important;
          }

          a {
            text-decoration: none;
            color: #8f2f1c !important;
          }
          
          a[href^="http"]:after {
            content: " (" attr(href) ")";
            font-size: 0.85em;
            font-style: italic;
          }

          .rounded-\[34px\], .rounded-\[28px\], .rounded-\[20px\], .rounded-\[30px\], .rounded-\[40px\] {
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            background: #fffaf3 !important;
            print-color-adjust: exact;
            break-inside: avoid;
          }

          .rounded-\[34px\] .text-[13px],
          .rounded-\[28px\] .text-\[11px\] {
            color: #42342b !important;
          }
        }
      `}</style>

      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md" style={{ background: "rgba(246,239,227,0.92)", borderColor: TOKENS.color.line }}>
        {/* Progress bar */}
        <div className="absolute top-0 left-0 h-[3px] bg-gradient-to-r from-[#c95e2a] to-[#8f2f1c] z-50" style={{ width: `${readProgress * 100}%`, transition: 'width 0.1s ease-out' }} />
        <div className="mx-auto max-w-[1440px] px-4 md:px-6">
          <div className="flex h-16 items-center justify-between">
            <button
              onClick={() => scrollToSection("portada")}
              className="text-lg font-black tracking-tight"
              style={{ fontFamily: TOKENS.font.display }}
            >
              <span style={{ color: TOKENS.color.ink }}>Gaceta Tu Espacio </span>
              <span style={{ color: TOKENS.color.warm }}>Eje Central</span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {sectionMeta.map(({ id, label, icon: Icon }, index) => {
                const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
                return (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-all"
                    style={{
                      color: activeSection === id ? TOKENS.color.warm : TOKENS.color.inkSoft,
                      background: activeSection === id ? "rgba(201,94,42,0.1)" : "transparent"
                    }}
                  >
                    <span className="text-[10px] font-bold tracking-widest opacity-60 w-4 text-center">{romanNumerals[index]}</span>
                    {label}
                  </button>
                )
              })}
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
                {["#AcosoVecinal", "#GentrificaciónCDMX", "#DerechoALaVivienda", "#RuidoYSalud", "#DesplazamientoForzado"].map((tag) => (
                  <span key={tag} className="rounded-full px-4 py-2 text-sm" style={{ background: "rgba(201,94,42,0.1)", color: TOKENS.color.warm }}>
                    {tag}
                  </span>
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
                className="group flex flex-col bg-white rounded-3xl p-8 text-left transition-all hover:-translate-y-1 hover:shadow-xl print-anchor"
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
              </a>
            ))}
          </div>
        </section>
      </main>

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
