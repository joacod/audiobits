export function getPageMarkdownUrl(page: { slugs: string[] }) {
  return `/docs/${page.slugs.length ? page.slugs.join("/") : "index"}.md`;
}

export function getPageGithubUrl(page: { path: string }) {
  const path = page.path.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/joacod/audiobits/blob/main/apps/www/content/docs/${path}`;
}
