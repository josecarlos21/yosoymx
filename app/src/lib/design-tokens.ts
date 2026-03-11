import tokenJson from "../../shared/design/tokens.json" with { type: "json" };

type Primitive = string | number | boolean | null;

type TokenLeaf = {
  $type: string;
  $value: Primitive | Record<string, unknown>;
};

type TokenDocument = typeof tokenJson;

function isTokenLeaf(value: unknown): value is TokenLeaf {
  return Boolean(
    value &&
    typeof value === "object" &&
    "$type" in (value as Record<string, unknown>) &&
    "$value" in (value as Record<string, unknown>)
  );
}

function resolvePath(document: TokenDocument, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, document);
}

function resolveReferenceString(document: TokenDocument, raw: string): string {
  return raw.replace(/\{([^}]+)\}/g, (_, refPath: string) => {
    const referenced = resolveTokenValue(document, refPath.trim());
    return referenced === undefined || referenced === null ? "" : String(referenced);
  });
}

function resolveObject(document: TokenDocument, input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, resolveReferenceString(document, value)];
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return [key, resolveObject(document, value as Record<string, unknown>)];
      }
      return [key, value];
    })
  );
}

export function resolveTokenValue(document: TokenDocument, path: string): Primitive | Record<string, unknown> | undefined {
  const node = resolvePath(document, path);
  if (!node) return undefined;
  if (isTokenLeaf(node)) {
    if (typeof node.$value === "string") {
      return resolveReferenceString(document, node.$value);
    }
    if (node.$value && typeof node.$value === "object" && !Array.isArray(node.$value)) {
      return resolveObject(document, node.$value);
    }
    return node.$value;
  }
  return node as Record<string, unknown>;
}

export type WebThemeTokens = {
  color: {
    ink: string;
    inkSoft: string;
    paper: string;
    paperAlt: string;
    cream: string;
    mist: string;
    line: string;
    warm: string;
    warmAlt: string;
    cacao: string;
    sand: string;
    whiteGlass: string;
    whiteGlassStrong: string;
  };
  shadow: {
    soft: string;
    deep: string;
    lift: string;
  };
  font: {
    display: string;
    body: string;
    editorial: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    sectionY: number;
  };
  cardBorder: string;
  badgeBg: string;
  sectionPad: {
    paddingTop: string;
    paddingBottom: string;
  };
};

function stringToken(path: string) {
  return String(resolveTokenValue(tokenJson, path) ?? "");
}

function numberToken(path: string) {
  return Number(resolveTokenValue(tokenJson, path) ?? 0);
}

export const sharedTokenDocument = tokenJson;

export const webThemeTokens: WebThemeTokens = {
  color: {
    ink: stringToken("n0.color.ink"),
    inkSoft: stringToken("n0.color.inkSoft"),
    paper: stringToken("n0.color.paper"),
    paperAlt: stringToken("n0.color.paperAlt"),
    cream: stringToken("n0.color.cream"),
    mist: stringToken("n0.color.mist"),
    line: stringToken("n0.color.line"),
    warm: stringToken("n0.color.warm"),
    warmAlt: stringToken("n0.color.warmAlt"),
    cacao: stringToken("n0.color.cacao"),
    sand: stringToken("n0.color.sand"),
    whiteGlass: stringToken("n0.color.whiteGlass"),
    whiteGlassStrong: stringToken("n0.color.whiteGlassStrong")
  },
  shadow: {
    soft: stringToken("n0.shadow.soft"),
    deep: stringToken("n0.shadow.deep"),
    lift: stringToken("n0.shadow.lift")
  },
  font: {
    display: stringToken("n0.font.display"),
    body: stringToken("n0.font.body"),
    editorial: stringToken("n0.font.editorial")
  },
  radius: {
    sm: numberToken("n0.radius.sm"),
    md: numberToken("n0.radius.md"),
    lg: numberToken("n0.radius.lg"),
    xl: numberToken("n0.radius.xl"),
    pill: numberToken("n0.radius.pill")
  },
  spacing: {
    xs: numberToken("n0.spacing.xs"),
    sm: numberToken("n0.spacing.sm"),
    md: numberToken("n0.spacing.md"),
    lg: numberToken("n0.spacing.lg"),
    xl: numberToken("n0.spacing.xl"),
    xxl: numberToken("n0.spacing.xxl"),
    sectionY: numberToken("n0.spacing.sectionY")
  },
  cardBorder: `1px solid ${stringToken("n1.color.lineSubtle")}`,
  badgeBg: "rgba(255,255,255,0.7)",
  sectionPad: {
    paddingTop: "clamp(4.5rem, 8vw, 7rem)",
    paddingBottom: "clamp(4.5rem, 8vw, 7rem)"
  }
};
