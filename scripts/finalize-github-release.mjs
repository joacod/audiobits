import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

export function releaseNotes(changelog, version) {
  const sections = changelog.replaceAll("\r\n", "\n").split(/^## /m);
  const matches = sections.filter(
    (section) => section.split("\n", 1)[0].trim() === version,
  );
  assert.equal(
    matches.length,
    1,
    `Expected one changelog section for ${version}`,
  );
  const notes = matches[0].split("\n").slice(1).join("\n").trim();
  assert.ok(notes, `Changelog notes for ${version} must not be empty`);
  return notes;
}

export async function waitForPublicVersion(
  version,
  {
    fetch = globalThis.fetch,
    wait = delay,
    now = () => globalThis.performance.now(),
    timeoutMs = 10 * 60 * 1000,
    intervalMs = 15 * 1000,
  } = {},
) {
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    const response = await fetch(
      `https://registry.npmjs.org/audiobits/${encodeURIComponent(version)}`,
      {
        cache: "no-store",
        signal: globalThis.AbortSignal.timeout(
          Math.max(1, Math.min(10_000, Math.ceil(deadline - now()))),
        ),
      },
    );
    if (response.ok) {
      const published = await response.json();
      assert.equal(published.name, "audiobits", "Registry package must match");
      assert.equal(published.version, version, "Registry version must match");
      return;
    }
    assert.equal(
      response.status,
      404,
      `Public registry lookup failed: HTTP ${response.status}`,
    );
    const remaining = deadline - now();
    if (remaining > 0) await wait(Math.min(intervalMs, remaining));
  }
  throw new Error(
    `audiobits@${version} did not become publicly available within ${timeoutMs}ms; npm may already have accepted publication. Rerun only the failed GitHub Release job.`,
  );
}

const command = (program, args) =>
  execFileSync(program, args, { encoding: "utf8" }).trim();

export async function finalizeRelease(
  { version, sha, repository, changelog },
  { run = command, waitForVersion = waitForPublicVersion } = {},
) {
  assert.match(
    sha,
    /^[a-f0-9]{40}$/,
    "Release commit must be a full GitHub SHA",
  );
  assert.match(
    repository,
    /^[\w.-]+\/[\w.-]+$/,
    "GitHub repository must be set",
  );
  assert.equal(
    run("git", ["rev-parse", "HEAD"]),
    sha,
    "Checkout must match release commit",
  );
  const tag = `v${version}`;
  const notes = releaseNotes(changelog, version);
  await waitForVersion(version);

  // Peel annotated tags as well as accepting lightweight tags.
  const refs = run("git", [
    "ls-remote",
    "--tags",
    "origin",
    `refs/tags/${tag}`,
    `refs/tags/${tag}^{}`,
  ])
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split(/\s+/));
  const target =
    refs.find(([, ref]) => ref.endsWith("^{}"))?.[0] ?? refs[0]?.[0];
  if (target) {
    assert.equal(
      target,
      sha,
      `Existing ${tag} points to a different commit; refusing to move it`,
    );
  } else {
    run("gh", [
      "api",
      `repos/${repository}/git/refs`,
      "--method",
      "POST",
      "-f",
      `ref=refs/tags/${tag}`,
      "-f",
      `sha=${sha}`,
    ]);
  }

  // A successful list distinguishes absence from authentication/network failures.
  const releases = run("gh", [
    "api",
    `repos/${repository}/releases`,
    "--paginate",
    "--jq",
    ".[] | .tag_name",
  ]).split("\n");
  if (releases.includes(tag)) return;
  run("gh", [
    "release",
    "create",
    tag,
    "--repo",
    repository,
    "--verify-tag",
    "--target",
    sha,
    "--title",
    `audiobits ${tag}`,
    "--notes",
    notes,
  ]);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { version } = JSON.parse(
    readFileSync("packages/audiobits/package.json", "utf8"),
  );
  await finalizeRelease({
    version,
    sha: process.env.RELEASE_SHA,
    repository: process.env.GITHUB_REPOSITORY,
    changelog: readFileSync("packages/audiobits/CHANGELOG.md", "utf8"),
  });
  console.log(
    `GitHub Release v${version} complete at ${process.env.RELEASE_SHA}`,
  );
}
