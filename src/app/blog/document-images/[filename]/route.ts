import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";

const imagesDirectory = path.join(
  process.cwd(),
  "content",
  "documents",
  "images",
);
const imageFilenamePattern =
  /^[a-z0-9][a-z0-9._-]*\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return fs
    .readdirSync(imagesDirectory, { withFileTypes: true })
    .filter(
      (entry) => entry.isFile() && imageFilenamePattern.test(entry.name),
    )
    .map((entry) => ({ filename: entry.name }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!imageFilenamePattern.test(filename)) notFound();

  const image = await fs.promises.readFile(path.join(imagesDirectory, filename));

  return new Response(image, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": contentTypes[path.extname(filename).toLowerCase()],
    },
  });
}
