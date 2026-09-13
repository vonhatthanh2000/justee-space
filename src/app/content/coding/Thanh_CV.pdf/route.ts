import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";

export async function GET() {
  const cv = await readFile(
    path.join(process.cwd(), "content", "coding", "Thanh_CV.pdf"),
  );

  return new Response(cv, {
    headers: {
      "Content-Disposition": 'attachment; filename="Thanh_CV.pdf"',
      "Content-Length": cv.byteLength.toString(),
      "Content-Type": "application/pdf",
    },
  });
}
