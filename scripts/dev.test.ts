import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { expect, test } from "vitest";

const supervisor = new URL("./dev.mjs", import.meta.url).href;
const pause = () => new Promise((resolve) => setTimeout(resolve, 30));
async function waitForFile(path: string) {
  for (let i = 0; i < 200; i++) {
    try {
      return await readFile(path, "utf8");
    } catch {
      await pause();
    }
  }
  throw new Error("Child did not start");
}
function alive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
function launch(build: string, services: string[]) {
  const command = (code: string) => [
    process.execPath,
    "--input-type=module",
    "-e",
    code,
  ];
  const child = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { runDevelopment } from ${JSON.stringify(supervisor)}; process.exitCode = await runDevelopment(${JSON.stringify({ build: command(build), services: services.map(command) })});`,
    ],
    { stdio: "inherit" },
  );
  return { child, exited: once(child, "exit") };
}
function running(file: string) {
  return `import {writeFileSync} from 'node:fs';writeFileSync(${JSON.stringify(file)},String(process.pid));setInterval(()=>{},1000);`;
}

test("failed initial build never launches services", async () => {
  const dir = await mkdtemp(join(tmpdir(), "audiobits-supervisor-"));
  try {
    const { exited } = launch("process.exit(7)", [
      running(join(dir, "service")),
    ]);
    expect((await exited)[0]).toBe(7);
    await expect(readFile(join(dir, "service"))).rejects.toThrow();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test.each([9, 0])(
  "watcher exit %s fails and stops its sibling",
  async (code) => {
    const dir = await mkdtemp(join(tmpdir(), "audiobits-supervisor-"));
    let child;
    try {
      const launched = launch("process.exit(0)", [
        `import {existsSync} from "node:fs";setInterval(()=>{if(existsSync(${JSON.stringify(join(dir, "site"))}))process.exit(${code});},10);`,
        running(join(dir, "site")),
      ]);
      child = launched.child;
      const pid = Number(await waitForFile(join(dir, "site")));
      expect((await launched.exited)[0]).toBe(code || 1);
      expect(alive(pid)).toBe(false);
    } finally {
      child?.kill("SIGTERM");
      await rm(dir, { recursive: true, force: true });
    }
  },
);

test.each(["SIGINT", "SIGTERM"] as const)(
  "%s stops watcher, site, and grandchildren",
  async (signal) => {
    const dir = await mkdtemp(join(tmpdir(), "audiobits-supervisor-"));
    let child;
    try {
      const grandchild =
        running(join(dir, "grandchild")) + `process.on("SIGTERM",()=>{});`;
      const watcher = `${running(join(dir, "watcher"))}import {spawn} from 'node:child_process';spawn(process.execPath,['--input-type=module','-e',${JSON.stringify(grandchild)}]);`;
      const launched = launch("process.exit(0)", [
        watcher,
        running(join(dir, "site")),
      ]);
      child = launched.child;
      const pids = await Promise.all(
        ["watcher", "site", "grandchild"].map(async (file) =>
          Number(await waitForFile(join(dir, file))),
        ),
      );
      child.kill(signal);
      expect((await launched.exited)[0]).toBe(signal === "SIGINT" ? 130 : 143);
      for (const pid of pids) expect(alive(pid)).toBe(false);
    } finally {
      child?.kill("SIGTERM");
      await rm(dir, { recursive: true, force: true });
    }
  },
);

test("termination during a stalled initial build never starts services", async () => {
  const dir = await mkdtemp(join(tmpdir(), "audiobits-supervisor-"));
  let child;
  try {
    const launched = launch(
      running(join(dir, "build")) + `process.on("SIGTERM",()=>{});`,
      [running(join(dir, "site"))],
    );
    child = launched.child;
    const pid = Number(await waitForFile(join(dir, "build")));
    child.kill("SIGTERM");
    expect((await launched.exited)[0]).toBe(143);
    expect(alive(pid)).toBe(false);
    await expect(readFile(join(dir, "site"))).rejects.toThrow();
  } finally {
    child?.kill("SIGTERM");
    await rm(dir, { recursive: true, force: true });
  }
});
