import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    AudioWaveform,
    BookOpenText,
    Building2,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    FileText,
    Gavel,
    GalleryVerticalEnd,
    HeartPulse,
    Home,
    Landmark,
    Link2,
    MapPin,
    MessageSquareWarning,
    Newspaper,
    Quote,
    Scale,
    ScrollText,
    ShieldAlert,
    Siren,
    Waves,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
        soft: "0 6px 18px rgba(62, 41, 22, 0.05)",
        deep: "0 10px 30px rgba(34, 23, 16, 0.12)",
        lift: "0 14px 40px rgba(24, 18, 14, 0.08)",
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

const sectionMeta = [
    { id: "portada", label: "Portada", icon: Newspaper },
    { id: "problema", label: "Problema", icon: AlertTriangle },
    { id: "mecanica", label: "Mecánica", icon: AudioWaveform },
    { id: "casos", label: "China", icon: Landmark },
    { id: "impacto", label: "Impacto", icon: HeartPulse },
    { id: "acciones", label: "CDMX", icon: Building2 },
    { id: "fuentes", label: "Fuentes", icon: Link2 },
    { id: "escrito", label: "Escrito", icon: ScrollText },
];

const editorialGallery = [
    {
        src: "https://society.people.com.cn/mediafile/pic/20231023/4/16866223863776453172.jpg",
        alt: "Cobertura visual en prensa china sobre el fenómeno zhenlouqi",
        kicker: "China · prensa",
        caption: "Archivo contemporáneo sobre el fenómeno 震楼器: imagen-documento, no espectáculo.",
        credit: "People's Daily / prensa china",
    },
    {
        src: "https://upload.wikimedia.org/wikipedia/commons/1/10/Portada_El_Mundo_Ilustrado_1896.jpg",
        alt: "Portada de El Mundo Ilustrado de 1896",
        kicker: "México · hemeroteca",
        caption: "La lógica visual del sitio toma aire de portadas ilustradas mexicanas de fin de siglo.",
        credit: "Wikimedia Commons / El Mundo Ilustrado, 1896",
    },
    {
        src: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Caricatura_de_Zapata1.jpg",
        alt: "Portada de El Ahuizote con caricatura política",
        kicker: "México · prensa satírica",
        caption: "El gesto editorial mexicano también vive en la caricatura política y la composición de portada.",
        credit: "Wikimedia Commons / El Ahuizote",
    },
];

const problemas = [
    {
        icon: Home,
        title: "La vivienda deja de ser refugio",
        text: "El golpe real no siempre es el volumen. Es la pérdida de seguridad dentro del propio espacio.",
    },
    {
        icon: HeartPulse,
        title: "La salud mental sí entra aquí",
        text: "Sueño roto, ansiedad, hipervigilancia, irritabilidad y llanto son efectos esperables, no sobreactuación.",
    },
    {
        icon: Gavel,
        title: "La respuesta suele llegar fragmentada",
        text: "Condominio, ruido, ambiente, delito, discriminación: cuando nadie integra el caso, el acoso se mete por la grieta.",
    },
];

const timeline = [
    { step: "Ruido o conflicto inicial", detail: "Todo comienza con un episodio que parece menor: música fuerte, golpes aislados, un reclamo vecinal. Pero la semilla del patrón ya está ahí." },
    { step: "Respuesta institucional insuficiente", detail: "La administración no actúa, la autoridad minimiza, el caso se archiva como 'pleito de vecinos'. Esa inacción alimenta la siguiente fase." },
    { step: "Represalia acústica o vibratoria", detail: "El ruido se convierte en herramienta: golpes rítmicos, vibración transmitida por estructura, horarios deliberados. Ya no es molestia: es hostigamiento." },
    { step: "Escalada y afectación a terceros", detail: "El conflicto deja de ser bilateral. Otros vecinos resultan afectados, la tensión crece y el edificio entero entra en crisis de convivencia." },
    { step: "Desgaste, miedo o presión para salir", detail: "El objetivo final del acoso sostenido: que la víctima abandone su vivienda. El desplazamiento forzado es el resultado más grave." },
];

const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

const casosChina = [
    {
        ciudad: "Guangzhou",
        año: "2021–2024",
        titulo: "Uso deliberado y constatación in situ",
        texto:
            "La cobertura y el tratamiento judicial apuntan a un patrón verificable: dispositivo, horarios, escalada y mediación posterior.",
    },
    {
        ciudad: "Shanghai",
        año: "2016–2021",
        titulo: "Daño expandido a varios departamentos",
        texto:
            "Una represalia planeada contra una vivienda termina afectando la estructura y amplificando el conflicto social entero.",
    },
    {
        ciudad: "Changsha",
        año: "2024",
        titulo: "Escalada más allá del ruido",
        texto:
            "El patrón importante no es el artefacto por sí solo, sino la facilidad con la que el hostigamiento deriva en violencia directa.",
    },
    {
        ciudad: "Chengdu",
        año: "2023–2025",
        titulo: "Prueba técnica difícil",
        texto:
            "Las barreras clásicas: origen intermitente, vibración estructural, acceso restringido y dificultad para medir baja frecuencia en campo.",
    },
];

const danos = [
    "Alteración del sueño",
    "Ansiedad y estrés sostenido",
    "Hipervigilancia",
    "Deterioro de concentración",
    "Conflicto social crónico",
    "Riesgo de desplazamiento de vivienda",
];

const autoridades = [
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
        label: "COPRED",
        title: "Discriminación y vivienda",
        text: "Si el hostigamiento se cruza con exclusión, segregación o presión por perfil social, económico o condición de arrendatario, esta vía importa.",
        href: "https://copred.cdmx.gob.mx/servicios/servicio/denuncia",
        meta: "Atención de casos / General Prim 10",
    },
    {
        icon: Siren,
        label: "Emergencia",
        title: "Seguridad y constancia inmediata",
        text: "Cuando el episodio está ocurriendo con riesgo, amenaza o agresión, la prioridad es seguridad y constancia en tiempo real.",
        href: "https://paot.org.mx/micrositios/sabias_que/RUIDO/denuncia.html",
        meta: "911 / SSC / Juzgado Cívico",
    },
];

const fuentes = [
    {
        group: "Diseño",
        title: "Google Fonts: Fraunces",
        note: "Variable font expresiva inspirada en viejos estilos de display, útil para titulares con carácter sin caer en caricatura.",
        href: "https://design.google/library/a-new-take-on-old-style-typeface",
    },
    {
        group: "Diseño",
        title: "Google Fonts: Spectral",
        note: "Serif screen-first pensada para entornos ricos en texto y lectura prolongada; ideal para la capa editorial del micrositio.",
        href: "https://design.google/library/spectral-new-screen-first-typeface",
    },
    {
        group: "Archivo",
        title: "UNAM · Hemeroteca Nacional",
        note: "La colección de Publicaciones Periódicas Mexicanas 1728–1916 documenta títulos clave como Gaceta de México, El Monitor Republicano, El Ahuizote y El Mundo Ilustrado.",
        href: "https://bnm.iib.unam.mx/index.php/hemeroteca-nacional-de-mexico/colecciones/fondo-reservado/74-publicaciones-periodicas-mexicanas-1728-1916",
    },
    {
        group: "Salud",
        title: "WHO · Environmental noise",
        note: "La OMS vincula el ruido ambiental con annoyance, sleep disturbance y evidencia creciente sobre salud mental y otros daños.",
        href: "https://www.who.int/tools/compendium-on-health-and-environment/environmental-noise/",
    },
    {
        group: "China",
        title: "People’s Daily / prensa china",
        note: "Base documental útil para el fenómeno 震楼器 y su tratamiento público en China.",
        href: "https://paper.people.com.cn/rmrb/html/2024-06/27/nw.D110000renmrb_20240627_3-19.htm",
    },
];

const escrito = `ASUNTO: Denuncia y solicitud de actuación coordinada por acoso vecinal mediante ruido y vibración estructural.

A quien corresponda:

Por medio del presente expongo que en el inmueble ubicado en [DOMICILIO] se presentan episodios reiterados de vibración y/o ruido de carácter impulsivo, de baja frecuencia o retumbante, principalmente en los horarios [HORARIOS], con una duración aproximada de [DURACIÓN].

La afectación se percibe en piso, techo y/o muros, altera el sueño, la concentración y la estabilidad emocional, y además impacta a otras viviendas del entorno. El patrón no corresponde a una molestia aislada, sino a un hostigamiento persistente con efectos reales sobre la salud mental y la permanencia digna en la vivienda.

Solicito:
1. Admisión de la denuncia y asignación de folio.
2. Verificación in situ en los horarios de mayor incidencia.
3. Canalización coordinada según competencia: justicia cívica, vía condominal, vía ambiental, vía penal y/o antidiscriminación.
4. Medidas preventivas y de no repetición.
5. Protección contra represalias.

Adjunto:
- Bitácora de hechos.
- Audios, videos y testigos.
- Comunicaciones con administración y autoridades.
- Cualquier constancia médica o psicológica disponible.

ATENTAMENTE
[NOMBRE]
[TELÉFONO / CORREO]
[FECHA]`;

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
            className="rounded-[10px] border-0 shadow-none"
            style={{
                background: "rgba(255,250,243,0.9)",
                border: TOKENS.cardBorder,
                boxShadow: TOKENS.shadow.soft,
            }}
        >
            <CardContent className="p-5 md:p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[6px]" style={{ background: "rgba(201,94,42,0.12)", color: TOKENS.color.warm }}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="mb-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: TOKENS.color.warm }}>Columna</div>
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
                <div className="h-full rounded-full" style={{ width: `${value}%`, background: `linear-gradient(90deg, ${TOKENS.color.warm2}, ${TOKENS.color.warm})` }} />
            </div>
        </div>
    );
}

function AuthorityCard({ icon: Icon, label, title, text, href, meta }: { icon: React.ComponentType<any>; label: string; title: string; text: string; href: string; meta: string }) {
    return (
        <Card className="rounded-[10px] border-0 shadow-none" style={{ background: "rgba(255,255,255,0.66)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
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

function SourceCard({ group, title, note, href }: { group: string; title: string; note: string; href: string }) {
    return (
        <div className="rounded-[10px] p-5" style={{ background: "rgba(255,255,255,0.66)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <Badge className="rounded-full border-0 shadow-none" style={{ background: "rgba(255,255,255,0.9)", color: TOKENS.color.warm }}>
                    {group}
                </Badge>
                <Link2 className="h-4 w-4" style={{ color: TOKENS.color.warm }} />
            </div>
            <h3 className="mb-2 text-lg font-black" style={{ fontFamily: TOKENS.font.display }}>{title}</h3>
            <p className="mb-4 text-sm leading-7" style={{ color: "rgba(66,52,43,0.8)" }}>{note}</p>
            <SourceLink href={href}>Fuente</SourceLink>
        </div>
    );
}

function ExpandableSection({
    id,
    title,
    kicker,
    summary,
    open,
    onToggle,
    children,
    dark = false,
    image,
    icon: Icon = Newspaper,
}: {
    id: string;
    title: string;
    kicker: string;
    summary: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    dark?: boolean;
    image?: { src: string; alt: string };
    icon?: React.ComponentType<any>;
}) {
    return (
        <section
            id={id}
            className="border-b"
            style={{
                borderColor: dark ? "rgba(255,255,255,0.08)" : TOKENS.color.line,
                ...paperStyle(dark),
                ...TOKENS.sectionPad,
            }}
        >
            <div className="mx-auto max-w-[1440px] px-4 md:px-6">
                <button onClick={onToggle} className="group w-full text-left" aria-expanded={open} aria-controls={`${id}-panel`}>
                    <div
                        className="rounded-[12px] p-5 md:p-6"
                        style={{
                            background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.72)",
                            border: dark ? "1px solid rgba(255,255,255,0.08)" : TOKENS.cardBorder,
                            boxShadow: dark ? "none" : TOKENS.shadow.soft,
                        }}
                    >
                        <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto]">
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: dark ? "rgba(255,255,255,0.08)" : "rgba(201,94,42,0.12)", color: dark ? TOKENS.color.sand : TOKENS.color.warm }}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <Eyebrow>{kicker}</Eyebrow>
                                </div>
                                <div>
                                    <h2 className="font-black tracking-tight" style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(1.8rem, 3.8vw, 3.8rem)", lineHeight: 0.96, color: dark ? TOKENS.color.cream : TOKENS.color.ink }}>
                                        {title}
                                    </h2>
                                    <p className="mt-3 max-w-3xl text-sm leading-8 md:text-[16px]" style={{ color: dark ? "rgba(255,250,243,0.78)" : "rgba(66,52,43,0.82)", fontFamily: TOKENS.font.editorial }}>
                                        {summary}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-4">
                                {image ? (
                                    <div className="hidden overflow-hidden rounded-[8px] lg:block" style={{ width: 160, height: 110, border: dark ? "1px solid rgba(255,255,255,0.08)" : TOKENS.cardBorder }}>
                                        <img src={image.src} alt={image.alt} className="h-full w-full object-cover" style={{ filter: "sepia(.22) contrast(.98) saturate(.92)" }} />
                                    </div>
                                ) : null}
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-[1.03]" style={{ background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)", color: dark ? TOKENS.color.cream : TOKENS.color.warm }}>
                                    <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
                                </div>
                            </div>
                        </div>
                    </div>
                </button>

                {open ? (
                    <motion.div id={`${id}-panel`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="pt-6">
                        {children}
                    </motion.div>
                ) : null}
            </div>
        </section>
    );
}

export default function MicrositioAcosoVecinal2026() {
    const [openSections, setOpenSections] = useState < Record < string, boolean>> ({
        portada: true,
        problema: true,
        mecanica: false,
        casos: true,
        impacto: false,
        acciones: false,
        fuentes: false,
        escrito: false,
    });
    const [activeSection, setActiveSection] = useState("portada");
    const [readProgress, setReadProgress] = useState(0);
    const [copied, setCopied] = useState(false);
    const [showMobileNav, setShowMobileNav] = useState(false);

    const toggleSection = (id: string) => setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
    const openOnlyPortada = () => setOpenSections({ portada: true, problema: false, mecanica: false, casos: false, impacto: false, acciones: false, fuentes: false, escrito: false });
    const openAll = () => setOpenSections({ portada: true, problema: true, mecanica: true, casos: true, impacto: true, acciones: true, fuentes: true, escrito: true });
    const openedCount = useMemo(() => Object.values(openSections).filter(Boolean).length, [openSections]);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            setReadProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);

            const sections = sectionMeta.map(s => document.getElementById(s.id)).filter(Boolean);
            for (let i = sections.length - 1; i >= 0; i--) {
                const rect = sections[i].getBoundingClientRect();
                if (rect.top <= 160) { setActiveSection(sectionMeta[i].id); break; }
            }
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const copyEscrito = useCallback(() => {
        navigator.clipboard.writeText(escrito).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); });
    }, []);

    const downloadEscrito = useCallback(() => {
        const blob = new Blob([escrito], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "Escrito_Denuncia_Acoso_Vecinal_2026.txt"; a.click();
        URL.revokeObjectURL(url);
    }, []);

    const handlePrint = useCallback(() => {
        setOpenSections({ portada: true, problema: true, mecanica: true, casos: true, impacto: true, acciones: true, fuentes: true, escrito: true });
        setTimeout(() => window.print(), 350);
    }, []);

    const scrollToSection = (id) => {
        setOpenSections(prev => ({ ...prev, [id]: true }));
        setTimeout(() => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
        setShowMobileNav(false);
    };

    return (
        <div className="min-h-screen" style={shellStyle()}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,300..900,0..100,0..1&family=Inter:wght@400;500;600;700;800&family=Spectral:wght@400;500;600;700;800&display=swap');
        html { scroll-behavior: smooth; }
        * { box-sizing: border-box; }
        ::selection { background: rgba(201,94,42,.18); }

        @media print {
          @page { margin: 2cm 1.8cm; size: letter; }
          html { scroll-behavior: auto; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print, .sticky-nav, .reading-progress, .mobile-menu-btn { display: none !important; }
          .print-break { page-break-before: always; }
          section { break-inside: avoid-page; }
          section[id] > div > button { display: none !important; }
          section[id] div[id$="-panel"] { display: block !important; opacity: 1 !important; }
          img { filter: grayscale(0.3) contrast(1.05) !important; max-height: 240px !important; }
          a[href]::after { content: " (" attr(href) ")"; font-size: 9px; color: #666; word-break: break-all; }
          .print-only { display: block !important; }
          h1, h2, h3 { orphans: 3; widows: 3; }
          pre { white-space: pre-wrap !important; font-size: 11px !important; border: 1px solid #ccc !important; }
          footer::before { content: "Gaceta del Ruido · Edición Especial · CDMX 2026 · Publicación de archivo y referencia"; display: block; text-align: center; font-size: 9px; color: #999; padding: 12px 0; border-top: 1px solid #ddd; margin-top: 24px; }
        }
        .print-only { display: none; }
      `}</style>

            {/* Reading progress */}
            <div className="reading-progress" style={{ position: "fixed", top: 0, left: 0, width: `${readProgress}%`, height: 3, background: `linear-gradient(90deg, ${TOKENS.color.warm2}, ${TOKENS.color.warm})`, zIndex: 60, transition: "width 0.15s ease-out" }} />

            {/* Sticky editorial nav */}
            <nav className="sticky-nav" style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(246,239,227,0.92)", backdropFilter: "blur(16px) saturate(1.6)", borderBottom: `1px solid ${TOKENS.color.line}`, fontFamily: TOKENS.font.body }}>
                <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 md:px-6" style={{ height: 52 }}>
                    <button className="mobile-menu-btn flex items-center gap-2 md:hidden" onClick={() => setShowMobileNav(!showMobileNav)} style={{ color: TOKENS.color.ink, fontSize: 13, fontWeight: 700 }}>
                        <Newspaper className="h-4 w-4" /> Secciones <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMobileNav ? "rotate-180" : ""}`} />
                    </button>
                    <div className="hidden items-center gap-1 md:flex">
                        {sectionMeta.map(({ id, label, icon: Icon }, i) => (
                            <button key={id} onClick={() => scrollToSection(id)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all" style={{ background: activeSection === id ? "rgba(143,47,28,0.12)" : "transparent", color: activeSection === id ? TOKENS.color.warm : TOKENS.color.inkSoft, fontWeight: activeSection === id ? 700 : 500 }}>
                                <Icon className="h-3.5 w-3.5" />
                                <span className="hidden lg:inline">{romanNumerals[i]}.</span> {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint} className="no-print flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-opacity hover:opacity-80" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream }}>
                            <FileText className="h-3.5 w-3.5" /> Imprimir
                        </button>
                    </div>
                </div>
                {showMobileNav && (
                    <div className="border-t px-4 pb-3 md:hidden" style={{ borderColor: TOKENS.color.line }}>
                        {sectionMeta.map(({ id, label, icon: Icon }, i) => (
                            <button key={id} onClick={() => scrollToSection(id)} className="flex w-full items-center gap-3 border-b px-2 py-3 text-sm" style={{ borderColor: TOKENS.color.line, color: activeSection === id ? TOKENS.color.warm : TOKENS.color.inkSoft, fontWeight: activeSection === id ? 700 : 400 }}>
                                <Icon className="h-4 w-4" /> <span>{romanNumerals[i]}. {label}</span>
                                {openSections[id] && <span className="ml-auto text-[10px] uppercase tracking-widest" style={{ color: TOKENS.color.warm }}>abierto</span>}
                            </button>
                        ))}
                    </div>
                )}
            </nav>

            <header style={{ ...paperStyle(false), borderBottom: `1px solid ${TOKENS.color.line}` }}>
                <div className="mx-auto max-w-[1440px] px-4 pt-6 md:px-6 md:pt-8">
                    <div className="grid gap-3 border-y py-3 md:grid-cols-3" style={{ borderColor: TOKENS.color.line }}>
                        <div className="text-[11px] uppercase tracking-[0.32em]" style={{ color: TOKENS.color.inkSoft }}>
                            Ciudad de México · Edición especial
                        </div>
                        <div className="text-center text-[11px] uppercase tracking-[0.34em]" style={{ color: TOKENS.color.warm }}>
                            Dossier periodístico · Vivienda / ruido / vibración
                        </div>
                        <div className="text-left text-[11px] uppercase tracking-[0.32em] md:text-right" style={{ color: TOKENS.color.inkSoft }}>
                            Año MMXXVI · Número extraordinario
                        </div>
                    </div>

                    <div className="grid gap-4 py-6 md:grid-cols-[0.24fr_0.52fr_0.24fr] md:items-end">
                        <div className="space-y-2">
                            <div className="text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Fechado</div>
                            <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                Ciudad de México · Marzo de 2026
                            </p>
                        </div>

                        <div className="text-center">
                            <div
                                className="text-[13px] uppercase tracking-[0.45em]"
                                style={{ color: TOKENS.color.warm, fontFamily: TOKENS.font.body }}
                            >
                                Edición especial
                            </div>
                            <div
                                className="mt-2 text-[clamp(2.4rem,5.6vw,5.2rem)] font-black leading-none tracking-tight"
                                style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}
                            >
                                Gaceta del Ruido
                            </div>
                            <div
                                className="mt-2 text-[13px] uppercase tracking-[0.28em]"
                                style={{ color: TOKENS.color.inkSoft }}
                            >
                                China / CDMX / salud mental / vivienda
                            </div>
                        </div>

                        <div className="space-y-2 md:text-right">
                            <div className="text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Tema central</div>
                            <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                Acoso vecinal por ruido y vibración
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 border-t pb-4 pt-3 md:grid-cols-[1fr_auto_auto] md:items-center" style={{ borderColor: TOKENS.color.line }}>
                        <div>
                            <div
                                className="text-[15px] leading-7 md:text-[17px]"
                                style={{ fontFamily: TOKENS.font.editorial, color: TOKENS.color.ink }}
                            >
                                Un formato de periódico impreso adaptado a pantalla: menos sensación de landing, más lectura de edición, archivo y suplemento.
                            </div>
                        </div>

                        <div className="hidden items-center gap-2 lg:flex">
                            <div className="rounded-full px-3 py-1.5 text-xs" style={{ background: "rgba(255,255,255,0.82)", color: TOKENS.color.inkSoft, border: TOKENS.cardBorder }}>
                                {openedCount} secciones abiertas
                            </div>
                            <Button variant="secondary" className="rounded-full border-0 bg-white/80 shadow-none" onClick={openAll}>
                                Abrir edición completa
                            </Button>
                            <Button variant="secondary" className="rounded-full border-0 bg-white/80 shadow-none" onClick={openOnlyPortada}>
                                Cerrar todo menos portada
                            </Button>
                        </div>

                        <Button asChild className="rounded-full border-0 shadow-none" style={{ background: TOKENS.color.warm, color: TOKENS.color.cream }}>
                            <a href="#escrito">Ir al escrito</a>
                        </Button>
                    </div>
                </div>
            </header>

            <main>
                <ExpandableSection
                    id="portada"
                    title="Acoso vecinal por ruido y vibración: del fenómeno documentado en China a la ruta institucional en CDMX"
                    kicker="Portada · Primera plana"
                    summary="La portada ya no abre como homepage. Abre como edición impresa: titular principal, bajada, foto líder, notas secundarias, columna lateral y contexto suficiente para entender el caso desde el primer vistazo."
                    open={openSections.portada}
                    onToggle={() => toggleSection("portada")}
                    image={editorialGallery[1]}
                    icon={Newspaper}
                >
                    <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
                        <div className="grid gap-6">
                            <div
                                className="rounded-[8px] border bg-white/82 p-5 md:p-6"
                                style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}
                            >
                                <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-start">
                                    <div>
                                        <div className="mb-3 text-[11px] uppercase tracking-[0.3em]" style={{ color: TOKENS.color.warm }}>
                                            Nota principal
                                        </div>
                                        <h1
                                            className="max-w-5xl font-black tracking-tight"
                                            style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(3rem, 6.8vw, 6.4rem)", lineHeight: 0.9, color: TOKENS.color.ink }}
                                        >
                                            No es “pleito de vecinos”.
                                            <span className="mt-2 block" style={{ color: TOKENS.color.warm }}>
                                                Es hostigamiento que rompe vivienda, sueño y salud mental.
                                            </span>
                                        </h1>
                                        <p
                                            className="mt-4 max-w-4xl text-[18px] leading-9 md:text-[20px]"
                                            style={{ fontFamily: TOKENS.font.editorial, color: "rgba(24,18,14,0.92)" }}
                                        >
                                            El fenómeno conocido en China como <span className="font-semibold">震楼器 / zhènlóuqì</span> ayuda a nombrar algo que también puede leerse localmente: el uso deliberado de ruido, golpes o vibración estructural para desgastar, intimidar o empujar a una persona fuera de su vivienda.
                                        </p>
                                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                                            {[
                                                ["Qué es", "Uso deliberado de golpes o vibración transmitida por la estructura del edificio para afectar a otra vivienda."],
                                                ["Por qué importa", "No sólo altera la convivencia: puede afectar sueño, ansiedad, concentración y permanencia en el hogar."],
                                                ["Qué hacer", "Documentar, activar seguridad si ocurre en el momento y abrir ruta coordinada: condominio, ambiente, justicia cívica, fiscalía y derechos."],
                                            ].map(([title, text]) => (
                                                <div key={title} className="rounded-[6px] border bg-[#fffaf3] p-4" style={{ borderColor: TOKENS.color.line }}>
                                                    <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>{title}</div>
                                                    <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>{text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid gap-4">
                                        <figure className="overflow-hidden rounded-[6px] border bg-white" style={{ borderColor: TOKENS.color.line }}>
                                            <img
                                                src={editorialGallery[0].src}
                                                alt={editorialGallery[0].alt}
                                                className="h-[260px] w-full object-cover md:h-[360px]"
                                                style={{ filter: "sepia(.18) contrast(.99) saturate(.94)" }}
                                            />
                                            <figcaption className="border-t px-4 py-3" style={{ borderColor: TOKENS.color.line }}>
                                                <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: TOKENS.color.warm }}>{editorialGallery[0].kicker}</div>
                                                <p className="mt-1 text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>{editorialGallery[0].caption}</p>
                                            </figcaption>
                                        </figure>

                                        <div className="rounded-[6px] border bg-[#fffaf3] p-4" style={{ borderColor: TOKENS.color.line }}>
                                            <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>Bajada editorial</div>
                                            <p className="text-sm leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                                La ventaja del formato periódico no es sólo estética: permite jerarquizar el caso como si fuera una edición impresa, con una historia principal, recuadros de contexto, notas laterales y un suplemento final de acción.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                                <div className="rounded-[8px] border bg-white/82 p-5" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                                    <div className="mb-3 flex items-center gap-3">
                                        <Quote className="h-5 w-5" style={{ color: TOKENS.color.warm }} />
                                        <div className="text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Lead</div>
                                    </div>
                                    <p className="text-[16px] leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                        Cuando el ruido o la vibración se usan para castigar, intimidar o desgastar a una persona dentro de su vivienda, el daño deja de ser una simple incomodidad. La vivienda pierde su función básica de refugio y el conflicto se convierte en un problema de convivencia, salud y permanencia habitacional.
                                    </p>
                                    <div className="mt-4 border-t pt-4" style={{ borderColor: TOKENS.color.line }}>
                                        <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>Ejes del dossier</div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {[
                                                "China y casos documentados",
                                                "CDMX y rutas oficiales",
                                                "Salud mental",
                                                "Prueba y evidencia",
                                                "Escrito base",
                                            ].map((x) => (
                                                <span key={x} className="rounded-full px-3 py-1 text-xs" style={{ background: "rgba(255,255,255,0.92)", border: TOKENS.cardBorder, color: TOKENS.color.inkSoft }}>
                                                    {x}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    {editorialGallery.slice(1).map((image) => (
                                        <figure key={image.src} className="overflow-hidden rounded-[6px] border bg-white/84" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                                            <img src={image.src} alt={image.alt} className="h-[210px] w-full object-cover" style={{ filter: "sepia(.26) contrast(.98) saturate(.92)" }} />
                                            <figcaption className="space-y-1 px-4 py-3">
                                                <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: TOKENS.color.warm }}>{image.kicker}</div>
                                                <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>{image.caption}</p>
                                            </figcaption>
                                        </figure>
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-3">
                                {[
                                    ["Fenómeno", "En China, el nombre 震楼器 ya permite identificar un patrón de represalia acústica o vibratoria que se volvió visible en prensa y debate público."],
                                    ["Prueba", "Uno de los grandes problemas es demostrar origen, horario, repetición y transmisión estructural cuando el episodio es intermitente o el acceso al domicilio es limitado."],
                                    ["Lectura local", "En CDMX el término puede no existir en la norma, pero sí existen rutas oficiales por ruido, vibración, conflicto condominal, hostigamiento y posible afectación a derechos."],
                                ].map(([title, text]) => (
                                    <div key={title} className="rounded-[6px] border bg-white/82 p-4" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                                        <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>{title}</div>
                                        <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>{text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <aside className="grid gap-4">
                            <div className="rounded-[8px] border p-5 md:p-6" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream, borderColor: "rgba(255,255,255,0.08)", boxShadow: TOKENS.shadow.deep }}>
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.1)" }}>
                                        <AudioWaveform className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.color.sand }}>Mapa del daño</div>
                                        <div className="text-xs" style={{ color: "rgba(255,250,243,0.68)" }}>Recuadro lateral de primera plana.</div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <MetricBar label="Interrupción del sueño" value={92} note="muy alto" dark />
                                    <MetricBar label="Estrés / ansiedad" value={88} note="alto" dark />
                                    <MetricBar label="Conflicto social" value={84} note="alto" dark />
                                    <MetricBar label="Riesgo de desplazamiento" value={71} note="creciente" dark />
                                </div>
                            </div>

                            <div className="rounded-[8px] border bg-white/82 p-5 md:p-6" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                                <div className="mb-4 flex items-center gap-3">
                                    <GalleryVerticalEnd className="h-5 w-5" style={{ color: TOKENS.color.warm }} />
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Mesa visual</div>
                                </div>
                                <div className="grid gap-3">
                                    {editorialGallery.map((image) => (
                                        <div key={image.src} className="grid grid-cols-[84px_1fr] gap-3 rounded-[6px] bg-white p-3" style={{ border: TOKENS.cardBorder }}>
                                            <img src={image.src} alt={image.alt} className="h-[84px] w-[84px] rounded-[4px] object-cover" style={{ filter: "sepia(.22) contrast(.99) saturate(.94)" }} />
                                            <div>
                                                <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: TOKENS.color.warm }}>{image.kicker}</div>
                                                <p className="mt-1 text-sm leading-6" style={{ color: TOKENS.color.inkSoft }}>{image.credit}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-[8px] border bg-white/82 p-5" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                                <div className="mb-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Abrir suplementos</div>
                                <div className="grid gap-2">
                                    {sectionMeta.slice(1).map(({ id, label, icon: Icon }) => (
                                        <button
                                            key={id}
                                            onClick={() => setOpenSections((prev) => ({ ...prev, [id]: true }))}
                                            className="flex items-center justify-between rounded-[4px] border px-4 py-3 text-sm text-left"
                                            style={{ borderColor: TOKENS.color.line, background: "rgba(255,255,255,0.9)", color: TOKENS.color.inkSoft }}
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <Icon className="h-4 w-4" style={{ color: TOKENS.color.warm }} />
                                                Abrir {label}
                                            </span>
                                            <ChevronRight className="h-4 w-4" style={{ color: TOKENS.color.warm }} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    </div>
                </ExpandableSection>

                <ExpandableSection
                    id="problema"
                    title="Qué está pasando realmente"
                    kicker="01 · Problema"
                    summary="Esta sección abre como artículo central de interiores: más desarrollo, más contexto y menos caja bonita flotando. La idea es que se lea como texto impreso con apoyos visuales, no como interfaz de producto."
                    open={openSections.problema}
                    onToggle={() => toggleSection("problema")}
                    image={editorialGallery[2]}
                    icon={AlertTriangle}
                >
                    <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                        <div className="grid gap-6">
                            <div className="border-t pt-5" style={{ borderColor: TOKENS.color.line }}>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>Artículo central</div>
                                        <p className="text-[17px] leading-9" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                            En la práctica, el problema no siempre se presenta como una agresión abierta y simple. Muchas veces aparece como una secuencia de episodios de ruido, golpes, retumbes o vibraciones que parecen aislados cuando se observan uno por uno, pero que en conjunto producen una atmósfera de desgaste continuo. Esa repetición es parte del mecanismo: romper descanso, concentración, previsibilidad y sensación básica de hogar.
                                        </p>
                                        <p className="mt-4 text-[17px] leading-9" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                            La dificultad social del caso está en que, desde fuera, suele verse como simple conflicto vecinal. Sin embargo, cuando el patrón es deliberado, localizado y persistente, la lectura correcta ya no es “desacuerdo de convivencia”, sino hostigamiento con efectos materiales y psicológicos. El daño no se agota en el sonido: pasa al cuerpo, a la percepción del espacio y a la permanencia en la vivienda.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[17px] leading-9" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                            También importa distinguir entre ruido ambiental común y agresión estructural. En edificios, la transmisión de vibración por piso, techo o muros vuelve difícil identificar con precisión el origen inmediato, y eso produce una zona gris perfecta para negar, minimizar o fragmentar la respuesta institucional. Esa ambigüedad técnica suele jugar a favor del acosador.
                                        </p>
                                        <p className="mt-4 text-[17px] leading-9" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                            Por eso esta edición insiste en tres ejes: nombrar el fenómeno, ordenar la evidencia y conectar las vías disponibles. No basta con decir “me molestan”. Hay que poder explicar patrón, horarios, recurrencia, afectación, posibles testigos y la razón por la que el caso trasciende una simple incomodidad doméstica.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-3">
                                {problemas.map((item) => (
                                    <StoryCard key={item.title} {...item} />
                                ))}
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                {[
                                    ["Señal de alerta", "El patrón suele ser más claro cuando existe repetición en horarios específicos, coincidencia con presencia de la víctima o reacción inmediata tras actividades cotidianas."],
                                    ["Daño acumulado", "La suma de episodios cortos puede ser más destructiva que un solo evento intenso: rompe la continuidad del descanso y alimenta la hipervigilancia."],
                                    ["Lectura pública", "Si el caso se comunica mal, se percibe como “drama vecinal”. Si se comunica con orden, aparece como afectación real a vivienda, convivencia y salud."],
                                ].map(([title, text]) => (
                                    <div key={title} className="border bg-white/88 p-4" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                                        <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>{title}</div>
                                        <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>{text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <aside className="grid gap-4">
                            <figure className="overflow-hidden border bg-white/88" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                                <img src={editorialGallery[2].src} alt={editorialGallery[2].alt} className="h-[280px] w-full object-cover" style={{ filter: "sepia(.24) contrast(.98) saturate(.92)" }} />
                                <figcaption className="border-t px-4 py-3" style={{ borderColor: TOKENS.color.line }}>
                                    <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: TOKENS.color.warm }}>{editorialGallery[2].kicker}</div>
                                    <p className="mt-1 text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>{editorialGallery[2].caption}</p>
                                </figcaption>
                            </figure>

                            <div className="border bg-white/88 p-5" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                                <div className="mb-3 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>Criterio de interpretación</div>
                                <p className="text-sm leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                    Un caso de acoso acústico o vibratorio se vuelve legible cuando se observa como serie y no como episodio aislado. La impresión importa: el sitio ahora trata de reproducir esa lógica de lectura larga, como si el lector estuviera pasando páginas de una edición impresa.
                                </p>
                            </div>
                        </aside>
                    </div>
                </ExpandableSection>

                <ExpandableSection
                    id="mecanica"
                    title="Cómo escala el conflicto"
                    kicker="02 · Mecánica"
                    summary="La coreografía del hostigamiento casi siempre repite el mismo patrón: detonante pequeño, respuesta floja, represalia, escalada y desgaste. Aquí ya se lee como secuencia editorial, no como tabla fría."
                    open={openSections.mecanica}
                    onToggle={() => toggleSection("mecanica")}
                    image={editorialGallery[0]}
                    icon={AudioWaveform}
                >
                    <div className="grid gap-4 xl:grid-cols-5">
                        {timeline.map(({ step, detail }, i) => (
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                className="rounded-[10px] p-5"
                                style={{ background: "rgba(255,255,255,0.76)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}
                            >
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black" style={{ background: TOKENS.color.warm, color: TOKENS.color.cream }}>{i + 1}</div>
                                    {i < timeline.length - 1 ? <ChevronRight className="hidden h-4 w-4 xl:block" style={{ color: TOKENS.color.warm }} /> : null}
                                </div>
                                <h4 className="mb-2 text-[15px] font-bold" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>{step}</h4>
                                <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>{detail}</p>
                            </motion.div>
                        ))}
                    </div>
                </ExpandableSection>

                <ExpandableSection
                    id="casos"
                    title="Casos documentados y patrones observados"
                    kicker="03 · China"
                    summary="La sección China ahora entra más como página de investigación: no sólo fichas, también contexto sobre por qué el fenómeno se volvió visible, cómo se discute y qué obstáculos probatorios aparecen una y otra vez."
                    open={openSections.casos}
                    onToggle={() => toggleSection("casos")}
                    image={editorialGallery[0]}
                    icon={Landmark}
                >
                    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="grid gap-6">
                            <div className="border-t pt-5" style={{ borderColor: TOKENS.color.line }}>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <p className="text-[16px] leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                            En China, el término 震楼器 ayudó a volver visible una práctica que probablemente ya existía de forma dispersa: el uso de dispositivos o técnicas de golpeo/vibración para atacar a otra vivienda a través de la estructura del edificio. El valor del término es doble: nombra el fenómeno y permite rastrear discusión pública, mercado, reportajes y tratamiento judicial.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[16px] leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                            Lo importante no es fetichizar el aparato. Lo importante es ver el patrón. En prensa y discusión jurídica aparecen siempre los mismos nudos: conflicto vecinal previo, respuesta institucional insuficiente, escalada deliberada, afectación a terceros y prueba compleja cuando la vibración se transmite por muros, techos o pisos.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                {casosChina.map((caso) => (
                                    <Card key={caso.ciudad + caso.titulo} className="rounded-[10px] border-0 shadow-none" style={{ background: "rgba(255,255,255,0.82)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                                        <CardHeader>
                                            <div className="mb-1 flex items-center justify-between gap-3">
                                                <Badge className="rounded-full border-0 shadow-none" style={{ background: "rgba(255,255,255,0.9)", color: TOKENS.color.warm }}>{caso.año}</Badge>
                                                <div className="flex items-center gap-1 text-xs" style={{ color: "rgba(66,52,43,0.62)" }}><MapPin className="h-3.5 w-3.5" /> {caso.ciudad}</div>
                                            </div>
                                            <CardTitle className="text-[24px] leading-8" style={{ fontFamily: TOKENS.font.display }}>{caso.titulo}</CardTitle>
                                            <CardDescription className="text-sm leading-7" style={{ color: "rgba(66,52,43,0.78)" }}>{caso.texto}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                {[
                                    ["Mercado", "La discusión pública también se enfoca en la comercialización o reetiquetado de dispositivos, lo que muestra que no se trata sólo de un rumor aislado."],
                                    ["Prueba", "El cuello de botella técnico casi siempre es el mismo: documentar origen, intensidad, repetición y afectación cuando la fuente es intermitente o estructural."],
                                    ["Escalada", "Varias coberturas muestran que lo que empieza como ‘respuesta vecinal’ puede terminar afectando a todo un entorno y escalar a violencia más directa."],
                                ].map(([title, text]) => (
                                    <div key={title} className="border bg-white/88 p-4" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                                        <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>{title}</div>
                                        <p className="text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>{text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-6">
                            <div className="overflow-hidden border bg-white/82" style={{ borderColor: TOKENS.color.line, boxShadow: TOKENS.shadow.soft }}>
                                <img src={editorialGallery[0].src} alt={editorialGallery[0].alt} className="h-[300px] w-full object-cover" style={{ filter: "sepia(.34) contrast(.96) saturate(.92)" }} />
                                <div className="p-5">
                                    <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.warm }}>Prensa / archivo</div>
                                    <p className="mb-3 text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>
                                        La foto líder funciona como apertura de página: documento primero, decoración después. Eso refuerza la sensación de impreso y mantiene el foco en el contenido.
                                    </p>
                                    <SourceLink href="https://paper.people.com.cn/rmrb/html/2024-06/27/nw.D110000renmrb_20240627_3-19.htm">
                                        Ver base documental china
                                    </SourceLink>
                                </div>
                            </div>

                            <div className="border p-6 md:p-7" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream, borderColor: "rgba(255,255,255,0.08)", boxShadow: TOKENS.shadow.deep }}>
                                <div className="mb-4 flex items-center gap-3">
                                    <BookOpenText className="h-5 w-5" style={{ color: TOKENS.color.sand }} />
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.color.sand }}>Nota editorial</div>
                                </div>
                                <div className="space-y-4 text-sm leading-8" style={{ color: "rgba(255,250,243,0.84)" }}>
                                    <p>La sección conserva la capa moderna, pero ahora respira más como página de investigación impresa: artículo corto, caja explicativa, imagen líder y notas de apoyo.</p>
                                    <p>Eso la vuelve más legible y más creíble. Menos web bonita. Más edición con criterio.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ExpandableSection>

                <ExpandableSection
                    id="impacto"
                    title="Salud mental: no es una nota al pie"
                    kicker="04 · Impacto"
                    summary="Esta página se volvió más larga y más textual, como una nota de fondo impresa. La meta es que el lector se quede, no que pase por aquí como si fuera otro panel de UI."
                    open={openSections.impacto}
                    onToggle={() => toggleSection("impacto")}
                    image={editorialGallery[1]}
                    icon={HeartPulse}
                    dark
                >
                    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                        <Card className="rounded-[12px] border-0 bg-white/5 shadow-none">
                            <CardHeader>
                                <CardTitle className="text-3xl" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.cream }}>Daños frecuentes</CardTitle>
                                <CardDescription style={{ color: "rgba(255,250,243,0.68)" }}>Nombrarlos con claridad ya es parte de salir del laberinto.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                {danos.map((d) => (
                                    <div key={d} className="flex items-center gap-3 border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
                                        <CheckCircle2 className="h-5 w-5" style={{ color: TOKENS.color.sand }} />
                                        <span className="text-sm" style={{ color: "rgba(255,250,243,0.86)" }}>{d}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <div className="border p-6 md:p-7" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}>
                            <div className="mb-4 flex items-center gap-3" style={{ color: TOKENS.color.sand }}>
                                <MessageSquareWarning className="h-5 w-5" />
                                <div className="text-[11px] font-semibold uppercase tracking-[0.26em]">Nota clínica y social</div>
                            </div>
                            <div className="space-y-4 text-sm leading-8" style={{ color: "rgba(255,250,243,0.84)" }}>
                                <p>El daño no depende únicamente de decibeles. Importan la imprevisibilidad, la repetición, la sensación de invasión del espacio propio y la imposibilidad de controlar el entorno.</p>
                                <p>Cuando el episodio es intermitente, nocturno, impulsivo o vibratorio, el cuerpo no logra anticiparlo ni adaptarse bien. Eso favorece hipervigilancia, fatiga, irritabilidad y deterioro emocional.</p>
                                <p>Desde la salud pública, el ruido ambiental se relaciona con molestia intensa, trastornos del sueño y evidencia creciente sobre impactos en salud mental. En este tipo de casos, esa base ayuda a sacar la conversación del registro del “capricho” y llevarla al terreno del bienestar, la vivienda y la seguridad cotidiana.</p>
                                <div className="border p-5" style={{ background: "rgba(201,94,42,0.12)", borderColor: "rgba(201,94,42,0.22)" }}>
                                    <div className="mb-2 flex items-center gap-2 font-semibold"><HeartPulse className="h-4 w-4" /> Punto clave</div>
                                    <p className="text-sm leading-7" style={{ color: "rgba(255,243,234,0.9)" }}>
                                        Pedir una reacción impecable a alguien que lleva semanas o meses con sueño fragmentado es una tontería administrativa elegante. El impacto psicológico es parte central del caso.
                                    </p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
                                        <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.sand }}>Qué suele pasar</div>
                                        <p className="text-sm leading-7">Sueño roto, cansancio, irritabilidad, sensación de amenaza y dificultad para concentrarse incluso durante el día.</p>
                                    </div>
                                    <div className="border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
                                        <div className="mb-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: TOKENS.color.sand }}>Qué conviene documentar</div>
                                        <p className="text-sm leading-7">Horas de sueño interrumpidas, síntomas, episodios de ansiedad, consultas médicas y cualquier evidencia de deterioro funcional.</p>
                                    </div>
                                </div>
                                <SourceLink href="https://www.who.int/tools/compendium-on-health-and-environment/environmental-noise/" dark>
                                    Ver guía OMS sobre ruido ambiental
                                </SourceLink>
                            </div>
                        </div>
                    </div>
                </ExpandableSection>

                <ExpandableSection
                    id="acciones"
                    title="Ruta integrada de acción"
                    kicker="05 · CDMX"
                    summary="Esta parte ya se siente como suplemento práctico. Le metí más contenido para que funcione menos como menú y más como página utilitaria de una edición impresa."
                    open={openSections.acciones}
                    onToggle={() => toggleSection("acciones")}
                    image={editorialGallery[0]}
                    icon={Building2}
                >
                    <div className="grid gap-6">
                        <div className="border-t pt-5" style={{ borderColor: TOKENS.color.line }}>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <p className="text-[16px] leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                        En CDMX no existe una ventanilla única perfecta para este tipo de caso. Por eso la estrategia más útil es una ruta compuesta: seguridad si el evento está ocurriendo, condominio si hay relación vecinal/administrativa, ambiente si hay ruido o vibración, fiscalía si hay hostigamiento o delito, y derechos si existe discriminación o presión para expulsar.
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[16px] leading-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                        El objetivo no es dispersarse, sino construir un expediente legible. Cada contacto, llamada, correo, orientación o denuncia debe alimentar una misma narrativa documental: qué pasa, cuándo pasa, cómo afecta, quién fue notificado y qué respuesta se obtuvo.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-5">
                            {autoridades.map((item) => (
                                <AuthorityCard key={item.title} {...item} />
                            ))}
                        </div>

                        <div className="mt-2 grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                            <Card className="rounded-[12px] border-0 shadow-none" style={{ background: "rgba(255,255,255,0.66)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                                <CardHeader>
                                    <CardTitle className="text-3xl" style={{ fontFamily: TOKENS.font.display }}>Check de evidencia mínima</CardTitle>
                                    <CardDescription>Orden antes que pánico. Archivo antes que ruido discursivo.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-3 text-sm leading-7" style={{ color: TOKENS.color.inkSoft }}>
                                    {[
                                        "Bitácora diaria con fecha, hora, duración, intensidad percibida y efecto.",
                                        "Audios o videos con marcas de tiempo y contexto del lugar.",
                                        "Testigos o vecinos afectados por el mismo episodio.",
                                        "Capturas de mensajes, oficios o reportes a administración y autoridades.",
                                        "Constancias médicas o psicológicas si ya existe afectación clínica.",
                                    ].map((x) => (
                                        <div key={x} className="flex items-start gap-3 border p-4" style={{ background: "rgba(255,255,255,0.72)", borderColor: TOKENS.color.line }}>
                                            <CheckCircle2 className="mt-0.5 h-5 w-5" style={{ color: TOKENS.color.warm }} />
                                            <span>{x}</span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card className="rounded-[12px] border-0 shadow-none" style={{ background: "rgba(255,255,255,0.66)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                                <CardHeader>
                                    <CardTitle className="text-3xl" style={{ fontFamily: TOKENS.font.display }}>Qué exigir a la autoridad</CardTitle>
                                    <CardDescription>Lo concreto casi siempre humilla al discurso inflado.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {[
                                        "Reconocer explícitamente el acoso acústico y vibratorio en vivienda.",
                                        "Crear protocolo único: SSC + Juez Cívico + PROSOC + PAOT + FGJ + COPRED.",
                                        "Permitir medición real de baja frecuencia, impulsividad y vibración estructural.",
                                        "Proteger a inquilinos y propietarios ante hostigamiento para desplazamiento.",
                                        "Tratar la salud mental como daño real, no como nota marginal burocrática.",
                                    ].map((e) => (
                                        <div key={e} className="flex items-start gap-3 border p-4 text-sm leading-7" style={{ borderColor: TOKENS.color.line, color: TOKENS.color.inkSoft }}>
                                            <ChevronRight className="mt-1 h-4 w-4" style={{ color: TOKENS.color.warm }} />
                                            <span>{e}</span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </ExpandableSection>

                <ExpandableSection
                    id="fuentes"
                    title="Fuentes oficiales y base visual integradas"
                    kicker="06 · Fuentes"
                    summary="En formato periódico, las fuentes funcionan como archivo y pie de edición. Aquí se despliegan cuando hace falta verificar, no como navegación obligatoria desde arriba."
                    open={openSections.fuentes}
                    onToggle={() => toggleSection("fuentes")}
                    image={editorialGallery[1]}
                    icon={Link2}
                >
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
                        {fuentes.map((f) => (
                            <SourceCard key={f.title} {...f} />
                        ))}
                    </div>
                </ExpandableSection>

                <ExpandableSection
                    id="escrito"
                    title="Borrador listo para adaptar"
                    kicker="07 · Escrito"
                    summary="El cierre sigue siendo el documento accionable, pero ahora entra como suplemento final de la edición. Se abre cuando ya entendiste el caso y quieres pasar a la acción."
                    open={openSections.escrito}
                    onToggle={() => toggleSection("escrito")}
                    image={editorialGallery[2]}
                    icon={ScrollText}
                >
                    <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
                        <div className="grid gap-6">
                            <div className="rounded-[12px] p-6 md:p-7" style={{ background: TOKENS.color.cacao, color: TOKENS.color.cream, boxShadow: TOKENS.shadow.deep }}>
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                                    <ScrollText className="h-6 w-6" />
                                </div>
                                <h3 className="mb-3 text-2xl font-black" style={{ fontFamily: TOKENS.font.display }}>Cómo usarlo</h3>
                                <div className="space-y-3 text-sm leading-8" style={{ color: "rgba(255,250,243,0.84)" }}>
                                    <p>1. Cambia domicilio, fechas, horarios y síntomas reales.</p>
                                    <p>2. Adjunta bitácora, clips, testigos y mensajes.</p>
                                    <p>3. Duplica el escrito según autoridad competente.</p>
                                    <p>4. Conserva versión firmada y versión digital.</p>
                                </div>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <Button onClick={copyEscrito} className="rounded-full border-0 shadow-none" style={{ background: TOKENS.color.warm2, color: TOKENS.color.cream }}>
                                        <FileText className="mr-2 h-4 w-4" /> {copied ? "✓ Copiado al portapapeles" : "Copiar texto base"}
                                    </Button>
                                    <Button onClick={downloadEscrito} variant="secondary" className="rounded-full border-0 bg-white/10 shadow-none" style={{ color: TOKENS.color.cream }}>
                                        Guardar como .txt
                                    </Button>
                                    <Button onClick={handlePrint} variant="secondary" className="no-print rounded-full border-0 bg-white/10 shadow-none" style={{ color: TOKENS.color.cream }}>
                                        Imprimir edición
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-[12px] p-6" style={{ background: "rgba(255,255,255,0.74)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.soft }}>
                                <div className="mb-3 flex items-center gap-3" style={{ color: TOKENS.color.warm }}>
                                    <Quote className="h-5 w-5" />
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em]">Criterio editorial</div>
                                </div>
                                <p className="text-sm leading-8" style={{ color: TOKENS.color.inkSoft }}>
                                    La edición ya no te obliga a brincar por el sitio. Te deja abrir lo que te interesa y llegar al escrito cuando de verdad estás listo para usarlo.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-[12px]" style={{ background: "rgba(255,255,255,0.84)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.lift }}>
                            <div className="border-b px-6 py-4 md:px-8" style={{ borderColor: TOKENS.color.line }}>
                                <div className="text-[11px] uppercase tracking-[0.3em]" style={{ color: TOKENS.color.warm }}>Documento base</div>
                            </div>
                            <pre className="overflow-x-auto whitespace-pre-wrap p-6 text-sm leading-8 md:p-8" style={{ color: TOKENS.color.inkSoft, fontFamily: TOKENS.font.editorial }}>
                                {escrito}
                            </pre>
                        </div>
                    </div>
                </ExpandableSection>

                <section style={{ background: TOKENS.color.mist, ...TOKENS.sectionPad }}>
                    <div className="mx-auto max-w-[1440px] px-4 md:px-6">
                        <div className="rounded-[12px] p-6 md:p-8" style={{ background: "rgba(255,255,255,0.82)", border: TOKENS.cardBorder, boxShadow: TOKENS.shadow.lift }}>
                            <div className="mb-5 flex items-center gap-3" style={{ color: TOKENS.color.warm }}>
                                <FileText className="h-6 w-6" />
                                <div>
                                    <h3 className="text-2xl font-black" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>Frase pública sugerida</h3>
                                    <p className="text-sm" style={{ color: "rgba(66,52,43,0.6)" }}>Clara, sobria y lista para salir.</p>
                                </div>
                            </div>
                            <blockquote className="rounded-[10px] p-5 md:p-6" style={{ background: TOKENS.color.cream, borderLeft: `5px solid ${TOKENS.color.warm}`, fontFamily: TOKENS.font.editorial, color: TOKENS.color.ink }}>
                                <div className="text-xl font-semibold leading-9 md:text-[28px] md:leading-[1.5]">
                                    El acoso por ruido y vibraciones no es una molestia menor: puede dañar la salud mental, romper la convivencia y empujar a las personas fuera de su vivienda. La ciudad necesita protocolo, medición y respuesta real.
                                </div>
                            </blockquote>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t" style={{ borderColor: TOKENS.color.line, background: TOKENS.color.paper2 }}>
                <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-6" style={{ color: "rgba(66,52,43,0.68)" }}>
                    <div className="grid gap-8 md:grid-cols-3">
                        <div>
                            <div className="mb-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Colofón</div>
                            <div className="text-lg font-black" style={{ fontFamily: TOKENS.font.display, color: TOKENS.color.ink }}>Gaceta del Ruido</div>
                            <p className="mt-2 text-sm leading-7">Edición especial · Ciudad de México · Marzo de 2026. Publicación de archivo, referencia e investigación sobre acoso vecinal por ruido y vibración estructural.</p>
                        </div>
                        <div>
                            <div className="mb-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Tipografía y diseño</div>
                            <div className="space-y-1 text-sm leading-7">
                                <p><strong style={{ color: TOKENS.color.ink }}>Titulares:</strong> Fraunces (variable, display)</p>
                                <p><strong style={{ color: TOKENS.color.ink }}>Cuerpo editorial:</strong> Spectral (serif, screen-first)</p>
                                <p><strong style={{ color: TOKENS.color.ink }}>UI y navegación:</strong> Inter (sans-serif, sistema)</p>
                            </div>
                        </div>
                        <div>
                            <div className="mb-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: TOKENS.color.warm }}>Fuentes institucionales</div>
                            <div className="flex flex-wrap gap-2">
                                {["PAOT", "PROSOC", "FGJ CDMX", "COPRED", "WHO", "Hemeroteca UNAM", "People's Daily"].map((x) => (
                                    <Badge key={x} className="rounded-full border-0 shadow-none" style={{ background: "rgba(255,255,255,0.9)", color: TOKENS.color.inkSoft }}>
                                        {x}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 grid gap-4 border-t pt-6 md:grid-cols-[1fr_auto] md:items-center" style={{ borderColor: TOKENS.color.line }}>
                        <p className="text-xs leading-6" style={{ color: "rgba(66,52,43,0.55)" }}>
                            Este micrositio es una herramienta de archivo, documentación e investigación ciudadana. No constituye asesoría jurídica profesional. Las rutas institucionales citadas son de acceso público y están sujetas a cambios por parte de cada autoridad. La responsabilidad de verificar vigencia y aplicabilidad corresponde al usuario.
                        </p>
                        <div className="no-print flex flex-wrap gap-2">
                            <Button onClick={handlePrint} variant="secondary" className="rounded-full border-0 bg-white/80 shadow-none text-xs" style={{ color: TOKENS.color.inkSoft }}>
                                <FileText className="mr-1.5 h-3.5 w-3.5" /> Imprimir edición completa
                            </Button>
                            <Button onClick={openAll} variant="secondary" className="rounded-full border-0 bg-white/80 shadow-none text-xs" style={{ color: TOKENS.color.inkSoft }}>
                                Expandir todo
                            </Button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
