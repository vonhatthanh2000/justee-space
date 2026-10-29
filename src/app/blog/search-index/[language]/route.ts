import { getDocumentSearchIndex } from "@/lib/documents";
import {
  isDocumentLanguage,
  type DocumentLanguage,
} from "@/lib/document-language";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams(): Array<{ language: DocumentLanguage }> {
  return [{ language: "vi" }, { language: "en" }];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ language: string }> },
) {
  const { language } = await params;
  if (!isDocumentLanguage(language)) {
    return Response.json({ message: "Unsupported language." }, { status: 404 });
  }

  return Response.json(getDocumentSearchIndex(language), {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=31536000",
    },
  });
}
