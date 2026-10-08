import { readFileSync } from "node:fs";
import { expect, test, vi } from "vitest";
import {
  finalizeRelease,
  releaseNotes,
  waitForPublicVersion,
} from "./finalize-github-release.mjs";

const { version } = JSON.parse(
  readFileSync("packages/audiobits/package.json", "utf8"),
);
const sha = "a".repeat(40);
const tag = `v${version}`;
const notes = "### Patch Changes\n\n- Package change.";
const changelog = `# audiobits\n\n## ${version}\n\n${notes}\n\n## older\n\n- Previous release.\n`;
const release = { version, sha, repository: "joacod/audiobits", changelog };

test("notes contain only the exact package version section, retaining subheadings", () => {
  expect(releaseNotes(changelog, version)).toBe(notes);
  expect(releaseNotes(changelog.replaceAll("\n", "\r\n"), version)).toBe(notes);
  expect(() => releaseNotes(changelog, "missing")).toThrow("Expected one");
  expect(() => releaseNotes(`## ${version}\n\n`, version)).toThrow("empty");
  expect(() => releaseNotes(`## ${version}`, version)).toThrow("empty");
  expect(() =>
    releaseNotes(changelog + `\n## ${version}\nDuplicate`, version),
  ).toThrow("Expected one");
  const actual = readFileSync("packages/audiobits/CHANGELOG.md", "utf8");
  expect(releaseNotes(actual, version)).not.toMatch(/^## /m);
});

test("public availability polls only the exact version and stops when visible", async () => {
  let time = 0;
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 404 })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: "audiobits", version }),
    });
  const wait = vi.fn(async (ms: number) => {
    time += ms;
  });
  await waitForPublicVersion(version, { fetch, wait, now: () => time });
  expect(fetch).toHaveBeenCalledTimes(2);
  for (const [url] of fetch.mock.calls) {
    expect(url).toBe(`https://registry.npmjs.org/audiobits/${version}`);
  }
  expect(wait).toHaveBeenCalledExactlyOnceWith(15_000);
});

test("availability timeout is bounded and explains finalization-only recovery", async () => {
  let time = 0;
  const fetch = vi.fn(async () => ({ ok: false, status: 404 }));
  const wait = vi.fn(async (ms: number) => {
    time += ms;
  });
  await expect(
    waitForPublicVersion(version, {
      fetch,
      wait,
      now: () => time,
      timeoutMs: 35,
      intervalMs: 15,
    }),
  ).rejects.toThrow("Rerun only the failed GitHub Release job");
  expect(time).toBe(35);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(wait.mock.calls.map(([ms]) => ms)).toEqual([15, 15, 5]);
});

test("unexpected registry failures and mismatched responses fail without sleeping", async () => {
  const wait = vi.fn();
  for (const response of [
    { ok: false, status: 403 },
    { ok: false, status: 500 },
    { ok: true, json: async () => ({ name: "audiobits", version: "other" }) },
    { ok: true, json: async () => ({ name: "other", version }) },
  ]) {
    await expect(
      waitForPublicVersion(version, {
        fetch: async () => response,
        wait,
      }),
    ).rejects.toThrow();
  }
  await expect(
    waitForPublicVersion(version, {
      fetch: async () => {
        throw new Error("Network failure");
      },
      wait,
    }),
  ).rejects.toThrow("Network failure");
  expect(wait).not.toHaveBeenCalled();
});

test("finalization waits before mutations, targets the release SHA, and uses package notes", async () => {
  const events: string[] = [];
  const run = vi.fn((program: string, args: string[]) => {
    events.push(`${program} ${args[0]}`);
    return args[0] === "rev-parse" ? sha : "";
  });
  const waitForVersion = vi.fn(async () => {
    events.push("available");
  });
  await finalizeRelease(release, { run, waitForVersion });
  expect(waitForVersion).toHaveBeenCalledExactlyOnceWith(version);
  expect(events).toEqual([
    "git rev-parse",
    "available",
    "git ls-remote",
    "gh api",
    "gh api",
    "gh release",
  ]);
  expect(run).toHaveBeenCalledWith("gh", [
    "api",
    "repos/joacod/audiobits/git/refs",
    "--method",
    "POST",
    "-f",
    `ref=refs/tags/${tag}`,
    "-f",
    `sha=${sha}`,
  ]);
  expect(run).toHaveBeenCalledWith("gh", [
    "release",
    "create",
    tag,
    "--repo",
    "joacod/audiobits",
    "--verify-tag",
    "--target",
    sha,
    "--title",
    `audiobits ${tag}`,
    "--notes",
    notes,
  ]);
});

test("matching lightweight or annotated tags and existing releases are complete", async () => {
  for (const refs of [
    `${sha}\trefs/tags/${tag}`,
    `${"b".repeat(40)}\trefs/tags/${tag}\n${sha}\trefs/tags/${tag}^{}`,
  ]) {
    const run = vi.fn((_program: string, args: string[]) => {
      if (args[0] === "rev-parse") return sha;
      if (args[0] === "ls-remote") return refs;
      return tag;
    });
    await finalizeRelease(release, { run, waitForVersion: vi.fn() });
    expect(
      run.mock.calls.some(
        ([, args]) => args.includes("POST") || args.includes("create"),
      ),
    ).toBe(false);
  }
});

test("conflicting tags fail loudly without moving the tag or creating a release", async () => {
  const run = vi.fn((_program: string, args: string[]) =>
    args[0] === "rev-parse" ? sha : `${"b".repeat(40)}\trefs/tags/${tag}`,
  );
  await expect(
    finalizeRelease(release, { run, waitForVersion: vi.fn() }),
  ).rejects.toThrow("refusing to move");
  expect(run.mock.calls.every(([program]) => program === "git")).toBe(true);
});

test("failed release creation can be rerun after tag creation without republishing", async () => {
  let tagged = false;
  let created = false;
  const run = vi.fn((program: string, args: string[]) => {
    if (args[0] === "rev-parse") return sha;
    if (args[0] === "ls-remote")
      return tagged ? `${sha}\trefs/tags/${tag}` : "";
    if (args.includes("POST")) {
      tagged = true;
      return "";
    }
    if (program === "gh" && args[0] === "release") {
      if (!created) {
        created = true;
        throw new Error("Release request failed");
      }
      return "";
    }
    return "";
  });
  const waitForVersion = vi.fn();
  await expect(
    finalizeRelease(release, { run, waitForVersion }),
  ).rejects.toThrow("Release request failed");
  await finalizeRelease(release, { run, waitForVersion });
  expect(
    run.mock.calls.filter(([, args]) => args.includes("POST")),
  ).toHaveLength(1);
  expect(
    run.mock.calls.every(([program]) => program === "gh" || program === "git"),
  ).toBe(true);
});

test("unavailable package, wrong checkout, or failed remote inspection prevents mutations", async () => {
  const run = vi.fn(() => sha);
  await expect(
    finalizeRelease(release, {
      run,
      waitForVersion: async () => {
        throw new Error("Unavailable");
      },
    }),
  ).rejects.toThrow("Unavailable");
  expect(run).toHaveBeenCalledTimes(1);
  await expect(
    finalizeRelease(release, {
      run: () => "b".repeat(40),
      waitForVersion: vi.fn(),
    }),
  ).rejects.toThrow("Checkout must match");
  const remoteFailure = vi.fn((_program: string, args: string[]) => {
    if (args[0] === "rev-parse") return sha;
    throw new Error("Remote lookup failed");
  });
  await expect(
    finalizeRelease(release, {
      run: remoteFailure,
      waitForVersion: vi.fn(),
    }),
  ).rejects.toThrow("Remote lookup failed");
  expect(remoteFailure.mock.calls.every(([program]) => program === "git")).toBe(
    true,
  );
});
