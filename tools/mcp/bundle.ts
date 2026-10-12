import { isMainThread } from "node:worker_threads";

// Workers re-enter the same ESM executable, without opening another transport.
if (isMainThread) await import("./stdio.js");
else await import("./runtime-worker.js");
