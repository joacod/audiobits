import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

// Each command owns a process group so pnpm grandchildren stop with their parent.
export async function runDevelopment({ build, services }) {
  const children = [];
  let stopping = false;
  let signalCode;
  let killed;
  const send = (child, signal) => {
    if (!child.pid) return;
    try {
      if (process.platform === "win32") child.kill(signal);
      else process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  };
  const stop = (signal) => {
    if (signal) signalCode = signal === "SIGINT" ? 130 : 143;
    if (stopping) return;
    stopping = true;
    for (const { child } of children) send(child, "SIGTERM");
    killed ??= new Promise((resolve) =>
      setTimeout(() => {
        for (const { child } of children) send(child, "SIGKILL");
        resolve();
      }, 1000),
    );
  };
  const onInt = () => stop("SIGINT");
  const onTerm = () => stop("SIGTERM");
  process.on("SIGINT", onInt);
  process.on("SIGTERM", onTerm);
  const start = ([command, ...args]) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      detached: process.platform !== "win32",
    });
    const closed = new Promise((resolve) => {
      child.once("error", (error) => {
        console.error(error.message);
        resolve(1);
      });
      child.once("close", (code) => resolve(code ?? 1));
    });
    children.push({ child, closed });
    return closed;
  };
  try {
    const built = await start(build);
    if (stopping || built !== 0) return signalCode ?? built;
    const result = await Promise.race(services.map(start));
    // Even a clean watcher exit is unexpected while development is running.
    return signalCode ?? (result === 0 ? 1 : result);
  } finally {
    stop();
    // Escalate after a grace period, including grandchildren whose parent exited.
    await killed;
    await Promise.all(children.map(({ closed }) => closed));
    process.off("SIGINT", onInt);
    process.off("SIGTERM", onTerm);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  process.exitCode = await runDevelopment({
    build: [pnpm, "build:lib"],
    services: [
      [pnpm, "--filter", "audiobits", "dev"],
      [pnpm, "--filter", "@audiobits/www", "dev"],
    ],
  });
}
