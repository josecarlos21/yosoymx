import { Facebook, MessageCircleCode, X } from "lucide-react";
import { useMemo } from "react";

type SocialProvider = "facebook" | "x" | "tiktok";

type ProviderConfig = {
  id: SocialProvider;
  label: string;
  env: string;
};

/* eslint-disable no-unused-vars */
type SocialAuthButtonsProps = {
  onMessage: (message: string) => void;
  onProviderSelected?: (provider: SocialProvider) => void;
};
/* eslint-enable no-unused-vars */

const PROVIDERS: ProviderConfig[] = [
  {
    id: "facebook",
    label: "Facebook",
    env: "VITE_SOCIAL_AUTH_FACEBOOK",
  },
  {
    id: "x",
    label: "X",
    env: "VITE_SOCIAL_AUTH_X",
  },
  {
    id: "tiktok",
    label: "TikTok",
    env: "VITE_SOCIAL_AUTH_TIKTOK",
  },
];

function isWindowAvailable() {
  return typeof window !== "undefined";
}

function getProviderUrl(provider: SocialProvider) {
  const providerEntry = PROVIDERS.find((entry) => entry.id === provider);
  const env = import.meta.env as Record<string, string | undefined>;
  const explicit = providerEntry ? providerEntry.env : undefined;
  const configured = explicit ? env[explicit] : "";
  if (!isWindowAvailable()) return "";
  if (!configured) return "";
  const base = new URL(configured, window.location.origin);
  return base.toString();
}

function buildFallbackMessage() {
  return "Inicio de sesión social disponible próximamente.";
}

export function SocialAuthButtons({ onMessage, onProviderSelected }: SocialAuthButtonsProps) {
  const enabledProviders = useMemo(() => PROVIDERS.filter((provider) => Boolean(getProviderUrl(provider.id))), []);

  const handleClick = (provider: SocialProvider) => {
    const baseUrl = getProviderUrl(provider);
    onProviderSelected?.(provider);
    if (!baseUrl || !isWindowAvailable()) {
      onMessage(buildFallbackMessage());
      return;
    }
    const target = new URL(baseUrl, window.location.origin);
    target.searchParams.set("provider", provider);
    target.searchParams.set("returnTo", `${window.location.pathname}${window.location.hash}`);
    target.searchParams.set("state", "comment-flow");
    window.location.assign(target.toString());
  };

  if (enabledProviders.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-3 text-xs" style={{ borderColor: "#f4aa00", color: "#7c4a00" }}>
        Inicio de sesión social disponible próximamente. Por ahora, publica tu comentario directamente.
      </p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {enabledProviders.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => handleClick(provider.id)}
          className="rounded-full border px-3 py-2 text-sm"
          style={{ borderColor: "rgba(38,26,18,0.16)", background: "rgba(255,255,255,0.8)" }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            {provider.id === "facebook" ? <Facebook className="h-4 w-4" /> : provider.id === "x" ? <X className="h-4 w-4" /> : <MessageCircleCode className="h-4 w-4" />}
            {provider.label}
          </span>
        </button>
      ))}
    </div>
  );
}
