import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Unknown paths fail conservatively toward the full matrix. UI and prose are
// explicit exceptions; runtime/browser infrastructure always wins in mixed PRs.
export function selectChecks(paths, main = false) {
  let chromium = main;
  let crossBrowser = main;
  for (const path of paths) {
    if (
      /^apps\/www\/(app\/(sound-gallery|output-scope)\.tsx|lib\/raw-example\.ts)$/.test(
        path,
      )
    ) {
      chromium = true;
      crossBrowser = true;
    } else if (
      /^(apps\/www\/|packages\/audiobits\/src\/recipes\/)/.test(path)
    ) {
      chromium = true;
    } else if (/^(docs\/|.*\.md$|LICENSE$|\.github\/.*TEMPLATE)/.test(path)) {
      continue;
    } else {
      chromium = true;
      crossBrowser = true;
    }
  }
  if (
    paths.some((path) =>
      /^packages\/audiobits\/(README\.md|skill\/)/.test(path),
    )
  )
    chromium = true;
  return { chromium, crossBrowser };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const main = process.env.GITHUB_EVENT_NAME === "push";
  const paths = main
    ? []
    : execFileSync(
        "git",
        ["diff", "--name-only", "-z", `${process.env.BASE_SHA}...HEAD`],
        { encoding: "utf8" },
      )
        .split("\0")
        .filter(Boolean);
  const result = selectChecks(paths, main);
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `chromium=${result.chromium}\ncross-browser=${result.crossBrowser}\n`,
  );
  console.log(JSON.stringify(result));
}
