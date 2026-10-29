import assert from "node:assert/strict";
import test from "node:test";
import { getBlogHref } from "./document-language.ts";

test("uses static paths for both blog languages", () => {
  assert.equal(getBlogHref("vi"), "/blog");
  assert.equal(getBlogHref("en"), "/blog/en");
});
