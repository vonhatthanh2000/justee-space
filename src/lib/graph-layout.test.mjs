import assert from "node:assert/strict";
import test from "node:test";
import { getGraphPositions } from "./graph-layout.ts";

test("assigns distinct positions to documents without curated coordinates", () => {
  const positions = getGraphPositions(["hello-world", "who-am-i"]);
  const first = positions.get("hello-world");
  const second = positions.get("who-am-i");

  assert.notDeepEqual(first, second);
});

test("keeps generated positions stable when document order changes", () => {
  const slugs = ["hello-world", "who-am-i", "another-document"];
  const forward = getGraphPositions(slugs);
  const reversed = getGraphPositions([...slugs].reverse());

  for (const slug of slugs) {
    assert.deepEqual(forward.get(slug), reversed.get(slug));
  }
});
