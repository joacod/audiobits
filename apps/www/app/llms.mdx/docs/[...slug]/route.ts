import { notFound } from "next/navigation";
import { docsLlms, source } from "../../../../lib/source";

export const revalidate = false;
export const dynamic = "force-static";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  if (slug.at(-1) !== "content.md") notFound();
  const slugs = slug.slice(0, -1);
  if (slugs.length === 1 && slugs[0] === "index") slugs.pop();
  const page = source.getPage(slugs);
  if (!page) notFound();

  return new Response(await docsLlms.page(page), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}

export function generateStaticParams() {
  return source.generateParams().map(({ slug }) => ({
    slug: [...(slug.length ? slug : ["index"]), "content.md"],
  }));
}
