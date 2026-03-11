import { Camera, ImageUp } from "lucide-react";
import { useState } from "react";
import { webThemeTokens } from "@/lib/design-tokens";
import type { IssueContent } from "@/lib/issue-content";

type MediaGallerySectionProps = {
  gallery: IssueContent["gallery"];
};

export function MediaGallerySection({ gallery }: MediaGallerySectionProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const tokens = webThemeTokens;

  return (
    <section
      id="galeria"
      className="border-t"
      style={{
        borderColor: tokens.color.line,
        paddingTop: tokens.sectionPad.paddingTop,
        paddingBottom: tokens.sectionPad.paddingBottom,
        background: tokens.color.paper,
      }}
    >
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">
        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]"
            style={{ background: "rgba(255,255,255,0.76)", color: tokens.color.warm, border: tokens.cardBorder }}
          >
            <ImageUp className="h-3.5 w-3.5" />
            {gallery.eyebrow}
          </div>
          <h2
            className="mt-4 whitespace-pre-line text-[clamp(2rem,4vw,3.5rem)] font-black leading-none tracking-tight"
            style={{ fontFamily: tokens.font.display, color: tokens.color.ink }}
          >
            {gallery.title}
          </h2>
          <p
            className="mt-4 max-w-2xl text-[1.3rem] leading-8 font-medium"
            style={{ color: "rgba(66,52,43,0.9)", fontFamily: tokens.font.editorial }}
          >
            {gallery.summary}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {gallery.items.map((asset) => (
            <article
              key={asset.id}
              className="rounded-[30px] border p-3"
              style={{ background: "rgba(255,255,255,0.86)", borderColor: "rgba(38,26,18,0.16)" }}
            >
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
                <div className="flex h-64 w-full items-center justify-center rounded-[24px] border border-dashed border-amber-600/40 bg-amber-50 text-sm text-amber-900">
                  <span className="inline-flex items-center gap-2 px-4">
                    <Camera className="h-5 w-5" />
                    Imagen no disponible aún
                  </span>
                </div>
              )}
              <div className="p-4">
                <h3 className="mb-2 text-lg font-black" style={{ color: tokens.color.ink, fontFamily: tokens.font.display }}>
                  {asset.title}
                </h3>
                <p className="text-sm leading-6" style={{ color: "rgba(66,52,43,0.82)" }}>
                  {asset.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
