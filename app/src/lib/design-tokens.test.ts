import test from "node:test";
import assert from "node:assert/strict";

import { resolveTokenValue, sharedTokenDocument, webThemeTokens } from "./design-tokens.ts";

test("primitive and semantic token resolution stay deterministic", () => {
  assert.equal(resolveTokenValue(sharedTokenDocument, "n0.color.ink"), "#18120e");
  assert.equal(resolveTokenValue(sharedTokenDocument, "n1.color.accent"), "#8f2f1c");
  assert.equal(resolveTokenValue(sharedTokenDocument, "n4.platform.ios.minimumOS"), undefined);
});

test("object token references resolve nested aliases", () => {
  const cardToken = resolveTokenValue(sharedTokenDocument, "n2.component.card");
  assert.deepEqual(cardToken, {
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(38, 26, 18, 0.12)",
    shadow: "0 12px 40px rgba(62, 41, 22, 0.08)",
    radius: "28",
  });
});

test("web theme tokens derive stable platform values", () => {
  assert.equal(webThemeTokens.color.ink, "#18120e");
  assert.equal(webThemeTokens.radius.xl, 34);
  assert.equal(webThemeTokens.spacing.sectionY, 72);
  assert.equal(webThemeTokens.cardBorder, "1px solid rgba(38, 26, 18, 0.12)");
});
