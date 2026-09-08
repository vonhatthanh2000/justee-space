export type GraphPosition = readonly [number, number];

const curatedPositions: Record<string, GraphPosition> = {
  "welcome-to-the-blog": [455, 294],
  "why-this-blog-has-a-graph": [680, 205],
  "building-useful-ai-systems": [775, 390],
  "finding-database-bottlenecks": [620, 510],
  "learning-in-public": [285, 445],
  "photography-as-observation": [155, 280],
};

export function getGraphPositions(slugs: string[]): Map<string, GraphPosition> {
  const uniqueSlugs = Array.from(new Set(slugs));
  const resolved = new Map<string, GraphPosition>();

  for (const slug of uniqueSlugs) {
    const curated = curatedPositions[slug];
    if (curated) resolved.set(slug, curated);
  }

  const unplaced = uniqueSlugs
    .filter((slug) => !resolved.has(slug))
    .sort((a, b) => a.localeCompare(b));

  if (unplaced.length === 1 && resolved.size === 0) {
    resolved.set(unplaced[0], [450, 310]);
    return resolved;
  }

  const used = new Set(
    Array.from(resolved.values(), ([x, y]) => `${x}:${y}`),
  );

  unplaced.forEach((slug, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / unplaced.length;
    let x = Math.round(450 + Math.cos(angle) * 330);
    let y = Math.round(310 + Math.sin(angle) * 210);

    while (used.has(`${x}:${y}`)) {
      x += 1;
      y += 1;
    }

    used.add(`${x}:${y}`);
    resolved.set(slug, [x, y]);
  });

  return resolved;
}
