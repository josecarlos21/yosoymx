import { Camera, ImageUp } from "lucide-react";
import { useState } from "react";

type MediaCard = {
  id: string;
  title: string;
  description: string;
  fileName: string;
};

const MEDIA_ASSETS: MediaCard[] = [
  {
    id: "cover-visual-01",
    title: "Violencia silenciosa · Privación del sueño",
    description: "Alteración severa del ciclo de sueño. La vibración y el impacto físico traspasan muros, provocando agotamiento crónico y daño a la salud mental.",
    fileName: "/photos/impacto-psicologico.png",
  },
  {
    id: "cover-visual-02",
    title: "Desgaste material · Hostigamiento y burocracia",
    description: "Fisuras y desgaste acelerado. El hostigamiento constante impacta física y estructuralmente el espacio íntimo, documentado sistemáticamente.",
    fileName: "/photos/dano-estructural.png",
  },
];

export function MediaGallerySection() {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  return (
    <section id="galeria" className="border-t" style={{ borderColor: "rgba(38, 26, 18, 0.12)", paddingTop: "clamp(4.5rem, 8vw, 7rem)", paddingBottom: "clamp(4.5rem, 8vw, 7rem)", background: "#f6efe3" }}>
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ background: "rgba(255,255,255,0.76)", color: "#8f2f1c", border: "1px solid rgba(38,26,18,0.12)" }}>
            <ImageUp className="h-3.5 w-3.5" />
            Galería del periódico
          </div>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black leading-none tracking-tight" style={{ fontFamily: "Fraunces, ui-serif, Georgia, Cambria, \"Times New Roman\", serif", color: "#18120e" }}>
            No es un "pleito de vecinos".<br />
            Es violencia.
          </h2>
          <p className="mt-4 max-w-2xl text-[1.3rem] leading-8 font-medium" style={{ color: "rgba(66,52,43,0.9)", fontFamily: "Spectral, ui-serif, Georgia, Cambria, \"Times New Roman\", serif" }}>
            Registro visual del impacto real en la comunidad. Las metodologías de hostigamiento rompen la vivienda, vulneran el sueño y el derecho a la salud mental.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {MEDIA_ASSETS.map((asset) => (
            <article key={asset.id} className="rounded-[30px] border p-3" style={{ background: "rgba(255,255,255,0.86)", borderColor: "rgba(38,26,18,0.16)" }}>
              {!imageErrors[asset.id] ? (
                <img
                  src={asset.fileName}
                  alt={asset.description}
                  loading="lazy"
                  className="h-64 w-full rounded-[24px] object-cover"
                  onError={() =>
                    setImageErrors((state) => ({
                      ...state,
                      [asset.id]: true,
                    }))
                  }
                />
              ) : (
                <div className="h-64 w-full rounded-[24px] border border-dashed border-amber-600/40 bg-amber-50 flex items-center justify-center text-sm text-amber-900">
                  <span className="inline-flex items-center gap-2 px-4">
                    <Camera className="h-5 w-5" />
                    Imagen no disponible aún
                  </span>
                </div>
              )}
              <div className="p-4">
                <h3 className="mb-2 text-lg font-black" style={{ color: "#18120e", fontFamily: "Fraunces, ui-serif, Georgia, Cambria, \"Times New Roman\", serif" }}>{asset.title}</h3>
                <p className="text-sm leading-6" style={{ color: "rgba(66,52,43,0.82)" }}>{asset.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
