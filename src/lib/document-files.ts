import fs from "node:fs";

export function listMarkdownFiles(directory: string): string[] {
  try {
    return fs
      .readdirSync(directory)
      .filter((filename) => filename.endsWith(".md"));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}
