import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validSourcePath } from "./source-path.mjs";
import { format } from "prettier";

const root = fileURLToPath(new URL("../../", import.meta.url));
const destination = new URL("./snapshot.json", import.meta.url);
const revisionArgument = process.argv.find((arg) =>
  arg.startsWith("--revision="),
);
const revision =
  revisionArgument?.slice(11) ??
  JSON.parse(readFileSync(destination, "utf8")).revision;
if (!/^[a-f0-9]{40}$/.test(revision))
  throw new Error("Use a full immutable commit SHA.");
const atRevision = (path) =>
  execFileSync("git", ["show", `${revision}:${path}`], {
    cwd: root,
    maxBuffer: 256 * 1024,
  });
const registry = JSON.parse(atRevision("registry.json").toString("utf8"));
if (
  JSON.stringify(registry) !==
  JSON.stringify(
    JSON.parse(
      readFileSync(new URL("../../registry.json", import.meta.url), "utf8"),
    ),
  )
)
  throw new Error(
    "Registry differs from revision; select a reviewed commit containing this catalog.",
  );
const items = registry.items
  .toSorted((a, b) => a.name.localeCompare(b.name, "en"))
  .map((item) => ({
    ...item,
    docs: item.docs.replaceAll("/blob/main/", `/blob/${revision}/`),
    files: item.files.map((file) => {
      if (!validSourcePath(file.path))
        throw new Error("Unsafe registry source path.");
      const content = atRevision(file.path);
      if (
        !content.equals(
          readFileSync(new URL(`../../${file.path}`, import.meta.url)),
        )
      )
        throw new Error(`Source differs from revision: ${file.path}`);
      return {
        ...file,
        bytes: content.length,
        sha256: createHash("sha256").update(content).digest("hex"),
      };
    }),
  }));
const generated = await format(
  JSON.stringify({
    repository: "https://github.com/joacod/audiobits",
    revision,
    items,
  }),
  { parser: "json" },
);
if (process.argv.includes("--check")) {
  if (readFileSync(destination, "utf8") !== generated)
    throw new Error("MCP catalog snapshot is stale.");
} else writeFileSync(destination, generated);
