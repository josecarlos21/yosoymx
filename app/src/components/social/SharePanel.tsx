import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Facebook,
  Link2,
  Music2,
  Quote,
  Share2,
  X as XIcon,
  Check,
  ExternalLink
} from "lucide-react";

import {
  buildFbShareUrl,
  buildSharePayload,
  buildShareText,
  buildXShareUrl,
  buildTikTokSearchUrl,
  copyTextWithFallback,
  type SharePayload,
  type SharePanelAction,
  type SharePanelEvent,
  type SharePanelStatus,
  type SharePanelSurface,
} from "@/lib/share-contract";

/* eslint-disable no-unused-vars */
type SharePanelProps = {
  surface: SharePanelSurface;
  sharePayload: SharePayload;
  summaryText: string;
  quoteText?: string;
  compact?: boolean;
  className?: string;
  onAction?: (event: SharePanelEvent) => void;
};
/* eslint-enable no-unused-vars */

const UI_TOKENS = {
  glass: "rgba(255, 255, 255, 0.45)",
  glassBorder: "1px solid rgba(255, 255, 255, 0.4)",
  accent: "#8f2f1c",
  accentSoft: "rgba(143, 47, 28, 0.08)",
  ink: "#18120e",
  shadow: "0 8px 32px rgba(31, 38, 135, 0.07)"
};

export function SharePanel({
  surface,
  sharePayload,
  summaryText,
  quoteText,
  compact = false,
  className = "",
  onAction,
}: SharePanelProps) {
  const payload = buildSharePayload({
    title: sharePayload.title,
    excerpt: sharePayload.excerpt,
    url: sharePayload.url,
    hashtags: sharePayload.hashtags,
  });

  const normalizedPayload = {
    ...sharePayload,
    hashtags: payload.hashtags,
    url: payload.url,
  };

  const [feedback, setFeedback] = useState<{
    label: string;
    message: string;
    status: SharePanelStatus;
  } | null>(null);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = window.setTimeout(() => {
      setFeedback(null);
    }, 2000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [feedback]);

  const publishFeedback = (label: string, message: string, status: SharePanelStatus = "ok") => {
    setFeedback({ label, message, status });
  };

  const trackAction = (action: SharePanelAction, status: SharePanelStatus = "ok", message?: string) => {
    onAction?.({ action, surface, status, message });
  };

  const copyText = async (text: string, action: SharePanelAction, label: string) => {
    if (!text) return;
    const result = await copyTextWithFallback(text);
    if (result.status === "error") {
      publishFeedback(label, "Error", "error");
      trackAction(action, "error", "clipboard_failed");
      return;
    }
    publishFeedback(label, "Copiado", result.status);
    trackAction(action, result.status);
  };

  const openWindow = (url: string, action: SharePanelAction, fallbackMsg: string) => {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      publishFeedback(fallbackMsg, "error");
      trackAction(action, "error", "popup_blocked");
      return;
    }
    trackAction(action);
  };

  const handleWebShare = async () => {
    if (!navigator.share) {
      trackAction("web_share", "fallback", "not_supported");
      return;
    }
    try {
      await navigator.share({
        title: payload.title,
        text: buildShareText(payload, null),
        url: payload.url,
      });
      trackAction("web_share");
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        publishFeedback("Error al compartir", "error");
      }
    }
  };

  const shareOptions = [
    { id: "x", icon: XIcon, label: "𝕏", action: () => openWindow(buildXShareUrl(normalizedPayload), "x", "X bloqueado") },
    { id: "facebook", icon: Facebook, label: "Facebook", action: () => openWindow(buildFbShareUrl(normalizedPayload.url), "facebook", "FB bloqueado") },
    {
      id: "tiktok", icon: Music2, label: "TikTok", action: async () => {
        await copyText(buildShareText(normalizedPayload, null), "tiktok", "TikTok");
        openWindow(buildTikTokSearchUrl(normalizedPayload.hashtags[0] || "AcosoVecinal"), "tiktok", "TikTok");
      }
    },
    { id: "link", icon: Link2, label: "Enlace", action: () => copyText(payload.url, "copy_link", "Enlace") },
    { id: "summary", icon: Copy, label: "Resumen", action: () => copyText(summaryText, "copy_summary", "Resumen") },
  ];

  return (
    <section className={`relative ${className}`}>
      {!compact && (
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Compartir nota
        </p>
      )}

      <div className={`flex flex-wrap gap-2 ${compact ? "justify-center" : "justify-start"}`}>
        {shareOptions.map((opt) => (
          <motion.button
            key={opt.id}
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={opt.action}
            className="group relative flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-3 transition-all sm:min-w-0 sm:flex-none sm:justify-start sm:gap-2.5 sm:px-4 sm:py-2.5"
            style={{
              background: UI_TOKENS.glass,
              backdropFilter: "blur(12px)",
              border: UI_TOKENS.glassBorder,
              boxShadow: UI_TOKENS.shadow,
            }}
          >
            <opt.icon className="w-4 h-4 transition-colors group-hover:text-[#8f2f1c]" />
            <span className="text-[11px] font-bold tracking-tight text-slate-700 sm:text-xs">{opt.label}</span>

            <AnimatePresence>
              {feedback?.label === opt.label && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold shadow-xl whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <Check className={`w-3 h-3 ${feedback.status === "error" ? "text-rose-400" : "text-emerald-400"}`} />
                    {feedback.message}
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        ))}

        {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleWebShare}
            className="flex h-11 w-full items-center justify-center rounded-2xl transition-all sm:h-10 sm:w-10"
            style={{
              background: "linear-gradient(135deg, #8f2f1c 0%, #c95e2a 100%)",
              color: "white",
              boxShadow: "0 4px 12px rgba(143, 47, 28, 0.3)"
            }}
          >
            <Share2 className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {!compact && quoteText && (
        <motion.button
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          onClick={() => copyText(`${quoteText}\n\n${payload.url}`, "copy_quote", "Cita")}
          className="group relative mt-4 w-full overflow-hidden rounded-2xl border border-dashed p-4 text-left transition-colors hover:border-[#8f2f1c] sm:mt-6"
          style={{
            borderColor: "rgba(143, 47, 28, 0.2)",
            background: "rgba(143, 47, 28, 0.01)"
          }}
        >
          <div className="flex gap-3">
            <Quote className="w-5 h-5 text-slate-300 group-hover:text-[#8f2f1c] shrink-0" />
            <div>
              <p className="line-clamp-3 text-[12px] leading-relaxed text-slate-500 italic sm:line-clamp-2 sm:text-[13px]">
                "{quoteText}"
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-[#8f2f1c]">
                Copiar cita para redes
                <ExternalLink className="w-3 h-3" />
              </div>
            </div>
          </div>
        </motion.button>
      )}
    </section>
  );
}
