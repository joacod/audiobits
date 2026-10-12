import { resolve } from "node:path";
import { Worker } from "node:worker_threads";
import type { RuntimeRequest, RuntimeResponse } from "./contracts.js";
import { ToolError } from "./errors.js";

// Replaced only by the Skill bundler. Development keeps the separate worker.
declare const AUDIOBITS_BUNDLED: boolean;

export async function installedRuntime(
  request: Omit<RuntimeRequest, "projectPath"> & { projectPath?: string },
  signal?: AbortSignal,
): Promise<RuntimeResponse> {
  signal?.throwIfAborted();
  const worker = new Worker(
    new URL(
      typeof AUDIOBITS_BUNDLED !== "undefined" && AUDIOBITS_BUNDLED
        ? import.meta.url
        : "./runtime-worker.js",
      import.meta.url,
    ),
    {
      workerData: {
        ...request,
        projectPath: resolve(request.projectPath ?? process.cwd()),
      },
      execArgv: ["--experimental-import-meta-resolve"],
      stdout: true,
      stderr: true,
    },
  );
  // Drain installed-package output. It must never become protocol output.
  worker.stdout.resume();
  worker.stderr.resume();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    return await new Promise<RuntimeResponse>((accept, reject) => {
      abort = () =>
        reject(
          new ToolError(
            "request-cancelled",
            "Runtime operation was cancelled.",
            "Start a new request if needed.",
          ),
        );
      signal?.addEventListener("abort", abort, { once: true });
      timer = setTimeout(
        () =>
          reject(
            new ToolError(
              "runtime-timeout",
              "Installed runtime did not respond within five seconds.",
              "Check the selected AudioBits installation.",
            ),
          ),
        5000,
      );
      worker.once("message", (message) => {
        if (message.ok) accept(message.result);
        else
          reject(
            new ToolError(
              message.diagnostic.code,
              message.diagnostic.message,
              message.diagnostic.action,
            ),
          );
      });
      worker.once("error", () =>
        reject(
          new ToolError(
            "runtime-unavailable",
            "Installed runtime worker failed.",
            "Check the selected AudioBits installation.",
          ),
        ),
      );
      worker.once("exit", () =>
        reject(
          new ToolError(
            "runtime-unavailable",
            "Installed runtime exited before responding.",
            "Check the selected AudioBits installation.",
          ),
        ),
      );
    });
  } finally {
    clearTimeout(timer);
    if (abort) signal?.removeEventListener("abort", abort);
    await worker.terminate();
  }
}
