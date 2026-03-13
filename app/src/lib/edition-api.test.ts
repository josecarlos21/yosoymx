import test from "node:test";
import assert from "node:assert/strict";

import { applyBrandHead, fetchEditionBySlug, fetchIssueArchive } from "./edition-api.ts";
import { buildFallbackEditionPayload, fallbackBrandConfig } from "./issue-content.ts";

class FakeNode {
  public readonly tagName: string;
  public rel = "";
  public type = "";
  public href = "";
  public content = "";
  private readonly attributes = new Map<string, string>();

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
    if (name === "rel") this.rel = value;
    if (name === "type") this.type = value;
    if (name === "href") this.href = value;
    if (name === "name" || name === "property") {
      this.attributes.set(name, value);
    }
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
}

class FakeHead {
  public readonly children: FakeNode[] = [];

  appendChild(node: FakeNode) {
    this.children.push(node);
    return node;
  }

  querySelector<T extends FakeNode>(selector: string): T | null {
    const relMatch = selector.match(/^link\[rel="(.+)"\]$/);
    if (relMatch) {
      return (this.children.find((node) => node.tagName === "link" && node.rel === relMatch[1]) as T | undefined) ?? null;
    }

    const nameMatch = selector.match(/^meta\[name="(.+)"\]$/);
    if (nameMatch) {
      return (
        this.children.find((node) => node.tagName === "meta" && node.getAttribute("name") === nameMatch[1]) as T | undefined
      ) ?? null;
    }

    const propertyMatch = selector.match(/^meta\[property="(.+)"\]$/);
    if (propertyMatch) {
      return (
        this.children.find((node) => node.tagName === "meta" && node.getAttribute("property") === propertyMatch[1]) as T | undefined
      ) ?? null;
    }

    return null;
  }
}

class FakeDocument {
  public title = "";
  public readonly head = new FakeHead();

  createElement(tagName: string) {
    return new FakeNode(tagName);
  }
}

function installWindow(hostname = "yosoymx.com", pathname = "/gaceta-eje-central", search = "") {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const document = new FakeDocument();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        hostname,
        pathname,
        search,
        origin: `https://${hostname}`,
      },
      setTimeout,
      clearTimeout,
    },
  });

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: document,
  });

  return {
    document,
    restore() {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: previousDocument,
      });
      Object.defineProperty(globalThis, "fetch", {
        configurable: true,
        value: previousFetch,
      });
    },
  };
}

test("issue archive request sanitizes public summaries and brand payload", async () => {
  const env = installWindow();
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (input: RequestInfo | URL) => {
      assert.match(String(input), /\/api\/issues\?limit=3$/);
      return new Response(
        JSON.stringify({
          items: [
            {
              id: "issue-2",
              slug: "edicion-dos",
              status: "archived",
              version: 2,
              publishedAt: "2026-03-11T00:00:00.000Z",
              label: "Edición 2",
              location: "Benito Juárez",
              themeLine: "Nueva nota",
              title: "Edición archivada",
              summary: "Resumen breve",
              articleLabel: "Especial",
            },
          ],
          brand: {
            ...fallbackBrandConfig,
            masthead: "Gaceta Eje Central",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    },
  });

  try {
    const archive = await fetchIssueArchive(3);
    assert.equal(archive.items.length, 1);
    assert.equal(archive.items[0]?.slug, "edicion-dos");
    assert.equal(archive.brand.masthead, "Gaceta Eje Central");
  } finally {
    env.restore();
  }
});

test("edition by slug falls back safely when production receives non-json", async () => {
  const env = installWindow();
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () =>
      new Response("<html>blocked</html>", {
        status: 403,
        headers: { "content-type": "text/html; charset=UTF-8" },
      }),
  });

  try {
    const edition = await fetchEditionBySlug("archivo-invalido");
    assert.equal(edition.item.slug, "gaceta-eje-central");
    assert.equal(edition.brand.defaultOgAssetId, fallbackBrandConfig.defaultOgAssetId);
  } finally {
    env.restore();
  }
});

test("brand head uses social asset precedence and archive-specific copy", () => {
  const env = installWindow("yosoymx.com", "/gaceta-eje-central/edicion/edicion-dos");
  const edition = {
    ...buildFallbackEditionPayload(),
    slug: "edicion-dos",
    label: "Edición 2",
    socialAssetId: "media-og-002",
  };

  try {
    applyBrandHead(fallbackBrandConfig, edition);
    assert.equal(env.document.title, "Gaceta Tu Espacio Eje Central · Edición 2");
    const ogImage = env.document.head.querySelector<FakeNode>('meta[property="og:image"]');
    const canonical = env.document.head.querySelector<FakeNode>('link[rel="canonical"]');
    assert.equal(ogImage?.content, "https://yosoymx.com/api/media/media-og-002");
    assert.equal(canonical?.href, "https://yosoymx.com/gaceta-eje-central/edicion/edicion-dos");
  } finally {
    env.restore();
  }
});
