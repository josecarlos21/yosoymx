import test from "node:test";
import assert from "node:assert/strict";

import { issueContent, issueNavigation, issuePdfResources, normalizePdfHref } from "./issue-content.ts";

test("issue content exposes the core editorial contract", () => {
  assert.equal(issueContent.id, "gaceta-eje-central");
  assert.equal(issueContent.metadata.version, "2.3.0");
  assert.ok(issueContent.cover.title.length > 0);
  assert.ok(issueContent.problem.cards.length >= 3);
  assert.ok(issueContent.routes.authorities.length >= 3);
  assert.ok(issueContent.resources.pdfs.length >= 3);
  assert.ok(issueContent.community.comments.reviewMessage.length > 0);
});

test("navigation and resource collections stay aligned with the shared JSON", () => {
  assert.ok(issueNavigation.some((item) => item.id === "portada"));
  assert.ok(issueNavigation.some((item) => item.id === "comentarios"));
  assert.ok(issuePdfResources.every((item) => item.href.startsWith("/pdfs/")));
  assert.ok(issuePdfResources.every((item) => item.fileName.endsWith(".pdf")));
});

test("pdf href normalization keeps bundle paths stable", () => {
  assert.equal(normalizePdfHref("/pdfs/guia.pdf"), "/pdfs/guia.pdf");
  assert.equal(normalizePdfHref("pdfs/guia.pdf"), "/pdfs/guia.pdf");
});
