import { getDocument, getGraphDocuments } from "@/lib/documents";
import {
  isDocumentLanguage,
  type DocumentLanguage,
} from "@/lib/document-language";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams(): Array<{
  language: DocumentLanguage;
  slug: string;
}> {
  const params = (["vi", "en"] as DocumentLanguage[]).flatMap((language) =>
    getGraphDocuments(language).map((document) => ({
      language: document.language,
      slug: document.slug,
    })),
  );

  return params.filter(
    (item, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.language === item.language && candidate.slug === item.slug,
      ) === index,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ language: string; slug: string }> },
) {
  const { language, slug } = await params;
  if (!isDocumentLanguage(language)) {
    return Response.json({ message: "Unsupported language." }, { status: 404 });
  }

  const document = getDocument(slug, language);
  if (!document || document.language !== language) {
    return Response.json({ message: "Document preview not found." }, { status: 404 });
  }

  return Response.json(
    { previewContent: document.previewContent },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=31536000",
      },
    },
  );
}
