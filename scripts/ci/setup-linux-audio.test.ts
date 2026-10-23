import { expect, test } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("Linux audio installs only required packages and stops before startup when installation fails", () => {
  const directory = mkdtempSync(join(tmpdir(), "audiobits-audio-setup-"));
  const record = join(directory, "commands.jsonl");
  const fixture = `#!${process.execPath}
const fs = require('node:fs');
const name = require('node:path').basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync(process.env.RECORD, JSON.stringify([name, ...args]) + '\\n');
if (process.env.FAIL_INSTALL && name === 'sudo' && args[0] === 'apt-get' && args[1] === 'install') process.exit(9);
`;
  const commands = () =>
    readFileSync(record, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as string[]);
  const run = (fail = "") =>
    spawnSync("bash", [resolve("scripts/ci/setup-linux-audio.sh")], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        GITHUB_ACTIONS: "true",
        RECORD: record,
        FAIL_INSTALL: fail,
      },
    });
  try {
    for (const command of ["sudo", "pulseaudio", "pactl"])
      writeFileSync(join(directory, command), fixture, { mode: 0o755 });
    const success = run();
    expect(success.status, success.stderr).toBe(0);
    expect(commands()).toContainEqual([
      "sudo",
      "sed",
      "-i",
      "s|http://azure.archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g",
      "/etc/apt/sources.list.d/ubuntu.sources",
    ]);
    expect(commands()).toContainEqual([
      "sudo",
      "apt-get",
      "install",
      "-y",
      "--no-install-recommends",
      "pulseaudio",
      "pulseaudio-utils",
    ]);
    expect(commands()).toContainEqual([
      "pactl",
      "set-default-sink",
      "audiobits_ci",
    ]);
    writeFileSync(record, "");
    expect(run("yes").status).toBe(9);
    expect(
      commands().some(
        ([command]) => command === "pulseaudio" || command === "pactl",
      ),
    ).toBe(false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
