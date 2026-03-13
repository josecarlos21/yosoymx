import test from "node:test";
import assert from "node:assert/strict";

import {
  CommunityApiError,
  fetchCommunityPosts,
  submitCommunityPost,
} from "./community.ts";

type StorageRecord = Record<string, string>;

function createLocalStorage(seed: StorageRecord = {}) {
  const store = new Map(Object.entries(seed));
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function installBrowserEnvironment(hostname: string) {
  const localStorage = createLocalStorage();
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const previousCrypto = globalThis.crypto;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { hostname },
      localStorage,
      setTimeout,
      clearTimeout,
    },
  });

  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        randomUUID: () => "test-random-uuid",
      },
    });
  }

  return {
    localStorage,
    restore() {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
      Object.defineProperty(globalThis, "fetch", {
        configurable: true,
        value: previousFetch,
      });
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: previousCrypto,
      });
    },
  };
}

test("community falls back to local approved seed only on localhost", async () => {
  const env = installBrowserEnvironment("localhost");
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => {
      throw new TypeError("network down");
    },
  });

  try {
    const comments = await fetchCommunityPosts("comment", 10);
    const histories = await fetchCommunityPosts("history", 10);

    assert.equal(comments.length, 1);
    assert.equal(histories.length, 1);
    assert.equal(comments[0]?.source, "local");
    assert.equal(histories[0]?.source, "local");
  } finally {
    env.restore();
  }
});

test("community returns empty state in production when api is unavailable", async () => {
  const env = installBrowserEnvironment("yosoymx.com");
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => {
      throw new TypeError("network down");
    },
  });

  try {
    const comments = await fetchCommunityPosts("comment", 10);
    assert.deepEqual(comments, []);
    assert.equal(env.localStorage.getItem("yosoymx.community.posts.v1"), null);
  } finally {
    env.restore();
  }
});

test("community submission does not create local pending content in production", async () => {
  const env = installBrowserEnvironment("yosoymx.com");
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () =>
      new Response(JSON.stringify({ error: "service-unavailable" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
  });

  try {
    await assert.rejects(
      submitCommunityPost({
        kind: "comment",
        displayName: "Prueba vecinal",
        email: "test@example.com",
        content: "Esto debe fallar sin guardar contenido ficticio.",
      }),
      (error: unknown) => {
        assert.ok(error instanceof CommunityApiError);
        assert.equal(error.message, "Tu aporte no pudo enviarse ahora. Intenta más tarde.");
        return true;
      }
    );
    assert.equal(env.localStorage.getItem("yosoymx.community.posts.v1"), null);
  } finally {
    env.restore();
  }
});
