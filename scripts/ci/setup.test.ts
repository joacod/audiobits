import { expect, test } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

test("centralized provisioning shares indexes, downloads only the shell and fails visibly at each boundary", () => {
  const directory = mkdtempSync(join(tmpdir(), "audiobits-setup-"));
  const record = join(directory, "commands.jsonl");
  for (const command of ["pnpm", "sudo", "pulseaudio", "pactl"]) {
    writeFileSync(
      join(directory, command),
      `#!${process.execPath}
const fs = require('node:fs');
const name = require('node:path').basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync(process.env.RECORD, JSON.stringify([name, ...args]) + '\\n');
if (process.env.FAIL_COMMAND === name + ':' + args.join(' ')) process.exit(9);
if (args[0] === 'get-default-sink') console.log(process.env.BAD_SINK ? 'wrong_sink' : 'audiobits_ci');
if (args.join(' ') === 'list short sinks') console.log('0\\taudiobits_ci\\tmodule-null-sink.c\\ts16le 2ch 44100Hz\\tIDLE');
`,
      { mode: 0o755 },
    );
  }
  const run = (fail = "", badSink = "", githubActions = "true") =>
    spawnSync("bash", [resolve("scripts/ci/setup-linux-audio.sh")], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        RECORD: record,
        FAIL_COMMAND: fail,
        BAD_SINK: badSink,
        GITHUB_ACTIONS: githubActions,
      },
    });
  try {
    const passed = run();
    expect(passed.status, passed.stderr).toBe(0);
    const calls = readFileSync(record, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as string[]);
    const dependencies = [
      "pnpm",
      "exec",
      "playwright",
      "install-deps",
      "chromium",
    ];
    const pulse = [
      "sudo",
      "apt-get",
      "install",
      "-y",
      "--no-install-recommends",
      "pulseaudio",
    ];
    const browser = [
      "pnpm",
      "exec",
      "playwright",
      "install",
      "--only-shell",
      "chromium",
    ];
    const [mirror] = calls;
    expect(mirror.slice(0, 3)).toEqual(["sudo", "sed", "-i"]);
    expect(mirror[4]).toBe("/etc/apt/apt-mirrors.txt");
    const upstream =
      "https://archive.ubuntu.com/ubuntu/\tpriority:2\n" +
      "https://security.ubuntu.com/ubuntu/\tpriority:3\n";
    const mirrors = spawnSync("sed", [mirror[3]], {
      input: "http://azure.archive.ubuntu.com/ubuntu/\tpriority:1\n" + upstream,
      encoding: "utf8",
    });
    expect(mirrors.status, mirrors.stderr).toBe(0);
    expect(mirrors.stdout).toBe(upstream);
    expect(calls.slice(1, 4)).toEqual([dependencies, pulse, browser]);
    expect(calls).toContainEqual([
      "pactl",
      "load-module",
      "module-null-sink",
      "sink_name=audiobits_ci",
      "norewinds=1",
    ]);
    expect(calls).toContainEqual(["pactl", "get-default-sink"]);
    expect(calls).toContainEqual(["pactl", "list", "short", "sinks"]);
    expect(passed.stdout).toMatch(/Provisioning OS installation: \d+s/);
    expect(passed.stdout).toMatch(
      /Provisioning Chromium headless-shell download: \d+s/,
    );
    expect(passed.stdout).toMatch(
      /Provisioning audio startup and verification: \d+s/,
    );
    for (const [name, ...args] of calls) {
      writeFileSync(record, "");
      const failed = run(`${basename(name)}:${args.join(" ")}`);
      expect(failed.status).not.toBe(0);
      expect(failed.stdout).not.toContain(
        "Provisioning audio startup and verification:",
      );
      // A failed command is never retried or followed by another provisioning phase.
      expect(readFileSync(record, "utf8").trim().split("\n").at(-1)).toBe(
        JSON.stringify([name, ...args]),
      );
    }
    expect(run("", "1").status).not.toBe(0);
    writeFileSync(record, "");
    expect(run("", "", "false").status).toBe(0);
    expect(readFileSync(record, "utf8")).not.toContain("apt-mirrors.txt");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
