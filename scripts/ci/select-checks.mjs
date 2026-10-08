import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Chromium is the routine pre-release target. Executable/package and unknown
// paths receive browser checks; contributor prose alone does not.
export function selectChecks(paths, main = false) {
  const chromium =
    main ||
    paths.some(
      (path) =>
        /^apps\/www\/|^packages\/audiobits\/(README\.md|skill\/)/.test(path) ||
        !/^(docs\/|.*\.md$|LICENSE$|\.github\/.*TEMPLATE)/.test(path),
    );
  return { chromium };
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
  appendFileSync(process.env.GITHUB_OUTPUT, `chromium=${result.chromium}\n`);
  console.log(JSON.stringify(result));
}
