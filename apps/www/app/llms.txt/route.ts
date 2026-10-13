import { docsLlms } from "../../lib/source";
import { siteUrl } from "../../lib/site-url";

export const revalidate = false;
export const dynamic = "force-static";

export async function GET() {
  const index = (await docsLlms.index()).replace(
    /\]\((\/[^)]*)\)/g,
    (_match, path: string) => `](${new URL(path, siteUrl).href})`,
  );
  return new Response(index, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
