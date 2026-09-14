export type GraphPosition = readonly [number, number];

export type GraphLayoutNode = {
  slug: string;
  connections: readonly string[];
};

export const graphWidth = 1400;
export const graphHeight = 900;

const graphPadding = 80;
const chunkGap = 90;
const minimumNodeDistance = 145;
const firstRingRadius = 185;
const ringStep = 155;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));

type Region = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Chunk = {
  indexes: number[];
  weight: number;
};

function splitIntoRegions(chunks: Chunk[], region: Region): Region[] {
  if (chunks.length === 1) return [region];

  const totalWeight = chunks.reduce((total, chunk) => total + chunk.weight, 0);
  let runningWeight = 0;
  let splitIndex = 1;
  let smallestDifference = Number.POSITIVE_INFINITY;

  for (let index = 1; index < chunks.length; index += 1) {
    runningWeight += chunks[index - 1].weight;
    const difference = Math.abs(totalWeight / 2 - runningWeight);
    if (difference < smallestDifference) {
      smallestDifference = difference;
      splitIndex = index;
    }
  }

  const firstChunks = chunks.slice(0, splitIndex);
  const secondChunks = chunks.slice(splitIndex);
  const firstWeight = firstChunks.reduce(
    (total, chunk) => total + chunk.weight,
    0,
  );
  const rawRatio = firstWeight / totalWeight;
  const ratio = Math.max(0.34, Math.min(0.66, rawRatio));

  if (region.width >= region.height) {
    const usableWidth = region.width - chunkGap;
    const firstWidth = usableWidth * ratio;
    return [
      ...splitIntoRegions(firstChunks, {
        ...region,
        width: firstWidth,
      }),
      ...splitIntoRegions(secondChunks, {
        left: region.left + firstWidth + chunkGap,
        top: region.top,
        width: usableWidth - firstWidth,
        height: region.height,
      }),
    ];
  }

  const usableHeight = region.height - chunkGap;
  const firstHeight = usableHeight * ratio;
  return [
    ...splitIntoRegions(firstChunks, {
      ...region,
      height: firstHeight,
    }),
    ...splitIntoRegions(secondChunks, {
      left: region.left,
      top: region.top + firstHeight + chunkGap,
      width: region.width,
      height: usableHeight - firstHeight,
    }),
  ];
}

function findChunks(neighbors: Set<number>[]): number[][] {
  const visited = new Set<number>();
  const chunks: number[][] = [];

  for (let start = 0; start < neighbors.length; start += 1) {
    if (visited.has(start)) continue;
    const chunk: number[] = [];
    const queue = [start];
    visited.add(start);

    while (queue.length) {
      const index = queue.shift();
      if (index === undefined) break;
      chunk.push(index);
      for (const neighbor of neighbors[index]) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }

    chunks.push(chunk);
  }

  return chunks;
}

export function getGraphPositions(
  inputNodes: readonly GraphLayoutNode[],
): Map<string, GraphPosition> {
  const nodes = Array.from(
    new Map(inputNodes.map((node) => [node.slug, node])).values(),
  ).sort((first, second) => first.slug.localeCompare(second.slug));
  const nodeIndex = new Map(nodes.map((node, index) => [node.slug, index]));
  const neighbors = nodes.map(() => new Set<number>());

  nodes.forEach((node, from) => {
    for (const targetSlug of node.connections) {
      const to = nodeIndex.get(targetSlug);
      if (to === undefined || to === from) continue;
      neighbors[from].add(to);
      neighbors[to].add(from);
    }
  });

  const chunks: Chunk[] = findChunks(neighbors)
    .map((indexes) => ({
      indexes,
      // Square-root weighting gives large chunks more room without collapsing
      // small chunks into unreadably narrow slivers.
      weight: Math.max(1, Math.sqrt(indexes.length)),
    }))
    .sort(
      (first, second) =>
        second.indexes.length - first.indexes.length ||
        nodes[first.indexes[0]].slug.localeCompare(nodes[second.indexes[0]].slug),
    );
  const regions = splitIntoRegions(chunks, {
    left: graphPadding,
    top: graphPadding,
    width: graphWidth - graphPadding * 2,
    height: graphHeight - graphPadding * 2,
  });
  const resolved = new Map<string, GraphPosition>();

  chunks.forEach((chunk, chunkIndex) => {
    const region = regions[chunkIndex];
    const centerX = region.left + region.width / 2;
    const centerY = region.top + region.height / 2;
    const ranked = [...chunk.indexes].sort(
      (first, second) =>
        neighbors[second].size - neighbors[first].size ||
        nodes[first].slug.localeCompare(nodes[second].slug),
    );
    const hub = ranked[0];
    resolved.set(nodes[hub].slug, [Math.round(centerX), Math.round(centerY)]);

    if (ranked.length === 1) return;

    const availableRadiusX = Math.max(70, region.width / 2 - 90);
    const availableRadiusY = Math.max(70, region.height / 2 - 70);
    const ringCapacity = Math.max(
      3,
      Math.floor((Math.PI * 2 * firstRingRadius) / minimumNodeDistance),
    );

    ranked.slice(1).forEach((index, positionIndex) => {
      const ring = Math.floor(positionIndex / ringCapacity);
      const positionOnRing = positionIndex % ringCapacity;
      const nodesOnRing = Math.min(
        ringCapacity,
        ranked.length - 1 - ring * ringCapacity,
      );
      const requestedRadius = firstRingRadius + ring * ringStep;
      const radiusX = Math.min(requestedRadius * 1.12, availableRadiusX);
      const radiusY = Math.min(requestedRadius, availableRadiusY);
      const startAngle = chunkIndex * goldenAngle + ring * (goldenAngle / 2);
      const angle =
        nodesOnRing === 1
          ? region.width >= region.height
            ? 0
            : Math.PI / 2
          : startAngle + (positionOnRing * Math.PI * 2) / nodesOnRing;

      resolved.set(nodes[index].slug, [
        Math.round(centerX + Math.cos(angle) * radiusX),
        Math.round(centerY + Math.sin(angle) * radiusY),
      ]);
    });
  });

  return resolved;
}
