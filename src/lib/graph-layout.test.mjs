import assert from "node:assert/strict";
import test from "node:test";
import { getGraphPositions } from "./graph-layout.ts";

test("assigns distinct positions to documents without curated coordinates", () => {
  const positions = getGraphPositions([
    { slug: "hello-world", connections: [] },
    { slug: "who-am-i", connections: [] },
  ]);
  const first = positions.get("hello-world");
  const second = positions.get("who-am-i");

  assert.notDeepEqual(first, second);
});

test("keeps generated positions stable when document order changes", () => {
  const nodes = [
    { slug: "hello-world", connections: ["who-am-i"] },
    { slug: "who-am-i", connections: ["another-document"] },
    { slug: "another-document", connections: [] },
  ];
  const forward = getGraphPositions(nodes);
  const reversed = getGraphPositions([...nodes].reverse());

  for (const { slug } of nodes) {
    assert.deepEqual(forward.get(slug), reversed.get(slug));
  }
});

test("keeps dense graph nodes separated and places hubs centrally", () => {
  const leafSlugs = Array.from({ length: 10 }, (_, index) => `leaf-${index}`);
  const nodes = [
    { slug: "hub", connections: leafSlugs },
    ...leafSlugs.map((slug) => ({ slug, connections: [] })),
    { slug: "branch-a", connections: ["branch-b"] },
    { slug: "branch-b", connections: [] },
  ];
  const positions = getGraphPositions(nodes);
  const allPositions = [...positions.values()];

  for (let first = 0; first < allPositions.length; first += 1) {
    for (let second = first + 1; second < allPositions.length; second += 1) {
      const [firstX, firstY] = allPositions[first];
      const [secondX, secondY] = allPositions[second];
      assert.ok(
        Math.hypot(firstX - secondX, firstY - secondY) >= 135,
        `nodes ${first} and ${second} overlap`,
      );
    }
  }

  const firstChunk = ["hub", ...leafSlugs];
  const center = firstChunk.reduce(
    ([totalX, totalY], slug) => {
      const [x, y] = positions.get(slug);
      return [totalX + x / firstChunk.length, totalY + y / firstChunk.length];
    },
    [0, 0],
  );
  const distanceFromChunkCenter = (slug) => {
    const [x, y] = positions.get(slug);
    return Math.hypot(x - center[0], y - center[1]);
  };
  const averageLeafDistance =
    leafSlugs.reduce(
      (total, slug) => total + distanceFromChunkCenter(slug),
      0,
    ) /
    leafSlugs.length;

  assert.ok(distanceFromChunkCenter("hub") < averageLeafDistance * 0.45);
  for (const slug of leafSlugs) {
    const [hubX, hubY] = positions.get("hub");
    const [leafX, leafY] = positions.get(slug);
    assert.ok(
      Math.hypot(hubX - leafX, hubY - leafY) >= 165,
      `${slug} is too close to the hub to read clearly`,
    );
  }
});

test("places disconnected chunks in separate non-interleaving regions", () => {
  const firstChunk = ["alpha", "alpha-a", "alpha-b", "alpha-c"];
  const secondChunk = ["beta", "beta-a", "beta-b", "beta-c"];
  const positions = getGraphPositions([
    { slug: "alpha", connections: firstChunk.slice(1) },
    ...firstChunk.slice(1).map((slug) => ({ slug, connections: [] })),
    { slug: "beta", connections: secondChunk.slice(1) },
    ...secondChunk.slice(1).map((slug) => ({ slug, connections: [] })),
  ]);
  const bounds = (slugs) => {
    const chunkPositions = slugs.map((slug) => positions.get(slug));
    return {
      left: Math.min(...chunkPositions.map(([x]) => x)),
      right: Math.max(...chunkPositions.map(([x]) => x)),
      top: Math.min(...chunkPositions.map(([, y]) => y)),
      bottom: Math.max(...chunkPositions.map(([, y]) => y)),
    };
  };
  const first = bounds(firstChunk);
  const second = bounds(secondChunk);
  const gap = 70;

  assert.ok(
    first.right + gap <= second.left ||
      second.right + gap <= first.left ||
      first.bottom + gap <= second.top ||
      second.bottom + gap <= first.top,
    "disconnected chunks overlap or interleave",
  );
});
