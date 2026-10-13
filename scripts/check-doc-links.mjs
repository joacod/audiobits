import { readFile, readdir, access } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const ignored = new Set([
  ".git",
  "node_modules",
  "dist",
  ".next",
  ".source",
  "test-results",
  "playwright-report",
]);
const docsDirectory = "apps/www/content/docs";
const origin = "https://www.audiobits.dev";

// Match the default Fumadocs loader: folder groups are pathless and index
// represents its parent. No custom slug function is configured in lib/source.ts.
export function documentationRoute(path) {
  const segments = path
    .replaceAll(sep, "/")
    .replace(/\.mdx?$/, "")
    .split("/")
    .filter((segment) => !/^\(.+\)$/.test(segment));
  if (segments.at(-1) === "index") segments.pop();
  return `/docs${segments.length ? `/${segments.map(encodeURIComponent).join("/")}` : ""}`;
}

function prose(content) {
  let fence;
  return content
    .split("\n")
    .map((line) => {
      const marker = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        if (
          marker &&
          marker[1][0] === fence[0] &&
          marker[1].length >= fence.length &&
          !marker[2].trim()
        )
          fence = undefined;
        return "";
      }
      if (marker) {
        fence = marker[1];
        return "";
      }
      return line;
    })
    .join("\n")
    .replace(/<!--[\s\S]*?-->|\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(`+)[\s\S]*?\1(?!`)/g, "");
}

export function linkTargets(content) {
  const text = prose(content);
  // Literal Markdown destinations (including one balanced pair for folder
  // groups), reference definitions, and the literal hrefs used by MDX Cards.
  // Dynamic JSX expressions are intentionally outside this source check.
  const destination = "(<[^>]+>|(?:[^\\s()]+|\\([^()]*\\))+)";
  const patterns = [
    new RegExp(`\\]\\(\\s*${destination}(?:\\s+[^\\n)]*)?\\s*\\)`, "g"),
    new RegExp(`^ {0,3}\\[[^\\]]+\\]:\\s*${destination}`, "gm"),
    /\bhref\s*=\s*["']([^"']+)["']/g,
  ];
  return patterns.flatMap((pattern) =>
    [...text.matchAll(pattern)].map((match) => match[1].replace(/^<|>$/g, "")),
  );
}

async function sourceFiles(root, dir = root) {
  const files = [];
  // Vendored skill references are checked separately from project docs.
  if (dir === resolve(root, "apps/www/.agents/skills")) return files;
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(item.name)) continue;
    const path = resolve(dir, item.name);
    if (item.isDirectory()) files.push(...(await sourceFiles(root, path)));
    else if (/\.mdx?$/.test(item.name)) files.push(path);
  }
  return files.sort();
}

export async function checkDocLinks(root = resolve(".")) {
  const files = await sourceFiles(root);
  const docsRoot = resolve(root, docsDirectory);
  const routes = new Set();
  for (const file of files) {
    if (!file.startsWith(`${docsRoot}${sep}`)) continue;
    const route = decodeURIComponent(
      documentationRoute(relative(docsRoot, file)),
    );
    if (routes.has(route))
      throw new Error(`Duplicate documentation route: ${route}`);
    routes.add(route);
  }
  const errors = [];
  for (const file of files) {
    const pageRoute = file.startsWith(`${docsRoot}${sep}`)
      ? documentationRoute(relative(docsRoot, file))
      : undefined;
    for (const target of linkTargets(await readFile(file, "utf8"))) {
      if (!target || target.startsWith("#")) continue;
      try {
        // Explicit relative .md/.mdx links refer to files, not public URLs.
        if (
          !/^(?:[a-z][\w+.-]*:|\/)/i.test(target) &&
          /\.mdx?(?:[?#]|$)/.test(target)
        ) {
          await access(
            resolve(dirname(file), decodeURIComponent(target.split(/[?#]/)[0])),
          );
          continue;
        }
        const url = new URL(target, `${origin}${pageRoute ?? "/"}`);
        if (url.origin !== origin) continue;
        const pathname = decodeURIComponent(url.pathname);
        if (/^\/docs(?:\/|$)/.test(pathname)) {
          // Public Markdown endpoints use the same source pages, with index.md
          // for the documentation home. They are not source-file paths.
          const route = pathname
            .replace(/\/index\.md$/, "")
            .replace(/\.md$/, "")
            .replace(/\/$/, "");
          if (!routes.has(route))
            throw new Error("missing documentation route");
        } else if (!/^(?:[a-z][\w+.-]*:|\/)/i.test(target)) {
          await access(
            resolve(dirname(file), decodeURIComponent(target.split(/[?#]/)[0])),
          );
        }
      } catch (error) {
        errors.push(`${relative(root, file)}: ${target} (${error.message})`);
      }
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return { files: files.length, routes: routes.size };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const result = await checkDocLinks();
  console.log(
    `Markdown/MDX file targets and ${result.routes} documentation routes resolve (heading anchors and remote URLs are not checked).`,
  );
}
