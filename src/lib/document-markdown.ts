const obsidianImageEmbedPattern =
  /!\[\[([^\]\n|]+?)(?:\|([^\]\n]+))?\]\]/g;
const documentImagePattern = /^[a-z0-9][a-z0-9._-]*\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

function imageAltText(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

export function prepareDocumentMarkdown(content: string): string {
  return content
    .replace(
      obsidianImageEmbedPattern,
      (embed, rawTarget: string, rawAlias: string | undefined) => {
        const target = rawTarget.trim().replaceAll("\\", "/");
        if (!target.startsWith("../images/")) return embed;

        const filename = target.slice("../images/".length);
        if (!documentImagePattern.test(filename)) return embed;

        const alt = rawAlias?.trim() || imageAltText(filename);
        return `![${alt}](/blog/document-images/${encodeURIComponent(filename)})`;
      },
    )
    .replaceAll("$\\rightarrow$", "→")
    .replaceAll("$\\leftrightarrow$", "↔");
}
