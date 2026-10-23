import { execFileSync } from "node:child_process";
import { existsSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Distribution boundaries compose; catalog growth never expands website coverage.
export function selectScope(changes) {
  const areas = new Set();
  const files = new Set();
  for (const change of changes) {
    const { path } = change;
    if (/^tests\/browser\/[^/]+\.spec\.ts$/.test(path)) {
      areas.add("site");
      if (!change.deleted) files.add(path);
    } else if (
      path === "packages/audiobits/README.md" ||
      path === "packages/audiobits/CHANGELOG.md" ||
      (/^\.changeset\/[^/]+\.md$/.test(path) &&
        path !== ".changeset/README.md") ||
      (path === "packages/audiobits/package.json" && change.metadataOnly) ||
      (/^packages\/audiobits\/src\/recipe\/(capabilities|schema)\.json$/.test(
        path,
      ) &&
        change.metadataOnly)
    ) {
      areas.add("artifact");
    } else if (
      /^(?:README|CONTRIBUTING|CODE_OF_CONDUCT|AGENTS)\.md$/.test(path) ||
      /^docs\/.*\.md$/.test(path) ||
      /\/AGENTS\.md$/.test(path) ||
      path === ".changeset/README.md"
    ) {
      areas.add(change.executable ? "baseline" : "docs");
    } else if (path.startsWith("packages/audiobits/")) {
      areas.add("runtime");
    } else if (path === "registry.json" || path.startsWith("catalog/")) {
      areas.add("catalog");
    } else if (
      path.startsWith("skills/audiobits/") ||
      path.startsWith("tools/mcp/")
    ) {
      areas.add("skill");
    } else if (path.startsWith("apps/www/")) {
      areas.add("site");
      if (path.startsWith("apps/www/content/docs/") && change.executable)
        areas.add("skill");
    } else {
      areas.add("baseline");
    }
  }
  if (changes.length === 0) areas.add("baseline");
  const has = (...names) => names.some((name) => areas.has(name));
  const active = [...areas].filter((area) => area !== "docs");
  const site = has("baseline", "runtime", "catalog", "skill", "site");
  return {
    kind: active.length > 1 ? "mixed" : (active[0] ?? "docs"),
    package: has("baseline", "runtime", "artifact"),
    consumers: has("baseline", "runtime", "catalog", "skill"),
    site,
    extended: false,
    browserFiles: [...files].sort(),
  };
}

export function parseNameStatus(output) {
  const fields = output.split("\0");
  const changes = [];
  for (let index = 0; index < fields.length && fields[index];) {
    const status = fields[index++];
    const path = fields[index++];
    if (/^[RC]/.test(status)) {
      changes.push({ path, deleted: status.startsWith("R") });
      changes.push({ path: fields[index++], deleted: false, added: true });
    } else
      changes.push({ path, deleted: status === "D", added: status === "A" });
  }
  return changes;
}

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
const fences = (content) =>
  [...content.matchAll(/^(?:```|~~~)[^\n]*\n[\s\S]*?^(?:```|~~~)\s*$/gm)]
    .map(([block]) => block)
    .join("\n");
export function metadataOnly(path, before, after) {
  try {
    const left = JSON.parse(before),
      right = JSON.parse(after);
    const ignored = path.endsWith("package.json")
      ? [
          "name",
          "version",
          "description",
          "keywords",
          "author",
          "license",
          "homepage",
          "bugs",
          "repository",
          "funding",
        ]
      : ["packageVersion"];
    for (const key of ignored) {
      delete left[key];
      delete right[key];
    }
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

export function scopeForEvent(event, base, head) {
  if (event === "push")
    return {
      kind: "main",
      package: false,
      consumers: false,
      site: false,
      extended: false,
      browserFiles: [],
    };
  if (event !== "pull_request") return { ...selectScope([]), extended: true };
  if (![base, head].every((sha) => /^[a-f0-9]{40}$/.test(sha ?? "")))
    throw new Error("PR comparison requires full base/head SHAs");
  const ancestor = git("merge-base", base, head).trim();
  const changes = parseNameStatus(
    git("diff", "--name-status", "-z", "--find-renames", ancestor, head),
  );
  for (const change of changes) {
    if (!/\.(?:md|mdx|json)$/.test(change.path)) continue;
    const before = change.added
      ? ""
      : git("show", `${ancestor}:${change.path}`);
    const after = change.deleted ? "" : git("show", `${head}:${change.path}`);
    if (/\.(?:md|mdx)$/.test(change.path))
      change.executable = fences(before) !== fences(after);
    if (change.path.endsWith(".json"))
      change.metadataOnly = metadataOnly(change.path, before, after);
  }
  const scope = selectScope(changes);
  const deleted = new Set(
    changes.filter((change) => change.deleted).map((change) => change.path),
  );
  scope.browserFiles = scope.browserFiles.filter((path) => !deleted.has(path));
  for (const path of scope.browserFiles)
    if (!existsSync(path))
      throw new Error(
        `Changed browser spec is missing from the checkout: ${path}`,
      );
  return scope;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const scope = scopeForEvent(
    process.env.EVENT_NAME,
    process.env.PR_BASE_SHA,
    process.env.PR_HEAD_SHA,
  );
  console.log(JSON.stringify(scope, null, 2));
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `scope=${JSON.stringify(scope)}\n`,
    );
}
