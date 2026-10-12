// Test preload: observe worker readiness without timers or filesystem watchers.
import workerThreads from "node:worker_threads";
import { syncBuiltinESMExports } from "node:module";

const OriginalWorker = workerThreads.Worker;
workerThreads.Worker = class extends OriginalWorker {
  constructor(...args) {
    super(...args);
    this.once("online", () => process.stderr.write("worker-online\n"));
  }
};
syncBuiltinESMExports();
