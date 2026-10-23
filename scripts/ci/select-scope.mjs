import { execFileSync } from "node:child_process";
import { existsSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const spec = (name) => `tests/browser/${name}.spec.ts`;
const experiences = {
  "energy-charge": ["energy-charge", "visual-lifecycle"],
  "reactive-thruster": ["reactive-thruster", "thruster-showcase", "dynamic"],
  lightsaber: ["lightsaber", "landing", "gallery"],
  "echo-probe": ["echo-probe", "echo-vision"],
  "echo-vision": ["echo-vision"],
  "the-rift": ["the-rift"],
  "riff-reactor": ["riff-reactor"],
};
const websiteOwners = {
  "energy-charge": "energy-charge",
  "charge-": "energy-charge",
  "thruster-": "reactive-thruster",
  "flight-": "reactive-thruster",
  "lightsaber-": "lightsaber",
  "blade-": "lightsaber",
  "echo-probe-": "echo-probe",
  "echo-vision-": "echo-vision",
  "rift-": "the-rift",
  "riff-": "riff-reactor",
};

// Explicit ownership, with full regression for shared, mixed or unknown paths.
// No dependency graph or test-title/tag inference is involved.
export function selectScope(changes) {
  const areas = new Set();
  const files = new Set();
  let changedBrowser = false;
  let broad = changes.length === 0;
  const addExperience = (owner) => {
    const owned = experiences[owner];
    if (!owned) {
      broad = true;
      return;
    }
    for (const name of [
      ...owned,
      "touch-activation",
      "catalog",
      "catalog-workbench",
    ])
      files.add(spec(name));
  };
  for (const change of changes) {
    const { path } = change;
    if (/^tests\/browser\/[^/]+\.spec\.ts$/.test(path)) {
      // Full file execution includes every new/modified extended test, even
      // without @smoke. Deleted/renamed paths still influence the broad fallback.
      files.add(path);
      changedBrowser = true;
      if (change.deleted) broad = true;
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
    } else if (path.startsWith("packages/audiobits/")) {
      areas.add("runtime");
      broad = true;
    } else if (
      /^(?:README|CONTRIBUTING|CODE_OF_CONDUCT|AGENTS)\.md$/.test(path) ||
      /^docs\/.*\.md$/.test(path) ||
      /\/AGENTS\.md$/.test(path) ||
      path === ".changeset/README.md"
    ) {
      areas.add("docs");
      if (change.executable) broad = true;
    } else if (path.startsWith("catalog/experiences/")) {
      areas.add("catalog");
      addExperience(path.split("/")[2]);
    } else if (path.startsWith("catalog/recipes/")) {
      areas.add("catalog");
      if (
        ![
          "confirmation",
          "impact",
          "thruster",
          "tactile-click",
          "gentle-rejection",
          "glass-notification",
          "whoosh",
          "power-up",
        ].includes(path.split("/")[2])
      )
        broad = true;
      for (const name of [
        "catalog",
        "catalog-workbench",
        "gallery",
        "curated",
        "automation",
        "landing",
        "mixing",
      ])
        files.add(spec(name));
      if (path.split("/")[2] === "thruster") addExperience("reactive-thruster");
      // The portable impact/confirmation recipes also support shared native hosts.
      if (["impact", "confirmation"].includes(path.split("/")[2])) broad = true;
    } else if (path === "registry.json" || path.startsWith("catalog/")) {
      areas.add("catalog");
      broad = true;
    } else if (
      path.startsWith("skills/audiobits/") ||
      path.startsWith("tools/mcp/")
    ) {
      areas.add("skill");
      files.add(spec("touch-activation"));
    } else if (path.startsWith("apps/www/content/docs/")) {
      areas.add("site");
      for (const name of [
        "docs-markdown",
        "docs-navigation",
        "docs-search",
        "docs-layout",
        "seo",
      ])
        files.add(spec(name));
      if (change.executable) areas.add("skill");
    } else if (path.startsWith("apps/www/")) {
      areas.add("site");
      const name = path.split("/").at(-1);
      const owner = /^apps\/www\/(?:app|lib)\/[^/]+$/.test(path)
        ? Object.entries(websiteOwners).find(([prefix]) =>
            name.startsWith(prefix),
          )?.[1]
        : undefined;
      if (owner) addExperience(owner);
      else broad = true;
    } else {
      broad = true;
    }
  }
  // A changed owning test joins its production boundary. Prose/artifact-only
  // changes with browser edits are mixed; test-only changes still run every file.
  if (
    changedBrowser &&
    (areas.size === 0 || areas.has("docs") || areas.has("artifact"))
  )
    areas.add("site");
  if (areas.size > 1) broad = true;
  const full = broad;
  const kind = full ? "full" : [...areas][0];
  return {
    kind,
    package: full || kind === "artifact" || kind === "runtime",
    consumers: full || ["runtime", "catalog", "skill"].includes(kind),
    site: full || ["catalog", "site", "skill"].includes(kind),
    fullBrowser: full,
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
      fullBrowser: false,
      browserFiles: [],
    };
  if (event !== "pull_request") return selectScope([]);
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
